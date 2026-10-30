export interface AuthUser {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: string;
  external_id: string;
  services_selected: boolean;
  is_approved: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface GarageProfile {
  id: number;
  name: string;
  physical_address: string;
  latitude: string | null;
  longitude: string | null;
  operating_hours: Record<string, string>;
  primary_phone: string;
  secondary_phone: string | null;
  business_email: string;
  vehicle_types: string[];
  services_offered: string[];
  services_not_offered: string[] | null;
  pricing_info: Record<string, unknown> | string;
  is_price_negotiable: boolean;
  mechanics_count: number;
  lead_mechanic_name: string | null;
  experience_years: number | null;
  certifications: string[] | null;
  specialized_skills: string | null;
  warranty_offered: boolean;
  warranty_duration_days: number | null;
  avg_turnaround_hours: number;
  emergency_service_available: boolean;
  working_days: string[];
  cancellation_policy: string;
  verification_status: string;
}

export interface Quote {
  id: number;
  revision: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_amount: string;
  }>;
  amount: string;
  currency: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  response_reason: string;
  created_at: string;
  responded_at: string | null;
}

export interface Invoice {
  id?: number;
  invoice_number: string;
  garage_name: string;
  amount: string;
  currency: string;
  status: string;
  issued_at: string;
  paid_at: string | null;
  payments: Array<{
    id: number;
    transaction_reference: string;
    provider_reference: string | null;
    checkout_url: string;
    amount: string;
    currency: string;
    status: string;
    is_excess_payment: boolean;
    created_at: string;
    verified_at: string | null;
  }>;
}

export interface Booking {
  id: number;
  rider: number;
  rider_name: string;
  garage: number;
  garage_name: string;
  vehicle_type: string;
  service_category: string;
  description: string;
  preferred_date: string;
  preferred_time: string | null;
  location_lat: string | null;
  location_lng: string | null;
  status: string;
  estimated_cost: string | null;
  actual_cost: string | null;
  created_at: string;
  updated_at: string;
  response_note: string;
  quotes: Quote[];
  invoice: Invoice | null;
  review: {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
  } | null;
}

export interface ApplicationStatus {
  application_tracking_id: string;
  name: string;
  verification_status: string;
  submission_completeness: string;
  registration_date: string;
  verified_at: string | null;
  rejection_reason: string | null;
  suspension_reason: string | null;
  verified_by_name: string | null;
}

export interface QuoteDraft {
  description: string;
  quantity: number;
  unit_amount: string;
}
