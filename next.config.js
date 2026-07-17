/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // exceljs / jspdf are used only in server routes; keep them external so
  // they are not bundled into the client build.
  experimental: {
    serverComponentsExternalPackages: ["exceljs", "jspdf", "jspdf-autotable"],
  },
};

module.exports = nextConfig;
