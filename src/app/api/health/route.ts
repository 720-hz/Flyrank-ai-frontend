import { NextResponse } from "next/server";

export type HealthStatus = {
  status: "ok";
  timestamp: string;
  /**
   * Seconds since this server process started. On a serverless platform
   * (Vercel) this resets on every cold start — it's illustrative of "the
   * process answering this request has been alive for N seconds," not a
   * durable uptime metric. Fine for a placeholder; a later assignment with
   * a real backend should replace this with something that means more.
   */
  uptimeSeconds: number;
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  };
}

export async function GET() {
  return NextResponse.json(getHealthStatus());
}
