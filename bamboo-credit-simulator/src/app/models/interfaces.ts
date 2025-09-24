export interface AdminUser {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: AdminRole;
  permissions: { [key: string]: string[] };
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AdminUser;
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  READONLY = 'readonly'
}

export interface Bank {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  swift_code?: string;
  license_number?: string;
  established_year?: number;
  total_assets?: number;
  rating?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Propriétés additionnelles pour l'affichage
  color?: string;
  short_name?: string;
  market_share?: number;
  processing_time?: number;
}

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
  created_at: string;
  updated_at: string;
}

export interface CreditProduct {
  id: string;
  bank_id: string;
  name: string;
  type: string;
  description?: string;
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  average_rate: number;
  min_rate?: number;
  max_rate?: number;
  processing_time_hours: number;
  required_documents?: any;
  eligibility_criteria?: any;
  fees?: any;
  features?: string[];
  advantages?: string[];
  special_conditions?: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bank?: Bank;
}

export interface SavingsProduct {
  id: string;
  bank_id: string;
  name: string;
  type: string;
  description?: string;
  interest_rate: number;
  minimum_deposit: number;
  maximum_deposit?: number;
  minimum_balance: number;
  liquidity: 'immediate' | 'notice' | 'term';
  notice_period_days: number;
  term_months?: number;
  compounding_frequency: string;
  fees?: any;
  features?: string[];
  advantages?: string[];
  tax_benefits?: string[];
  risk_level: number;
  early_withdrawal_penalty?: number;
  is_islamic_compliant: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bank?: Bank;
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
  min_coverage: number;
  max_coverage: number;
  deductible_options?: number[];
  age_limits?: any;
  exclusions?: string[];
  features?: string[];
  advantages?: string[];
  claim_process?: string;
  settlement_time_days: number;
  renewable: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  insurance_company?: InsuranceCompany;
}

export interface PaginatedResponse<T> {
  limit: any;
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface DashboardStats {
  total_banks: number;
  active_banks: number;
  total_insurance_companies: number;
  active_insurance_companies: number;
  total_credit_products: number;
  active_credit_products: number;
  total_savings_products: number;
  active_savings_products: number;
  total_insurance_products: number;
  active_insurance_products: number;
  total_simulations_today: number;
  total_applications_pending: number;
}

export interface AuditLog {
  metadata: any;
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: AdminUser;
}

export interface CreditSimulation {
  id: string;
  session_id?: string;
  credit_product_id: string;
  requested_amount: number;
  duration_months: number;
  monthly_income: number;
  current_debts: number;
  down_payment: number;
  applied_rate: number;
  monthly_payment: number;
  total_cost: number;
  total_interest: number;
  debt_ratio: number;
  eligible: boolean;
  risk_score?: number;
  recommendations?: string[];
  client_ip?: string;
  created_at: string;
  credit_product?: CreditProduct;
}

export interface SavingsSimulation {
  id: string;
  session_id?: string;
  savings_product_id: string;
  initial_amount: number;
  monthly_contribution: number;
  duration_months: number;
  final_amount: number;
  total_contributions: number;
  total_interest: number;
  effective_rate?: number;
  client_ip?: string;
  created_at: string;
  savings_product?: SavingsProduct;
}

export interface CreditApplication {
  created_at: string | number | Date;
  id: string;
  simulation_id?: string;
  credit_product_id: string;
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  requested_amount: number;
  duration_months?: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  application_data?: any;
  documents_uploaded?: string[];
  bank_response?: any;
  processing_notes?: string;
  assigned_to?: string;
  submitted_at: string;
  updated_at: string;
  credit_product?: CreditProduct;
}

// NOUVELLE INTERFACE POUR LES DEMANDES D'ASSURANCE
export interface InsuranceApplication {
  id: string;
  quote_id?: string;
  insurance_product_id: string;
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  applicant_address?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  profession?: string;
  employer?: string;
  coverage_amount?: number;
  beneficiaries?: string;
  
  // Informations véhicule (pour assurance auto)
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_value?: number;
  
  // Informations logement (pour assurance habitation)
  property_type?: string;
  property_value?: number;
  property_address?: string;
  
  // Informations santé
  medical_history?: string;
  current_treatments?: string;
  
  // Statut et traitement
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed';
  processing_notes?: string;
  assigned_to?: string;
  insurance_response?: string;
  medical_exam_required?: boolean;
  application_data?: any;
  submitted_at: string;
  updated_at?: string;
  
  // Relations
  insurance_product?: {
    id: string;
    name: string;
    type: string;
    description: string;
    insurance_company?: {
      id: string;
      name: string;
      full_name: string;
      contact_phone?: string;
      contact_email?: string;
    };
  };
}

// Interfaces pour les formulaires
export interface BankFormData {
  id?: string;
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  swift_code?: string;
  license_number?: string;
  established_year?: number;
  total_assets?: number;
  rating?: string;
  is_active?: boolean;
}

export interface InsuranceCompanyFormData {
  id?: string;
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
  is_active?: boolean;
}

export interface CreditProductFormData {
  bank_id: string;
  name: string;
  type: string;
  description?: string;
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  average_rate: number;
  min_rate?: number;
  max_rate?: number;
  processing_time_hours: number;
  required_documents?: any;
  eligibility_criteria?: any;
  fees?: any;
  features?: string[];
  advantages?: string[];
  special_conditions?: string;
  is_featured?: boolean;
  is_active?: boolean;
}

// Nouvelle interface pour les formulaires de demandes d'assurance
export interface InsuranceApplicationFormData {
  insurance_product_id: string;
  quote_id?: string;
  
  // Informations personnelles
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  applicant_address?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  profession?: string;
  employer?: string;
  
  // Informations spécifiques
  coverage_amount?: number;
  beneficiaries?: string;
  
  // Véhicule (auto)
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_value?: number;
  
  // Logement (habitation)
  property_type?: string;
  property_value?: number;
  property_address?: string;
  
  // Santé
  medical_history?: string;
  current_treatments?: string;
  
  // Données d'application
  application_data?: any;
}

// Types pour les réponses d'API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface ErrorResponse {
  detail: string;
  status_code: number;
  timestamp: string;
}

// Enums
export enum CreditType {
  IMMOBILIER = 'immobilier',
  CONSOMMATION = 'consommation',
  AUTO = 'auto',
  PROFESSIONNEL = 'professionnel',
  EQUIPEMENT = 'equipement',
  TRAVAUX = 'travaux'
}

export enum SavingsType {
  LIVRET = 'livret',
  TERME = 'terme',
  PLAN_EPARGNE = 'plan_epargne',
  PROFESSIONNEL = 'professionnel'
}

export enum InsuranceType {
  AUTO = 'auto',
  HABITATION = 'habitation',
  VIE = 'vie',
  SANTE = 'sante',
  VOYAGE = 'voyage',
  RESPONSABILITE = 'responsabilite',
  TRANSPORT = 'transport'
}

export enum ApplicationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

// Nouvelles interfaces pour les conditions d'ouverture
export interface BankAccountConditions {
  minimumDeposit: number;
  requiredDocuments: string[];
  eligibilityCriteria: string[];
  fees: BankFee[];
  processingTime: string;
}

export interface BankFee {
  type: string;
  amount: number;
  frequency: string;
  description: string;
}

// Extension de l'interface Bank existante
export interface ExtendedBank extends Bank {
  accountConditions?: BankAccountConditions;
  availableServices: string[];
  branchLocations?: string[];
}

// Interface pour les produits d'assurance avec banque
export interface InsuranceProductWithBank {
  id: string;
  name: string;
  type: string;
  description: string;
  basePremium: number;
  coverageDetails: any;
  features: string[];
  exclusions: string[];
  company: InsuranceCompany;
  partnerBanks?: string[]; // IDs des banques partenaires
  specialOffers?: string[];
}


// Types utilitaires
export type CreateRequest<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateRequest<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;