// The platform's primary domain, where this app is now mounted at /calendar.
const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vestige-web-pi.vercel.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vestige/db"],
  // Mounted under the Vestige platform's domain at /calendar (Next.js
  // Multi-Zones), so magic-link sign-in is shared across the whole
  // platform. See lib/basePath.ts for the manual-redirect exceptions.
  basePath: "/calendar",
  // Bridge for bookmarks and already-sent magic-link emails, which point at
  // this app's OLD bare paths (no /calendar prefix, this domain). basePath:
  // false on each entry means `source` matches the raw incoming path, not
  // the basePath-prefixed one. Query strings (incl. auth `code`/`next`) are
  // forwarded automatically. Remove once old links have aged out.
  async redirects() {
    const to = (path) => `${PLATFORM_URL}/calendar${path}`;
    const bridge = (source, path) => ({
      source,
      destination: to(path),
      basePath: false,
      permanent: false,
    });
    return [
      bridge("/", ""),
      bridge("/login", "/login"),
      bridge("/home", "/home"),
      bridge("/profile", "/profile"),
      bridge("/new", "/new"),
      bridge("/auth/callback", "/auth/callback"),
      { source: "/g/:path*", destination: to("/g/:path*"), basePath: false, permanent: false },
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
