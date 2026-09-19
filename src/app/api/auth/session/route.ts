import { NextResponse } from "next/server";
import { requireWorkspace, apiError } from "@/lib/workspace/server";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  try {
    const auth=await requireWorkspace();
    const client=await createClient();
    const {data:{user}}=await client.auth.getUser();
    const {data:members,error}=await client.from("user_memberships").select("tenant:tenants(id,name)").eq("user_id",auth.userId);
    if(error)throw error;
    const tenants=(members||[]).flatMap(m=>Array.isArray(m.tenant)?m.tenant:[m.tenant]).filter(Boolean);
    const tenant=tenants.find(t=>t.id===auth.tenantId);
    if(!user||!tenant)return NextResponse.json({error:"Workspace tidak tersedia."},{status:403});
    return NextResponse.json({user:{id:user.id,email:user.email,name:user.user_metadata?.name,phone:user.user_metadata?.phone},tenant,tenants,workspace_id:auth.workspace_id,role:auth.role,permissions:["workspace:read","workspace:write","users:read",...(auth.role === "owner" ? ["users:create"] : [])]},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiError(error);}
}
