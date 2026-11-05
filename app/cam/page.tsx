"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { FILMS, develop, getFilm, type FilmId } from "@/lib/film";
import { playShutter, playWind } from "@/lib/sound";
import { BUCKET, getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const NAME_KEY = "dispo:guest";
const USED_KEY = "dispo:used";
const FILM_KEY = "dispo:film";
const ASPECT = 3 / 4; // portrait print
const MAX_WIDTH = 1080;

type Shot = { blob: Blob; filter: FilmId; width: number; height: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function setTorch(stream: MediaStream | null, on: boolean) {
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  try {
    const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
    if (!caps.torch) return;
    await track.applyConstraints({ advanced: [{ torch: on } as unknown as MediaTrackConstraintSet] });
  } catch {
    /* torch not supported */
  }
}

export default function CamPage() {
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [used, setUsed] = useState(0);
  const [filmId, setFilmId] = useState<FilmId>("classic");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [needsWind, setNeedsWind] = useState(false);
  const [winding, setWinding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fx, setFx] = useState<"shutter" | "flash" | null>(null);
  const [uploading, setUploading] = useState(0);
  const [failed, setFailed] = useState<Shot[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const film = getFilm(filmId);
  const remaining = Math.max(0, config.shotsPerGuest - used);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Restore guest state from this device.
  useEffect(() => {
    const n = load(NAME_KEY) ?? "";
    setName(n);
    setDraft(n);
    setUsed(Number(load(USED_KEY)) || 0);
    setFilmId(getFilm(load(FILM_KEY)).id);
    setHydrated(true);
  }, []);

  // Start / restart the camera.
  useEffect(() => {
    if (!name || remaining <= 0) return;
    let cancelled = false;

    (async () => {
      setCamOn(false);
      setCamError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
        setCamOn(true);
      } catch (e) {
        const err = e as DOMException;
        if (err?.name === "NotAllowedError")
          setCamError("Akses kamera ditolak. Izinkan kamera di pengaturan browser lalu muat ulang halaman.");
        else if (err?.message === "unsupported" || !window.isSecureContext)
          setCamError("Browser ini tidak mendukung kamera. Buka lewat HTTPS di Chrome atau Safari.");
        else setCamError("Kamera tidak bisa dibuka. Tutup aplikasi lain yang memakai kamera lalu coba lagi.");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, facing, remaining > 0]);

  const upload = useCallback(
    async (shot: Shot) => {
      const sb = getSupabase();
      const path = `${new Date().toISOString().slice(0, 10)}/${uuid()}.jpg`;
      const up = await sb.storage
        .from(BUCKET)
        .upload(path, shot.blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw up.error;
      const ins = await sb.from("photos").insert({
        guest_name: name,
        filter: shot.filter,
        storage_path: path,
        width: shot.width,
        height: shot.height,
      });
      if (ins.error) throw ins.error;
    },
    [name]
  );

  const uploadWithRetry = useCallback(
    async (shot: Shot) => {
      setUploading((n) => n + 1);
      try {
        for (let attempt = 0; ; attempt++) {
          try {
            await upload(shot);
            return true;
          } catch (e) {
            if (attempt >= 2) {
              console.error(e);
              setFailed((f) => [...f, shot]);
              showToast("Gagal mengirim foto. Cek koneksi lalu ketuk 'Kirim ulang'.");
              return false;
            }
            await sleep(1500 * (attempt + 1));
          }
        }
      } finally {
        setUploading((n) => n - 1);
      }
    },
    [upload, showToast]
  );

  const capture = useCallback(async (): Promise<Shot | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let sw = vw;
    let sh = vh;
    if (vw / vh > ASPECT) sw = vh * ASPECT;
    else sh = vw / ASPECT;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    const width = Math.round(Math.min(MAX_WIDTH, sw));
    const height = Math.round(width / ASPECT);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    if (facing === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    // Cheap plastic lens: a touch of softness.
    ctx.filter = "blur(0.6px)";
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
    ctx.filter = "none";
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    develop(ctx, width, height, film, { flash, date: new Date() });

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.88));
    if (!blob) return null;
    return { blob, filter: film.id, width, height };
  }, [facing, film, flash]);

  const shoot = useCallback(async () => {
    if (busy || needsWind || remaining <= 0 || !camOn) return;
    setBusy(true);
    try {
      if (flash) {
        await setTorch(streamRef.current, true);
        setFx("flash");
        await sleep(180);
      } else {
        setFx("shutter");
      }
      playShutter();
      navigator.vibrate?.(25);
      const shot = await capture();
      if (flash) void setTorch(streamRef.current, false);
      setTimeout(() => setFx(null), 220);
      if (!shot) {
        showToast("Ups, foto gagal diambil. Coba lagi.");
        return;
      }
      const next = used + 1;
      setUsed(next);
      save(USED_KEY, String(next));
      setNeedsWind(next < config.shotsPerGuest);
      showToast(next >= config.shotsPerGuest ? "Jepretan terakhir!" : "Cekrek! Foto sedang dicuci...");
      void uploadWithRetry(shot);
    } finally {
      setBusy(false);
    }
  }, [busy, needsWind, remaining, camOn, flash, capture, used, showToast, uploadWithRetry]);

  const wind = useCallback(async () => {
    if (!needsWind || winding) return;
    setWinding(true);
    playWind();
    navigator.vibrate?.([8, 40, 8, 40, 8]);
    await sleep(550);
    setNeedsWind(false);
    setWinding(false);
  }, [needsWind, winding]);

  const retryFailed = useCallback(() => {
    const list = failed;
    setFailed([]);
    list.forEach((s) => void uploadWithRetry(s));
  }, [failed, uploadWithRetry]);

  const pickFilm = (id: FilmId) => {
    setFilmId(id);
    save(FILM_KEY, id);
  };

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    const n = draft.trim().slice(0, 40);
    if (!n) return;
    save(NAME_KEY, n);
    setName(n);
  };

  if (!hydrated) return <main className="cam-page" />;

  if (!isSupabaseConfigured) {
    return (
      <main className="paper center-screen">
        <div className="home-card">
          <h1 className="couple">Belum siap</h1>
          <p className="lead">
            Supabase belum dikonfigurasi. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di environment variables.
          </p>
        </div>
      </main>
    );
  }

  if (!name) {
    return (
      <main className="paper center-screen">
        <form className="home-card" onSubmit={submitName}>
          <p className="eyebrow">Selamat datang di pernikahan</p>
          <h1 className="couple">{config.coupleNames}</h1>
          <p className="lead">
            Kamu dapat <b>{config.shotsPerGuest} jepretan</b>. Tulis namamu supaya pengantin tahu siapa
            fotografernya.
          </p>
          <input
            className="input"
            autoFocus
            placeholder="Nama kamu"
            maxLength={40}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={!draft.trim()}>
            Ambil Kamera
          </button>
        </form>
      </main>
    );
  }

  if (remaining <= 0) {
    return (
      <main className="paper center-screen">
        <div className="home-card">
          <p className="eyebrow">Rol film habis</p>
          <h1 className="couple">Terima kasih, {name}!</h1>
          <p className="lead">
            Semua {config.shotsPerGuest} jepretanmu sudah terkirim ke laboratorium. Lihat hasilnya di galeri.
          </p>
          {uploading > 0 && <p className="muted">Mengirim {uploading} foto terakhir...</p>}
          {failed.length > 0 && (
            <button className="btn" onClick={retryFailed}>
              Kirim ulang {failed.length} foto
            </button>
          )}
          <Link className="btn btn-primary" href="/gallery">
            Lihat Galeri
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cam-page">
      <header className="cam-top">
        <span className="cam-brand">{config.coupleNames}</span>
        <button
          className="chip"
          onClick={() => {
            setName("");
            setDraft(name);
          }}
          title="Ganti nama"
        >
          {name}
        </button>
      </header>

      <section className="camera-body">
        <div className="body-label">
          <span>DISPO·CAM</span>
          <span className="body-film">{film.name}</span>
        </div>

        <div className="viewfinder">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ filter: film.css, transform: facing === "user" ? "scaleX(-1)" : undefined }}
          />
          <div className="vf-vignette" />
          <div className="vf-grain" />
          <div className="vf-corners" />
          {!camOn && !camError && <div className="vf-msg">Membuka kamera...</div>}
          {camError && <div className="vf-msg vf-error">{camError}</div>}
          {needsWind && camOn && <div className="vf-msg vf-wind">Putar roda film dulu ↻</div>}
          <div className={`vf-fx ${fx ?? ""}`} />
        </div>

        <div className="film-picker" role="radiogroup" aria-label="Pilih film">
          {FILMS.map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={f.id === film.id}
              className={`film-chip ${f.id === film.id ? "active" : ""}`}
              onClick={() => pickFilm(f.id)}
              title={f.tagline}
            >
              <span className="canister" style={{ background: f.color }} />
              {f.name}
            </button>
          ))}
        </div>
        <p className="film-tagline">{film.tagline}</p>

        <div className="controls">
          <button
            className={`ctrl ${flash ? "on" : ""}`}
            onClick={() => setFlash((f) => !f)}
            aria-pressed={flash}
            aria-label="Flash"
          >
            <span className="ctrl-icon">⚡</span>
            <span className="ctrl-text">{flash ? "Flash ON" : "Flash"}</span>
          </button>

          <button
            className="shutter"
            onClick={shoot}
            disabled={!camOn || busy || needsWind}
            aria-label="Jepret"
          />

          <button
            className="ctrl"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            aria-label="Ganti kamera"
          >
            <span className="ctrl-icon">⟲</span>
            <span className="ctrl-text">{facing === "user" ? "Selfie" : "Belakang"}</span>
          </button>
        </div>

        <div className="body-bottom">
          <div className="counter" aria-label={`${remaining} jepretan tersisa`}>
            <span className="counter-num">{String(remaining).padStart(2, "0")}</span>
            <span className="counter-label">sisa</span>
          </div>
          <button
            className={`wind ${needsWind ? "ready" : ""} ${winding ? "spinning" : ""}`}
            onClick={wind}
            disabled={!needsWind}
            aria-label="Putar film"
          >
            <span className="wind-ridges" />
          </button>
          <Link href="/gallery" className="chip chip-dark">
            Galeri →
          </Link>
        </div>
      </section>

      <div className="cam-status">
        {uploading > 0 && <span>Mengirim {uploading} foto...</span>}
        {failed.length > 0 && (
          <button className="chip" onClick={retryFailed}>
            Kirim ulang {failed.length}
          </button>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
