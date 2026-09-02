/**
 * Content-Security-Policy.
 *
 * Built per request in src/proxy.ts because the script policy is nonce-based:
 * every response carries a fresh, unguessable nonce, and only scripts stamped
 * with it may run. That is what turns an injected <script> - or an injected
 * src pointing at an attacker's host - into a blocked request rather than
 * code execution.
 *
 * Two deliberate loosenings, both documented rather than hidden:
 *
 * 1. `style-src` keeps 'unsafe-inline'. React writes inline style attributes
 *    during server rendering, and a style attribute cannot carry a nonce. The
 *    alternative is a policy that breaks the site on the first inline style
 *    anyone adds, which is worse than an honest exception. Injected CSS is a
 *    far weaker primitive than injected script.
 *
 * 2. `img-src` allows the map tile host and the project's own Supabase host.
 *    Both are single, named origins - not a wildcard.
 */

type CspOptions = {
  nonce: string;
  isDevelopment: boolean;
};

/**
 * Map tiles. Must match the provider in components/property/property-map.tsx -
 * changing one without the other shows an empty grey map.
 */
const TILE_HOSTS = ['https://tile.openstreetmap.org'];

/** The project's own Supabase origin, or nothing if it is not configured. */
function supabaseOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
}: CspOptions): string {
  const supabase = supabaseOrigin();
  const supabaseWebSocket = supabase ? supabase.replace(/^https:/, 'wss:') : null;

  const directives: Array<[string, Array<string | null | false>]> = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      [
        "'self'",
        `'nonce-${nonce}'`,
        // Next loads its chunks from a script that already carries the nonce;
        // strict-dynamic lets those load without listing every filename.
        "'strict-dynamic'",
        // React rebuilds server stack traces in the browser with eval during
        // development only. Production needs no eval from React or Next.
        isDevelopment && "'unsafe-eval'",
      ],
    ],
    // See note 1 above.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    [
      'img-src',
      [
        "'self'",
        // blob:/data: cover Next's image placeholders and client-side previews
        // of a file the admin has selected but not yet uploaded.
        'blob:',
        'data:',
        supabase,
        ...TILE_HOSTS,
      ],
    ],
    ['media-src', ["'self'", 'blob:', supabase]],
    ['font-src', ["'self'", 'data:']],
    [
      'connect-src',
      [
        "'self'",
        supabase,
        supabaseWebSocket,
        // The dev server's hot-reload socket.
        isDevelopment && 'ws:',
        isDevelopment && 'http://localhost:*',
      ],
    ],
    ['worker-src', ["'self'", 'blob:']],
    // Nothing on this site embeds a third-party frame, and nothing may embed
    // this site - frame-ancestors is the modern X-Frame-Options.
    ['frame-src', ["'none'"]],
    ['frame-ancestors', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    // Forms post to this origin only. Stops an injected form exfiltrating a
    // lead - or an admin's input - to somewhere else.
    ['form-action', ["'self'"]],
  ];

  const policy = directives
    .map(([name, values]) => {
      const allowed = values.filter((value): value is string => Boolean(value));
      return `${name} ${allowed.join(' ')}`;
    })
    .join('; ');

  // Only in production: locally the dev server is plain http and upgrading
  // would make every request fail.
  return isDevelopment ? policy : `${policy}; upgrade-insecure-requests`;
}

/**
 * A fresh nonce per response.
 *
 * Uses the Web Crypto API rather than node:crypto so it runs unchanged in the
 * proxy runtime.
 */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
