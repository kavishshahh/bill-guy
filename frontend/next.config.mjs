/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy /api/* from the Next.js dev/edge server to the Flask backend so the
    // browser never has to make a cross-origin request (the Flask app does not
    // currently install flask-cors). Override BACKEND_URL via .env.local.
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
