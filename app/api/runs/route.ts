import { NextResponse } from "next/server";
import { listRuns } from "@/lib/run-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ runs: await listRuns() });
  } catch {
    return NextResponse.json(
      { error: { code: "RUN_LIST_FAILED", message: "Saved runs could not be loaded." } },
      { status: 500 },
    );
  }
}
