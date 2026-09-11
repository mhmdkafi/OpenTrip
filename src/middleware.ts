import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};