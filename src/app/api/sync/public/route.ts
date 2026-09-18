import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readPublicSheet } from "@/lib/workspace/public-sheet";
import { apiError } from "@/lib/workspace/server";
export async function POST(request:NextRequest) {
  try {
    const {spreadsheetUrl}=z.object({spreadsheetUrl:z.url().max(1000)}).parse(await request.json());
    return NextResponse.json(await readPublicSheet(spreadsheetUrl),{headers:{"Cache-Control":"no-store"}});
  } catch(error){return apiError(error);}
}
