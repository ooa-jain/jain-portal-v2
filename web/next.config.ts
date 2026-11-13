import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Excel generation and the MongoDB driver run on the server only.
  serverExternalPackages: ["exceljs", "mongodb", "nodemailer"],
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
