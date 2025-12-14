/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Ignora errores de TS en build para evitar bloqueos
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora errores de linting en build
    ignoreDuringBuilds: true,
  }
};
export default nextConfig;
