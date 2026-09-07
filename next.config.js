/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...any existing settings you already have...
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
      "/api/reports/daily": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
};

module.exports = nextConfig;