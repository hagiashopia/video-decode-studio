/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paket native / bundler Remotion tidak boleh di-bundle oleh Next.
  serverExternalPackages: ["better-sqlite3", "@remotion/bundler", "@remotion/renderer", "esbuild"],
};
export default nextConfig;
