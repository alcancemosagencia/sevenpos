import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SevenPOS",
    short_name: "SevenPOS",
    description: "POS SaaS moderno para bodegas, minimarkets y retail.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f3f5f8",
    theme_color: "#2563eb",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
      { src: "/icons/maskable-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Caja POS", short_name: "POS", url: "/pos", icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }] },
      { name: "Preventa", short_name: "Preventa", url: "/pre-sales", icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }] },
    ],
  };
}
