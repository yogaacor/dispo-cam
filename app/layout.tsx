import type { Metadata, Viewport } from "next";
import { Caveat, Space_Mono, Fraunces } from "next/font/google";
import { config } from "@/lib/config";
import "./globals.css";

const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });
const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-hand" });
const serif = Fraunces({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: `Kamera ${config.coupleNames}`,
  description: "Kamera sekali pakai digital untuk para tamu. Jepret, dan biarkan filmnya dicuci.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1714",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${mono.variable} ${hand.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
