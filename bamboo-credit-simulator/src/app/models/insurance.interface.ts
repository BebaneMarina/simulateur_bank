// models/insurance.interface.ts - Interfaces complètes pour le système d'assurance

// ==================== INTERFACES PRINCIPALES ====================

export interface InsuranceProductInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  base_premium: number;
  coverage_details: CoverageDetails;
  deductible_options?: DeductibleOptions;
  age_limits?: AgeLimits;
  exclusions: string[];
  features: string[];
  advantages?: string[];
  is_active: boolean;
  company: InsuranceCompanyInfo;
  created_at?: string;
  updated_at?: string;
}

export interface InsuranceCompanyInfo {
  id: string;
  name: string;
  full_name: string;
  logo_url?: string;
  rating?: number;
  solvency_ratio?: number;
  contact_phone?: string;
  contact_email?: string;
  specialties?: string[];
  coverage_areas?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ==================== INTERFACES DE COUVERTURE ====================

export interface CoverageDetails {
  [guaranteeId: string]: number | string | CoverageItem;
}

export interface CoverageItem {
  amount?: number;
  percentage?: number;
  description?: string;
  limits?: {
    annual?: number;
    per_incident?: number;
    deductible?: number;
  };
}

export interface DeductibleOptions {
  [guaranteeId: string]: {
    amount: number;
    type: 'fixed' | 'percentage';
    minimum?: number;
    maximum?: number;
  };
}

export interface AgeLimits {
  minimum: number;
  maximum: number;
  restrictions?: {
    [ageRange: string]: string[];
  };
}

// ==================== INTERFACES DE SIMULATION ====================

export interface SimulationRequest {
  insurance_type: InsuranceTypeEnum;
  age: number;
  risk_factors: RiskFactors;
  selected_insurers: string[];
  guarantees: string[];
  coverage_amount?: number;
  session_id?: string;
  user_id?: string;
}

export interface SimulationResult {
  quote_id: string;
  product_name: string;
  company_name: string;
  insurance_type: string;
  monthly_premium: number;
  annual_premium: number;
  deductible: number;
  coverage_details: CoverageDetails;
  exclusions: string[];
  valid_until: string;
  recommendations: string[];
  quotes: QuoteOption[];
  selected_guarantees: string[];
  selected_insurers_count: number;
  coverage_summary: CoverageSummary;
}

export interface QuoteOption {
  company_name: string;
  product_name: string;
  monthly_premium: number;
  annual_premium: number;
  deductible: number;
  rating?: number;
  advantages: string[];
  company_id?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface CoverageSummary {
  total_guarantees: number;
  mandatory_included: boolean;
  optional_selected: number;
  coverage_level: CoverageLevelEnum;
}

// ==================== TYPES ET ENUMS ====================

export type InsuranceTypeEnum = 'auto' | 'habitation' | 'vie' | 'sante' | 'voyage' | 'transport';
export type CoverageLevelEnum = 'basique' | 'standard' | 'premium';
export type RiskLevelEnum = 'low' | 'medium' | 'high';

// ==================== FACTEURS DE RISQUE PAR TYPE ====================

export interface RiskFactors {
  // Commun
  city: string;
  age: number;

  // Auto
  vehicle_category?: string;
  fuel_type?: string;
  fiscal_power?: number;
  first_registration?: string;
  seats?: number;
  vehicle_value?: number;

  // Habitation
  property_type?: string;
  surface?: number;
  property_value?: number;
  construction_year?: number;
  security_level?: string;
  occupancy?: string;

  // Vie
  coverage_amount?: number;
  health_status?: string;
  smoking_status?: string;
  profession?: string;
  beneficiaries?: string;

  // Santé
  family_size?: number;
  medical_history?: string;
  coverage_level?: string;
  hospitalization?: string;

  // Voyage
  destination?: string;
  duration?: number;
  activities?: string;
  travel_frequency?: string;
  travelers?: number;

  // Transport
  cargo_type?: string;
  cargo_value?: number;
  transport_mode?: string;
  coverage?: string;
}

// ==================== GARANTIES ====================

export interface InsuranceGuarantee {
  id: string;
  name: string;
  description: string;
  required: boolean;
  icon?: string;
  coverage?: string;
  amount?: number;
  recommended?: boolean;
  essential?: boolean;
  category?: GuaranteeCategory;
  premium_impact?: number; // Pourcentage d'impact sur la prime
}

export interface GuaranteeCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

// ==================== PARCOURS PAR ÉTAPES ====================

export interface StepConfig {
  title: string;
  subtitle: string;
  description?: string;
  required_fields?: string[];
  validation_rules?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'min' | 'max' | 'pattern';
  value?: any;
  message: string;
}

export interface StepData {
  step_number: number;
  step_type: StepTypeEnum;
  data: any;
  completed: boolean;
  validation_errors?: string[];
}

export type StepTypeEnum = 'info_gathering' | 'guarantee_selection' | 'insurer_selection' | 'results';

// ==================== ÉLÉMENTS SPÉCIALISÉS ====================

// Assurance Vie
export interface VieContractType {
  id: string;
  name: string;
  description: string;
  price_range: string;
  icon: string;
  duration?: 'temporaire' | 'vie_entiere' | 'mixte';
  savings_component?: boolean;
}

// Assurance Santé
export interface MedicalNeed {
  id: string;
  name: string;
  description: string;
  frequency?: string;
  priority: RiskLevelEnum;
  icon: string;
  estimated_annual_cost?: number;
}

export interface FamilyMember {
  type: 'souscripteur' | 'conjoint' | 'enfant';
  age?: number;
  medical_conditions?: string[];
}

// Assurance Voyage
export interface TravelRisk {
  id: string;
  name: string;
  description: string;
  level: RiskLevelEnum;
  level_text: string;
  icon: string;
  destination_specific?: boolean;
  activity_specific?: boolean;
}

export interface Destination {
  id: string;
  name: string;
  region: string;
  risk_level: RiskLevelEnum;
  medical_facilities: QualityRating;
  security_rating: QualityRating;
  natural_disasters: string[];
}

export type QualityRating = 'excellent' | 'good' | 'average' | 'poor';

// ==================== INTERFACES UI ====================

export interface InsuranceTypeCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  image_url?: string;
  is_popular?: boolean;
  estimated_premium?: PremiumRange;
}

export interface PremiumRange {
  min: number;
  max: number;
  currency: string;
  period: 'monthly' | 'annual';
}

export interface InsurerCard {
  id: string;
  name: string;
  full_name: string;
  logo_url?: string;
  rating: number;
  solvency_ratio?: number;
  contact_info: ContactInfo;
  specialties: string[];
  market_position?: MarketPosition;
  customer_reviews?: CustomerReview[];
}

export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
  address?: Address;
}

export interface Address {
  street: string;
  city: string;
  postal_code?: string;
  country: string;
}

export interface MarketPosition {
  market_share?: number;
  ranking?: number;
  years_in_market?: number;
}

export interface CustomerReview {
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

// ==================== INTERFACES DE RÉSULTATS ====================

export interface ComparisonResult {
  quotes: DetailedQuote[];
  best_offer: DetailedQuote;
  savings_analysis: SavingsAnalysis;
  market_position: MarketAnalysis;
  recommendations: PersonalizedRecommendation[];
}

export interface DetailedQuote extends QuoteOption {
  quote_details: QuoteDetails;
  coverage_analysis: CoverageAnalysis;
  pros_and_cons: {
    pros: string[];
    cons: string[];
  };
  suitable_for: string[];
}

export interface QuoteDetails {
  premium_breakdown: PremiumBreakdown;
  coverage_limits: CoverageLimits;
  exclusions: DetailedExclusion[];
  deductibles: DeductibleBreakdown;
  payment_options: PaymentOption[];
}

export interface PremiumBreakdown {
  base_premium: number;
  guarantee_costs: { [guaranteeId: string]: number };
  taxes: number;
  fees: number;
  discounts?: { [discountId: string]: number };
  total: number;
}

export interface CoverageLimits {
  [guaranteeId: string]: {
    annual_limit?: number;
    per_incident_limit?: number;
    lifetime_limit?: number;
    deductible: number;
  };
}

export interface DetailedExclusion {
  category: string;
  description: string;
  examples?: string[];
  severity: 'major' | 'minor';
}

export interface DeductibleBreakdown {
  [guaranteeId: string]: {
    amount: number;
    type: 'fixed' | 'percentage';
    applies_to: string[];
  };
}

export interface PaymentOption {
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  total_cost: number;
  discount_percentage?: number;
  processing_fee?: number;
}

export interface CoverageAnalysis {
  coverage_score: number; // 0-100
  gaps: CoverageGap[];
  redundancies: string[];
  value_for_money: number; // 0-100
}

export interface CoverageGap {
  area: string;
  severity: RiskLevelEnum;
  description: string;
  recommendation: string;
}

export interface SavingsAnalysis {
  cheapest_option: QuoteOption;
  most_expensive: QuoteOption;
  average_market_price: number;
  potential_savings: number;
  savings_percentage: number;
}

export interface MarketAnalysis {
  market_average_premium: number;
  user_position: 'below_average' | 'average' | 'above_average';
  price_trends: PriceTrend[];
  competitive_landscape: CompetitorAnalysis[];
}

export interface PriceTrend {
  period: string;
  average_premium: number;
  change_percentage: number;
}

export interface CompetitorAnalysis {
  company_name: string;
  market_share: number;
  average_premium: number;
  customer_satisfaction: number;
  strengths: string[];
  weaknesses: string[];
}

export interface PersonalizedRecommendation {
  type: 'coverage' | 'cost' | 'insurer' | 'general';
  title: string;
  description: string;
  priority: RiskLevelEnum;
  potential_impact: string;
  action_required?: boolean;
}

// ==================== INTERFACES D'APPLICATION ====================

export interface ApplicationData {
  personal_info: PersonalInfo;
  risk_assessment: RiskAssessment;
  selected_quote: DetailedQuote;
  additional_requests?: string;
  documents: DocumentInfo[];
  status: ApplicationStatus;
}

export interface PersonalInfo {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  address: Address;
  profession?: string;
  marital_status?: string;
  dependents?: number;
}

export interface RiskAssessment {
  health_declaration?: HealthDeclaration;
  driving_record?: DrivingRecord;
  property_security?: PropertySecurity;
  travel_patterns?: TravelPattern[];
  previous_claims?: PreviousClaim[];
}

export interface HealthDeclaration {
  general_health: 'excellent' | 'good' | 'fair' | 'poor';
  chronic_conditions: string[];
  medications: string[];
  surgeries: string[];
  smoking_status: 'never' | 'former' | 'current';
  alcohol_consumption: 'none' | 'moderate' | 'heavy';
  bmi?: number;
  last_medical_checkup?: string;
}

export interface DrivingRecord {
  license_date: string;
  accidents: TrafficIncident[];
  violations: TrafficIncident[];
  license_suspensions: string[];
  annual_mileage?: number;
  primary_use: 'personal' | 'business' | 'commuting';
}

export interface TrafficIncident {
  date: string;
  type: string;
  description: string;
  fault_percentage?: number;
  cost?: number;
}

export interface PropertySecurity {
  security_system: boolean;
  alarm_monitoring: boolean;
  security_cameras: boolean;
  gated_community: boolean;
  neighborhood_crime_rate?: 'low' | 'medium' | 'high';
  previous_break_ins?: number;
}

export interface TravelPattern {
  destination: string;
  frequency: 'rare' | 'occasional' | 'frequent';
  purpose: 'business' | 'leisure' | 'family';
  duration_typical: number;
  high_risk_activities: boolean;
}

export interface PreviousClaim {
  date: string;
  insurance_type: string;
  company: string;
  claim_amount: number;
  cause: string;
  fault_determination?: string;
  settled: boolean;
}

export interface DocumentInfo {
  type: DocumentType;
  name: string;
  size: number;
  upload_date: string;
  verified: boolean;
  required: boolean;
}

export type DocumentType = 
  | 'id_card'
  | 'proof_of_residence' 
  | 'driving_license'
  | 'vehicle_registration'
  | 'property_deed'
  | 'medical_report'
  | 'income_proof'
  | 'bank_statement';

export interface ApplicationStatus {
  current_stage: ApplicationStage;
  progress_percentage: number;
  estimated_completion: string;
  required_actions: RequiredAction[];
  status_history: StatusUpdate[];
}

export type ApplicationStage = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'additional_info_required'
  | 'approved'
  | 'rejected'
  | 'policy_issued';

export interface RequiredAction {
  id: string;
  description: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}

export interface StatusUpdate {
  stage: ApplicationStage;
  date: string;
  description: string;
  user_action_required: boolean;
}

// ==================== INTERFACES DE NOTIFICATION ====================

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  marketing_communications: boolean;
  policy_updates: boolean;
  payment_reminders: boolean;
  claim_updates: boolean;
}

export interface InsuranceNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  action_required: boolean;
  created_at: string;
  expires_at?: string;
  related_policy?: string;
  related_claim?: string;
}

export type NotificationType = 
  | 'policy_renewal'
  | 'payment_due'
  | 'claim_update'
  | 'document_required'
  | 'policy_update'
  | 'promotional'
  | 'system_maintenance';

// ==================== INTERFACES D'ANALYTICS ====================

export interface UserInsights {
  risk_profile: RiskProfile;
  recommended_coverage: RecommendedCoverage[];
  cost_optimization: CostOptimization;
  market_comparison: MarketComparison;
  behavioral_patterns: BehavioralPattern[];
}

export interface RiskProfile {
  overall_risk_score: number; // 0-100
  risk_factors: RiskFactor[];
  risk_category: 'low' | 'moderate' | 'high';
  recommendations: string[];
}

export interface RiskFactor {
  category: string;
  factor: string;
  impact_score: number;
  description: string;
  mitigation_suggestions?: string[];
}

export interface RecommendedCoverage {
  insurance_type: InsuranceTypeEnum;
  priority: number;
  recommended_amount: number;
  justification: string;
  potential_scenarios: string[];
}

export interface CostOptimization {
  current_total_premium: number;
  optimized_premium: number;
  potential_savings: number;
  optimization_strategies: OptimizationStrategy[];
}

export interface OptimizationStrategy {
  strategy: string;
  description: string;
  potential_savings: number;
  trade_offs: string[];
  implementation_difficulty: 'easy' | 'moderate' | 'complex';
}

export interface MarketComparison {
  user_vs_market: UserMarketPosition;
  peer_comparison: PeerComparison;
  market_trends: MarketTrend[];
}

export interface UserMarketPosition {
  premium_percentile: number;
  coverage_percentile: number;
  value_score: number;
  market_segment: string;
}

export interface PeerComparison {
  similar_profiles: number;
  average_premium: number;
  coverage_gaps: string[];
  over_insured_areas: string[];
}

export interface MarketTrend {
  metric: string;
  current_value: number;
  trend_direction: 'increasing' | 'stable' | 'decreasing';
  percentage_change: number;
  time_period: string;
}

export interface BehavioralPattern {
  pattern_type: string;
  description: string;
  frequency: number;
  risk_impact: RiskLevelEnum;
  recommendations: string[];
}

// ==================== INTERFACES DE CONFIGURATION ====================

export interface AppConfiguration {
  insurance_types: InsuranceTypeConfig[];
  guarantee_definitions: GuaranteeDefinition[];
  risk_assessment_rules: RiskAssessmentRule[];
  pricing_models: PricingModel[];
  validation_rules: ValidationConfiguration;
  ui_customization: UICustomization;
}

export interface InsuranceTypeConfig {
  type: InsuranceTypeEnum;
  enabled: boolean;
  display_name: string;
  description: string;
  icon: string;
  color_scheme: string;
  required_fields: string[];
  optional_fields: string[];
  guarantee_categories: string[];
  default_guarantees: string[];
  risk_factors: string[];
  pricing_model: string;
}

export interface GuaranteeDefinition {
  id: string;
  name: string;
  description: string;
  insurance_types: InsuranceTypeEnum[];
  category: string;
  required: boolean;
  default_selected: boolean;
  premium_impact_percentage: number;
  coverage_details: CoverageDetails;
  exclusions: string[];
  conditions: string[];
}

export interface RiskAssessmentRule {
  rule_id: string;
  insurance_type: InsuranceTypeEnum;
  risk_factor: string;
  assessment_logic: AssessmentLogic;
  premium_impact: PremiumImpact;
  eligibility_impact: EligibilityImpact;
}

export interface AssessmentLogic {
  condition_type: 'range' | 'category' | 'boolean' | 'calculation';
  conditions: AssessmentCondition[];
  default_value?: any;
}

export interface AssessmentCondition {
  value: any;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  result: AssessmentResult;
}

export interface AssessmentResult {
  risk_score: number;
  risk_category: RiskLevelEnum;
  premium_multiplier: number;
  exclusions?: string[];
  requirements?: string[];
}

export interface PremiumImpact {
  base_multiplier: number;
  min_multiplier: number;
  max_multiplier: number;
  calculation_method: 'linear' | 'exponential' | 'stepped' | 'custom';
}

export interface EligibilityImpact {
  affects_eligibility: boolean;
  exclusion_conditions?: string[];
  additional_requirements?: string[];
  waiting_periods?: { [guarantee: string]: number };
}

export interface PricingModel {
  model_id: string;
  name: string;
  insurance_type: InsuranceTypeEnum;
  base_premium_calculation: PremiumCalculation;
  risk_adjustments: RiskAdjustment[];
  guarantee_pricing: GuaranteePricing[];
  discount_rules: DiscountRule[];
  loading_factors: LoadingFactor[];
}

export interface PremiumCalculation {
  method: 'fixed' | 'percentage_of_value' | 'age_based' | 'income_based' | 'formula';
  base_amount?: number;
  percentage?: number;
  formula?: string;
  parameters: { [key: string]: any };
}

export interface RiskAdjustment {
  risk_factor: string;
  adjustment_type: 'multiplier' | 'additive' | 'percentage';
  value: number;
  conditions?: string[];
}

export interface GuaranteePricing {
  guarantee_id: string;
  pricing_method: 'fixed' | 'percentage' | 'calculated';
  cost: number;
  dependencies?: string[];
}

export interface DiscountRule {
  rule_id: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  conditions: DiscountCondition[];
  max_discount?: number;
  combinable: boolean;
}

export interface DiscountCondition {
  field: string;
  operator: string;
  value: any;
  description: string;
}

export interface LoadingFactor {
  factor_id: string;
  name: string;
  description: string;
  factor_type: 'multiplier' | 'additive';
  value: number;
  applies_to: 'base_premium' | 'total_premium' | 'specific_guarantees';
  target_guarantees?: string[];
}

export interface ValidationConfiguration {
  field_validations: { [field: string]: FieldValidation };
  business_rules: BusinessRule[];
  cross_field_validations: CrossFieldValidation[];
}

export interface FieldValidation {
  required: boolean;
  data_type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'boolean';
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  allowed_values?: any[];
  custom_validation?: string;
}

export interface BusinessRule {
  rule_id: string;
  description: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  active: boolean;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export interface RuleAction {
  action_type: 'block' | 'warn' | 'require_additional_info' | 'adjust_premium' | 'exclude_guarantee';
  message: string;
  parameters?: { [key: string]: any };
}

export interface CrossFieldValidation {
  validation_id: string;
  description: string;
  fields: string[];
  validation_logic: string;
  error_message: string;
}

export interface UICustomization {
  theme: ThemeConfiguration;
  layouts: LayoutConfiguration[];
  component_settings: ComponentSettings;
  localization: LocalizationSettings;
}

export interface ThemeConfiguration {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  success_color: string;
  warning_color: string;
  error_color: string;
  font_family: string;
  font_sizes: { [size: string]: string };
  spacing: { [size: string]: string };
  border_radius: string;
  shadows: { [level: string]: string };
}

export interface LayoutConfiguration {
  layout_id: string;
  name: string;
  insurance_type?: InsuranceTypeEnum;
  steps: StepLayoutConfig[];
  responsive_settings: ResponsiveSettings;
}

export interface StepLayoutConfig {
  step_number: number;
  layout_type: 'single_column' | 'two_column' | 'grid' | 'tabs' | 'accordion';
  field_groups: FieldGroupConfig[];
  navigation: NavigationConfig;
}

export interface FieldGroupConfig {
  group_id: string;
  title: string;
  description?: string;
  fields: string[];
  layout: 'horizontal' | 'vertical' | 'grid';
  collapsible: boolean;
  expanded_by_default: boolean;
}

export interface NavigationConfig {
  show_progress_bar: boolean;
  show_step_numbers: boolean;
  allow_skip: boolean;
  auto_save: boolean;
  back_button_text: string;
  next_button_text: string;
  submit_button_text: string;
}

export interface ResponsiveSettings {
  breakpoints: { [device: string]: number };
  column_configurations: { [device: string]: ColumnConfig };
}

export interface ColumnConfig {
  columns: number;
  gap: string;
  field_width: 'auto' | 'full' | 'half' | 'third' | 'quarter';
}

export interface ComponentSettings {
  input_styles: InputStyleConfig;
  button_styles: ButtonStyleConfig;
  card_styles: CardStyleConfig;
  animation_settings: AnimationSettings;
}

export interface InputStyleConfig {
  border_style: string;
  focus_color: string;
  error_color: string;
  placeholder_color: string;
  background_color: string;
  padding: string;
  border_radius: string;
}

export interface ButtonStyleConfig {
  primary_style: ButtonStyle;
  secondary_style: ButtonStyle;
  outline_style: ButtonStyle;
  disabled_style: ButtonStyle;
}

export interface ButtonStyle {
  background_color: string;
  text_color: string;
  border_color: string;
  border_radius: string;
  padding: string;
  font_weight: string;
  hover_background: string;
  hover_text_color: string;
}

export interface CardStyleConfig {
  background_color: string;
  border_color: string;
  border_radius: string;
  shadow: string;
  padding: string;
  hover_shadow: string;
}

export interface AnimationSettings {
  enable_animations: boolean;
  transition_duration: string;
  easing_function: string;
  loading_animation: string;
  success_animation: string;
  error_animation: string;
}

export interface LocalizationSettings {
  default_language: string;
  supported_languages: string[];
  currency_format: CurrencyFormat;
  date_format: string;
  number_format: NumberFormat;
  rtl_support: boolean;
}

export interface CurrencyFormat {
  currency_code: string;
  currency_symbol: string;
  decimal_places: number;
  thousands_separator: string;
  decimal_separator: string;
  symbol_position: 'before' | 'after';
}

export interface NumberFormat {
  decimal_places: number;
  thousands_separator: string;
  decimal_separator: string;
}

// ==================== INTERFACES D'EXPORT ET REPORTING ====================

export interface ExportConfiguration {
  format: 'pdf' | 'excel' | 'json' | 'csv';
  template?: string;
  include_sections: string[];
  branding: BrandingConfig;
  language: string;
}

export interface BrandingConfig {
  logo_url: string;
  company_name: string;
  company_address: string;
  color_scheme: string;
  footer_text: string;
}

export interface ReportData {
  report_id: string;
  title: string;
  generated_at: string;
  generated_by: string;
  data_sections: ReportSection[];
  summary: ReportSummary;
}

export interface ReportSection {
  section_id: string;
  title: string;
  data: any;
  charts?: ChartConfig[];
  tables?: TableConfig[];
}

export interface ChartConfig {
  chart_type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: any[];
  x_axis: string;
  y_axis: string;
  colors: string[];
}

export interface TableConfig {
  title: string;
  headers: string[];
  data: any[][];
  formatting: TableFormatting;
}

export interface TableFormatting {
  header_style: string;
  row_styles: string[];
  column_alignments: ('left' | 'center' | 'right')[];
  column_widths: string[];
}

export interface ReportSummary {
  total_quotes: number;
  average_premium: number;
  coverage_distribution: { [coverage: string]: number };
  top_recommendations: string[];
  key_insights: string[];
}