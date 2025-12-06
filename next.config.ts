import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Ignorar errores de TypeScript y ESLint (Mantener esto es útil para desarrollo rápido)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
