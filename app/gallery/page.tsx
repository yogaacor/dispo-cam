"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { config } from "@/lib/config";
import { getFilm } from "@/lib/film";
import { getSupabase, isSupabaseConfigured, photoUrl, type PhotoRow } from "@/lib/supabase";

const PAGE = 1000;

function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d} hari ` : ""}${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export default function GalleryPage() {
  const revealAt = useMemo(() => {
    const t = config.revealAt ? new Date(config.revealAt).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  }, []);
  const [now, setNow] = useState<number | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const locked = now !== null && revealAt > now;

  useEffect(() => {
    setNow(Date.now());
    try {
      setMe(localStorage.getItem("dispo:guest") ?? "");
    } catch {
      /* ignore */
    }
    if (!revealAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [revealAt]);

  const fetchAll = useCallback(async () => {
    const sb = getSupabase();
    const all: PhotoRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      all.push(...(data as PhotoRow[]));
      if (!data || data.length < PAGE) break;
    }
    return all;
  }, []);

  // Load photos (or just the count while the film is still "developing").
  useEffect(() => {
    if (now === null || !isSupabaseConfigured) {
      if (!isSupabaseConfigured) setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        if (locked) {
          const { count, error } = await getSupabase()
            .from("photos")
            .select("id", { count: "exact", head: true });
          if (error) throw error;
          if (!cancelled) setCount(count ?? 0);
        } else {
          const rows = await fetchAll();
          if (!cancelled) {
            setPhotos(rows);
            setCount(rows.length);
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Gagal memuat galeri. Coba muat ulang.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the lock state flips, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, now === null, fetchAll]);

  // Live updates as guests shoot.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    const channel = sb
      .channel("photos-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos" }, (payload) => {
        const row = payload.new as PhotoRow;
        setCount((c) => (c ?? 0) + 1);
        setPhotos((p) => (p.some((x) => x.id === row.id) ? p : [row, ...p]));
      })
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, []);

  const visible = useMemo(
    () => (onlyMine && me ? photos.filter((p) => p.guest_name === me) : photos),
    [photos, onlyMine, me]
  );

  const step = useCallback(
    (dir: number) => setOpen((i) => (i === null ? i : (i + dir + visible.length) % visible.length)),
    [visible.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (!isSupabaseConfigured) {
    return (
      <main className="paper center-screen">
        <p className="lead">Supabase belum dikonfigurasi.</p>
      </main>
    );
  }

  const current = open !== null ? visible[open] : null;

  return (
    <main className="paper gallery">
      <header className="gallery-head">
        <div>
          <p className="eyebrow">Hasil cuci film</p>
          <h1 className="couple">{config.coupleNames}</h1>
          {count !== null && <p className="muted">{count} foto dari para tamu</p>}
        </div>
        <div className="row">
          {!locked && me && (
            <button className={`chip ${onlyMine ? "chip-dark" : ""}`} onClick={() => setOnlyMine((v) => !v)}>
              {onlyMine ? "Semua foto" : "Foto saya"}
            </button>
          )}
          <Link href="/cam" className="btn btn-primary btn-sm">
            Kamera
          </Link>
        </div>
      </header>

      {loading && <p className="muted center">Memuat...</p>}
      {error && <p className="error center">{error}</p>}

      {locked && now !== null && (
        <section className="darkroom">
          <div className="darkroom-light" />
          <h2>Film sedang dicuci di kamar gelap</h2>
          <p>Galeri terbuka dalam</p>
          <p className="darkroom-time">{countdown(revealAt - now)}</p>
          <p className="muted">Sabar ya, seperti kamera film sungguhan.</p>
        </section>
      )}

      {!locked && !loading && visible.length === 0 && !error && (
        <p className="muted center">Belum ada foto. Jadilah yang pertama!</p>
      )}

      {!locked && (
        <section className="prints">
          {visible.map((p, i) => (
            <button
              key={p.id}
              className="print"
              style={{ rotate: `${((i * 37) % 7) - 3}deg` }}
              onClick={() => setOpen(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.storage_path)} alt={`Foto oleh ${p.guest_name}`} loading="lazy" />
              <span className="print-caption">{p.guest_name}</span>
            </button>
          ))}
        </section>
      )}

      {current && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(current.storage_path)} alt={`Foto oleh ${current.guest_name}`} />
            <div className="lightbox-meta">
              <span className="print-caption">
                {current.guest_name} · {getFilm(current.filter).name}
              </span>
              <div className="row">
                <button className="chip" onClick={() => step(-1)} aria-label="Sebelumnya">
                  ←
                </button>
                <a
                  className="chip chip-dark"
                  href={photoUrl(current.storage_path, `nikahan-${current.id.slice(0, 8)}.jpg`)}
                >
                  Unduh
                </a>
                <button className="chip" onClick={() => step(1)} aria-label="Berikutnya">
                  →
                </button>
                <button className="chip" onClick={() => setOpen(null)} aria-label="Tutup">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
