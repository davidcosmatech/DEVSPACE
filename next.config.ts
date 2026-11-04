import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async redirects() {
    return [
      { source: "/private", destination: "/github", permanent: false },
      { source: "/repositories", destination: "/github", permanent: false },
      { source: "/repos", destination: "/github", permanent: false },
      { source: "/home", destination: "/dashboard", permanent: false },
      { source: "/workspace", destination: "/workspaces", permanent: false },
      { source: "/project", destination: "/projects", permanent: false },
      { source: "/note", destination: "/notes", permanent: false },
      { source: "/file", destination: "/files", permanent: false },
      { source: "/markdown", destination: "/tracker", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
