import type { MetadataRoute } from "next";

/** Web app manifest: gives Android/Chrome (add to home screen, install) the RaveSoft mark. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RaveSoft Digital Solutions",
    short_name: "RaveSoft",
    description: "Business software, custom development and AI automation.",
    start_url: "/",
    display: "browser",
    background_color: "#FFFFFF",
    theme_color: "#070B19",
    icons: [
      { src: "/img/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/img/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/img/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
