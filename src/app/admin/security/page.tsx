import type { Metadata } from "next";
import { ShieldAlert, ShieldCheck, Globe, Lock, MapPin } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { UnlockButton } from "@/components/admin/UnlockButton";
import {
  getSecurityOverview,
  LOCKOUT_LADDER,
  MAX_FAILURES,
  MAX_FAILURES_MEMBER,
} from "@/server/services/admin-security.service";
import { formatDateTime } from "@/lib/utils";
import { describeGps } from "@/lib/geolocate";

export const metadata: Metadata = {
  title: "Security",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const { attempts, locks, counts } = await getSecurityOverview();

  return (
    <>
      <PageHeader
        title="Security"
        description="Sign-in attempts, lockouts and where they came from."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Failed sign-ins (24h)" value={counts.failures24h} icon={<ShieldAlert size={20} />} />
        <StatCard label="Flagged as VPN (24h)" value={counts.vpn24h} icon={<Globe size={20} />} />
        <StatCard label="Distinct addresses (24h)" value={counts.distinctIps24h} icon={<MapPin size={20} />} />
      </div>

      {/* Active lockouts */}
      <Card className="mt-6">
        <CardBody>
          <CardTitle>Locked accounts</CardTitle>
          <p className="mt-1 text-sm text-ink-500">
            {MAX_FAILURES} failed attempts locks an admin account, {MAX_FAILURES_MEMBER} a
            member account. Each further round lasts twice as long —{" "}
            {LOCKOUT_LADDER.join(", ")} minutes — and the level only resets on a
            successful sign-in. Members get more rope on purpose: anyone who knows an
            address can burn another person&apos;s attempts, so a tight limit there
            locks a child out rather than an attacker.
          </p>

          {locks.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">
              No account is locked or has failed attempts on record.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {locks.map((l) => (
                <li
                  key={l.email}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium wrap-anywhere text-ink-900">
                      {l.email}
                      {l.lockedUntil ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <Lock size={11} /> Locked · {l.minutesRemaining}m left
                        </span>
                      ) : (
                        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-600">
                          {l.failedCount}/{MAX_FAILURES} failures
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Lockout level {l.level}
                      {l.lastIp ? ` · last from ${l.lastIp}` : ""}
                      {l.lastFailedAt ? ` · ${formatDateTime(l.lastFailedAt)}` : ""}
                    </p>
                  </div>
                  <UnlockButton email={l.email} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Attempt log */}
      <Card className="mt-6">
        <CardBody>
          <CardTitle>Recent sign-in attempts</CardTitle>
          <p className="mt-1 text-sm text-ink-500">
            Two readings per attempt, deliberately kept apart. The <strong>GPS pin</strong>
            is metres-accurate but comes from the browser, so it can be forged and only
            exists when the person allowed it. The <strong>network estimate</strong> is
            only city-accurate but comes from the connection itself. Trust neither alone —
            it is the disagreement between them that is worth investigating. A VPN flag
            means the address belongs to a hosting network: a reason to look closer,
            not proof.
          </p>

          {attempts.length === 0 ? (
            <EmptyState
              className="mt-4 border-0"
              icon={<ShieldCheck size={34} />}
              title="Nothing logged yet"
              description="Admin sign-in attempts will appear here."
            />
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {attempts.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <span
                    aria-hidden
                    className={
                      a.success
                        ? "mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"
                        : "mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
                    }
                  >
                    {a.success ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium wrap-anywhere text-ink-900">
                      {a.email}
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-ink-600 uppercase">
                        {a.stage}
                      </span>
                      {a.vpnSuspected && (
                        <span
                          title={a.vpnReason ?? undefined}
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-amber-700 uppercase"
                        >
                          VPN?
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs wrap-anywhere text-ink-600">
                      {a.success ? "Signed in" : (a.reason ?? "Failed")} · {a.ip} ·{" "}
                      {a.location}
                      {a.org ? ` · ${a.org}` : ""}
                    </p>
                    {/*
                      Both readings are shown, never merged. The GPS pin is
                      precise but client-supplied and therefore forgeable; the
                      network estimate is coarse but comes from the connection
                      itself. Disagreement between them is the signal.
                    */}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {a.gpsStatus === "granted" &&
                      a.gpsLatitude !== null &&
                      a.gpsLongitude !== null ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${a.gpsLatitude}&mlon=${a.gpsLongitude}#map=17/${a.gpsLatitude}/${a.gpsLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 font-semibold text-accent-700 hover:bg-accent-100"
                        >
                          <MapPin size={11} /> {describeGps(a)} →
                        </a>
                      ) : (
                        <span className="text-ink-400">{describeGps(a)}</span>
                      )}

                      {a.latitude !== null && a.longitude !== null && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${a.latitude}&mlon=${a.longitude}#map=11/${a.latitude}/${a.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand-700 hover:text-brand-800"
                        >
                          Network estimate →
                        </a>
                      )}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-ink-400">
                    {formatDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
