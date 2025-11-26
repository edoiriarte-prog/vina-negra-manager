import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Ignorar errores de TypeScript y ESLint (Mantener esto es útil para desarrollo rápido)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. SOLUCIÓN DEFINITIVA PARA EL ERROR 'fs' (Webpack)
  // Esto le dice al navegador que ignore las librerías de servidor cuando compile.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        perf_hooks: false, 
      };
    }
    return config;
  },
};

export default nextConfig;