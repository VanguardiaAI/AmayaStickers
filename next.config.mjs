/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'file.aiquickdraw.com',
      },
    ],
  },
}

export default nextConfig
