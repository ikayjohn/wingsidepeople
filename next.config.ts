import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
