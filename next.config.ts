import { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
