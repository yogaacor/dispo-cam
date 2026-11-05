export const config = {
  coupleNames: process.env.NEXT_PUBLIC_COUPLE_NAMES || "Nadhir & Pacare",
  weddingDate: process.env.NEXT_PUBLIC_WEDDING_DATE || "",
  hashtag: process.env.NEXT_PUBLIC_HASHTAG || "",
  shotsPerGuest: Math.max(1, Number(process.env.NEXT_PUBLIC_SHOTS_PER_GUEST) || 27),
  revealAt: process.env.NEXT_PUBLIC_REVEAL_AT || "",
};

export function formatWeddingDate(): string {
  if (!config.weddingDate) return "";
  const d = new Date(config.weddingDate);
  if (Number.isNaN(d.getTime())) return config.weddingDate;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
