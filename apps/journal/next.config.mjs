/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Mounted under apps/web at /journal via Next.js Multi-Zones (see
  // apps/web/next.config.mjs rewrites). This makes the Supabase auth cookie
  // — scoped to whichever domain the browser actually visits — shared
  // between web and journal, since the browser only ever sees web's domain.
  basePath: "/journal",
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
