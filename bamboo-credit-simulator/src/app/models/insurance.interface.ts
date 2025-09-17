export interface InsuranceCompanyInfo {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  rating?: number;
  solvency_ratio?: number;
  specialties?: string[];
  is_active?: boolean;
}

export interface InsuranceProductInfo {
  id: string;
  name: string;
  type: string;
  description?: string;
  base_premium: number;
  coverage_details?: any;
  deductible_options?: any;
  age_limits?: any;
  exclusions?: string[];
  features?: string[];
  advantages?: string[];
  is_active?: boolean;
  company?: InsuranceCompanyInfo;
  created_at?: string;
  updated_at?: string;
}