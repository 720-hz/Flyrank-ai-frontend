/**
 * Builds the absolute origin for self-fetching this app's own API routes
 * from a Server Component (fetch always needs an absolute URL — there's no
 * document base URL to resolve a relative one against on the server).
 * `host` is a `host` header value (e.g. "localhost:3000" or
 * "my-app.vercel.app"); localhost/127.0.0.1 get http, everything else
 * (including Vercel preview/production domains) gets https.
 */
export function buildRequestOrigin(host: string): string {
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  return `${protocol}://${host}`;
}
