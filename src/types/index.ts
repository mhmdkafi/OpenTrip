export type Tenant = {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
};

export type User = {
  id: string;
  email: string;
  status: "active" | "inactive";
  created_at: Date;
};

export type Trip = {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  departure_date?: Date;
  timezone: string;
  status: string;
  price_catalog_version: number;
  created_at: Date;
  updated_at: Date;
};

export type Booking = {
  id: string;
  trip_id: string;
  source_connection_id: string;
  source_row_number: number;
  raw_name: string;
  registered_at: Date;
  contact_phone?: string;
  source_fingerprint: string;
  created_at: Date;
  updated_at: Date;
};

export type Participant = {
  id: string;
  booking_id: string;
  name: string;
  meeting_point?: string;
  facility: string;
  status: "active" | "cancelled";
  cancellation_reason?: string;
  cancelled_at?: Date;
  created_at: Date;
  updated_at: Date;
};

export type Payment = {
  id: string;
  booking_id: string;
  trip_id: string;
  amount: number;
  method: string;
  paid_at: Date;
  date_source: string;
  status: "pending" | "verified" | "rejected";
  verified_at?: Date;
  verified_by?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
};

export type PaymentAllocation = {
  id: string;
  payment_id: string;
  participant_id: string;
  allocated_amount: number;
  created_at: Date;
};

export type Charge = {
  id: string;
  participant_id: string;
  trip_id: string;
  base_amount: number;
  adjustment: number;
  total_amount: number;
  price_version: number;
  created_at: Date;
  updated_at: Date;
};

export type Expense = {
  id: string;
  trip_id?: string;
  tenant_id: string;
  category_id: string;
  amount: number;
  occurred_at: Date;
  description?: string;
  created_by: string;
  created_at: Date;
};

export type ExpenseCategory = {
  id: string;
  tenant_id: string;
  name: string;
  active: boolean;
  created_at: Date;
};

export type Refund = {
  id: string;
  payment_id: string;
  participant_id: string;
  amount: number;
  reason: string;
  created_by: string;
  created_at: Date;
};

export type CashEntry = {
  id: string;
  trip_id: string;
  tenant_id: string;
  source_type: string;
  source_id?: string;
  direction: "in" | "out";
  amount: number;
  occurred_at: Date;
  reversal_of_id?: string;
  created_by: string;
  created_at: Date;
};

export type SourceConnection = {
  id: string;
  trip_id: string;
  spreadsheet_id: string;
  sheet_id: number;
  sheet_title: string;
  mapping_version: number;
  mapping_config: string;
  last_success_at?: Date;
  created_at: Date;
  updated_at: Date;
};

export type AttendanceExport = {
  id: string;
  trip_id: string;
  version: number;
  title: string;
  organizer_name?: string;
  total_participants: number;
  unpaid_count: number;
  incomplete_count: number;
  file_path: string;
  created_by: string;
  created_at: Date;
};
