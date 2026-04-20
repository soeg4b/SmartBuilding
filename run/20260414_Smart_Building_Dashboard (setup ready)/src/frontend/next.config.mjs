/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000/api/v1/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: (process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000').replace(/\/api\/v1$/, '') + '/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
