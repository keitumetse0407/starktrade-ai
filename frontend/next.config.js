/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://185.167.97.193:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
