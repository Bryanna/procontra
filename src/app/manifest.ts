import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PROCONTRA · Farmacia La Línea",
    short_name: "PROCONTRA",
    description: "Continuidad de tratamiento e inventario de Farmacia La Línea.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f7f8",
    theme_color: "#0e667d",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/brand/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/logo-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
