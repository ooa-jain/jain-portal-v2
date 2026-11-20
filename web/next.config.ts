import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // deploy/deploy.sh builds into a separate folder, then swaps it in, so a
  // failed build never touches the running site.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Excel generation and the MongoDB driver run on the server only.
  serverExternalPackages: ["exceljs", "mongodb", "nodemailer", "unpdf"],
  experimental: {
    // Evidence uploads go through a route handler; actions only carry form JSON.
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
