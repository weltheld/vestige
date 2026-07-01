/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Mounted under apps/web at /journal via Next.js Multi-Zones (see
  // apps/web/next.config.mjs rewrites). This makes the Supabase auth cookie
  // — scoped to whichever domain the browser actually visits — shared
  // between web and journal, since the browser only ever sees web's domain.
  basePath: "/journal",
  transpilePackages: ["@vestige/ui", "@vestige/db", "@vestige/domain"],
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
