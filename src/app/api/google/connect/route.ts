import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { googleConfig } from "@/lib/workspace/google-auth";
import { requireWorkspace, apiError } from "@/lib/workspace/server";
export async function GET() {
  try {
    const auth = await requireWorkspace(); const config = googleConfig();
    const state = randomBytes(32).toString("hex");
    (await cookies()).set("google-oauth-state", `${state}:${auth.tenantId}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/api/google" });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: "https://www.googleapis.com/auth/spreadsheets.readonly", access_type: "offline", prompt: "consent", state }).toString();
    return NextResponse.redirect(url);
  } catch (error) { return apiError(error); }
}
