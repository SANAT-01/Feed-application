/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal, self-contained production output (.next/standalone) — the
  // Docker runtime stage copies just that instead of the whole node_modules.
  //
  // This app lives in an npm workspace, so `next` itself is hoisted to the
  // repo root's node_modules. Next auto-detects the root as wherever the
  // nearest lockfile is (the repo root) and traces/nests standalone output
  // accordingly (.next/standalone/frontend/server.js) — see the Dockerfile
  // for the matching COPY paths. Do NOT pin outputFileTracingRoot to this
  // directory: that hides the hoisted node_modules from the trace and
  // breaks the build ("Could not find the Next.js package").
  output: "standalone",
};

export default nextConfig;
