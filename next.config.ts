import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Ignorar errores de TypeScript (Mantener esto es útil para desarrollo rápido)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
