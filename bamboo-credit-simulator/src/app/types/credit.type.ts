// types/credit.types.ts
// Import des types du service pour éviter la duplication
import { 
  CreditProduct,
  Bank,
  CreditSimulationRequest,
  CreditSimulationResponse,
  AmortizationEntry,
  CreditComparisonRequest,
  CreditComparisonResponse,
  BankComparison,
  BorrowingCapacityRequest,
  BorrowingCapacityResponse
} from '../services/credit.service';

export interface CreditFormData {
  clientType: 'particulier' | 'entreprise';
  fullName: string;
  phoneNumber: string;
  email?: string;
  monthlyIncome: number;
  profession?: string;
  creditType: CreditTypeId;
  requestedAmount: number;
  duration: number;
  currentDebts: number;
  purpose: string;
}

export type CreditTypeId = 
  | 'consommation' 
  | 'auto' 
  | 'immobilier' 
  | 'investissement' 
  | 'equipement' 
  | 'travaux';

export interface CreditTypeInfo {
  id: CreditTypeId;
  name: string;
  description: string;
  icon?: string;
  minAmount?: number;
  maxAmount?: number;
  minDuration?: number;
  maxDuration?: number;
}

export interface DurationOption {
  value: number;
  label: string;
  years: number;
  isPopular?: boolean;
}

export interface ValidationRule {
  field: string;
  rules: {
    required?: boolean;
    minLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
  };
  messages: {
    [key: string]: string;
  };
}

export interface FormValidationState {
  isValid: boolean;
  errors: { [key: string]: string };
  warnings: { [key: string]: string };
}

// Énumérations pour les statuts
export enum EligibilityStatus {
  ELIGIBLE = 'eligible',
  NOT_ELIGIBLE = 'not_eligible',
  CONDITIONAL = 'conditional',
  PENDING_REVIEW = 'pending_review'
}

export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

// Types pour les statistiques et métriques
export interface ComparisonStatistics {
  totalOffers: number;
  eligibleOffers: number;
  averageRate: number;
  bestRate: number;
  worstRate: number;
  averageMonthlyPayment: number;
  lowestMonthlyPayment: number;
  averageProcessingTime: number;
  fastestProcessingTime: number;
  totalPotentialSavings: number;
}

export interface BankMetrics {
  id: string;
  name: string;
  marketShare: number;
  averageRate: number;
  averageProcessingTime: number;
  approvalRate: number;
  customerSatisfaction: number;
  totalProducts: number;
  featuredProducts: number;
}

// Types pour les paramètres de recherche avancée
export interface AdvancedSearchFilters {
  creditTypes: CreditTypeId[];
  minAmount?: number;
  maxAmount?: number;
  minDuration?: number;
  maxDuration?: number;
  maxRate?: number;
  maxProcessingTime?: number;
  requiredFeatures?: string[];
  bankIds?: string[];
  sortBy: 'rate' | 'payment' | 'processing_time' | 'approval_rate';
  sortOrder: 'asc' | 'desc';
}

// Types pour l'export et la sauvegarde
export interface ComparisonExportData {
  metadata: {
    exportDate: string;
    version: string;
    searchCriteria: CreditFormData;
  };
  results: {
    summary: ComparisonStatistics;
    offers: BankComparison[];
    bestOffer?: BankComparison;
  };
  user: {
    sessionId?: string;
    preferences?: UserPreferences;
  };
}

export interface UserPreferences {
  defaultCreditType: CreditTypeId;
  defaultAmount: number;
  defaultDuration: number;
  preferredBanks: string[];
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacySettings: {
    shareData: boolean;
    marketingEmails: boolean;
  };
}

// Types pour les événements analytics
export interface AnalyticsEvent {
  eventName: string;
  category: 'form' | 'comparison' | 'application' | 'user' | 'error';
  action: string;
  label?: string;
  value?: number;
  customProperties?: { [key: string]: any };
  timestamp: string;
  sessionId: string;
  userId?: string;
}

// Types pour les notifications
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface NotificationMessage {
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

// Extensions des interfaces existantes pour plus de détails
export interface ExtendedCreditProduct extends CreditProduct {
  // Informations additionnelles calculées
  popularity: number;
  averageApprovalTime: number;
  successRate: number;
  customerRating: number;
  lastUpdated: Date;
  
  // Conditions spéciales
  promotions?: {
    title: string;
    description: string;
    discountRate?: number;
    validUntil: Date;
  }[];
  
  // Critères d'éligibilité détaillés
  detailedEligibility: {
    minAge: number;
    maxAge: number;
    minIncome: number;
    employmentTypes: string[];
    residencyRequirements: string[];
    creditScoreMin?: number;
    additionalRequirements: string[];
  };
}

export interface ExtendedBankComparison extends BankComparison {
  // Scores calculés
  overallScore: number;
  rateScore: number;
  serviceScore: number;
  speedScore: number;
  
  // Informations détaillées sur l'éligibilité
  eligibilityDetails: {
    status: EligibilityStatus;
    reasons: string[];
    improvementSuggestions: string[];
    conditionalRequirements?: string[];
  };
  
  // Avantages et inconvénients
  pros: string[];
  cons: string[];
  
  // Coûts détaillés
  detailedCosts: {
    monthlyPayment: number;
    insurance?: number;
    processingFees?: number;
    otherFees?: number;
    totalMonthlyCost: number;
  };
}

// Types pour les hooks personnalisés
export interface UseCreditComparison {
  comparisonResults: MultiBankComparisonResult | null;
  isLoading: boolean;
  error: string | null;
  compare: (request: CreditComparisonRequest) => Promise<void>;
  reset: () => void;
}

export interface UseCreditForm {
  formData: CreditFormData;
  validationState: FormValidationState;
  isSubmitting: boolean;
  updateField: (field: keyof CreditFormData, value: any) => void;
  validateForm: () => boolean;
  resetForm: () => void;
  submitForm: () => Promise<boolean>;
}

// Types pour la gestion d'état
export interface CreditComparatorState {
  // Données du formulaire
  formData: CreditFormData;
  formErrors: { [key: string]: string };
  
  // Configuration
  availableBanks: Bank[];
  availableProducts: CreditProduct[];
  selectedBankIds: string[];
  
  // Résultats
  comparisonResults: MultiBankComparisonResult | null;
  
  // UI State
  isLoading: boolean;
  currentStep: number;
  expandedOffers: string[];
  sortBy: string;
  
  // Préférences utilisateur
  userPreferences: UserPreferences;
}

export interface CreditComparatorActions {
  setFormData: (data: Partial<CreditFormData>) => void;
  setFormError: (field: string, error: string) => void;
  clearFormErrors: () => void;
  selectBank: (bankId: string) => void;
  deselectBank: (bankId: string) => void;
  setComparisonResults: (results: MultiBankComparisonResult) => void;
  setLoading: (loading: boolean) => void;
  toggleOfferExpanded: (bankId: string) => void;
  setSortBy: (sortBy: string) => void;
  resetState: () => void;
}

// Re-export des types du service pour centraliser
export type {
  CreditProduct,
  Bank,
  CreditSimulationRequest,
  CreditSimulationResponse,
  AmortizationEntry,
  CreditComparisonRequest,
  CreditComparisonResponse,
  BankComparison,
  BorrowingCapacityRequest,
  BorrowingCapacityResponse
};

export interface MultiBankComparisonResult {
  bankOffers: BankComparison[];
  bestOffer?: BankComparison;
  summary: {
    total_offers: number;
    eligible_offers: number;
    best_rate?: number;
    lowest_monthly?: number;
    max_savings: number;
  };
  search_params: {
    credit_type: string;
    amount: number;
    duration: number;
    monthly_income: number;
    current_debts: number;
  };
}