// multi-bank-comparator.component.ts - Version avec stepper
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Observable, forkJoin } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
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

interface ProductSimulation {
  product: CreditProduct;
  simulation: CreditSimulationResponse;
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

  formatCurrency(amount: number): string {
    return this.creditService.formatCurrency(amount);
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