import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Forced restart for prisma update
  reactCompiler: true,
};

export default nextConfig;
