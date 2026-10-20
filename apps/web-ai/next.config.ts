
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // Add WAQI API related domains if they serve images you might use, e.g., station photos or map tiles.
      // For now, we are not using images from WAQI directly in the UI.
      // Example:
      // {
      //   protocol: 'https',
      //   hostname: 'tiles.aqicn.org',
      //   port: '',
      //   pathname: '/**',
      // },
    ],
  },
};

export default nextConfig;
