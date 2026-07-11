// Calendar's own deployment, still mounted at /calendar via Multi-Zones
// (Journal now lives in this app natively under app/journal/). Server-only —
// used just to build rewrite destinations.
const CALENDAR_ZONE_URL = process.env.CALENDAR_ZONE_URL ?? "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vestige/ui", "@vestige/db", "@vestige/domain"],
  // Every route here is dynamically rendered (auth-gated), and Next 15
  // defaults the client router cache to 0s for dynamic pages — so each
  // back/forward or revisit refetches everything and shows a loader.
  // 30s makes recently-visited pages render instantly from cache; mutations
  // still update immediately because router.refresh() bypasses it.
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
  async rewrites() {
    return [
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
