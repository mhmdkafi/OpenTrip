import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function requireAuth() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value;
  
  if (!tenantId) {
    redirect("/login");
  }
  
  return tenantId;
}

export async function getCurrentTenant() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value;
  
  if (!tenantId) {
    return null;
  }
  
  return tenantId;
}

export async function requireRole(requiredRole: string) {
  const tenantId = await requireAuth();
  
  // TODO: Check user role from database
  // For now, we'll accept all authenticated users
  return tenantId;
}