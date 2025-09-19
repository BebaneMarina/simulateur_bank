// multi-bank-comparator.component.ts - Version avec stepper
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Observable, forkJoin } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { AmortizationEntry } from '../../models/amortization.interface';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

// SimulationData interface moved to top-level scope
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
    ApplicationModalComponent  // Ajout de l'import manquant
  ],
  providers: [PdfService],
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


// Export tableau d'amortissement détaillé
exportAmortizationToPDF(simulation: ProductSimulation): void {
  const simulationData: SimulationData = {
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

  const amortizationSchedule = this.generateAmortizationSchedule(simulation);
  this.pdfService.generateAmortizationPDF(simulationData, amortizationSchedule);
  
  this.notificationService.showSuccess('PDF d\'amortissement généré avec succès !');
}

// Export comparaison multi-banques
exportComparisonToPDF(): void {
  if (this.productSimulations.length === 0) {
    this.notificationService.showWarning('Aucune simulation à exporter');
    return;
  }
  
  this.pdfService.generateComparisonPDF(this.productSimulations);
  this.notificationService.showSuccess('PDF de comparaison généré avec succès !');
}

// Export synthèse express (1 page)
exportQuickSummaryPDF(simulation: ProductSimulation): void {
  const simulationData: SimulationData = {
    bank_name: simulation.product.bank.name,
    product_name: simulation.product.name,
    requested_amount: this.simulationForm.get('requestedAmount')?.value || 0,
    duration_months: this.simulationForm.get('duration')?.value || 0,
    applied_rate: simulation.simulation.applied_rate,
    monthly_payment: simulation.simulation.monthly_payment,
    total_cost: simulation.simulation.total_cost,
    total_interest: simulation.simulation.total_interest,
    debt_ratio: simulation.simulation.debt_ratio,
    eligible: simulation.simulation.eligible
  };
  
  this.pdfService.generateQuickSummaryPDF(simulationData);
  this.notificationService.showSuccess('Synthèse PDF générée avec succès !');
}

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

  // Version encore plus simple - remplace la méthode existante

openCreditApplicationModal(simulation: ProductSimulation): void {
  if (!simulation.simulation.eligible) {
    this.notificationService.showWarning('Cette simulation n\'est pas éligible pour une demande');
    return;
  }

  // Ouvrir directement le modal avec les données de simulation
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
  
  // Correction de la méthode pour typer correctement le paramètre
  onApplicationSubmitted(notification: ApplicationNotification): void {
    console.log('Application submitted:', notification);
    
    // Fermer le modal
    this.showApplicationModal = false;
    
    // Afficher une notification de succès supplémentaire
    this.notificationService.showSuccess(
      `Votre demande a été transmise à ${notification.contact_info.bank_name}. ` +
      `Numéro de dossier: ${notification.application_number}`
    );
    
    // Optionnel: tracker l'événement
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

  private setupStepValidation(): void {
    // Validation immédiate des valeurs par défaut
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

    console.log('Types de crédit disponibles:', this.availableCreditTypes);

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

//  Méthode pour obtenir une simulation étendue
getExtendedSimulation(productId: string): ExtendedSimulationView | undefined {
  return this.extendedSimulations.get(productId);
}

// Version corrigée de toggleAmortizationTable
toggleAmortizationTable(productId: string): void {
  console.log('Toggle amortization pour productId:', productId);
  
  if (this.expandedAmortization.has(productId)) {
    this.expandedAmortization.delete(productId);
    console.log('Tableau masqué pour:', productId);
  } else {
    this.expandedAmortization.add(productId);
    console.log('Tableau affiché pour:', productId);
    
    // Trouver la simulation correspondante
    const simulation = this.productSimulations.find(s => s.product.id === productId);
    if (simulation) {
      // Initialiser les données étendues si nécessaire
      if (!this.extendedSimulations.has(productId)) {
        console.log('Initialisation des données étendues...');
        this.initExtendedSimulation(simulation);
      }
    } else {
      console.error('Simulation non trouvée pour productId:', productId);
    }
  }
  
  console.log('État expandedAmortization:', Array.from(this.expandedAmortization));
  console.log('Simulations étendues:', Array.from(this.extendedSimulations.keys()));
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
changeAmortizationView(productId: string, view: 'monthly' | 'yearly'): void {
  const extended = this.extendedSimulations.get(productId);
  if (extended) {
    extended.currentView = view;
    this.extendedSimulations.set(productId, extended);
  }
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

  private updateStepValidation(): void {
    this.steps.forEach(step => {
      this.stepValidation[step.id] = this.isStepValid(step.id);
    });
    
    console.log('Step validation updated:', this.stepValidation);
    console.log('Current step:', this.currentStep);
    console.log('Can proceed to next:', this.canProceedToNext);
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

    const isValid = requiredFields.every(fieldName => {
      const control = this.simulationForm.get(fieldName);
      if (!control) return true;

      const value = control.value;
      const hasValue = value !== null && value !== undefined && value !== '';
      
      if (['monthlyIncome', 'requestedAmount', 'duration'].includes(fieldName)) {
        const numValue = Number(value);
        const isValidNumber = !isNaN(numValue) && numValue > 0;
        
        console.log(`Field ${fieldName}:`, {
          value,
          numValue,
          isValidNumber,
          hasValue,
          isValid: hasValue && isValidNumber
        });
        
        return hasValue && isValidNumber;
      }
      
      console.log(`Field ${fieldName}:`, {
        value,
        hasValue,
        isValid: hasValue
      });
      
      return hasValue;
    });

    console.log(`Step ${stepId} validation result:`, isValid, 'Required fields:', requiredFields);
    return isValid;
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

  // Méthodes de navigation du stepper
  nextStep(): void {
    console.log('Attempting to go to next step from:', this.currentStep);
    console.log('Can proceed:', this.canProceedToNext);
    console.log('Step validations:', this.stepValidation);
    
    if (this.currentStep < this.totalSteps) {
      if (this.canGoToNextStep()) {
        this.currentStep++;
        this.scrollToTop();
        this.trackStepNavigation('next', this.currentStep);
        console.log('Moved to step:', this.currentStep);
      } else {
        this.validateCurrentStep();
        this.notificationService.showError('Veuillez compléter tous les champs requis avant de continuer');
        console.log('Cannot proceed - validation failed');
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

  applyToOffer(simulation: ProductSimulation): void {
    const product = simulation.product;
    const sim = simulation.simulation;

    this.analyticsService.trackEvent('product_application_started', {
      product_id: product.id,
      bank_id: product.bank_id,
      bank_name: product.bank.name,
      interest_rate: sim.applied_rate,
      monthly_payment: sim.monthly_payment,
      eligible: sim.eligible
    });

    this.notificationService.showSuccess(
      `Demande transmise à ${product.bank.name}. Vous serez contacté sous ${this.getProcessingTimeText(product.processing_time_hours)}.`
    );
  }

  // Getters pour le template
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

  initExtendedSimulation(simulation: ProductSimulation): void {
  // Générer le tableau d'amortissement
  const amortizationSchedule = this.generateAmortizationSchedule(simulation);
  
  console.log('Initialisation simulation étendue pour:', simulation.product.id);
  console.log('Tableau généré:', amortizationSchedule.length, 'entrées');

  const extended: ExtendedSimulation = {
    ...simulation,
    currentView: 'monthly',
    selectedYear: 'all',
    amortization_schedule: amortizationSchedule
  };
  
  this.extendedSimulations.set(simulation.product.id, extended);
  console.log('Simulation étendue stockée:', this.extendedSimulations.get(simulation.product.id));
}
  // Méthodes supplémentaires à ajouter au composant MultiBankComparatorComponent

// Sauvegarder les détails d'une simulation
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

  // Sauvegarde locale (vous pouvez l'adapter pour sauvegarder via API)
  const savedSimulations = JSON.parse(localStorage.getItem('saved_simulations') || '[]');
  savedSimulations.push(simulationData);
  localStorage.setItem('saved_simulations', JSON.stringify(savedSimulations));

  this.notificationService.showSuccess(
    `Simulation sauvegardée ! ${simulation.product.bank.name} - ${this.formatCurrency(simulation.simulation.monthly_payment)}/mois`
  );

  // Tracking analytique
  this.analyticsService.trackEvent('simulation_saved', {
    bank_id: simulation.product.bank.id,
    product_id: simulation.product.id,
    monthly_payment: simulation.simulation.monthly_payment,
    eligible: simulation.simulation.eligible
  });
}

// Partager une simulation
shareSimulation(simulation: ProductSimulation): void {
  const formData = this.simulationForm.value;
  const shareText = `Simulation de crédit chez ${simulation.product.bank.name}
💰 Mensualité: ${this.formatCurrency(simulation.simulation.monthly_payment)}
📅 Durée: ${formData.duration} mois
🏦 Produit: ${simulation.product.name}
✅ ${simulation.simulation.eligible ? 'Éligible' : 'Non éligible'}`;

  const shareData = {
    title: 'Ma Simulation de Crédit - Bamboo',
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

// Partage de secours si l'API native n'est pas disponible
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

// Afficher une modal de partage personnalisée
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

  // Styles pour la modal
  const style = document.createElement('style');
  style.textContent = `
    .share-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .share-modal {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      padding: 0;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    .share-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .share-modal-header h3 {
      margin: 0;
      color: #1e293b;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #64748b;
    }
    .share-modal-content {
      padding: 1.5rem;
    }
    .share-text {
      width: 100%;
      height: 120px;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      resize: none;
      font-family: inherit;
      margin-bottom: 1rem;
    }
    .share-actions {
      display: flex;
      justify-content: flex-end;
    }
  `;
  document.head.appendChild(style);
}

// Comparer avec d'autres offres
compareWithOthers(selectedSimulation: ProductSimulation): void {
  // Filtrer les autres simulations éligibles
  const otherEligibleSimulations = this.productSimulations.filter(sim => 
    sim.simulation.eligible && 
    sim.product.id !== selectedSimulation.product.id
  );

  if (otherEligibleSimulations.length === 0) {
    this.notificationService.showInfo('Aucune autre offre éligible disponible pour la comparaison.');
    return;
  }

  // Créer une modal de comparaison
  this.showComparisonModal(selectedSimulation, otherEligibleSimulations);
}

// Afficher la modal de comparaison
private showComparisonModal(baseSimulation: ProductSimulation, comparisons: ProductSimulation[]): void {
  const modal = document.createElement('div');
  modal.className = 'comparison-modal-overlay';
  
  const comparisonRows = comparisons.map(sim => {
    const monthlyDiff = sim.simulation.monthly_payment - baseSimulation.simulation.monthly_payment;
    const totalDiff = sim.simulation.total_cost - baseSimulation.simulation.total_cost;
    
    return `
      <tr>
        <td class="bank-cell">
          <div class="bank-info-mini">
            <div class="bank-logo-mini" style="background: ${this.getBankColor(sim.product.bank)}">
              ${sim.product.bank.name.charAt(0)}
            </div>
            <span>${sim.product.bank.name}</span>
          </div>
        </td>
        <td class="rate-cell">${sim.simulation.applied_rate}%</td>
        <td class="payment-cell">
          ${this.formatCurrency(sim.simulation.monthly_payment)}
          <span class="diff ${monthlyDiff >= 0 ? 'negative' : 'positive'}">
            (${monthlyDiff >= 0 ? '+' : ''}${this.formatCurrency(monthlyDiff)})
          </span>
        </td>
        <td class="total-cell">
          ${this.formatCurrency(sim.simulation.total_cost)}
          <span class="diff ${totalDiff >= 0 ? 'negative' : 'positive'}">
            (${totalDiff >= 0 ? '+' : ''}${this.formatCurrency(totalDiff)})
          </span>
        </td>
        <td class="action-cell">
          <button class="btn-mini btn-primary" onclick="
            this.closest('.comparison-modal-overlay').remove();
            document.querySelector('[data-product-id=\\'${sim.product.id}\\']')?.scrollIntoView({behavior: 'smooth'});
          ">
            Voir détails
          </button>
        </td>
      </tr>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="comparison-modal">
      <div class="comparison-modal-header">
        <h3>Comparaison avec ${baseSimulation.product.bank.name}</h3>
        <button class="close-btn" onclick="this.closest('.comparison-modal-overlay').remove()">×</button>
      </div>
      <div class="comparison-modal-content">
        <div class="base-offer">
          <h4>Votre sélection de référence:</h4>
          <div class="base-offer-details">
            <span class="bank-name">${baseSimulation.product.bank.name}</span>
            <span class="monthly-payment">${this.formatCurrency(baseSimulation.simulation.monthly_payment)}/mois</span>
            <span class="rate">${baseSimulation.simulation.applied_rate}%</span>
          </div>
        </div>
        
        <div class="comparison-table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Banque</th>
                <th>Taux</th>
                <th>Mensualité</th>
                <th>Coût total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${comparisonRows}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Styles pour la modal de comparaison
  const style = document.createElement('style');
  style.textContent = `
    .comparison-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .comparison-modal {
      background: white;
      border-radius: 12px;
      width: 95%;
      max-width: 800px;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .comparison-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    
    .comparison-modal-content {
      padding: 1.5rem;
      overflow-y: auto;
      max-height: calc(80vh - 80px);
    }
    
    .base-offer {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .base-offer h4 {
      margin: 0 0 0.5rem 0;
      color: #1e40af;
    }
    
    .base-offer-details {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .bank-name {
      font-weight: 600;
      font-size: 1.1rem;
    }
    
    .monthly-payment {
      background: #1e40af;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }
    
    .comparison-table-container {
      overflow-x: auto;
    }
    
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .comparison-table th {
      background: #64748b;
      color: white;
      padding: 0.75rem;
      text-align: left;
      font-size: 0.9rem;
      font-weight: 600;
    }
    
    .comparison-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.9rem;
    }
    
    .comparison-table tbody tr:hover {
      background: #f8fafc;
    }
    
    .bank-info-mini {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .bank-logo-mini {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.8rem;
      font-weight: 600;
    }
    
    .payment-cell, .total-cell {
      position: relative;
    }
    
    .diff {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 0.25rem;
    }
    
    .diff.positive {
      color: #059669;
    }
    
    .diff.negative {
      color: #dc2626;
    }
    
    .btn-mini {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
    
    .btn-mini.btn-primary {
      background: #3b82f6;
      color: white;
    }
    
    .btn-mini:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  `;
  document.head.appendChild(style);

  this.analyticsService.trackEvent('comparison_modal_opened', {
    base_bank: baseSimulation.product.bank.name,
    comparison_count: comparisons.length
  });
}

// Générer un numéro de demande unique
generateApplicationNumber(): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `DEM-${timestamp}-${random}`;
}

// Obtenir la prochaine étape recommandée
getNextRecommendedStep(simulation: ProductSimulation): string {
  if (!simulation.simulation.eligible) {
    return 'Améliorer votre profil financier';
  }
  
  const debtRatio = simulation.simulation.debt_ratio;
  if (debtRatio > 30) {
    return 'Réduire vos charges mensuelles';
  }
  
  return 'Préparer vos documents et faire une demande';
}

// Calculer le score de l'offre pour le classement
calculateOfferScore(simulation: ProductSimulation): number {
  const weights = {
    eligibility: 0.4,
    rate: 0.3,
    monthly_payment: 0.2,
    processing_time: 0.1
  };

  const eligibilityScore = simulation.simulation.eligible ? 1 : 0;
  const rateScore = Math.max(0, (20 - simulation.simulation.applied_rate) / 20);
  const paymentScore = Math.max(0, (3000000 - simulation.simulation.monthly_payment) / 3000000);
  const timeScore = Math.max(0, (168 - simulation.product.processing_time_hours) / 168);

  return (
    eligibilityScore * weights.eligibility +
    rateScore * weights.rate +
    paymentScore * weights.monthly_payment +
    timeScore * weights.processing_time
  ) * 100;
}

// Vérifier si une simulation peut être améliorée
canImproveSimulation(simulation: ProductSimulation): boolean {
  const currentAmount = this.simulationForm.get('requestedAmount')?.value;
  const currentDuration = this.simulationForm.get('duration')?.value;
  
  // Vérifier si on peut réduire le montant
  const minAmount = simulation.product.min_amount;
  if (currentAmount > minAmount * 1.1) {
    return true;
  }
  
  // Vérifier si on peut allonger la durée
  const maxDuration = simulation.product.max_duration_months;
  if (currentDuration < maxDuration * 0.9) {
    return true;
  }
  
  // Vérifier si un apport pourrait aider
  const downPaymentThreshold = currentAmount * 0.1;
  if (downPaymentThreshold > 0) {
    return true;
  }
  
  return false;
}

// Obtenir des suggestions d'amélioration
getImprovementSuggestions(simulation: ProductSimulation): string[] {
  const suggestions: string[] = [];
  const currentAmount = this.simulationForm.get('requestedAmount')?.value;
  const currentDuration = this.simulationForm.get('duration')?.value;
  const currentDebts = this.simulationForm.get('currentDebts')?.value || 0;
  const debtRatio = simulation.simulation.debt_ratio;

  if (debtRatio > 33) {
    suggestions.push(`Réduisez vos charges actuelles de ${this.formatCurrency((debtRatio - 30) * this.simulationForm.get('monthlyIncome')?.value / 100)}`);
  }

  if (currentAmount > simulation.product.min_amount * 1.2) {
    const suggestedAmount = Math.max(simulation.product.min_amount, currentAmount * 0.9);
    suggestions.push(`Réduire le montant à ${this.formatCurrency(suggestedAmount)}`);
  }

  if (currentDuration < simulation.product.max_duration_months * 0.8) {
    const suggestedDuration = Math.min(simulation.product.max_duration_months, currentDuration + 12);
    suggestions.push(`Allonger la durée à ${suggestedDuration} mois`);
  }

  if ((this.simulationForm.get('downPayment')?.value || 0) < currentAmount * 0.1) {
    const suggestedDownPayment = currentAmount * 0.15;
    suggestions.push(`Prévoir un apport de ${this.formatCurrency(suggestedDownPayment)}`);
  }

  if (suggestions.length === 0) {
    suggestions.push('Votre profil est optimal pour ce produit');
  }

  return suggestions;
}

// Calculer l'impact d'une modification de durée
calculateDurationImpact(simulation: ProductSimulation, newDuration: number): any {
  const currentAmount = this.simulationForm.get('requestedAmount')?.value;
  const rate = simulation.simulation.applied_rate / 100 / 12;
  
  if (rate === 0) {
    const newMonthlyPayment = currentAmount / newDuration;
    return {
      monthly_payment: newMonthlyPayment,
      total_cost: newMonthlyPayment * newDuration,
      total_interest: 0,
      monthly_difference: newMonthlyPayment - simulation.simulation.monthly_payment,
      total_difference: (newMonthlyPayment * newDuration) - simulation.simulation.total_cost
    };
  }

  const newMonthlyPayment = currentAmount * (rate * Math.pow(1 + rate, newDuration)) / (Math.pow(1 + rate, newDuration) - 1);
  const newTotalCost = newMonthlyPayment * newDuration;
  const newTotalInterest = newTotalCost - currentAmount;

  return {
    monthly_payment: newMonthlyPayment,
    total_cost: newTotalCost,
    total_interest: newTotalInterest,
    monthly_difference: newMonthlyPayment - simulation.simulation.monthly_payment,
    total_difference: newTotalCost - simulation.simulation.total_cost
  };
}

// Obtenir les produits alternatifs de la même banque
getAlternativeProductsFromSameBank(simulation: ProductSimulation): CreditProduct[] {
  return this.availableProducts.filter(product => 
    product.bank_id === simulation.product.bank_id &&
    product.id !== simulation.product.id &&
    product.is_active
  );
}

// Estimer le délai de traitement réaliste
getRealisticProcessingTime(simulation: ProductSimulation): string {
  let baseHours = simulation.product.processing_time_hours;
  
  // Ajustements selon le profil
  if (simulation.simulation.debt_ratio > 30) {
    baseHours += 24; // Analyse plus approfondie
  }
  
  if (!this.simulationForm.get('email')?.value) {
    baseHours += 12; // Contact plus difficile
  }
  
  const currentDebts = this.simulationForm.get('currentDebts')?.value || 0;
  if (currentDebts > 0) {
    baseHours += 12; // Vérifications supplémentaires
  }

  return this.getProcessingTimeText(baseHours);
}

// Calculer la capacité d'emprunt résiduelle
calculateRemainingCapacity(simulation: ProductSimulation): number {
  const monthlyIncome = this.simulationForm.get('monthlyIncome')?.value;
  const maxDebtRatio = 33;
  const maxMonthlyDebt = (monthlyIncome * maxDebtRatio) / 100;
  const currentTotalDebt = simulation.simulation.monthly_payment + (this.simulationForm.get('currentDebts')?.value || 0);
  
  return Math.max(0, maxMonthlyDebt - currentTotalDebt);
}

// Formater le temps de traitement avec plus de détails
getDetailedProcessingTime(simulation: ProductSimulation): { min: string, max: string, average: string } {
  const baseHours = simulation.product.processing_time_hours;
  const minHours = baseHours * 0.8;
  const maxHours = baseHours * 1.5;
  
  return {
    min: this.getProcessingTimeText(minHours),
    max: this.getProcessingTimeText(maxHours),
    average: this.getProcessingTimeText(baseHours)
  };
}

formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  return Math.round(amount).toLocaleString('fr-FR');
}

// Obtenir les documents requis personnalisés
getPersonalizedRequiredDocuments(simulation: ProductSimulation): string[] {
  let documents = [
    'Pièce d\'identité en cours de validité',
    'Justificatifs de revenus (3 derniers bulletins)',
    'Relevés bancaires (3 derniers mois)'
  ];

  const clientType = this.simulationForm.get('clientType')?.value;
  const currentDebts = this.simulationForm.get('currentDebts')?.value || 0;
  const requestedAmount = this.simulationForm.get('requestedAmount')?.value;

  if (clientType === 'entreprise') {
    documents.push('Statuts de l\'entreprise');
    documents.push('Bilans comptables (2 dernières années)');
  }

  if (currentDebts > 0) {
    documents.push('Tableaux d\'amortissement des crédits en cours');
  }

  if (requestedAmount > 10000000) {
    documents.push('Justificatif de destination des fonds');
    documents.push('Devis ou facture pro forma');
  }

  if (simulation.product.type.toLowerCase().includes('immobilier')) {
    documents.push('Compromis de vente ou promesse d\'achat');
    documents.push('Justificatif d\'apport personnel');
  }

  return documents;
}

  // Vérifier si le tableau d'amortissement est affiché
  isAmortizationExpanded(productId: string): boolean {
    return this.expandedAmortization.has(productId);
  }


  // Filtrer par année
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


// Force la régénération des données d'amortissement pour toutes les simulations
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




// 11. Obtenir les données annuelles
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

// Ajoutez ces méthodes au composant

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

// 13. Calculer l'impact d'un apport
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
  const amount = parseFloat(downPayment);
  // Cette méthode est appelée depuis le template, les calculs sont faits dans calculateDownPaymentSavings
}
// Méthode pour déboguer les données d'amortissement
debugAmortizationData(productId: string): void {
  console.group(`🔍 DEBUG Amortization pour ${productId}`);
  
  // Vérifier l'état général
  console.log('expandedAmortization contient productId:', this.expandedAmortization.has(productId));
  console.log('extendedSimulations contient productId:', this.extendedSimulations.has(productId));
  
  // Vérifier la simulation
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
  
  // Vérifier les données du formulaire
  const formData = {
    requestedAmount: this.simulationForm.get('requestedAmount')?.value,
    duration: this.simulationForm.get('duration')?.value
  };
  console.log('Données du formulaire:', formData);
  
  // Vérifier les données étendues
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

// Méthode trackBy pour améliorer les performances
trackByMonth(index: number, item: AmortizationEntry): number {
  return item.month;
}

generateAmortizationSchedule(simulation: ProductSimulation): AmortizationEntry[] {
  const requestedAmount = this.simulationForm.get('requestedAmount')?.value || 0;
  const durationMonths = this.simulationForm.get('duration')?.value || 0;
  const { monthly_payment, applied_rate } = simulation.simulation;
  
  // Vérifications de base
  if (!requestedAmount || !durationMonths || !monthly_payment || !applied_rate) {
    console.error('Données manquantes pour le calcul d\'amortissement:', {
      requestedAmount, durationMonths, monthly_payment, applied_rate
    });
    return [];
  }
  
  const monthlyRate = applied_rate / 100 / 12;
  let remainingBalance = requestedAmount;
  const schedule: AmortizationEntry[] = [];

  console.log('Calcul amortissement - Données initiales:', {
    requestedAmount,
    durationMonths,
    monthly_payment,
    applied_rate,
    monthlyRate
  });

  for (let month = 1; month <= durationMonths; month++) {
    // Calcul des intérêts sur le capital restant
    const interestPayment = remainingBalance * monthlyRate;
    
    // Calcul du capital remboursé (mensualité - intérêts)
    const principalPayment = monthly_payment - interestPayment;
    
    // Mise à jour du capital restant
    remainingBalance = Math.max(0, remainingBalance - principalPayment);

    const entry: AmortizationEntry = {
      month: month,
      payment: monthly_payment,
      principal: principalPayment,
      interest: interestPayment,
      remaining_balance: remainingBalance
    };

    schedule.push(entry);

    // Debug pour les premiers mois
    if (month <= 3) {
      console.log(`Mois ${month}:`, entry);
    }
  }

  console.log('Tableau d\'amortissement généré:', schedule.length, 'entrées');
  return schedule;
}




  // Méthodes utilitaires
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

  formatPercent(value: number): string {
    return this.creditService.formatPercent(value);
  }

  getSelectedYear(productId: string): string {
  const extended = this.extendedSimulations.get(productId);
  return extended?.selectedYear || 'all';
}

getFilteredAmortizationData(productId: string): AmortizationEntry[] {
  console.log('getFilteredAmortizationData appelée pour:', productId);
  
  const extended = this.extendedSimulations.get(productId);
  if (!extended || !extended.amortization_schedule) {
    console.warn('Pas de données d\'amortissement pour:', productId);
    console.log('Extended simulation:', extended);
    return [];
  }

  let filteredData = [...extended.amortization_schedule];
  console.log('Données brutes:', filteredData.length, 'entrées');

  // Filtrage par année si nécessaire
  if (extended.selectedYear && extended.selectedYear !== 'all') {
    const targetYear = parseInt(extended.selectedYear);
    const startMonth = (targetYear - 1) * 12 + 1;
    const endMonth = targetYear * 12;
    
    filteredData = filteredData.filter(entry => 
      entry.month >= startMonth && entry.month <= endMonth
    );
    
    console.log(`Filtrage année ${targetYear}: ${filteredData.length} entrées`);
  }

  // Limiter l'affichage pour de meilleures performances (optionnel)
  if (filteredData.length > 60) {
    console.log('Limitation à 60 entrées pour les performances');
    filteredData = filteredData.slice(0, 60);
  }

  console.log('Données filtrées retournées:', filteredData.length);
  return filteredData;
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

  resetForm(): void {
    this.simulationForm.reset({
      clientType: 'particulier',
      monthlyIncome: 750000,
      creditType: 'consommation',
      requestedAmount: 2000000,
      duration: 24,
      currentDebts: 0,
      downPayment: 0
    });
    this.productSimulations = [];
    this.compatibleProducts = [];
    this.hasFormError = false;
    this.expandedOffers.clear();
    this.showOnlyEligible = false;
    this.resetStepper();
  }

  private resetStepper(): void {
    this.currentStep = 1;
    this.stepValidation = { 1: false, 2: false, 3: false };
    this.updateStepValidation();
  }

  saveComparison(): void {
    if (!this.productSimulations.length) return;
    this.notificationService.showSuccess('Comparaison sauvegardée avec succès');
  }

  exportToPDF(): void {
    if (!this.productSimulations.length) return;
    this.notificationService.showSuccess('Export PDF généré avec succès');
  }

  shareComparison(): void {
    if (!this.productSimulations.length) return;

    const bestOffer = this.getSortedSimulations()[0];
    const shareText = bestOffer 
      ? `Comparaison de crédits - Meilleur taux: ${bestOffer.simulation.applied_rate}% chez ${bestOffer.product.bank.name}`
      : 'Comparaison de crédits - Bamboo';
    
    if (navigator.share) {
      navigator.share({
        title: 'Comparaison de Crédits - Bamboo',
        text: shareText,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        this.notificationService.showSuccess('Lien copié dans le presse-papier');
      });
    }
  }

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
      page_title: 'Comparateur Multi-Banques',
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

  // Méthodes de debug temporaires
  testApiConnection(): void {
    console.log('Testing API connection...');
    this.creditService.testConnection().subscribe({
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
    
    // Afficher les erreurs de chaque champ
    Object.keys(this.simulationForm.controls).forEach(key => {
      const control = this.simulationForm.get(key);
      if (control?.errors) {
        console.log(`${key} errors:`, control.errors);
      }
    });

    // Force update validation
    this.updateStepValidation();
    this.notificationService.showSuccess('Validation forcée - vérifiez la console');
  }

  private generateSessionId(): string {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}