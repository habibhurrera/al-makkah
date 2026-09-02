import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/**
 * Static security headers.
 *
 * The Content-Security-Policy is NOT here: it carries a per-request nonce, so
 * it is built in src/middleware.ts from src/lib/security/csp.ts. Everything in
 * this list is the same on every response and belongs in the static config.
 */
const securityHeaders = [
  // Stop MIME sniffing turning an uploaded file into executable script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No framing: blocks clickjacking of the admin area. Superseded by the CSP's
  // frame-ancestors, kept for browsers that predate it.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs these device APIs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // HTTPS only, once the domain is live. Vercel serves HTTPS by default.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // sharp is a native module: bundling it would break the thumbnail generator
  // in src/lib/images.ts on the server.
  serverExternalPackages: ["sharp"],
  images: {
    // Only property media from our own Supabase project may be optimised.
    // Without this allowlist the image optimiser can be pointed at any host.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
