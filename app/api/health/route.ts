import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await checkDatabaseConnection();
    return NextResponse.json({
      ok: true,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
      db: "up",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
        db: "down",
      },
      { status: 503 }
    );
  }
}
