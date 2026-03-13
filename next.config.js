const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this to ignore ESLint errors during builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.svgrepo.com",
      },
    ],
  },
  async redirects() {
    const demoVideo =
      process.env.DEMO_VIDEO_URL ||
      "https://www.youtube.com/";
    const pitchDeck =
      process.env.PITCH_DECK_URL ||
      "https://croignite.com";

    return [
      {
        source: "/demo-video",
        destination: demoVideo,
        permanent: false,
      },
      {
        source: "/pitch-deck",
        destination: pitchDeck,
        permanent: false,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "src/lib/shims/asyncStorage.ts"
      ),
    };
    return config;
  },
};

module.exports = nextConfig;
