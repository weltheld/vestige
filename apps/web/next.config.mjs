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
    // Calendar's banner uploads send the cropped image AND the original
    // (up to 5MB) to a Server Action in one FormData payload — well past
    // Next's 1MB default body limit.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  // Bridge for old bookmarks and long-lived magic-link emails that point at
  // Calendar's pre-merge bare paths (no /calendar prefix). Ported from the
  // standalone Calendar app; useful once its old domain is pointed at this
  // project. "/" and "/auth/callback" are NOT bridged — this app owns both.
  async redirects() {
    return [
      { source: "/login", destination: "/calendar/login", permanent: false },
      { source: "/home", destination: "/calendar/home", permanent: false },
      { source: "/new", destination: "/calendar/new", permanent: false },
      { source: "/profile", destination: "/calendar/profile", permanent: false },
      { source: "/g/:path*", destination: "/calendar/g/:path*", permanent: false },
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
