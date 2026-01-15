/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fixes Playwright + Next dev proxy "Cross origin request detected" warnings when the app is
  // accessed via 127.0.0.1 in CI/dev.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
