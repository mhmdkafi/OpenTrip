export type UserRole = "owner" | "admin";

export type AuthSession = {
  workspace_id: string;
  tenants: {id:string;name:string}[];
  user: {
    id: string;
    email: string;
    name?: string;
    phone?: string;
  };
  tenant: {
    id: string;
    name: string;
  };
  role: UserRole;
  permissions: string[];
};

export type LoginFormData = {
  email: string;
  password: string;
  tenantId?: string;
};

