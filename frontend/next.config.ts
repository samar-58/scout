import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * The dev tools badge defaults to the bottom-left corner, which is exactly
   * where the workspace sidebar keeps the account row — it sat on top of the
   * avatar and name. Development-only setting; it has no effect on a build.
   */
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
