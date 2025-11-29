/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  turbopack: {},
  webpack: (config) => {
    config.module.rules.push({
      test: /\.geojson$/,
      type: 'json',
    })
    return config
  }
}

module.exports = nextConfig