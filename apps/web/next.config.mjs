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
  // Browser hardening. The CSP deliberately has no script-src: Next's own
  // inline scripts and the theme no-flash script in layout.tsx would need a
  // per-request nonce, and a script-src that blocks them breaks the app.
  // These directives need none and still stop clickjacking, <base>/<form>
  // hijacking and plugin content.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
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
