import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1 year for static images
  },
  async headers() {
    return [
      {
        // Public image assets under /img/
        source: "/img/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Next.js built static chunks (JS/CSS) — already immutable by default, this reinforces
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Old website URL → new URL (301 permanent)
      { source: "/contacts", destination: "/contact", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/portfolio", destination: "/case-studies", permanent: true },
      { source: "/our-services", destination: "/services", permanent: true },
      { source: "/blog-post/:slug", destination: "/blog/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
