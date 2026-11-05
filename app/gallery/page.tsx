"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { config } from "@/lib/config";
import { getFilm } from "@/lib/film";
import { getSupabase, isSupabaseConfigured, photoUrl, type PhotoRow } from "@/lib/supabase";

const PAGE = 1000;

function parseTime(value: string): number {
  const t = value ? new Date(value).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

const pad = (n: number) => String(n).padStart(2, "0");

function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d > 0 ? `${d} hari ` : ""}${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

/** "Jam Menit Tersisa" until the event ends. */
function timeLeft(end: number, now: number | null): string {
  if (!end || now === null) return "--:--";
  const ms = end - now;
  if (ms <= 0) return "Selesai";
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin >= 48 * 60) return `${Math.floor(totalMin / 1440)} hari`;
  return `${pad(Math.floor(totalMin / 60))}:${pad(totalMin % 60)}`;
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 10.5 3.5h3a1.5 1.5 0 0 1 1.2.7L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function GalleryPage() {
  const revealAt = useMemo(() => parseTime(config.revealAt), []);
  const eventEnd = useMemo(() => parseTime(config.eventEnd), []);
  const [now, setNow] = useState<number | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
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
    if (!revealAt && !eventEnd) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [revealAt, eventEnd]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
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
        if (!cancelled) setPhotos(all);
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
  }, []);

  // Live updates as guests shoot.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    const channel = sb
      .channel("photos-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos" }, (payload) => {
        const row = payload.new as PhotoRow;
        setPhotos((p) => (p.some((x) => x.id === row.id) ? p : [row, ...p]));
      })
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, []);

  const guests = useMemo(
    () => new Set(photos.map((p) => p.guest_name.trim().toLowerCase())).size,
    [photos]
  );

  const visible = useMemo(
    () => (onlyMine ? photos.filter((p) => p.guest_name === me) : photos),
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
  const stat = (n: number) => (loading ? "–" : n.toLocaleString("id-ID"));

  return (
    <main className="gallery">
      <header className="g-head">
        <h1 className="g-title">
          {config.galleryTitle}
          <span className="g-couple">{config.coupleNames}</span>
        </h1>
      </header>

      <section className="g-stats" aria-label="Ringkasan">
        <div className="g-stat">
          <span className="g-stat-num">{stat(photos.length)}</span>
          <span className="g-stat-label">Momen</span>
        </div>
        <div className="g-stat">
          <span className="g-stat-num">{timeLeft(eventEnd, now)}</span>
          <span className="g-stat-label">{eventEnd && now !== null && now >= eventEnd ? "Acara" : "Tersisa"}</span>
        </div>
        <div className="g-stat">
          <span className="g-stat-num">{stat(guests)}</span>
          <span className="g-stat-label">Orang</span>
        </div>
      </section>

      <nav className="g-actions">
        <div className="g-toggle" role="tablist" aria-label="Filter foto">
          <button
            role="tab"
            aria-selected={onlyMine}
            className={onlyMine ? "active" : ""}
            onClick={() => setOnlyMine(true)}
            disabled={!me}
            title={me ? undefined : "Ambil foto dulu untuk melihat foto kamu"}
          >
            Foto Saya
          </button>
          <button role="tab" aria-selected={!onlyMine} className={!onlyMine ? "active" : ""} onClick={() => setOnlyMine(false)}>
            Semua
          </button>
        </div>
        <Link href="/cam" className="g-cam">
          <CameraIcon />
          Buka Kamera
        </Link>
      </nav>

      {error && <p className="error center">{error}</p>}

      {locked && now !== null ? (
        <section className="darkroom">
          <div className="darkroom-light" />
          <h2>Film sedang dicuci di kamar gelap</h2>
          <p>Galeri terbuka dalam</p>
          <p className="darkroom-time">{countdown(revealAt - now)}</p>
          <p className="muted">Sabar ya, seperti kamera film sungguhan.</p>
        </section>
      ) : loading ? (
        <section className="g-grid" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="g-card g-skeleton" />
          ))}
        </section>
      ) : visible.length === 0 && !error ? (
        <p className="g-empty">
          {onlyMine ? "Kamu belum mengambil foto." : "Belum ada foto. Jadilah yang pertama!"}
        </p>
      ) : (
        <section className="g-grid">
          {visible.map((p, i) => (
            <button key={p.id} className="g-card" onClick={() => setOpen(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.storage_path)} alt={`Foto oleh ${p.guest_name}`} loading="lazy" />
              <span className="g-name">{p.guest_name}</span>
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
