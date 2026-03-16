/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@excalidraw/excalidraw"],
  outputFileTracingIncludes: {},
  webpack: (config, { isServer }) => {
    // Excalidraw uses canvas & other browser APIs that don't exist on the server
    if (isServer) {
      config.resolve.alias.canvas = false;
      config.resolve.alias.jsdom = false;
    }

    config.resolve.alias.canvas = false;

    // Suppress critical dependency warnings from Excalidraw
    config.module.exprContextCritical = false;

    return config;
  },
};

module.exports = nextConfig;