// models/insurance.interfaces.ts
export interface InsuranceCompany {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  license_number?: string;
  established_year?: number;
  solvency_ratio?: number;
  rating?: string;
  specialties?: string[];
  coverage_areas?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  logo_data?: any;
  logo_content_type?: string;
}

export interface InsuranceProduct {
  id: string;
  insurance_company_id: string;
  name: string;
  type: string;
  description?: string;
  coverage_details?: any;
  premium_calculation?: any;
  base_premium: number;
  min_coverage?: number;
  max_coverage?: number;
  deductible_options?: any;
  age_limits?: any;
  exclusions?: string[];
  features?: string[];
  advantages?: string[];
  claim_process?: string;
  settlement_time_days?: number;
  renewable?: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by_admin?: string;
  updated_by_admin?: string;
  company?: InsuranceCompany;
}

export interface InsuranceApplication {
  id: string;
  quote_id?: string;
  insurance_product_id?: string;
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  coverage_amount?: number;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'active';
  application_data?: any;
  medical_exam_required: boolean;
  documents_uploaded?: string[];
  insurance_response?: any;
  processing_notes?: string;
  assigned_to?: string;
  submitted_at: Date;
  updated_at: Date;
  applicant_address?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  profession?: string;
  employer?: string;
  beneficiaries?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_value?: number;
  property_type?: string;
  property_value?: number;
  property_address?: string;
  medical_history?: string;
  current_treatments?: string;
  policy_number?: string;
  premium_offered?: number;
  deductible_offered?: number;
  medical_exam_date?: Date;
  documents_required?: any;
  documents_submitted?: any;
  processed_at?: Date;
}

export interface InsuranceQuote {
  id: string;
  session_id?: string;
  insurance_product_id?: string;
  insurance_type: string;
  age: number;
  risk_factors: any;
  coverage_amount?: number;
  monthly_premium: number;
  annual_premium: number;
  deductible?: number;
  coverage_details?: any;
  exclusions?: string[];
  valid_until?: Date;
  client_ip?: string;
  user_agent?: string;
  created_at: Date;
}

export interface CreateInsuranceCompanyRequest {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  license_number?: string;
  established_year?: number;
  solvency_ratio?: number;
  rating?: string;
  specialties?: string[];
  coverage_areas?: string[];
  is_active: boolean;
}

export interface UpdateInsuranceCompanyRequest {
  name?: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  license_number?: string;
  established_year?: number;
  solvency_ratio?: number;
  rating?: string;
  specialties?: string[];
  coverage_areas?: string[];
  is_active?: boolean;
}

export interface CreateInsuranceProductRequest {
  id: string;
  insurance_company_id: string;
  name: string;
  type: string;
  description?: string;
  coverage_details?: any;
  premium_calculation?: any;
  base_premium: number;
  min_coverage?: number;
  max_coverage?: number;
  deductible_options?: any;
  age_limits?: any;
  exclusions?: string[];
  features?: string[];
  advantages?: string[];
  claim_process?: string;
  settlement_time_days?: number;
  renewable?: boolean;
  is_featured: boolean;
  is_active: boolean;
}

export interface UpdateInsuranceProductRequest {
  insurance_company_id?: string;
  name?: string;
  type?: string;
  description?: string;
  coverage_details?: any;
  premium_calculation?: any;
  base_premium?: number;
  min_coverage?: number;
  max_coverage?: number;
  deductible_options?: any;
  age_limits?: any;
  exclusions?: string[];
  features?: string[];
  advantages?: string[];
  claim_process?: string;
  settlement_time_days?: number;
  renewable?: boolean;
  is_featured?: boolean;
  is_active?: boolean;
}

export interface InsuranceCompanyFilters {
  search?: string;
  status?: 'active' | 'inactive' | '';
  specialty?: string;
  skip?: number;
  limit?: number;
}

export interface InsuranceProductFilters {
  search?: string;
  company?: string;
  type?: string;
  status?: 'active' | 'inactive' | '';
  skip?: number;
  limit?: number;
}

export interface InsuranceApplicationFilters {
  search?: string;
  status?: string;
  company?: string;
  product?: string;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface InsuranceStats {
  companies: {
    total: number;
    active: number;
    inactive: number;
  };
  products: {
    total: number;
    active: number;
    by_type: { [key: string]: number };
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  quotes: {
    total: number;
    this_month: number;
  };
}

// Types pour les spécialités d'assurance
export type InsuranceSpecialty = 
  | 'auto'
  | 'habitation' 
  | 'vie'
  | 'sante'
  | 'voyage'
  | 'transport';

// Types pour les types d'assurance
export type InsuranceType = InsuranceSpecialty;

// Types pour les statuts d'application
export type ApplicationStatus = 
  | 'pending'
  | 'under_review'
  | 'approved' 
  | 'rejected'
  | 'active';

// Types pour les notations
export type InsuranceRating = 
  | 'AAA'
  | 'AA+'
  | 'AA'
  | 'AA-'
  | 'A+'
  | 'A'
  | 'A-'
  | 'BBB+'
  | 'BBB'
  | 'BBB-';

export interface InsuranceCompanyFormData {
  id: string;
  name: string;
  full_name: string;
  description: string;
  contact_phone: string;
  contact_email: string;
  website: string;
  address: string;
  license_number: string;
  established_year: number | null;
  solvency_ratio: number | null;
  rating: InsuranceRating | '';
  specialties: InsuranceSpecialty[];
  is_active: boolean;
}

export interface InsuranceProductFormData {
  id: string;
  insurance_company_id: string;
  name: string;
  type: InsuranceType;
  description: string;
  base_premium: number;
  min_coverage: number | null;
  max_coverage: number | null;
  features_text: string;
  advantages_text: string;
  exclusions_text: string;
  is_active: boolean;
  is_featured: boolean;
}