import { NextResponse } from "next/server";
import { loadRun } from "@/lib/run-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await context.params;
    return NextResponse.json(await loadRun(runId));
  } catch {
    return NextResponse.json(
      { error: { code: "RUN_NOT_FOUND", message: "That saved run could not be found." } },
      { status: 404 },
    );
  }
}
