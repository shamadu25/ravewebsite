import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
