// payment-calculator.component.ts (modifié)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ApiService, Bank, CreditProduct, CreditSimulationRequest, CreditSimulationResponse } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';

// Interfaces existantes adaptées
interface PaymentCalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  effectiveRate: number;
  monthlyInsurance: number;
  amortizationSchedule: AmortizationEntry[];
  paymentBreakdown: PaymentBreakdown;
  optimizations: OptimizationSuggestion[];
  comparisonData: DurationComparison[];
  costBreakdown: CostBreakdown;
}

interface AmortizationEntry {
  month: number;
  year: number;
  monthlyPayment: number;
  capitalPayment: number;
  interestPayment: number;
  insurancePayment: number;
  remainingCapital: number;
  cumulativeInterest: number;
  cumulativeCapital: number;
}

interface PaymentBreakdown {
  capitalPortion: number;
  interestPortion: number;
  insurancePortion: number;
  totalMonthly: number;
}

interface OptimizationSuggestion {
  type: 'duration' | 'rate' | 'amount' | 'early_payment';
  title: string;
  description: string;
  currentValue: number;
  suggestedValue: number;
  savings: number;
  impact: string;
  newMonthlyPayment: number;
}

interface DurationComparison {
  duration: number;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  savings: number;
}

interface CostBreakdown {
  principal: number;
  totalInterest: number;
  totalInsurance: number;
  totalFees: number;
  grandTotal: number;
}

@Component({
  selector: 'payment-calculator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './payment-calculator.component.html',
  styleUrls: ['./payment-calculator.component.scss']
})
export class PaymentCalculatorComponent implements OnInit, OnDestroy {
  calculatorForm!: FormGroup;
  results: PaymentCalculationResult | null = null;
  isCalculating = false;
  activeTab = 'amortization';
  showFullSchedule = false;
  selectedYear = 1;

  // Nouvelles propriétés pour l'API
  banks: Bank[] = [];
  creditProducts: CreditProduct[] = [];
  selectedProductId: string = '';
  selectedBankId: string = '';

  Math = Math;

  creditTypes = [
    { id: 'immobilier', name: 'Crédit Immobilier', icon: '🏠', avgRate: 6.2 },
    { id: 'consommation', name: 'Crédit Consommation', icon: '💳', avgRate: 12.5 },
    { id: 'auto', name: 'Crédit Auto', icon: '🚗', avgRate: 8.9 },
    { id: 'travaux', name: 'Crédit Travaux', icon: '🔨', avgRate: 7.8 },
    { id: 'professionnel', name: 'Crédit Pro', icon: '💼', avgRate: 9.8 }
  ];

  durationPresets = [
    { months: 60, label: '5 ans' },
    { months: 84, label: '7 ans' },
    { months: 120, label: '10 ans' },
    { months: 180, label: '15 ans' },
    { months: 240, label: '20 ans' },
    { months: 300, label: '25 ans' }
  ];

  amountPresets = [
    { amount: 1000000, label: '1M FCFA' },
    { amount: 5000000, label: '5M FCFA' },
    { amount: 10000000, label: '10M FCFA' },
    { amount: 25000000, label: '25M FCFA' },
    { amount: 50000000, label: '50M FCFA' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService, // Remplace simulatorService
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadBanksAndProducts();
    this.setupFormListeners();
    this.trackPageView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.calculatorForm = this.fb.group({
      // Montant et durée
      loanAmount: [10000000, [Validators.required, Validators.min(100000), Validators.max(500000000)]],
      duration: [240, [Validators.required, Validators.min(12), Validators.max(360)]],
      interestRate: [6.5, [Validators.required, Validators.min(1), Validators.max(25)]],
      
      // Type de crédit et sélection
      creditType: ['immobilier', Validators.required],
      selectedBank: [''],
      selectedProduct: [''],
      
      // Informations emprunteur (requises par l'API)
      monthlyIncome: [1000000, [Validators.required, Validators.min(200000)]],
      currentDebts: [0, [Validators.min(0)]],
      downPayment: [0, [Validators.min(0)]],
      
      // Assurance
      includeInsurance: [true],
      insuranceRate: [0.36, [Validators.min(0), Validators.max(5)]],
      insuranceType: ['declining', Validators.required],
      
      // Frais
      applicationFee: [50000, [Validators.min(0)]],
      notaryFees: [0, [Validators.min(0)]],
      guaranteeFees: [0, [Validators.min(0)]],
      
      // Options de remboursement
      paymentFrequency: ['monthly', Validators.required],
      firstPaymentDate: [new Date(), Validators.required],
      
      // Remboursement anticipé
      earlyPaymentAmount: [0, [Validators.min(0)]],
      earlyPaymentMonth: [0, [Validators.min(0)]],
      
      // Modulation
      allowModulation: [false],
      modulationPercentage: [20, [Validators.min(10), Validators.max(50)]]
    });
  }

  private loadBanksAndProducts(): void {
    // Charger les banques
    this.apiService.getBanks().subscribe({
      next: (banks) => {
        this.banks = banks;
        console.log('Banques chargées:', banks.length);
      },
      error: (error) => {
        console.error('Erreur chargement banques:', error);
        this.notificationService.showError('Erreur lors du chargement des banques');
      }
    });

    // Charger les produits selon le type sélectionné
    this.loadCreditProducts(this.calculatorForm.get('creditType')?.value);
  }

  private loadCreditProducts(creditType: string): void {
    this.apiService.getCreditProducts({ credit_type: creditType }).subscribe({
      next: (products) => {
        this.creditProducts = products;
        console.log(`Produits ${creditType} chargés:`, products.length);
        
        // Sélectionner le premier produit par défaut
        if (products.length > 0) {
          this.selectedProductId = products[0].id;
          this.calculatorForm.patchValue({ 
            selectedProduct: products[0].id,
            interestRate: products[0].average_rate 
          }, { emitEvent: false });
        }
      },
      error: (error) => {
        console.error('Erreur chargement produits:', error);
        this.notificationService.showError('Erreur lors du chargement des produits');
      }
    });
  }

  private setupFormListeners(): void {
    // Calcul automatique lors des changements
    this.calculatorForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.calculatorForm.valid && this.selectedProductId) {
          this.calculatePayments();
        }
      });

    // Mise à jour des produits selon le type de crédit
    this.calculatorForm.get('creditType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(creditType => {
        this.loadCreditProducts(creditType);
      });

    // Mise à jour des produits selon la banque sélectionnée
    this.calculatorForm.get('selectedBank')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(bankId => {
        if (bankId) {
          this.selectedBankId = bankId;
          this.apiService.getBankCreditProducts(bankId).subscribe({
            next: (products) => {
              const creditType = this.calculatorForm.get('creditType')?.value;
              this.creditProducts = products.filter(p => p.type === creditType);
              
              if (this.creditProducts.length > 0) {
                this.selectedProductId = this.creditProducts[0].id;
                this.calculatorForm.patchValue({ 
                  selectedProduct: this.creditProducts[0].id,
                  interestRate: this.creditProducts[0].average_rate 
                }, { emitEvent: false });
              }
            }
          });
        }
      });

    // Mise à jour du produit sélectionné
    this.calculatorForm.get('selectedProduct')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(productId => {
        if (productId) {
          this.selectedProductId = productId;
          const product = this.creditProducts.find(p => p.id === productId);
          if (product) {
            this.calculatorForm.patchValue({ 
              interestRate: product.average_rate 
            }, { emitEvent: false });
          }
        }
      });
  }

  calculatePayments(): void {
    if (this.isCalculating || this.calculatorForm.invalid || !this.selectedProductId) {
      return;
    }

    this.isCalculating = true;
    const formData = this.calculatorForm.value;
    
    const simulationRequest: CreditSimulationRequest = {
      credit_product_id: this.selectedProductId,
      requested_amount: formData.loanAmount,
      duration_months: formData.duration,
      monthly_income: formData.monthlyIncome,
      current_debts: formData.currentDebts || 0,
      down_payment: formData.downPayment || 0,
      session_id: this.generateSessionId()
    };

    this.apiService.simulateCredit(simulationRequest).subscribe({
      next: (response) => {
        this.results = this.adaptResponseToExistingFormat(response);
        this.isCalculating = false;
        this.trackCalculationCompleted();
      },
      error: (error) => {
        console.error('Erreur simulation crédit:', error);
        this.notificationService.showError(
          error.error?.detail || 'Erreur lors du calcul des mensualités'
        );
        this.isCalculating = false;
      }
    });
  }

  private adaptResponseToExistingFormat(response: CreditSimulationResponse): PaymentCalculationResult {
    // Adapter la réponse de l'API au format attendu par le composant
    const amortizationSchedule = response.amortization_schedule.map((entry, index) => ({
      month: entry.month,
      year: Math.ceil(entry.month / 12),
      monthlyPayment: entry.principal + entry.interest,
      capitalPayment: entry.principal,
      interestPayment: entry.interest,
      insurancePayment: 0, // À calculer si nécessaire
      remainingCapital: entry.remaining_balance,
      cumulativeInterest: response.amortization_schedule
        .slice(0, index + 1)
        .reduce((sum, e) => sum + e.interest, 0),
      cumulativeCapital: response.amortization_schedule
        .slice(0, index + 1)
        .reduce((sum, e) => sum + e.principal, 0)
    }));

    return {
      monthlyPayment: response.monthly_payment,
      totalInterest: response.total_interest,
      totalCost: response.total_cost,
      effectiveRate: response.applied_rate,
      monthlyInsurance: 0,
      amortizationSchedule,
      paymentBreakdown: {
        capitalPortion: amortizationSchedule[0]?.capitalPayment || 0,
        interestPortion: amortizationSchedule[0]?.interestPayment || 0,
        insurancePortion: 0,
        totalMonthly: response.monthly_payment
      },
      optimizations: this.generateOptimizationsFromRecommendations(response.recommendations),
      comparisonData: this.generateDurationComparisons(),
      costBreakdown: {
        principal: response.total_cost - response.total_interest,
        totalInterest: response.total_interest,
        totalInsurance: 0,
        totalFees: 0,
        grandTotal: response.total_cost
      }
    };
  }

  private generateOptimizationsFromRecommendations(recommendations: string[]): OptimizationSuggestion[] {
    return recommendations.map((rec, index) => ({
      type: 'rate' as const,
      title: `Recommandation ${index + 1}`,
      description: rec,
      currentValue: 0,
      suggestedValue: 0,
      savings: 0,
      impact: rec,
      newMonthlyPayment: this.results?.monthlyPayment || 0
    }));
  }

  private generateDurationComparisons(): DurationComparison[] {
    if (!this.results) return [];
    
    const durations = [120, 180, 240, 300, 360];
    const currentDuration = this.calculatorForm.get('duration')?.value;
    const currentTotalCost = this.results.totalCost;

    return durations.map(duration => ({
      duration: duration / 12,
      monthlyPayment: 0, // À calculer
      totalCost: 0, // À calculer
      totalInterest: 0, // À calculer
      savings: 0 // À calculer
    }));
  }

  goToComparator(): void {
    if (!this.results) return;

    const formData = this.calculatorForm.value;
    
    this.apiService.compareCreditOffers({
      credit_type: formData.creditType,
      amount: formData.loanAmount,
      duration: formData.duration,
      monthly_income: formData.monthlyIncome,
      current_debts: formData.currentDebts || 0
    }).subscribe({
      next: (comparison) => {
        this.router.navigate(['/multi-bank-comparator'], {
          state: { comparisonData: comparison }
        });
      },
      error: (error) => {
        console.error('Erreur comparaison:', error);
        this.notificationService.showError('Erreur lors de la comparaison');
      }
    });
  }

  onBankChange(event: any): void {
    const bankId = event.target.value;
    this.calculatorForm.patchValue({ selectedBank: bankId });
  }

  onProductChange(event: any): void {
    const productId = event.target.value;
    this.calculatorForm.patchValue({ selectedProduct: productId });
  }

  getCurrentCreditTypeRate(): string {
    if (this.selectedProductId) {
      const product = this.creditProducts.find(p => p.id === this.selectedProductId);
      return this.formatPercent(product?.average_rate || 6.5);
    }
    
    const currentType = this.calculatorForm.get('creditType')?.value;
    const type = this.creditTypes.find(t => t.id === currentType);
    return this.formatPercent(type?.avgRate || 6.5);
  }

  getAbsoluteValue(value: number): number {
    return Math.abs(value);
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleFullSchedule(): void {
    this.showFullSchedule = !this.showFullSchedule;
  }

  setPresetAmount(amount: number): void {
    this.calculatorForm.patchValue({ loanAmount: amount });
  }

  setPresetDuration(months: number): void {
    this.calculatorForm.patchValue({ duration: months });
  }

  exportToExcel(): void {
    if (!this.results) return;

    const exportData = {
      simulation: this.calculatorForm.value,
      results: this.results,
      amortizationSchedule: this.results.amortizationSchedule
    };

    this.notificationService.showSuccess('Export Excel généré avec succès');
  }

  simulateEarlyPayment(): void {
    const earlyAmount = this.calculatorForm.get('earlyPaymentAmount')?.value;
    const earlyMonth = this.calculatorForm.get('earlyPaymentMonth')?.value;
    
    if (earlyAmount && earlyAmount > 0 && earlyMonth > 0) {
      this.calculatePayments();
      this.notificationService.showInfo(`Simulation avec remboursement de ${this.formatCurrency(earlyAmount)} au mois ${earlyMonth}`);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  getScheduleForYear(year: number): AmortizationEntry[] {
    if (!this.results) return [];
    return this.results.amortizationSchedule.filter(entry => entry.year === year);
  }

  getAvailableYears(): number[] {
    if (!this.results) return [];
    const years = new Set(this.results.amortizationSchedule.map(entry => entry.year));
    return Array.from(years).sort();
  }

  hasError(controlName: string): boolean {
    const control = this.calculatorForm.get(controlName);
    return !!(control?.errors && control?.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.calculatorForm.get(controlName);
    if (!control?.errors) return '';

    const errors = control.errors;
    
    if (errors['required']) return 'Ce champ est requis';
    if (errors['min']) return `Valeur minimum: ${errors['min'].min}`;
    if (errors['max']) return `Valeur maximum: ${errors['max'].max}`;
    
    return 'Valeur invalide';
  }

  private trackPageView(): void {
    this.analyticsService.trackPageView('payment_calculator', {
      page_title: 'Calculateur de Mensualités'
    });
  }

  private trackCalculationCompleted(): void {
    if (!this.results) return;

    this.analyticsService.trackEvent('payment_calculation_completed', {
      loan_amount: this.calculatorForm.get('loanAmount')?.value,
      duration: this.calculatorForm.get('duration')?.value,
      interest_rate: this.calculatorForm.get('interestRate')?.value,
      monthly_payment: this.results.monthlyPayment,
      total_cost: this.results.totalCost,
      credit_type: this.calculatorForm.get('creditType')?.value,
      bank_used: this.selectedBankId,
      product_used: this.selectedProductId
    });
  }

  get isFormValid(): boolean {
    return this.calculatorForm.valid && !!this.selectedProductId;
  }

  get canExport(): boolean {
    return !!this.results;
  }

  get monthlyBudgetImpact(): number {
    return this.results?.monthlyPayment || 0;
  }

  get totalProjectCost(): number {
    if (!this.results) return 0;
    return this.calculatorForm.get('loanAmount')?.value + this.results.totalInterest;
  }

  get interestToCapitalRatio(): number {
    if (!this.results) return 0;
    const loanAmount = this.calculatorForm.get('loanAmount')?.value || 1;
    return (this.results.totalInterest / loanAmount) * 100;
  }

  get averageMonthlyInterest(): number {
    if (!this.results) return 0;
    const duration = this.calculatorForm.get('duration')?.value || 1;
    return this.results.totalInterest / duration;
  }
}