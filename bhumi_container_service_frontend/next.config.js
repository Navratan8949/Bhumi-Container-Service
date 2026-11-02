/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://localhost:8000/uploads/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/vehicle-documents",
        destination: "/vehicles",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
