import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.coupleNames,
    short_name: config.coupleNames,
    description: "Kamera sekali pakai digital untuk para tamu.",
    start_url: "/cam",
    display: "standalone",
    background_color: "#14110f",
    theme_color: "#1c1714",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
