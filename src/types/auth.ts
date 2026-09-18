export type UserRole = "owner" | "admin" | "user";

export type AuthSession = {
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

export type RegisterFormData = {
  email: string;
  password: string;
  tenantName: string;
  name: string;
  phone?: string;
};

export type TenantInviteFormData = {
  email: string;
  role: UserRole;
};
