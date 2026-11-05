"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { config, formatWeddingDate } from "@/lib/config";

export default function QrPage() {
  const [target, setTarget] = useState("");
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    setTarget(`${window.location.origin}/cam`);
  }, []);

  useEffect(() => {
    if (!target) return;
    QRCode.toDataURL(target, {
      width: 900,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#2b2118", light: "#fffaf0" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [target]);

  const date = formatWeddingDate();

  return (
    <main className="paper qr-page">
      <div className="qr-tools no-print">
        <label className="muted" htmlFor="qr-url">
          Link tujuan QR
        </label>
        <input id="qr-url" className="input" value={target} onChange={(e) => setTarget(e.target.value)} />
        <div className="row">
          <button className="btn btn-primary" onClick={() => window.print()}>
            Cetak
          </button>
          {dataUrl && (
            <a className="btn" href={dataUrl} download="qr-kamera-nikahan.png">
              Unduh PNG
            </a>
          )}
        </div>
      </div>

      <article className="qr-card">
        <p className="eyebrow">Kamera sekali pakai</p>
        <h1 className="couple">{config.coupleNames}</h1>
        {date && <p className="muted">{date}</p>}
        <div className="qr-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {dataUrl ? <img src={dataUrl} alt="Kode QR kamera" /> : <div className="qr-placeholder" />}
        </div>
        <p className="qr-cta">Scan, jepret, abadikan!</p>
        <p className="muted small">
          Kamu punya {config.shotsPerGuest} jepretan. Fotonya akan dicuci &amp; dibagikan oleh pengantin.
        </p>
        {config.hashtag && <p className="hashtag">{config.hashtag}</p>}
      </article>
    </main>
  );
}
