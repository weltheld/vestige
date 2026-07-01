// Journal and Calendar's own deployments, mounted at /journal and /calendar
// (Next.js Multi-Zones). Server-only — used just to build rewrite destinations.
// Keeping the whole platform on one origin is what lets one magic-link
// sign-in cover web + journal + calendar.
const JOURNAL_ZONE_URL = process.env.JOURNAL_ZONE_URL ?? "http://localhost:3002";
const CALENDAR_ZONE_URL = process.env.CALENDAR_ZONE_URL ?? "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vestige/ui", "@vestige/db", "@vestige/domain"],
  async rewrites() {
    return [
      { source: "/journal", destination: `${JOURNAL_ZONE_URL}/journal` },
      { source: "/journal/:path*", destination: `${JOURNAL_ZONE_URL}/journal/:path*` },
      { source: "/calendar", destination: `${CALENDAR_ZONE_URL}/calendar` },
      { source: "/calendar/:path*", destination: `${CALENDAR_ZONE_URL}/calendar/:path*` },
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
