import "server-only";

/**
 * Where a request came from, and whether that origin looks anonymised.
 *
 * TWO HONEST LIMITS, because the admin UI must not overstate either:
 *
 * 1. LOCATION IS APPROXIMATE. IP geolocation resolves to a city at best, and
 *    frequently to the carrier's regional hub instead — Indian mobile networks
 *    routinely place a handset in a different state. It is useful for spotting
 *    "this login came from another country", never for "who was at this
 *    address". Exact positioning would need browser geolocation, which any
 *    attacker simply declines.
 *
 * 2. VPN DETECTION IS A HEURISTIC. `vpnSuspected` means the address belongs to
 *    a network that hosts servers rather than homes, which is how most
 *    commercial VPNs and scrapers appear. It will not see a residential proxy,
 *    and it will occasionally flag a legitimate corporate or cloud-desktop
 *    user. Treat it as a reason to look closer, never as proof.
 */

export type IpIntel = {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  asn: string | null;
  org: string | null;
  vpnSuspected: boolean;
  vpnReason: string | null;
};

const EMPTY: IpIntel = {
  country: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
  asn: null,
  org: null,
  vpnSuspected: false,
  vpnReason: null,
};

const num = (v: string | null): number | null => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const dec = (v: string | null): string | null => {
  if (!v) return null;
  // Vercel percent-encodes city names that contain non-ASCII characters.
  try {
    return decodeURIComponent(v) || null;
  } catch {
    return v;
  }
};

/**
 * Words that appear in the network operator's name when the address belongs to
 * a datacentre rather than a household. Matched case-insensitively against the
 * org string, so "DigitalOcean, LLC" and "M247 Europe SRL" both land.
 */
const HOSTING_MARKERS = [
  "amazon", "aws", "google", "microsoft", "azure", "digitalocean", "linode",
  "akamai", "cloudflare", "fastly", "ovh", "hetzner", "contabo", "vultr",
  "scaleway", "leaseweb", "m247", "datacamp", "choopa", "hostinger",
  "godaddy", "namecheap", "oracle", "alibaba", "tencent",
  "hosting", "datacenter", "data center", "server", "colo", "cloud",
  "vpn", "proxy", "tor exit", "private internet", "nordvpn", "expressvpn",
  "surfshark", "mullvad", "cyberghost",
];

function inspectOrg(org: string | null): { vpnSuspected: boolean; vpnReason: string | null } {
  if (!org) return { vpnSuspected: false, vpnReason: null };
  const hay = org.toLowerCase();
  const hit = HOSTING_MARKERS.find((m) => hay.includes(m));
  return hit
    ? { vpnSuspected: true, vpnReason: `Network operator looks like hosting or VPN infrastructure ("${org}")` }
    : { vpnSuspected: false, vpnReason: null };
}

/**
 * Read the edge network's geo headers. Free and instant on Vercel, absent
 * locally — which is why every field is nullable and nothing here throws.
 */
function fromEdgeHeaders(req: Request): IpIntel {
  const h = req.headers;
  const org = h.get("x-vercel-ip-asn-org") ?? null;
  const { vpnSuspected, vpnReason } = inspectOrg(org);

  return {
    country: h.get("x-vercel-ip-country") ?? null,
    region: dec(h.get("x-vercel-ip-country-region")),
    city: dec(h.get("x-vercel-ip-city")),
    latitude: num(h.get("x-vercel-ip-latitude")),
    longitude: num(h.get("x-vercel-ip-longitude")),
    asn: h.get("x-vercel-ip-asn") ?? null,
    org,
    vpnSuspected,
    vpnReason,
  };
}

/** True for addresses that carry no useful location at all. */
function isLocalAddress(ip: string): boolean {
  return (
    ip === "0.0.0.0" ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.")
  );
}

/**
 * Best-effort intelligence for an address.
 *
 * Falls back to a free lookup when the edge headers are absent — which is the
 * case in local development and on any host that is not Vercel. The lookup is
 * given a short timeout and never throws: a sign-in must not fail, or hang,
 * because a third-party enrichment service is slow.
 */
export async function lookupIpIntel(req: Request, ip: string): Promise<IpIntel> {
  const edge = fromEdgeHeaders(req);
  if (edge.country || edge.city) return edge;
  if (isLocalAddress(ip)) return { ...EMPTY, org: "Local network", vpnReason: null };

  try {
    const res = await fetch(
      `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
      { signal: AbortSignal.timeout(2500), headers: { accept: "application/json" } },
    );
    if (!res.ok) return edge;

    const j = (await res.json()) as Record<string, unknown>;
    const org = (j.org as string) ?? (j.asn as string) ?? null;
    const { vpnSuspected, vpnReason } = inspectOrg(org);

    return {
      country: (j.country_name as string) ?? (j.country as string) ?? null,
      region: (j.region as string) ?? null,
      city: (j.city as string) ?? null,
      latitude: typeof j.latitude === "number" ? j.latitude : null,
      longitude: typeof j.longitude === "number" ? j.longitude : null,
      asn: (j.asn as string) ?? null,
      org,
      vpnSuspected,
      vpnReason,
    };
  } catch {
    // Timeout, rate limit, or the service being down. The attempt is still
    // logged, just without enrichment.
    return edge;
  }
}

/** Human summary for the admin log. Never claims more precision than it has. */
export function describeLocation(i: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  const parts = [i.city, i.region, i.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown location";
}
