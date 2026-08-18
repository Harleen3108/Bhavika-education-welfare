/**
 * Device position for the admin security log. Client-safe.
 *
 * WHY THIS EXISTS ALONGSIDE THE IP ESTIMATE, not instead of it:
 *
 * The browser's GPS fix is precise — tens of metres — where an IP lookup only
 * reaches a city or the carrier's regional hub. But precision is not the same
 * as trust. These coordinates are supplied by the client, so anyone able to run
 * a script can send whatever they like. The IP-derived estimate comes from the
 * network path and cannot be forged as casually.
 *
 * So the log keeps both: GPS answers "exactly where", the network estimate
 * answers "plausibly where", and a wide disagreement between them is itself
 * worth seeing.
 *
 * Permission is requested, never assumed. A refusal is recorded as a refusal
 * rather than silently producing nothing — "denied" is a fact about the attempt.
 */

export type GpsFix = {
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAccuracy: number | null;
  gpsStatus: string | null;
};

const NONE = (status: string): GpsFix => ({
  gpsLatitude: null,
  gpsLongitude: null,
  gpsAccuracy: null,
  gpsStatus: status,
});

/**
 * Ask the device for a position.
 *
 * Resolves either way and never rejects: a sign-in must not fail because a
 * browser withheld a coordinate. The timeout is deliberately short — an admin
 * waiting on a cold GPS fix would read as a broken login form.
 */
export function captureGps(timeoutMs = 6000): Promise<GpsFix> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(NONE("unsupported"));
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = (fix: GpsFix) => {
      if (!settled) {
        settled = true;
        resolve(fix);
      }
    };

    // A belt-and-braces timer: some browsers hold the permission prompt open
    // indefinitely, and the option below only bounds the fix, not the prompt.
    const timer = setTimeout(() => done(NONE("timeout")), timeoutMs + 500);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        done({
          gpsLatitude: pos.coords.latitude,
          gpsLongitude: pos.coords.longitude,
          gpsAccuracy: Math.round(pos.coords.accuracy),
          gpsStatus: "granted",
        });
      },
      (err) => {
        clearTimeout(timer);
        const status =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.POSITION_UNAVAILABLE
              ? "unavailable"
              : "timeout";
        done(NONE(status));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/** How a fix should read in the admin log. */
export function describeGps(f: {
  gpsAccuracy?: number | null;
  gpsStatus?: string | null;
}): string {
  switch (f.gpsStatus) {
    case "granted":
      return f.gpsAccuracy ? `GPS pin (±${f.gpsAccuracy}m)` : "GPS pin";
    case "denied":
      return "Location permission refused";
    case "unavailable":
      return "Device could not fix a position";
    case "timeout":
      return "Location request timed out";
    case "unsupported":
      return "Browser has no location support";
    default:
      return "No device location";
  }
}
