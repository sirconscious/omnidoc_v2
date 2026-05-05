import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: "http://localhost:8080/api/:path*",
    },
    {
      source: "/search/:path*",
      destination: "http://localhost:8000/search/:path*",
    },
  ],
  turbopack: {
    root: "/home/mehdi/programing/omnidoc/frontend",
  },
};

export default nextConfig;
