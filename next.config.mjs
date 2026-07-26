import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No ESLint config in this project yet; type safety is enforced via `tsc --noEmit`.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // next-auth ships `preact` (for its standalone build). During SSG prerender webpack can
    // resolve `preact` in place of `react`, producing a second React without `preload`
    // (TypeError: r.default.preload is not a function) and "Invalid hook call". We don't use
    // the standalone build, so disable the preact alias entirely.
    config.resolve.alias = {
      ...config.resolve.alias,
      preact: false,
    };
    return config;
  },
};

export default nextConfig;
