import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Declare packages that should only be used server-side.
   * This prevents them from being bundled into client code.
   */
  serverExternalPackages: ["@libsql/client", "firebase-admin"],
};

export default nextConfig;
