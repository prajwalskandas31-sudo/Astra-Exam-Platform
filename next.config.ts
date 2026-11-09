import type { NextConfig } from "next";

const securityHeaders = [
  // Force HTTPS for two years, including subdomains
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // No framing by other sites (clickjacking); the app never embeds itself
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The exam needs fullscreen; nothing needs camera, microphone or location
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), fullscreen=(self)" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Personal data: never cache API responses in shared caches
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
