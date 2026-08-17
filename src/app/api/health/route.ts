import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness + DB connectivity probe. */
export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ status: "ok", db: "connected", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "degraded", db: "unavailable" }, { status: 503 });
  }
}
