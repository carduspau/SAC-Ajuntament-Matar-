/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['leaflet', 'react-leaflet', 'leaflet.markercluster'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
