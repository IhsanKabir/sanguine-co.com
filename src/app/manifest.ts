import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sanguine",
    short_name: "Sanguine",
    description: "Considered gifts from Dhaka.",
    start_url: "/en",
    display: "standalone",
    background_color: "#fdfbf7",
    theme_color: "#0e2b3d",
    // The logo's round mark, S over স across the gold line (made in brand/).
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
