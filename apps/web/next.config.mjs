// The Journal module's own deployment, mounted at /journal (Next.js
// Multi-Zones). Server-only — used just to build the rewrite destination.
const JOURNAL_ZONE_URL = process.env.JOURNAL_ZONE_URL ?? "http://localhost:3002";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vestige/ui", "@vestige/db", "@vestige/domain"],
  async rewrites() {
    return [
      { source: "/journal", destination: `${JOURNAL_ZONE_URL}/journal` },
      { source: "/journal/:path*", destination: `${JOURNAL_ZONE_URL}/journal/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
