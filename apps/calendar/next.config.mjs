/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vestige/db"],
  // Mounted under the Vestige platform's domain at /calendar (Next.js
  // Multi-Zones), so magic-link sign-in is shared across the whole
  // platform. See lib/basePath.ts for the manual-redirect exceptions.
  basePath: "/calendar",
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
