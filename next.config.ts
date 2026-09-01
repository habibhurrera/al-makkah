import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/**
 * Security headers applied to every response.
 *
 * No Content-Security-Policy yet: Next injects inline scripts for hydration, so
 * a correct CSP needs nonce plumbing through the root layout. Added deliberately
 * in the security-hardening phase rather than shipped in a broken, permissive
 * form that provides false assurance.
 */
const securityHeaders = [
  // Stop MIME sniffing turning an uploaded file into executable script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No framing: blocks clickjacking of the admin area.
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
