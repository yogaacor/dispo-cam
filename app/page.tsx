import Link from "next/link";
import { config, formatWeddingDate } from "@/lib/config";

export default function Home() {
  const date = formatWeddingDate();
  return (
    <main className="paper home">
      <div className="home-card">
        <p className="eyebrow">Kamera sekali pakai untuk tamu</p>
        <h1 className="couple">{config.coupleNames}</h1>
        {date && <p className="muted">{date}</p>}
        <p className="lead">
          Setiap tamu dapat <b>{config.shotsPerGuest} jepretan</b>. Tidak ada preview, tidak ada
          hapus, persis seperti kamera film sungguhan. Foto akan &ldquo;dicuci&rdquo; dan muncul di galeri.
        </p>
        <div className="stack">
          <Link className="btn btn-primary" href="/cam">
            Buka Kamera
          </Link>
          <Link className="btn" href="/gallery">
            Lihat Galeri
          </Link>
          <Link className="btn btn-ghost" href="/qr">
            Cetak Kode QR
          </Link>
        </div>
        {config.hashtag && <p className="hashtag">{config.hashtag}</p>}
      </div>
    </main>
  );
}
