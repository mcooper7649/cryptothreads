/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Native deps used by the render pipeline must not be bundled.
    serverComponentsExternalPackages: ["@resvg/resvg-js", "sharp"],
    // Ensure bundled fonts are traced into the serverless output on Vercel.
    outputFileTracingIncludes: {
      "/api/**": ["./src/assets/fonts/**"],
    },
  },
};

export default nextConfig;
