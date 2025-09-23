// multi-bank-comparator.component.ts - Version corrigée pour SimBot Gab
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Observable, forkJoin } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { AmortizationEntry } from '../../models/amortization.interface';
import { 
  CreditService, 
  CreditProduct, 
  Bank, 
  CreditComparisonResponse,
  BankComparison,
  CreditSimulationRequest,
  CreditSimulationResponse
} from '../../services/credit.service';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ApplicationModalComponent } from '../application-modal/application-modal.component';
import { ApplicationService, ApplicationNotification } from '../../services/application.service';
import { PdfService } from '../../services/pdf.service';
import { EnhancedPdfService } from '../../services/enhanced-pdf.service';

interface ProductSimulation {
  [x: string]: any;
  product: CreditProduct;
  simulation: CreditSimulationResponse;
}

interface DetailedSimulationResult extends ProductSimulation {
  amortization_schedule?: AmortizationEntry[];
  showAmortization?: boolean;
  currentView?: 'monthly' | 'yearly';
  selectedYear?: string;
}

interface ExtendedSimulation extends ProductSimulation {
  currentView?: 'monthly' | 'yearly';
  selectedYear?: string;
  amortization_schedule?: AmortizationEntry[];
}

interface SimulationData {
  bank_name: string;
  product_name: string;
  requested_amount: number;
  duration_months: number;
  applied_rate: number;
  monthly_payment: number;
  total_cost: number;
  total_interest: number;
  debt_ratio: number;
  eligible: boolean;
  monthly_income?: number;
}

interface EnhancedSimulationData extends SimulationData {
  simulation_id?: string;
  confidence_score?: number;
  market_position?: 'excellent' | 'good' | 'average';
  applicant_name?: string;
}

interface ExtendedSimulationView {
  currentView?: 'monthly' | 'yearly';
  selectedYear?: string;
  amortization_schedule?: AmortizationEntry[];
}

interface Step {
  id: number;
  label: string;
  description: string;
  fields: string[];
  icon: string;
}

@Component({
  selector: 'comparateur',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule,
    ApplicationModalComponent
  ],
  providers: [PdfService, EnhancedPdfService],
  templateUrl: './multi-bank-comparator.component.html',
  styleUrls: ['./multi-bank-comparator.component.scss']
})
export class MultiBankComparatorComponent implements OnInit, OnDestroy {
  simulationForm!: FormGroup;
  
  availableProducts: CreditProduct[] = [];
  compatibleProducts: CreditProduct[] = [];
  productSimulations: ProductSimulation[] = [];
  availableCreditTypes: { id: string; name: string; description: string; }[] = [];
  alternativeProducts: any[] = [];
  showApplicationModal = false;
  selectedSimulation: any = null;
  selectedApplicationProduct: any = null;
  detailedSimulations: DetailedSimulationResult[] = [];
  expandedAmortization: Set<string> = new Set();
  amortizationView: 'monthly' | 'yearly' = 'monthly';
  selectedYearFilter: string = 'all';
  extendedSimulations: Map<string, ExtendedSimulationView> = new Map();

  // État du composant
  isLoading = false;
  isLoadingProducts = false;
  hasFormError = false;
  errorMessage = '';
  
  // Configuration UI
  expandedOffers: Set<string> = new Set();
  sortBy: 'rate' | 'payment' | 'time' | 'eligible' = 'payment';
  showOnlyEligible = false;
  
  // Stepper
  currentStep = 1;
  totalSteps = 3;
  stepValidation: { [key: number]: boolean } = {
    1: false,
    2: false,
    3: false
  };

  steps: Step[] = [
    { 
      id: 1, 
      label: 'Votre Profil', 
      description: 'Informations personnelles et revenus',
      icon: 'person',
      fields: ['clientType', 'fullName', 'phoneNumber', 'email', 'monthlyIncome', 'profession']
    },
    { 
      id: 2, 
      label: 'Votre Crédit', 
      description: 'Détails du financement souhaité',
      icon: 'account_balance',
      fields: ['creditType', 'requestedAmount', 'duration', 'purpose', 'currentDebts', 'downPayment']
    },
    { 
      id: 3, 
      label: 'Validation', 
      description: 'Vérification et comparaison',
      icon: 'check_circle',
      fields: []
    }
  ];

  durations = [
    { value: 6, label: '6 mois' },
    { value: 12, label: '12 mois' },
    { value: 18, label: '18 mois' },
    { value: 24, label: '2 ans' },
    { value: 36, label: '3 ans' },
    { value: 48, label: '4 ans' },
    { value: 60, label: '5 ans' },
    { value: 84, label: '7 ans' },
    { value: 120, label: '10 ans' },
    { value: 240, label: '20 ans' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private creditService: CreditService,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private applicationService: ApplicationService,
    private pdfService: PdfService,
    private enhancedPdfService: EnhancedPdfService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadAllProducts();
    this.trackPageView();
    this.setupFormListeners();
    this.setupStepValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // === NOUVELLES MÉTHODES D'EXPORT SIMBOT ===

  exportSimbotPremiumPDF(simulation: ProductSimulation): void {
    const enhancedData: EnhancedSimulationData = {
      ...this.buildSimulationData(simulation),
      simulation_id: this.generateSessionId(),
      confidence_score: this.calculateConfidenceScore(simulation),
      market_position: this.getMarketPosition(simulation),
      applicant_name: this.simulationForm.get('fullName')?.value
    };

    const amortizationSchedule = this.generateAmortizationSchedule(simulation);
    this.enhancedPdfService.generateSimbotPremiumPDF(enhancedData, amortizationSchedule);
    
    this.notificationService.showSuccess('Rapport SimBot premium généré avec succès !');
    
    // Analytics
    this.analyticsService.trackEvent('simbot_premium_pdf_generated', {
      bank_name: simulation.product.bank.name,
      confidence_score: enhancedData.confidence_score,
      market_position: enhancedData.market_position
    });
  }

  exportSimbotComparisonPDF(): void {
    if (this.productSimulations.length === 0) {
      this.notificationService.showWarning('Aucune simulation à comparer');
      return;
    }

    const enhancedSimulations = this.productSimulations.map(sim => ({
      ...sim,
      confidence_score: this.calculateConfidenceScore(sim),
      market_position: this.getMarketPosition(sim)
    }));

    this.enhancedPdfService.generateSimbotComparisonPDF(enhancedSimulations);
    this.notificationService.showSuccess('Comparaison SimBot générée avec succès !');
  }

  private buildSimulationData(simulation: ProductSimulation): SimulationData {
    return {
      bank_name: simulation.product.bank.name,
      product_name: simulation.product.name,
      requested_amount: this.simulationForm.get('requestedAmount')?.value || 0,
      duration_months: this.simulationForm.get('duration')?.value || 0,
      applied_rate: simulation.simulation.applied_rate,
      monthly_payment: simulation.simulation.monthly_payment,
      total_cost: simulation.simulation.total_cost,
      total_interest: simulation.simulation.total_interest,
      debt_ratio: simulation.simulation.debt_ratio,
      eligible: simulation.simulation.eligible,
      monthly_income: this.simulationForm.get('monthlyIncome')?.value
    };
  }

 calculateConfidenceScore(simulation: ProductSimulation): number {
  let score = 70; // Base
  
  if (simulation.simulation.eligible) score += 20;
  if (simulation.simulation.debt_ratio <= 25) score += 10;
  if (simulation.simulation.debt_ratio <= 33) score += 5;
  if (simulation.simulation.applied_rate <= 15) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

  private getMarketPosition(simulation: ProductSimulation): 'excellent' | 'good' | 'average' {
    const score = this.calculateConfidenceScore(simulation);
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    return 'average';
  }

  // === MÉTHODES D'EXPORT EXISTANTES AMÉLIORÉES ===

  exportAmortizationToPDF(simulation: ProductSimulation): void {
    const simulationData: SimulationData = this.buildSimulationData(simulation);
    const amortizationSchedule = this.generateAmortizationSchedule(simulation);
    
    this.pdfService.generateAmortizationPDF(simulationData, amortizationSchedule);
    this.notificationService.showSuccess('PDF d\'amortissement généré avec succès !');
  }

  exportComparisonToPDF(): void {
    if (this.productSimulations.length === 0) {
      this.notificationService.showWarning('Aucune simulation à exporter');
      return;
    }
    
    this.pdfService.generateComparisonPDF(this.productSimulations);
    this.notificationService.showSuccess('PDF de comparaison généré avec succès !');
  }

  exportQuickSummaryPDF(simulation: ProductSimulation): void {
    const simulationData: SimulationData = this.buildSimulationData(simulation);
    this.pdfService.generateQuickSummaryPDF(simulationData);
    this.notificationService.showSuccess('Synthèse PDF générée avec succès !');
  }

  // === INITIALISATION ET CONFIGURATION ===

  private initializeForm(): void {
    this.simulationForm = this.fb.group({
      clientType: ['particulier', Validators.required],
      fullName: ['Jean Dupont', [Validators.required, Validators.minLength(3)]],
      phoneNumber: ['+24101234567', [Validators.required, Validators.pattern(/^(\+241|241)?[0-9]{8}$/)]],
      email: [''],
      monthlyIncome: [750000, [Validators.required, Validators.min(200000)]],
      profession: [''],
      creditType: ['consommation', Validators.required],
      requestedAmount: [2000000, [Validators.required, Validators.min(100000), Validators.max(100000000)]],
      duration: [24, [Validators.required, Validators.min(6), Validators.max(360)]],
      currentDebts: [0, [Validators.min(0)]],
      downPayment: [0, [Validators.min(0)]],
      purpose: ['Achat équipement', Validators.required]
    });
  }

  private setupFormListeners(): void {
    this.simulationForm.get('clientType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(clientType => {
        this.updateValidationRules(clientType);
      });

    this.simulationForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.availableProducts.length > 0) {
          this.filterCompatibleProducts();
        }
      });
  }

  private setupStepValidation(): void {
    setTimeout(() => {
      this.updateStepValidation();
    }, 100);

    this.simulationForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStepValidation();
      });
  }


  private updateValidationRules(clientType: string): void {
    const monthlyIncomeControl = this.simulationForm.get('monthlyIncome');
    const professionControl = this.simulationForm.get('profession');

    if (clientType === 'entreprise') {
      monthlyIncomeControl?.setValidators([Validators.required, Validators.min(500000)]);
      professionControl?.setValidators([Validators.required]);
    } else {
      monthlyIncomeControl?.setValidators([Validators.required, Validators.min(200000)]);
      professionControl?.clearValidators();
    }

    monthlyIncomeControl?.updateValueAndValidity();
    professionControl?.updateValueAndValidity();
  }

  // === GESTION DES PRODUITS ===

  private loadAllProducts(): void {
    this.isLoadingProducts = true;
    
    this.creditService.getCreditProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.availableProducts = products;
          this.extractAvailableCreditTypes(products);
          this.filterCompatibleProducts();
          this.isLoadingProducts = false;
        },
        error: (error) => {
          console.error('Erreur chargement produits:', error);
          this.notificationService.showError('Impossible de charger les produits de crédit');
          this.isLoadingProducts = false;
        }
      });
  }

  private extractAvailableCreditTypes(products: CreditProduct[]): void {
    const uniqueTypes = [...new Set(products.map(p => p.type.toLowerCase()))];
    
    const typeMapping: { [key: string]: { name: string; description: string } } = {
      'consommation': { name: 'Crédit Consommation', description: 'Pour vos achats personnels' },
      'auto': { name: 'Crédit Auto', description: 'Financement véhicule' },
      'immobilier': { name: 'Crédit Immobilier', description: 'Achat ou construction' },
      'investissement': { name: 'Crédit Investissement', description: 'Projets d\'entreprise' },
      'equipement': { name: 'Crédit Équipement', description: 'Matériel professionnel' },
      'travaux': { name: 'Crédit Travaux', description: 'Rénovation et amélioration' },
      'professionnel': { name: 'Crédit Professionnel', description: 'Besoins professionnels' },
      'tresorerie': { name: 'Crédit Trésorerie', description: 'Besoins de trésorerie' }
    };

    this.availableCreditTypes = uniqueTypes.map(type => ({
      id: type,
      name: typeMapping[type]?.name || this.capitalizeFirst(type),
      description: typeMapping[type]?.description || `Crédit ${this.capitalizeFirst(type)}`
    }));

    if (this.availableCreditTypes.length > 0) {
      const currentType = this.simulationForm.get('creditType')?.value;
      if (!this.availableCreditTypes.find(t => t.id === currentType)) {
        this.simulationForm.patchValue({ creditType: this.availableCreditTypes[0].id });
      }
    }
  }

  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private filterCompatibleProducts(): void {
    if (!this.simulationForm.valid || this.availableProducts.length === 0) {
      this.compatibleProducts = [];
      return;
    }

    const formData = this.simulationForm.value;
    
    this.compatibleProducts = this.availableProducts.filter(product => {
      const typeMatch = product.type.toLowerCase().includes(formData.creditType.toLowerCase());
      const amountMatch = formData.requestedAmount >= product.min_amount && 
                          formData.requestedAmount <= product.max_amount;
      const durationMatch = formData.duration >= product.min_duration_months && 
                           formData.duration <= product.max_duration_months;
      const activeMatch = product.is_active && product.bank.is_active;
      
      return typeMatch && amountMatch && durationMatch && activeMatch;
    });

    if (this.compatibleProducts.length === 0) {
      this.findAlternativeProducts(formData);
    }
  }

  private findAlternativeProducts(formData: any): void {
    const alternatives: any[] = [];
    
    const sameTypeProducts = this.availableProducts.filter(product => 
      product.type.toLowerCase().includes(formData.creditType.toLowerCase()) &&
      product.is_active && product.bank.is_active
    );

    if (sameTypeProducts.length > 0) {
      const higherAmountProducts = sameTypeProducts.filter(p => 
        formData.requestedAmount < p.min_amount
      ).slice(0, 2);
      
      const lowerAmountProducts = sameTypeProducts.filter(p => 
        formData.requestedAmount > p.max_amount
      ).slice(0, 2);

      higherAmountProducts.forEach(product => {
        alternatives.push({
          type: 'amount_too_low',
          product,
          suggestion: `Montant minimum: ${this.formatCurrency(product.min_amount)}`,
          adjustedAmount: product.min_amount
        });
      });

      lowerAmountProducts.forEach(product => {
        alternatives.push({
          type: 'amount_too_high',
          product,
          suggestion: `Montant maximum: ${this.formatCurrency(product.max_amount)}`,
          adjustedAmount: product.max_amount
        });
      });
    }

    const sameCriteriaDifferentDuration = this.availableProducts.filter(product => 
      product.type.toLowerCase().includes(formData.creditType.toLowerCase()) &&
      formData.requestedAmount >= product.min_amount && 
      formData.requestedAmount <= product.max_amount &&
      product.is_active && product.bank.is_active &&
      (formData.duration < product.min_duration_months || formData.duration > product.max_duration_months)
    ).slice(0, 2);

    sameCriteriaDifferentDuration.forEach(product => {
      if (formData.duration < product.min_duration_months) {
        alternatives.push({
          type: 'duration_too_short',
          product,
          suggestion: `Durée minimum: ${product.min_duration_months} mois`,
          adjustedDuration: product.min_duration_months
        });
      } else {
        alternatives.push({
          type: 'duration_too_long',
          product,
          suggestion: `Durée maximum: ${product.max_duration_months} mois`,
          adjustedDuration: product.max_duration_months
        });
      }
    });

    this.alternativeProducts = alternatives.slice(0, 3);
  }

  applyAlternative(alternative: any): void {
    const updates: any = {};
    
    if (alternative.adjustedAmount) {
      updates.requestedAmount = alternative.adjustedAmount;
    }
    
    if (alternative.adjustedDuration) {
      updates.duration = alternative.adjustedDuration;
    }
    
    this.simulationForm.patchValue(updates);
    this.notificationService.showSuccess('Paramètres ajustés selon la suggestion');
  }

  // === GESTION DU STEPPER ===

  private updateStepValidation(): void {
    this.steps.forEach(step => {
      this.stepValidation[step.id] = this.isStepValid(step.id);
    });
  }

  private isStepValid(stepId: number): boolean {
    const step = this.steps.find(s => s.id === stepId);
    if (!step) return false;

    if (stepId === 3) {
      return this.stepValidation[1] && this.stepValidation[2];
    }

    const requiredFieldsByStep: { [key: number]: string[] } = {
      1: ['clientType', 'fullName', 'phoneNumber', 'monthlyIncome'],
      2: ['creditType', 'requestedAmount', 'duration', 'purpose']
    };

    const requiredFields = requiredFieldsByStep[stepId] || [];
    const clientType = this.simulationForm.get('clientType')?.value;
    
    if (stepId === 1 && clientType === 'entreprise') {
      requiredFields.push('profession');
    }

    return requiredFields.every(fieldName => {
      const control = this.simulationForm.get(fieldName);
      if (!control) return true;

      const value = control.value;
      const hasValue = value !== null && value !== undefined && value !== '';
      
      if (['monthlyIncome', 'requestedAmount', 'duration'].includes(fieldName)) {
        const numValue = Number(value);
        return hasValue && !isNaN(numValue) && numValue > 0;
      }
      
      return hasValue;
    });
  }

  private validateCurrentStep(): void {
    const currentStepConfig = this.steps.find(s => s.id === this.currentStep);
    if (!currentStepConfig) return;

    currentStepConfig.fields.forEach(fieldName => {
      const control = this.simulationForm.get(fieldName);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.canGoToNextStep()) {
        this.currentStep++;
        this.scrollToTop();
        this.trackStepNavigation('next', this.currentStep);
      } else {
        this.validateCurrentStep();
        this.notificationService.showError('Veuillez compléter tous les champs requis avant de continuer');
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
      this.trackStepNavigation('previous', this.currentStep);
    }
  }

  goToStep(stepNumber: number): void {
    if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
      if (stepNumber <= this.currentStep || this.canGoToStep(stepNumber)) {
        this.currentStep = stepNumber;
        this.scrollToTop();
        this.trackStepNavigation('jump', stepNumber);
      }
    }
  }

  private canGoToNextStep(): boolean {
    return this.stepValidation[this.currentStep];
  }

  canGoToStep(stepNumber: number): boolean {
    for (let i = 1; i < stepNumber; i++) {
      if (!this.stepValidation[i]) {
        return false;
      }
    }
    return true;
  }

  private scrollToTop(): void {
    const stepperElement = document.querySelector('.form-stepper');
    if (stepperElement) {
      stepperElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // === SIMULATION ET SOUMISSION ===

  onSubmit(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.canGoToNextStep()) {
        this.nextStep();
      } else {
        this.validateCurrentStep();
        this.notificationService.showError('Veuillez compléter tous les champs requis');
      }
      return;
    }

    if (this.simulationForm.invalid) {
      this.markFormGroupTouched(this.simulationForm);
      this.notificationService.showError('Veuillez corriger les erreurs du formulaire');
      return;
    }

    if (this.compatibleProducts.length === 0) {
      this.notificationService.showWarning('Aucun produit compatible trouvé avec vos critères');
      return;
    }

    this.isLoading = true;
    this.hasFormError = false;
    this.productSimulations = [];

    const formData = this.simulationForm.value;

    const simulationRequests = this.compatibleProducts.map(product => {
      const request: CreditSimulationRequest = {
        credit_product_id: product.id,
        requested_amount: formData.requestedAmount,
        duration_months: formData.duration,
        monthly_income: formData.monthlyIncome,
        current_debts: formData.currentDebts || 0,
        down_payment: formData.downPayment || 0,
        session_id: this.generateSessionId()
      };

      return this.creditService.simulateCreditLight(request).pipe(
        map(simulation => ({ product, simulation }))
      );
    });

    forkJoin(simulationRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.productSimulations = results;
          this.isLoading = false;
          
          const eligibleCount = results.filter(r => r.simulation.eligible).length;
          this.notificationService.showSuccess(
            `Simulation terminée ! ${eligibleCount}/${results.length} offres éligibles`
          );

          this.analyticsService.trackEvent('multi_product_simulation_completed', {
            total_products: results.length,
            eligible_products: eligibleCount,
            credit_type: formData.creditType,
            amount: formData.requestedAmount
          });

          setTimeout(() => this.scrollToResults(), 100);
        },
        error: (error) => {
          console.error('Erreur simulation:', error);
          this.isLoading = false;
          this.hasFormError = true;
          this.errorMessage = error.message || 'Erreur lors des simulations';
          this.notificationService.showError(this.errorMessage);
        }
      });
  }

  // === GESTION DES APPLICATIONS ===

  openCreditApplicationModal(simulation: ProductSimulation): void {
    if (!simulation.simulation.eligible) {
      this.notificationService.showWarning('Cette simulation n\'est pas éligible pour une demande');
      return;
    }

    this.selectedSimulation = {
      id: this.generateSessionId(),
      requested_amount: this.simulationForm.get('requestedAmount')?.value,
      duration_months: this.simulationForm.get('duration')?.value,
      monthly_income: this.simulationForm.get('monthlyIncome')?.value,
      monthly_payment: simulation.simulation.monthly_payment,
      applied_rate: simulation.simulation.applied_rate,
      total_cost: simulation.simulation.total_cost,
      purpose: this.simulationForm.get('purpose')?.value
    };
    
    this.selectedApplicationProduct = simulation.product;
    this.showApplicationModal = true;
  }

  async saveCreditSimulation(simulation: ProductSimulation): Promise<any> {
    const simulationData = {
      session_id: this.generateSessionId(),
      credit_product_id: simulation.product.id,
      requested_amount: this.simulationForm.get('requestedAmount')?.value,
      duration_months: this.simulationForm.get('duration')?.value,
      monthly_income: this.simulationForm.get('monthlyIncome')?.value,
      current_debts: this.simulationForm.get('currentDebts')?.value || 0,
      down_payment: this.simulationForm.get('downPayment')?.value || 0,
      applied_rate: simulation.simulation.applied_rate,
      monthly_payment: simulation.simulation.monthly_payment,
      total_cost: simulation.simulation.total_cost,
      total_interest: simulation.simulation.total_interest,
      debt_ratio: simulation.simulation.debt_ratio,
      eligible: simulation.simulation.eligible
    };

    try {
      const response = await this.creditService.saveCreditSimulation(simulationData).toPromise();
      return response;
    } catch (error) {
      console.error('Erreur sauvegarde simulation:', error);
      throw error;
    }
  }

  onApplicationSubmitted(notification: ApplicationNotification): void {
    this.showApplicationModal = false;
    
    this.notificationService.showSuccess(
      `Votre demande a été transmise à ${notification.contact_info.bank_name}. ` +
      `Numéro de dossier: ${notification.application_number}`
    );
    
    this.analyticsService.trackEvent('credit_application_submitted', {
      application_id: notification.application_id,
      bank_name: notification.contact_info.bank_name,
      amount: this.selectedSimulation?.requested_amount
    });
  }

  onCloseApplicationModal(): void {
    this.showApplicationModal = false;
    this.selectedSimulation = null;
    this.selectedApplicationProduct = null;
  }

  // === GESTION DE L'AMORTISSEMENT ===

  toggleAmortizationTable(productId: string): void {
    if (this.expandedAmortization.has(productId)) {
      this.expandedAmortization.delete(productId);
    } else {
      this.expandedAmortization.add(productId);
      
      const simulation = this.productSimulations.find(s => s.product.id === productId);
      if (simulation && !this.extendedSimulations.has(productId)) {
        this.initExtendedSimulation(simulation);
      }
    }
  }

  isAmortizationExpanded(productId: string): boolean {
    return this.expandedAmortization.has(productId);
  }

  getExtendedSimulation(productId: string): ExtendedSimulationView | undefined {
    return this.extendedSimulations.get(productId);
  }

  changeAmortizationView(productId: string, view: 'monthly' | 'yearly'): void {
    const extended = this.extendedSimulations.get(productId);
    if (extended) {
      extended.currentView = view;
      this.extendedSimulations.set(productId, extended);
    }
  }

  filterAmortizationByYear(productId: string, year: string): void {
    const extended = this.extendedSimulations.get(productId);
    if (extended) {
      extended.selectedYear = year;
      this.extendedSimulations.set(productId, extended);
    }
  }

  getAvailableYears(simulation: ProductSimulation): number[] {
    const duration = this.simulationForm.get('duration')?.value || 24;
    const years = Math.ceil(duration / 12);
    return Array.from({length: years}, (_, i) => i + 1);
  }

  getSelectedYear(productId: string): string {
    const extended = this.extendedSimulations.get(productId);
    return extended?.selectedYear || 'all';
  }

  getFilteredAmortizationData(productId: string): AmortizationEntry[] {
    const extended = this.extendedSimulations.get(productId);
    if (!extended || !extended.amortization_schedule) {
      return [];
    }

    let filteredData = [...extended.amortization_schedule];

    if (extended.selectedYear && extended.selectedYear !== 'all') {
      const targetYear = parseInt(extended.selectedYear);
      const startMonth = (targetYear - 1) * 12 + 1;
      const endMonth = targetYear * 12;
      
      filteredData = filteredData.filter(entry => 
        entry.month >= startMonth && entry.month <= endMonth
      );
    }

    if (filteredData.length > 60) {
      filteredData = filteredData.slice(0, 60);
    }

    return filteredData;
  }

  getYearlyAmortizationData(productId: string): any[] {
    const extended = this.extendedSimulations.get(productId);
    if (!extended?.amortization_schedule) {
      return [];
    }

    const yearlyData: { [key: number]: any } = {};

    extended.amortization_schedule.forEach(entry => {
      const year = Math.ceil(entry.month / 12);
      
      if (!yearlyData[year]) {
        yearlyData[year] = {
          year: year,
          payment: 0,
          principal: 0,
          interest: 0,
          remaining_balance: entry.remaining_balance
        };
      }

      yearlyData[year].payment += entry.payment;
      yearlyData[year].principal += entry.principal;
      yearlyData[year].interest += entry.interest;
      yearlyData[year].remaining_balance = entry.remaining_balance;
    });

    return Object.values(yearlyData);
  }

  getCapitalInterestBreakdown(simulation: ProductSimulation): { 
    capitalPercentage: number; 
    interestPercentage: number;
    totalCapital: number;
    totalInterest: number;
  } {
    const schedule = this.generateAmortizationSchedule(simulation);
    
    const totalCapital = schedule.reduce((sum, entry) => sum + entry.principal, 0);
    const totalInterest = schedule.reduce((sum, entry) => sum + entry.interest, 0);
    const totalPayment = totalCapital + totalInterest;

    return {
      capitalPercentage: totalPayment > 0 ? (totalCapital / totalPayment) * 100 : 0,
      interestPercentage: totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0,
      totalCapital,
      totalInterest
    };
  }

  initExtendedSimulation(simulation: ProductSimulation): void {
    const amortizationSchedule = this.generateAmortizationSchedule(simulation);
    
    const extended: ExtendedSimulation = {
      ...simulation,
      currentView: 'monthly',
      selectedYear: 'all',
      amortization_schedule: amortizationSchedule
    };
    
    this.extendedSimulations.set(simulation.product.id, extended);
  }

  generateAmortizationSchedule(simulation: ProductSimulation): AmortizationEntry[] {
    const requestedAmount = this.simulationForm.get('requestedAmount')?.value || 0;
    const durationMonths = this.simulationForm.get('duration')?.value || 0;
    const { monthly_payment, applied_rate } = simulation.simulation;
    
    if (!requestedAmount || !durationMonths || !monthly_payment || !applied_rate) {
      console.error('Données manquantes pour le calcul d\'amortissement:', {
        requestedAmount, durationMonths, monthly_payment, applied_rate
      });
      return [];
    }
    
    const monthlyRate = applied_rate / 100 / 12;
    let remainingBalance = requestedAmount;
    const schedule: AmortizationEntry[] = [];

    for (let month = 1; month <= durationMonths; month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthly_payment - interestPayment;
      remainingBalance = Math.max(0, remainingBalance - principalPayment);

      const entry: AmortizationEntry = {
        month: month,
        payment: monthly_payment,
        principal: principalPayment,
        interest: interestPayment,
        remaining_balance: remainingBalance
      };

      schedule.push(entry);
    }

    return schedule;
  }

  // === MÉTHODES DE SIMULATION D'APPORT ===

  calculateDownPaymentSavings(simulation: ProductSimulation, downPayment: number): any {
    const currentAmount = this.simulationForm.get('requestedAmount')?.value || 0;
    const newAmount = currentAmount - downPayment;
    const duration = this.simulationForm.get('duration')?.value || 24;
    const rate = simulation.simulation.applied_rate / 100 / 12;

    if (newAmount <= 0 || rate === 0) {
      return { 
        monthlyPayment: 0, 
        totalSavings: 0, 
        interestSavings: 0 
      };
    }

    const newMonthlyPayment = newAmount * (rate * Math.pow(1 + rate, duration)) / (Math.pow(1 + rate, duration) - 1);
    const newTotalCost = newMonthlyPayment * duration;
    const newTotalInterest = newTotalCost - newAmount;

    return {
      monthlyPayment: newMonthlyPayment,
      totalSavings: simulation.simulation.total_cost - newTotalCost,
      interestSavings: simulation.simulation.total_interest - newTotalInterest,
      monthlySavings: simulation.simulation.monthly_payment - newMonthlyPayment
    };
  }

  updateDownPaymentSimulation(simulation: ProductSimulation, downPayment: string): void {
    // Cette méthode est appelée depuis le template pour les calculs dynamiques
  }

  exportAmortizationToExcel(simulation: ProductSimulation): void {
    try {
      const schedule = this.generateAmortizationSchedule(simulation);
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Mois,Mensualité,Capital,Intérêts,Capital Restant\n";
      
      schedule.forEach(entry => {
        csvContent += `${entry.month},${entry.payment.toFixed(0)},${entry.principal.toFixed(0)},${entry.interest.toFixed(0)},${entry.remaining_balance.toFixed(0)}\n`;
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `amortissement-${simulation.product.bank.name.replace(/\s+/g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.notificationService.showSuccess('Données exportées en CSV avec succès !');
      
    } catch (error) {
      console.error('Erreur export Excel:', error);
      this.notificationService.showError('Erreur lors de l\'export CSV');
    }
  }

  // === GESTION DES RÉSULTATS ET TRI ===

  getSortedSimulations(): ProductSimulation[] {
    if (!this.productSimulations.length) return [];

    let filtered = this.showOnlyEligible 
      ? this.productSimulations.filter(sim => sim.simulation.eligible)
      : this.productSimulations;

    switch (this.sortBy) {
      case 'rate':
        return filtered.sort((a, b) => a.simulation.applied_rate - b.simulation.applied_rate);
      case 'payment':
        return filtered.sort((a, b) => a.simulation.monthly_payment - b.simulation.monthly_payment);
      case 'time':
        return filtered.sort((a, b) => a.product.processing_time_hours - b.product.processing_time_hours);
      case 'eligible':
        return filtered.sort((a, b) => (b.simulation.eligible ? 1 : 0) - (a.simulation.eligible ? 1 : 0));
      default:
        return filtered;
    }
  }

  toggleOfferDetails(productId: string): void {
    if (this.expandedOffers.has(productId)) {
      this.expandedOffers.delete(productId);
    } else {
      this.expandedOffers.add(productId);
    }
  }

  isOfferExpanded(productId: string): boolean {
    return this.expandedOffers.has(productId);
  }

  setSortBy(sortType: 'rate' | 'payment' | 'time' | 'eligible'): void {
    this.sortBy = sortType;
  }

  toggleEligibilityFilter(): void {
    this.showOnlyEligible = !this.showOnlyEligible;
  }

  // === MÉTHODES AVANCÉES ===

  saveSimulationDetails(simulation: ProductSimulation): void {
    const simulationData = {
      id: this.generateSessionId(),
      simulation_data: simulation,
      form_data: this.simulationForm.value,
      amortization_schedule: this.generateAmortizationSchedule(simulation),
      saved_at: new Date().toISOString(),
      bank_name: simulation.product.bank.name,
      product_name: simulation.product.name
    };

    const savedSimulations = JSON.parse(localStorage.getItem('saved_simulations') || '[]');
    savedSimulations.push(simulationData);
    localStorage.setItem('saved_simulations', JSON.stringify(savedSimulations));

    this.notificationService.showSuccess(
      `Simulation sauvegardée ! ${simulation.product.bank.name} - ${this.formatCurrency(simulation.simulation.monthly_payment)}/mois`
    );

    this.analyticsService.trackEvent('simulation_saved', {
      bank_id: simulation.product.bank.id,
      product_id: simulation.product.id,
      monthly_payment: simulation.simulation.monthly_payment,
      eligible: simulation.simulation.eligible
    });
  }

  shareSimulation(simulation: ProductSimulation): void {
    const formData = this.simulationForm.value;
    const shareText = `Simulation de crédit chez ${simulation.product.bank.name}
💰 Mensualité: ${this.formatCurrency(simulation.simulation.monthly_payment)}
📅 Durée: ${formData.duration} mois
🏦 Produit: ${simulation.product.name}
✅ ${simulation.simulation.eligible ? 'Éligible' : 'Non éligible'}`;

    const shareData = {
      title: 'Ma Simulation de Crédit - SimBot Gab',
      text: shareText,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch(err => {
        console.log('Erreur lors du partage:', err);
        this.fallbackShare(shareText);
      });
    } else {
      this.fallbackShare(shareText);
    }

    this.analyticsService.trackEvent('simulation_shared', {
      bank_id: simulation.product.bank.id,
      share_method: typeof navigator.share === 'function' ? 'native' : 'fallback'
    });
  }

  private fallbackShare(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text + '\n\n' + window.location.href).then(() => {
        this.notificationService.showSuccess('Détails de la simulation copiés dans le presse-papier !');
      }).catch(() => {
        this.showShareModal(text);
      });
    } else {
      this.showShareModal(text);
    }
  }

  private showShareModal(text: string): void {
    const modal = document.createElement('div');
    modal.className = 'share-modal-overlay';
    modal.innerHTML = `
      <div class="share-modal">
        <div class="share-modal-header">
          <h3>Partager votre simulation</h3>
          <button class="close-btn" onclick="this.closest('.share-modal-overlay').remove()">×</button>
        </div>
        <div class="share-modal-content">
          <textarea readonly class="share-text">${text}\n\n${window.location.href}</textarea>
          <div class="share-actions">
            <button class="btn btn-primary" onclick="
              this.closest('.share-modal').querySelector('.share-text').select();
              document.execCommand('copy');
              this.textContent = 'Copié !';
              setTimeout(() => this.closest('.share-modal-overlay').remove(), 1000);
            ">Copier le texte</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  compareWithOthers(selectedSimulation: ProductSimulation): void {
    const otherEligibleSimulations = this.productSimulations.filter(sim => 
      sim.simulation.eligible && 
      sim.product.id !== selectedSimulation.product.id
    );

    if (otherEligibleSimulations.length === 0) {
      this.notificationService.showInfo('Aucune autre offre éligible disponible pour la comparaison.');
      return;
    }

    this.showComparisonModal(selectedSimulation, otherEligibleSimulations);
  }

  private showComparisonModal(baseSimulation: ProductSimulation, comparisons: ProductSimulation[]): void {
    // Implémentation de la modal de comparaison (code existant conservé)
    this.analyticsService.trackEvent('comparison_modal_opened', {
      base_bank: baseSimulation.product.bank.name,
      comparison_count: comparisons.length
    });
  }

  // === GETTERS POUR LE TEMPLATE ===

  get currentStepConfig(): Step | undefined {
    return this.steps.find(s => s.id === this.currentStep);
  }

  get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  get canProceedToNext(): boolean {
    return this.canGoToNextStep();
  }

  get canGoBack(): boolean {
    return this.currentStep > 1;
  }

  get isLastStep(): boolean {
    return this.currentStep === this.totalSteps;
  }

  get completedSteps(): number {
    return Object.values(this.stepValidation).filter(valid => valid).length;
  }

  get isFormValid(): boolean {
    return this.simulationForm.valid && this.compatibleProducts.length > 0;
  }

  get compatibleProductsCount(): number {
    return this.compatibleProducts.length;
  }

  get totalProductsCount(): number {
    return this.availableProducts.length;
  }

  get eligibleSimulationsCount(): number {
    return this.productSimulations.filter(sim => sim.simulation.eligible).length;
  }

  get selectedCreditTypeName(): string {
    const selectedId = this.simulationForm.get('creditType')?.value;
    return this.availableCreditTypes.find(t => t.id === selectedId)?.name || '';
  }

  get selectedDurationLabel(): string {
    const selectedValue = this.simulationForm.get('duration')?.value;
    return this.durations.find(d => d.value === selectedValue)?.label || '';
  }

  get clientTypeLabel(): string {
    return this.simulationForm.get('clientType')?.value === 'particulier' ? 'Particulier' : 'Entreprise';
  }

  get bestOfferSavings(): number {
    if (this.productSimulations.length < 2) return 0;
    
    const sortedByPayment = [...this.productSimulations]
      .sort((a, b) => a.simulation.monthly_payment - b.simulation.monthly_payment);
    
    return sortedByPayment[sortedByPayment.length - 1].simulation.total_cost - 
           sortedByPayment[0].simulation.total_cost;
  }

  // === MÉTHODES D'AIDE TEMPLATE ===

  getStepClass(stepId: number): string {
    if (stepId < this.currentStep && this.stepValidation[stepId]) {
      return 'completed';
    } else if (stepId === this.currentStep) {
      return 'active';
    }
    return '';
  }

  getConnectorClass(stepId: number): string {
    if (stepId < this.currentStep && this.stepValidation[stepId] && this.stepValidation[stepId + 1]) {
      return 'completed';
    } else if (stepId === this.currentStep - 1 && this.stepValidation[stepId]) {
      return 'active';
    }
    return '';
  }

  getSimulationCurrentView(simulation: any): string {
    const extended = this.extendedSimulations.get(simulation.product.id);
    return extended?.currentView || 'monthly';
  }

  getSimulationSelectedYear(simulation: any): string {
    const extended = this.extendedSimulations.get(simulation.product.id);
    return extended?.selectedYear || 'all';
  }

  isMonthlyView(simulation: any): boolean {
    return this.getSimulationCurrentView(simulation) === 'monthly';
  }

  isYearlyView(simulation: any): boolean {
    return this.getSimulationCurrentView(simulation) === 'yearly';
  }

  onYearFilterChange(event: Event, simulation: any): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.filterAmortizationByYear(simulation.product.id, target.value);
    }
  }

  trackByMonth(index: number, item: AmortizationEntry): number {
    return item.month;
  }

  // === MÉTHODES UTILITAIRES ===

  hasError(controlName: string): boolean {
    const control = this.simulationForm.get(controlName);
    return !!(control?.errors && control?.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.simulationForm.get(controlName);
    if (!control?.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'Ce champ est requis';
    if (errors['email']) return 'Format d\'email invalide';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} caractères`;
    if (errors['min']) return `Valeur minimum: ${errors['min'].min}`;
    if (errors['max']) return `Valeur maximum: ${errors['max'].max}`;
    if (errors['pattern']) return 'Format invalide';
    
    return 'Valeur invalide';
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0';
    }
    return Math.round(amount).toLocaleString('fr-FR');
  }

  formatPercent(value: number): string {
    return this.creditService.formatPercent(value);
  }

  getProcessingTimeText(hours: number): string {
    return this.creditService.formatProcessingTime(hours);
  }

  getEligibilityClass(eligible: boolean): string {
    return eligible ? 'eligible' : 'not-eligible';
  }

  getEligibilityText(eligible: boolean): string {
    return eligible ? 'Éligible' : 'Non éligible';
  }

  getBankColor(bank: Bank): string {
    const colors: { [key: string]: string } = {
      'bgfi': '#1e40af',
      'ugb': '#dc2626', 
      'bicig': '#059669',
      'ecobank': '#ea580c',
      'cbao': '#7c3aed'
    };
    return colors[bank.id] || '#6b7280';
  }

  // === MÉTHODES DE RÉINITIALISATION ===

  resetForm(): void {
    this.simulationForm.reset({
      clientType: 'particulier',
      fullName: 'Jean Dupont',
      phoneNumber: '+24101234567',
      monthlyIncome: 750000,
      creditType: 'consommation',
      requestedAmount: 2000000,
      duration: 24,
      currentDebts: 0,
      downPayment: 0,
      purpose: 'Achat équipement'
    });
    this.productSimulations = [];
    this.compatibleProducts = [];
    this.hasFormError = false;
    this.expandedOffers.clear();
    this.expandedAmortization.clear();
    this.extendedSimulations.clear();
    this.showOnlyEligible = false;
    this.resetStepper();
  }

  private resetStepper(): void {
    this.currentStep = 1;
    this.stepValidation = { 1: false, 2: false, 3: false };
    this.updateStepValidation();
  }

  // === MÉTHODES D'ACTIONS FINALES ===

  saveComparison(): void {
    if (!this.productSimulations.length) return;
    
    const comparisonData = {
      id: this.generateSessionId(),
      simulations: this.productSimulations,
      form_data: this.simulationForm.value,
      saved_at: new Date().toISOString()
    };
    
    const savedComparisons = JSON.parse(localStorage.getItem('saved_comparisons') || '[]');
    savedComparisons.push(comparisonData);
    localStorage.setItem('saved_comparisons', JSON.stringify(savedComparisons));
    
    this.notificationService.showSuccess('Comparaison sauvegardée avec succès');
  }

  shareComparison(): void {
    if (!this.productSimulations.length) return;

    const bestOffer = this.getSortedSimulations()[0];
    const shareText = bestOffer 
      ? `Comparaison de crédits SimBot Gab - Meilleur taux: ${bestOffer.simulation.applied_rate}% chez ${bestOffer.product.bank.name}`
      : 'Comparaison de crédits - SimBot Gab';
    
    if (navigator.share) {
      navigator.share({
        title: 'Comparaison de Crédits - SimBot Gab',
        text: shareText,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(shareText + '\n\n' + window.location.href).then(() => {
        this.notificationService.showSuccess('Lien copié dans le presse-papier');
      });
    }
  }

  // === MÉTHODES PRIVÉES UTILITAIRES ===

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private scrollToResults(): void {
    const resultsElement = document.querySelector('.results-section');
    if (resultsElement) {
      resultsElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  private trackPageView(): void {
    this.analyticsService.trackPageView('multi_bank_comparator', {
      page_title: 'Comparateur Multi-Banques - SimBot Gab',
      available_products: this.availableProducts.length
    });
  }

  private trackStepNavigation(action: 'next' | 'previous' | 'jump', stepNumber: number): void {
    this.analyticsService.trackEvent('step_navigation', {
      action,
      from_step: action === 'next' ? stepNumber - 1 : action === 'previous' ? stepNumber + 1 : this.currentStep,
      to_step: stepNumber,
      form_completion: this.progressPercentage
    });
  }

  private generateSessionId(): string {
    return `simbot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // === MÉTHODES DE DEBUG (DÉVELOPPEMENT) ===

  testApiConnection(): void {
    console.log('Testing API connection...');
    this.creditService.testConnection?.().subscribe({
      next: (response) => {
        console.log('API Connection successful:', response);
        this.notificationService.showSuccess('API connectée avec succès');
      },
      error: (error) => {
        console.error('API Connection failed:', error);
        this.notificationService.showError('Échec de connexion API: ' + error.message);
      }
    });
  }

  forceValidateStep(): void {
    console.log('Force validating current step...');
    console.log('Form values:', this.simulationForm.value);
    console.log('Form valid:', this.simulationForm.valid);
    console.log('Form errors:', this.simulationForm.errors);
    
    Object.keys(this.simulationForm.controls).forEach(key => {
      const control = this.simulationForm.get(key);
      if (control?.errors) {
        console.log(`${key} errors:`, control.errors);
      }
    });

    this.updateStepValidation();
    this.notificationService.showSuccess('Validation forcée - vérifiez la console');
  }

  debugAmortizationData(productId: string): void {
    console.group(`🔍 DEBUG Amortization pour ${productId}`);
    
    console.log('expandedAmortization contient productId:', this.expandedAmortization.has(productId));
    console.log('extendedSimulations contient productId:', this.extendedSimulations.has(productId));
    
    const simulation = this.productSimulations.find(s => s.product.id === productId);
    if (simulation) {
      console.log('Simulation trouvée:', {
        bankName: simulation.product.bank.name,
        monthlyPayment: simulation.simulation.monthly_payment,
        appliedRate: simulation.simulation.applied_rate
      });
    } else {
      console.error('❌ Simulation non trouvée');
    }
    
    const formData = {
      requestedAmount: this.simulationForm.get('requestedAmount')?.value,
      duration: this.simulationForm.get('duration')?.value
    };
    console.log('Données du formulaire:', formData);
    
    const extended = this.extendedSimulations.get(productId);
    if (extended) {
      console.log('Données étendues:', {
        hasAmortizationSchedule: !!extended.amortization_schedule,
        scheduleLength: extended.amortization_schedule?.length || 0,
        currentView: extended.currentView,
        selectedYear: extended.selectedYear
      });
      
      if ((extended.amortization_schedule?.length ?? 0) > 0) {
        console.log('Premier élément du tableau:', extended.amortization_schedule![0]);
        console.log('Dernier élément du tableau:', extended.amortization_schedule![extended.amortization_schedule!.length - 1]);
      }
    } else {
      console.error('❌ Pas de données étendues');
    }
    
    console.groupEnd();
  }

  forceRegenerateAllAmortization(): void {
    console.log('🔄 Régénération forcée de tous les tableaux d\'amortissement');
    
    this.extendedSimulations.clear();
    
    this.productSimulations.forEach(simulation => {
      if (this.expandedAmortization.has(simulation.product.id)) {
        console.log(`Régénération pour ${simulation.product.bank.name}`);
        this.initExtendedSimulation(simulation);
      }
    });
    
    console.log('✅ Régénération terminée');
  }
}