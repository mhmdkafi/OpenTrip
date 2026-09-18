import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";

export async function POST(request: NextRequest) {
  try {
    await requireWorkspace();
    const input=z.object({name:z.string().trim().min(1).max(100),phone:z.string().trim().max(30).regex(/^[+\d\s()-]*$/)}).parse(await request.json());
    const client=await createClient();
    const {error}=await client.auth.updateUser({data:input});
    if(error)throw new DomainError("Profil gagal disimpan. Silakan coba kembali.");
    return NextResponse.json({success:true});
  } catch(error) {return apiError(error);}
}
