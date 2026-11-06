export type FilmId = "classic" | "gold" | "superia" | "mono" | "faded" | "party" | "blur";

type RGB = [number, number, number];

export interface Film {
  id: FilmId;
  name: string;
  tagline: string;
  /** Approximation used for the live viewfinder preview. */
  css: string;
  /** Accent colour for the film canister chip. */
  color: string;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  tint: number;
  /** Lifts the blacks (0-255). */
  fade: number;
  shadow: RGB;
  highlight: RGB;
  grain: number;
  vignette: number;
  /** Light leak intensity 0-1. */
  leak: number;
  mono?: boolean;
  /** Soft-focus amount 0-1 (cheap lens / missed focus). */
  blur?: number;
  /** Camera-shake ghost image 0-1. */
  shake?: number;
  /** Built-in soft flash 0-1, applied even when the flash toggle is off. */
  flash?: number;
}

export const FILMS: Film[] = [
  {
    id: "classic",
    name: "Classic 400",
    tagline: "Hangat & kontras, khas kamera sekali pakai",
    css: "contrast(1.12) saturate(1.15) sepia(0.12) brightness(1.03)",
    color: "#e8b923",
    brightness: 1.04,
    contrast: 1.14,
    saturation: 1.12,
    warmth: 10,
    tint: 0,
    fade: 12,
    shadow: [0, 8, 10],
    highlight: [12, 6, -8],
    grain: 22,
    vignette: 0.45,
    leak: 0.25,
  },
  {
    id: "gold",
    name: "Gold 200",
    tagline: "Keemasan, cantik untuk golden hour",
    css: "sepia(0.3) saturate(1.3) contrast(1.05) brightness(1.06) hue-rotate(-8deg)",
    color: "#d9822b",
    brightness: 1.06,
    contrast: 1.06,
    saturation: 1.2,
    warmth: 22,
    tint: 4,
    fade: 16,
    shadow: [10, 4, -6],
    highlight: [18, 10, -14],
    grain: 18,
    vignette: 0.4,
    leak: 0.35,
  },
  {
    id: "superia",
    name: "Superia 400",
    tagline: "Hijau sejuk, warna kulit natural",
    css: "saturate(1.1) contrast(1.08) hue-rotate(6deg) brightness(1.02)",
    color: "#3f8f5a",
    brightness: 1.02,
    contrast: 1.1,
    saturation: 1.08,
    warmth: -4,
    tint: 8,
    fade: 10,
    shadow: [-6, 10, 6],
    highlight: [4, 8, -2],
    grain: 20,
    vignette: 0.4,
    leak: 0.15,
  },
  {
    id: "mono",
    name: "Mono HP5",
    tagline: "Hitam putih berbutir, abadi",
    css: "grayscale(1) contrast(1.3) brightness(1.04)",
    color: "#2a2a2a",
    brightness: 1.04,
    contrast: 1.3,
    saturation: 0,
    warmth: 0,
    tint: 0,
    fade: 14,
    shadow: [0, 0, 0],
    highlight: [0, 0, 0],
    grain: 34,
    vignette: 0.55,
    leak: 0,
    mono: true,
  },
  {
    id: "faded",
    name: "Faded 90s",
    tagline: "Pudar & pastel seperti album lama",
    css: "contrast(0.88) saturate(0.8) brightness(1.1) sepia(0.2)",
    color: "#c98fa6",
    brightness: 1.08,
    contrast: 0.86,
    saturation: 0.78,
    warmth: 8,
    tint: 2,
    fade: 42,
    shadow: [8, 0, 14],
    highlight: [10, 6, 0],
    grain: 16,
    vignette: 0.3,
    leak: 0.3,
  },
  {
    id: "party",
    name: "Party Flash",
    tagline: "Kontras tinggi ala foto pesta malam",
    css: "contrast(1.35) saturate(1.35) brightness(1.08)",
    color: "#d23c3c",
    brightness: 1.08,
    contrast: 1.35,
    saturation: 1.35,
    warmth: 6,
    tint: -2,
    fade: 4,
    shadow: [4, -2, 12],
    highlight: [10, 4, -6],
    grain: 26,
    vignette: 0.6,
    leak: 0.5,
  },
  {
    id: "blur",
    name: "Blur Flash",
    tagline: "Buram, sedikit goyang & kena flash, ala foto pesta jam 1 malam",
    css: "blur(1.6px) brightness(1.14) contrast(1.12) saturate(1.15)",
    color: "#f2e4c4",
    brightness: 1.06,
    contrast: 1.16,
    saturation: 1.12,
    warmth: 8,
    tint: 0,
    fade: 14,
    shadow: [6, 0, 12],
    highlight: [14, 8, -4],
    grain: 24,
    vignette: 0.55,
    leak: 0.3,
    blur: 0.6,
    shake: 0.4,
    flash: 0.22,
  },
];

export function getFilm(id: string | null | undefined): Film {
  return FILMS.find((f) => f.id === id) ?? FILMS[0];
}

/** "'26 11 05" – the classic orange date imprint. */
export function dateStamp(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `'${yy} ${mm} ${dd}`;
}

/**
 * "Develops" whatever is currently drawn on the canvas with the film look:
 * colour grade, faded blacks, vignette, grain, light leak and date stamp.
 */
export function develop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  film: Film,
  opts: { flash: boolean; date: Date; stamp?: boolean }
) {
  if (film.blur || film.shake) soften(ctx, w, h, film.blur ?? 0, film.shake ?? 0);

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const cx = w / 2;
  const cy = h / 2;
  const flashAmt = Math.max(opts.flash ? 0.18 : 0, film.flash ?? 0);
  const vignette = film.vignette + (flashAmt > 0 ? 0.25 : 0);
  const fadeScale = (255 - film.fade) / 255;
  const { brightness: br, contrast: ct, saturation: sat, warmth, tint, fade, grain, mono } = film;
  const [sr, sg, sb] = film.shadow;
  const [hr, hg, hb] = film.highlight;

  for (let y = 0; y < h; y++) {
    const dy = (y - cy) / cy;
    const dy2 = dy * dy;
    let i = y * w * 4;
    for (let x = 0; x < w; x++, i += 4) {
      const dx = (x - cx) / cx;
      const d2 = (dx * dx + dy2) / 2; // 0 at centre, 1 at corners

      // On-camera flash: hot centre that falls off quickly.
      const b = flashAmt > 0 ? br * (1 + flashAmt * Math.max(0, 1 - d2 * 2.5)) : br;

      let r = px[i] * b;
      let g = px[i + 1] * b;
      let bl = px[i + 2] * b;

      r = (r - 128) * ct + 128;
      g = (g - 128) * ct + 128;
      bl = (bl - 128) * ct + 128;

      const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
      if (mono) {
        r = g = bl = lum;
      } else {
        r = lum + (r - lum) * sat + warmth;
        g = lum + (g - lum) * sat + tint;
        bl = lum + (bl - lum) * sat - warmth;
      }

      // Split toning.
      const t = Math.min(1, Math.max(0, lum / 255));
      const s = 1 - t;
      r += sr * s + hr * t;
      g += sg * s + hg * t;
      bl += sb * s + hb * t;

      // Faded blacks.
      r = fade + r * fadeScale;
      g = fade + g * fadeScale;
      bl = fade + bl * fadeScale;

      // Lens vignette.
      const v = 1 - vignette * d2 * (0.35 + 0.65 * d2);
      r *= v;
      g *= v;
      bl *= v;

      // Film grain (luminance noise, stronger in the shadows).
      const n = (Math.random() - 0.5) * grain * (1.2 - t * 0.5);
      px[i] = r + n;
      px[i + 1] = g + n;
      px[i + 2] = bl + n;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (film.leak > 0) drawLightLeak(ctx, w, h, film.leak);
  if (opts.stamp !== false) drawDateStamp(ctx, w, h, opts.date);
}

/**
 * Camera shake (a faint offset double image), soft focus and a gentle highlight
 * bloom. Blur is done by down- and up-scaling, which works in every browser
 * (iOS Safari ignores ctx.filter).
 */
function soften(ctx: CanvasRenderingContext2D, w: number, h: number, blur: number, shake: number) {
  const copy = document.createElement("canvas");
  copy.width = w;
  copy.height = h;
  const cctx = copy.getContext("2d");
  if (!cctx) return;
  cctx.drawImage(ctx.canvas, 0, 0);

  ctx.save();
  if (shake > 0) {
    const angle = Math.random() * Math.PI * 2;
    const dist = w * (0.012 + Math.random() * 0.02) * shake;
    ctx.globalAlpha = 0.35 * shake + 0.15;
    ctx.drawImage(copy, Math.cos(angle) * dist, Math.sin(angle) * dist);
    ctx.globalAlpha = 0.2 * shake;
    ctx.drawImage(copy, Math.cos(angle) * dist * 2, Math.sin(angle) * dist * 2);
  }

  if (blur > 0) {
    const sw = Math.max(1, Math.round(w / 10));
    const sh = Math.max(1, Math.round(h / 10));
    const small = document.createElement("canvas");
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext("2d");
    if (sctx) {
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(ctx.canvas, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // Soft focus.
      ctx.globalAlpha = 0.75 * blur;
      ctx.drawImage(small, 0, 0, w, h);
      // Bloom: highlights glow like a cheap flash on a plastic lens.
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.3 * blur;
      ctx.drawImage(small, 0, 0, w, h);
    }
  }
  ctx.restore();
}

function drawLightLeak(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) {
  // Not every frame gets a leak – just like real film.
  if (Math.random() > 0.35 + intensity) return;
  const strength = intensity * (0.5 + Math.random() * 0.5);
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -w * 0.1 : w * 1.1;
  const y = h * (0.15 + Math.random() * 0.7);
  const radius = w * (0.5 + Math.random() * 0.5);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255,120,40,${0.85 * strength})`);
  g.addColorStop(0.35, `rgba(255,70,30,${0.45 * strength})`);
  g.addColorStop(0.7, `rgba(255,180,90,${0.12 * strength})`);
  g.addColorStop(1, "rgba(255,180,90,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Thin vertical streak, like a gap in the film door.
  const sx = fromLeft ? w * (0.02 + Math.random() * 0.1) : w * (0.88 + Math.random() * 0.1);
  const streak = ctx.createLinearGradient(sx - w * 0.06, 0, sx + w * 0.06, 0);
  streak.addColorStop(0, "rgba(255,90,40,0)");
  streak.addColorStop(0.5, `rgba(255,150,70,${0.35 * strength})`);
  streak.addColorStop(1, "rgba(255,90,40,0)");
  ctx.fillStyle = streak;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawDateStamp(ctx: CanvasRenderingContext2D, w: number, h: number, date: Date) {
  const text = dateStamp(date);
  const size = Math.round(w * 0.045);
  ctx.save();
  ctx.font = `bold ${size}px "Courier New", Courier, monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  const x = w - w * 0.07;
  const y = h - h * 0.05;
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = "rgba(255,80,0,0.9)";
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = "rgba(255,140,40,0.9)";
  ctx.fillText(text, x, y);
  ctx.shadowBlur = size * 0.15;
  ctx.fillStyle = "rgba(255,190,90,0.85)";
  ctx.fillText(text, x, y);
  ctx.restore();
}
