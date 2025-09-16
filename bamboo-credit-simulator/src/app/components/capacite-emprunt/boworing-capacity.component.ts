// borrowing-capacity.component.ts - Version complète corrigée avec intégration backend
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

// Import des services et interfaces
import { ApiService, Bank, CreditProduct } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';

// Interfaces locales
interface BorrowingCapacityResult {
  borrowingCapacity: number;
  maxMonthlyPayment: number;
  totalProjectCapacity: number;
  debtRatio: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  monthlyInsurance: number;
  totalInterest: number;
  effectiveRate: number;
  amortizationData: AmortizationPoint[];
  evolutionData: EvolutionPoint[];
  comparisonData: ComparisonPoint[];
  budgetBreakdown: BudgetBreakdown;
  bankComparisons?: BankComparison[];
}

interface AmortizationPoint {
  month: number;
  remainingDebt: number;
  paidPrincipal: number;
  cumulativeInterest: number;
  monthlyPayment: number;
}

interface EvolutionPoint {
  durationInMonths: number;
  duration: number;
  capacity: number;
  monthlyPayment: number;
  totalCost: number;
}

interface ComparisonPoint {
  rate: number;
  capacity: number;
  difference: number;
  monthlyPayment: number;
}

interface BudgetBreakdown {
  totalIncome: number;
  maxDebtPayment: number;
  currentDebts: number;
  availableForCredit: number;
  remainingIncome: number;
}

interface BankComparison {
  bank: Bank;
  product: CreditProduct;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  debtRatio: number;
  eligible: boolean;
  simulationId?: string;
}

interface ProfessionalIcon {
  id: string;
  name: string;
  svgContent: SafeHtml;
  color: string;
  description: string;
}

type RiskLevel = 'low' | 'medium' | 'high';

@Component({
  selector: 'borrowing-capacity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './boworring-capacity.component.html',
  styleUrls: ['./boworring-capacity.component.scss']
})
export class BorrowingCapacityComponent implements OnInit, OnDestroy {
  capacityForm!: FormGroup;
  results: BorrowingCapacityResult | null = null;
  isCalculating = false;
  isLoadingBanks = false;
  activeTab = 'simulation';
  showAdvancedOptions = false;
  
  // Données backend
  banks: Bank[] = [];
  creditProducts: CreditProduct[] = [];
  selectedCreditType = 'immobilier';
  
  // Configuration des graphiques
  chartConfig = {
    amortization: { width: 100, height: 400 },
    evolution: { width: 100, height: 300 },
    comparison: { width: 100, height: 300 }
  };

  // Icônes professionnelles sécurisées
  professionalIcons: { [key: string]: ProfessionalIcon } = {};

  // Options de durée en mois (jusqu'à 5 ans = 60 mois)
  durationOptions = [
    { value: 6, label: '6 mois', recommended: false },
    { value: 12, label: '1 an (12 mois)', recommended: true },
    { value: 18, label: '1 an et 6 mois (18 mois)', recommended: true },
    { value: 24, label: '2 ans (24 mois)', recommended: true },
    { value: 30, label: '2 ans et 6 mois (30 mois)', recommended: true },
    { value: 36, label: '3 ans (36 mois)', recommended: true },
    { value: 42, label: '3 ans et 6 mois (42 mois)', recommended: false },
    { value: 48, label: '4 ans (48 mois)', recommended: false },
    { value: 54, label: '4 ans et 6 mois (54 mois)', recommended: false },
    { value: 60, label: '5 ans (60 mois)', recommended: false }
  ];

  // Types de revenus avec icônes
  incomeTypes = [
    { 
      id: 'salary', 
      name: 'Salaire', 
      icon: 'briefcase',
      description: 'Revenus salariés stables',
      stability: 'high'
    },
    { 
      id: 'business', 
      name: 'Revenus d\'entreprise', 
      icon: 'building',
      description: 'Revenus d\'activité indépendante',
      stability: 'medium'
    },
    { 
      id: 'rental', 
      name: 'Revenus locatifs', 
      icon: 'home',
      description: 'Revenus immobiliers locatifs',
      stability: 'medium'
    },
    { 
      id: 'pension', 
      name: 'Pension/Retraite', 
      icon: 'user-check',
      description: 'Pensions et revenus de retraite',
      stability: 'high'
    }
  ];

  // Professions avec coefficients de risque
  professionTypes = [
    { value: 'employee', label: 'Salarié', riskFactor: 0, stability: 'high' },
    { value: 'civil_servant', label: 'Fonctionnaire', riskFactor: -1, stability: 'very_high' },
    { value: 'entrepreneur', label: 'Entrepreneur', riskFactor: 2, stability: 'low' },
    { value: 'freelance', label: 'Profession libérale', riskFactor: 1, stability: 'medium' },
    { value: 'retired', label: 'Retraité', riskFactor: 0, stability: 'high' }
  ];

  private destroy$ = new Subject<void>();
  
  
 

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.initializeProfessionalIcons();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
    this.loadInitialData();
    this.trackPageView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadInitialData(): Promise<void> {
    this.isLoadingBanks = true;
    
    try {
      // Charger les banques et produits de crédit en parallèle
      const [banks, creditProducts] = await Promise.all([
        this.apiService.getBanks().pipe(
          catchError(error => {
            console.error('Erreur lors du chargement des banques:', error);
            this.notificationService.showError('Erreur lors du chargement des banques');
            return of([]);
          })
        ).toPromise(),
        
        this.apiService.getCreditProducts({
          credit_type: this.selectedCreditType
        }).pipe(
          catchError(error => {
            console.error('Erreur lors du chargement des produits:', error);
            this.notificationService.showError('Erreur lors du chargement des produits de crédit');
            return of([]);
          })
        ).toPromise()
      ]);

      this.banks = banks || [];
      this.creditProducts = creditProducts || [];
      
      if (this.banks.length === 0) {
        this.notificationService.showWarning('Aucune banque disponible pour le moment');
      }
      
      console.log(`Chargé ${this.banks.length} banques et ${this.creditProducts.length} produits de crédit`);
      
    } catch (error) {
      console.error('Erreur lors du chargement initial:', error);
      this.notificationService.showError('Erreur lors du chargement des données');
    } finally {
      this.isLoadingBanks = false;
    }
  }

  private initializeProfessionalIcons(): void {
    this.professionalIcons = {
      calculator: {
        id: 'calculator',
        name: 'Calculatrice',
        svgContent: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="2" width="16" height="20" rx="2" stroke="#1a4d3a" stroke-width="2" fill="none"/>
            <rect x="6" y="6" width="4" height="2" rx="1" fill="#1a4d3a"/>
            <rect x="6" y="10" width="2" height="2" rx="1" fill="#1a4d3a"/>
            <rect x="10" y="10" width="2" height="2" rx="1" fill="#1a4d3a"/>
            <rect x="14" y="10" width="2" height="2" rx="1" fill="#1a4d3a"/>
            <rect x="6" y="14" width="2" height="2" rx="1" fill="#1a4d3a"/>
            <rect x="10" y="14" width="2" height="2" rx="1" fill="#1a4d3a"/>
            <rect x="14" y="14" width="2" height="6" rx="1" fill="#22c55e"/>
            <rect x="6" y="18" width="6" height="2" rx="1" fill="#1a4d3a"/>
          </svg>
        `),
        color: '#1a4d3a',
        description: 'Calcul de capacité'
      }
    };
  }

  private initializeForm(): void {
    this.capacityForm = this.fb.group({
      // Revenus
      monthlyIncome: [750000, [Validators.required, Validators.min(200000), Validators.max(50000000)]],
      additionalIncome: [0, [Validators.min(0), Validators.max(10000000)]],
      incomeType: ['salary', Validators.required],
      incomeStability: ['stable', Validators.required],
      
      // Charges actuelles
      currentDebts: [0, [Validators.min(0), Validators.max(5000000)]],
      rentOrMortgage: [0, [Validators.min(0), Validators.max(2000000)]],
      livingExpenses: [200000, [Validators.min(50000), Validators.max(2000000)]],
      
      // Paramètres du crédit (durée en mois)
      duration: [24, [Validators.required, Validators.min(6), Validators.max(60)]],
      interestRate: [6.5, [Validators.required, Validators.min(1), Validators.max(15)]],
      downPayment: [0, [Validators.min(0), Validators.max(100000000)]],
      
      // Assurance
      hasInsurance: [true],
      insuranceRate: [0.36, [Validators.min(0), Validators.max(2)]],
      
      // Options avancées
      includePropertyTax: [false],
      propertyTaxRate: [1.2, [Validators.min(0), Validators.max(5)]],
      includeMaintenanceCosts: [false],
      maintenanceRate: [1.0, [Validators.min(0), Validators.max(3)]],
      
      // Profil emprunteur
      age: [35, [Validators.required, Validators.min(18), Validators.max(70)]],
      profession: ['employee', Validators.required],
      workExperience: [5, [Validators.min(0), Validators.max(50)]]
    });
  }

  private calculateEffectiveRate(capital: number, monthlyPayment: number, durationInMonths: number): number {
  if (capital <= 0 || monthlyPayment <= 0 || durationInMonths <= 0) {
    return 0;
  }
  
  const totalPaid = monthlyPayment * durationInMonths;
  const totalInterest = totalPaid - capital;
  
  if (totalInterest <= 0) {
    return 0;
  }
  
  // Calcul du taux effectif annuel
  // TEG = (Total payé / Capital emprunté - 1) / (Durée en années)
  const durationInYears = durationInMonths / 12;
  const effectiveRate = ((totalPaid / capital - 1) / durationInYears) * 100;
  
  return Math.max(0, Math.min(50, effectiveRate)); // Limité entre 0 et 50%
}

// Validation des entrées du formulaire
private validateFormInputs(formData: any): string | null {
  // Revenus
  if (formData.monthlyIncome < 100000) {
    return "Le revenu mensuel doit être d'au moins 100 000 FCFA";
  }
  if (formData.monthlyIncome > 50000000) {
    return "Le revenu mensuel semble irréaliste";
  }
  
  // Durée
  if (formData.duration < 6 || formData.duration > 60) {
    return "La durée doit être entre 6 et 60 mois";
  }
  
  // Taux d'intérêt
  if (formData.interestRate < 1 || formData.interestRate > 25) {
    return "Le taux d'intérêt doit être entre 1% et 25%";
  }
  
  // Charges existantes
  if (formData.currentDebts < 0) {
    return "Les charges ne peuvent pas être négatives";
  }
  
  // Taux d'assurance
  if (formData.hasInsurance && (formData.insuranceRate < 0 || formData.insuranceRate > 5)) {
    return "Le taux d'assurance doit être entre 0% et 5%";
  }
  
  // Cohérence générale
  const totalCharges = (formData.currentDebts || 0) + (formData.livingExpenses || 0);
  if (totalCharges >= formData.monthlyIncome * 0.9) {
    return "Vos charges dépassent 90% de vos revenus, simulation impossible";
  }
  
  return null; // Validation OK
}


  private setupFormListeners(): void {
    this.capacityForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.capacityForm.valid) {
          this.calculateCapacity();
        }
      });
  }

  // Nouvelle méthode principale utilisant l'API backend
  async calculateCapacity(): Promise<void> {
  if (this.isCalculating) {
    return;
  }

  const formData = this.capacityForm.value;
  
  // Validation des entrées
  const validationError = this.validateFormInputs(formData);
  if (validationError) {
    this.notificationService.showError(validationError);
    return;
  }

  if (this.capacityForm.invalid) {
    this.notificationService.showWarning('Veuillez corriger les erreurs dans le formulaire');
    return;
  }

  this.isCalculating = true;
  
  try {
    // Tentative d'utilisation de l'API backend d'abord
    if (this.banks.length > 0) { // Backend disponible
      const capacityResult = await this.apiService.getBorrowingCapacity({
        monthly_income: formData.monthlyIncome + (formData.additionalIncome || 0),
        current_debts: formData.currentDebts || 0,
        duration_months: formData.duration,
        interest_rate: formData.interestRate,
        down_payment: formData.downPayment || 0,
        include_insurance: formData.hasInsurance,
        insurance_rate: formData.hasInsurance ? formData.insuranceRate : 0,
        max_debt_ratio: this.getMaxDebtRatio(formData)
      }).pipe(
        catchError(error => {
          console.warn('API backend indisponible, utilisation du calcul local:', error);
          return of(null);
        })
      ).toPromise();

      if (capacityResult && capacityResult.borrowing_capacity !== undefined) {
        // Utiliser les résultats de l'API
        this.results = await this.processBackendResults(capacityResult, formData);
        this.trackCalculationCompleted();
        return;
      }
    }

    

    // Fallback vers calculs locaux (toujours exécuté si API indisponible)
    console.log('Utilisation du calcul local de capacité');
    this.results = this.performLocalCalculations(formData);
    this.trackCalculationCompleted();
    
  } catch (error) {
    console.error('Erreur dans le calcul de capacité:', error);
    this.notificationService.showError('Une erreur est survenue lors du calcul');
    
    // En cas d'erreur, essayer le calcul local
    try {
      this.results = this.performLocalCalculations(formData);
    } catch (localError) {
      console.error('Erreur aussi dans le calcul local:', localError);
      this.results = this.createErrorResult('Impossible de calculer la capacité d\'emprunt');
    }
  } finally {
    this.isCalculating = false;
  }
}

  // Méthode helper pour mapper le niveau de risque
  private mapRiskLevel(debtRatio: number): 'low' | 'medium' | 'high' {
    if (debtRatio <= 25) return 'low';
    if (debtRatio <= 33) return 'medium';
    return 'high';
  }

  // Méthode modifiée pour les comparaisons bancaires
  private async getBankComparisons(formData: any, borrowingCapacity: number): Promise<BankComparison[]> {
    try {
      const comparisons: BankComparison[] = [];
      
      if (borrowingCapacity === 0) {
        return [];
      }
      
      // Récupérer les comparaisons via l'API avec la capacité calculée
      const compareResponse = await this.apiService.compareCreditOffers({
        credit_type: this.selectedCreditType,
        amount: borrowingCapacity,
        duration: formData.duration,
        monthly_income: formData.monthlyIncome + (formData.additionalIncome || 0),
        current_debts: formData.currentDebts || 0
      }).pipe(
        catchError(error => {
          console.error('Erreur lors de la comparaison:', error);
          return of({ comparisons: [] });
        })
      ).toPromise();

      if (compareResponse?.comparisons && Array.isArray(compareResponse.comparisons)) {
        // Transformer les données de l'API en format local
        for (const comparison of compareResponse.comparisons) {
          comparisons.push({
            bank: comparison.bank,
            product: comparison.product,
            monthlyPayment: comparison.monthly_payment,
            totalCost: comparison.total_cost,
            totalInterest: comparison.total_interest,
            debtRatio: comparison.debt_ratio,
            eligible: comparison.eligible
          });
        }
      }

      return comparisons.sort((a, b) => a.monthlyPayment - b.monthlyPayment);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des comparaisons:', error);
      return [];
    }
  }

  private async processBackendResults(apiResult: any, formData: any): Promise<BorrowingCapacityResult> {
  return {
    borrowingCapacity: Math.round(apiResult.borrowing_capacity || 0),
    maxMonthlyPayment: Math.round((apiResult.max_monthly_payment || 0) * 100) / 100,
    totalProjectCapacity: Math.round((apiResult.total_project_capacity || 0)),
    debtRatio: Math.round((apiResult.debt_ratio || 0) * 10) / 10,
    riskLevel: this.mapRiskLevel(apiResult.debt_ratio || 0),
    recommendations: Array.isArray(apiResult.recommendations) ? apiResult.recommendations : 
                    ['Résultats calculés par notre système avancé'],
    monthlyInsurance: Math.round((apiResult.monthly_insurance || 0) * 100) / 100,
    totalInterest: Math.round(apiResult.total_interest || 0),
    effectiveRate: Math.round((apiResult.effective_rate || formData.interestRate) * 100) / 100,
    amortizationData: this.generateAmortizationPoints(
      apiResult.borrowing_capacity || 0, 
      formData.interestRate, 
      formData.duration,
      apiResult.monthly_insurance || 0
    ),
    evolutionData: this.generateEvolutionData(formData),
    comparisonData: this.generateComparisonData(formData),
    budgetBreakdown: {
      totalIncome: apiResult.details?.monthly_income || formData.monthlyIncome,
      maxDebtPayment: (apiResult.max_monthly_payment || 0) + (apiResult.details?.current_debts || 0),
      currentDebts: apiResult.details?.current_debts || 0,
      availableForCredit: apiResult.details?.available_for_credit || 0,
      remainingIncome: (apiResult.details?.monthly_income || formData.monthlyIncome) - 
                       (apiResult.max_monthly_payment || 0) - 
                       (apiResult.details?.current_debts || 0)
    },
    bankComparisons: await this.getBankComparisons(formData, apiResult.borrowing_capacity || 0)
  };
}

// Méthode de diagnostic pour tester les calculs
testBorrowingCalculations(): void {
  console.group('🧮 Test des calculs de capacité d\'emprunt');
  
  // Cas de test 1 : Profil standard
  const testCase1 = {
    monthlyIncome: 750000,
    additionalIncome: 0,
    currentDebts: 0,
    duration: 24,
    interestRate: 6.5,
    downPayment: 0,
    hasInsurance: true,
    insuranceRate: 0.36,
    profession: 'employee',
    age: 35,
    workExperience: 5,
    incomeStability: 'stable'
  };
  
  console.log('Test 1 - Profil standard:');
  const result1 = this.performLocalCalculations(testCase1);
  console.table({
    'Revenus mensuels': this.formatCurrency(testCase1.monthlyIncome),
    'Capacité calculée': this.formatCurrency(result1.borrowingCapacity),
    'Mensualité max': this.formatCurrency(result1.maxMonthlyPayment),
    'Taux endettement': result1.debtRatio + '%',
    'Assurance mensuelle': this.formatCurrency(result1.monthlyInsurance)
  });
  
  // Cas de test 2 : Hauts revenus
  const testCase2 = {
    ...testCase1,
    monthlyIncome: 2000000,
    profession: 'civil_servant'
  };
  
  console.log('Test 2 - Hauts revenus:');
  const result2 = this.performLocalCalculations(testCase2);
  console.table({
    'Revenus mensuels': this.formatCurrency(testCase2.monthlyIncome),
    'Capacité calculée': this.formatCurrency(result2.borrowingCapacity),
    'Mensualité max': this.formatCurrency(result2.maxMonthlyPayment),
    'Taux endettement': result2.debtRatio + '%'
  });
  
  // Cas de test 3 : Avec dettes existantes
  const testCase3 = {
    ...testCase1,
    currentDebts: 150000
  };
  
  console.log('Test 3 - Avec dettes existantes:');
  const result3 = this.performLocalCalculations(testCase3);
  console.table({
    'Revenus mensuels': this.formatCurrency(testCase3.monthlyIncome),
    'Dettes existantes': this.formatCurrency(testCase3.currentDebts),
    'Capacité calculée': this.formatCurrency(result3.borrowingCapacity),
    'Mensualité max': this.formatCurrency(result3.maxMonthlyPayment)
  });
  
  // Tests de validation
  console.log('🔍 Tests de validation:');
  
  // Test cohérence mensualité
  const monthlyRate = testCase1.interestRate / 100 / 12;
  const theoreticalPayment = this.calculateMonthlyPaymentForAmount(
    result1.borrowingCapacity, 
    monthlyRate, 
    testCase1.duration
  );
  
  console.log(`Vérification cohérence mensualité:
    - Mensualité théorique pour ${this.formatCurrency(result1.borrowingCapacity)}: ${this.formatCurrency(theoreticalPayment)}
    - Mensualité + assurance calculée: ${this.formatCurrency(theoreticalPayment + result1.monthlyInsurance)}
    - Mensualité max autorisée: ${this.formatCurrency(result1.maxMonthlyPayment)}
    - Écart: ${this.formatCurrency(result1.maxMonthlyPayment - (theoreticalPayment + result1.monthlyInsurance))}
  `);
  
  console.groupEnd();
}


  private calculateMonthlyPaymentForAmount(amount: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return amount / months;
  
  return amount * monthlyRate * Math.pow(1 + monthlyRate, months) / 
         (Math.pow(1 + monthlyRate, months) - 1);
}
  private performLocalCalculations(formData: any): BorrowingCapacityResult {
  const totalIncome = formData.monthlyIncome + (formData.additionalIncome || 0);
  const totalMonthlyCharges = (formData.rentOrMortgage || 0) + (formData.livingExpenses || 0);
  const currentMonthlyDebtPayments = formData.currentDebts || 0;
  
  // Calcul du taux d'endettement maximum selon le profil
  const maxDebtRatio = this.getMaxDebtRatio(formData);
  const maxAllowedDebt = totalIncome * maxDebtRatio / 100;

  // Vérification si déjà en surendettement
  if (currentMonthlyDebtPayments >= maxAllowedDebt) {
    return this.createErrorResult(`Vous dépassez déjà le taux d'endettement maximum de ${maxDebtRatio.toFixed(1)}%`);
  }

  // Capacité mensuelle disponible pour nouveau crédit
  const maxMonthlyPayment = maxAllowedDebt - currentMonthlyDebtPayments;

  if (maxMonthlyPayment <= 0) {
    return this.createErrorResult('Capacité d\'emprunt insuffisante avec vos revenus actuels');
  }

  // === CORRECTION PRINCIPALE : Calcul itératif avec assurance ===
  let borrowingCapacity = 0;
  let monthlyInsurance = 0;
  let netMonthlyPayment = maxMonthlyPayment;

  if (formData.hasInsurance && formData.insuranceRate > 0) {
    // Méthode itérative pour trouver le capital optimal avec assurance
    borrowingCapacity = this.calculateCapitalWithInsurance(
      maxMonthlyPayment,
      formData.interestRate,
      formData.duration,
      formData.insuranceRate
    );
    monthlyInsurance = (borrowingCapacity * formData.insuranceRate / 100) / 12;
    netMonthlyPayment = maxMonthlyPayment - monthlyInsurance;
  } else {
    // Sans assurance, calcul direct
    const monthlyRate = formData.interestRate / 100 / 12;
    borrowingCapacity = this.calculateLoanAmount(netMonthlyPayment, monthlyRate, formData.duration);
  }

  // Vérifications de cohérence
  if (borrowingCapacity <= 0) {
    return this.createErrorResult('Capacité d\'emprunt insuffisante après prise en compte de l\'assurance');
  }

  // Calculs des résultats finaux
  const totalProjectCapacity = borrowingCapacity + (formData.downPayment || 0);
  const totalMonthlyDebt = maxMonthlyPayment + currentMonthlyDebtPayments;
  const actualDebtRatio = (totalMonthlyDebt / totalIncome) * 100;
  
  // Calcul du coût total et des intérêts
  const totalCost = (netMonthlyPayment * formData.duration) + (monthlyInsurance * formData.duration);
  const totalInterest = totalCost - borrowingCapacity;
  
  const effectiveRate = this.calculateEffectiveRate(
    borrowingCapacity, 
    maxMonthlyPayment, 
    formData.duration
  );

  // Génération des données pour les graphiques
  const amortizationData = this.generateAmortizationPoints(
    borrowingCapacity, 
    formData.interestRate, 
    formData.duration,
    monthlyInsurance
  );

  const budgetBreakdown: BudgetBreakdown = {
    totalIncome,
    maxDebtPayment: totalMonthlyDebt,
    currentDebts: currentMonthlyDebtPayments,
    availableForCredit: maxMonthlyPayment,
    remainingIncome: totalIncome - totalMonthlyDebt - totalMonthlyCharges
  };

  const riskLevel = this.calculateRiskLevel(actualDebtRatio, formData);
  const recommendations = this.generateRecommendations(actualDebtRatio, borrowingCapacity, formData);

  return {
    borrowingCapacity: Math.round(borrowingCapacity),
    maxMonthlyPayment: Math.round(maxMonthlyPayment * 100) / 100,
    totalProjectCapacity: Math.round(totalProjectCapacity),
    debtRatio: Math.round(actualDebtRatio * 10) / 10,
    riskLevel,
    recommendations,
    monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
    totalInterest: Math.round(totalInterest),
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    amortizationData,
    evolutionData: this.generateEvolutionData(formData),
    comparisonData: this.generateComparisonData(formData),
    budgetBreakdown
  };
}

  private estimateCapitalForInsurance(monthlyPayment: number, annualRate: number, durationInMonths: number): number {
    const monthlyRate = annualRate / 100 / 12;
    return this.calculateLoanAmount(monthlyPayment * 0.9, monthlyRate, durationInMonths);
  }

  private getMaxDebtRatio(formData: any): number {
  let baseRatio = 33.0; // Base de 33%
  
  // Ajustements selon la stabilité des revenus
  switch(formData.incomeStability) {
    case 'very_stable': baseRatio += 2.0; break;
    case 'stable': baseRatio += 0; break;
    case 'variable': baseRatio -= 1.0; break;
    case 'unstable': baseRatio -= 3.0; break;
    case 'freelance': baseRatio -= 1.5; break;
  }
  
  // Ajustements selon la profession
  const profession = this.professionTypes.find(p => p.value === formData.profession);
  if (profession) {
    baseRatio -= profession.riskFactor; // Soustraction car riskFactor est positif pour les professions à risque
  }
  
  // Bonus pour hauts revenus (seuils adaptés au contexte gabonais)
  if (formData.monthlyIncome >= 3000000) baseRatio += 2.0;      // 3M+ FCFA
  else if (formData.monthlyIncome >= 1500000) baseRatio += 1.0; // 1.5M+ FCFA
  else if (formData.monthlyIncome >= 1000000) baseRatio += 0.5; // 1M+ FCFA
  
  // Bonus pour l'expérience professionnelle
  if (formData.workExperience >= 20) baseRatio += 1.0;
  else if (formData.workExperience >= 10) baseRatio += 0.5;
  else if (formData.workExperience >= 5) baseRatio += 0.2;
  
  // Malus pour l'âge (risque de retraite)
  if (formData.age >= 60) baseRatio -= 2.0;
  else if (formData.age >= 55) baseRatio -= 1.0;
  else if (formData.age <= 25) baseRatio -= 0.5; // Jeune = moins d'expérience
  
  // Bonus si apport important
  if (formData.downPayment > 0 && formData.monthlyIncome > 0) {
    const apportMonths = formData.downPayment / formData.monthlyIncome;
    if (apportMonths >= 24) baseRatio += 1.0;      // 2 ans de salaire d'apport
    else if (apportMonths >= 12) baseRatio += 0.5; // 1 an de salaire d'apport
  }
  
  // Limites absolues (sécurité réglementaire)
  return Math.max(25.0, Math.min(37.0, baseRatio));
}

  private calculateLoanAmount(monthlyPayment: number, monthlyRate: number, durationInMonths: number): number {
  if (monthlyPayment <= 0 || durationInMonths <= 0) {
    return 0;
  }
  
  if (monthlyRate === 0) {
    return monthlyPayment * durationInMonths;
  }
  
  // Formule standard du capital avec vérification des valeurs
  const denominator = Math.pow(1 + monthlyRate, durationInMonths) - 1;
  if (denominator === 0) {
    return monthlyPayment * durationInMonths;
  }
  
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, durationInMonths);
  if (numerator === 0) {
    return 0;
  }
  
  const capital = monthlyPayment * denominator / numerator;
  
  // Vérification du résultat
  return isNaN(capital) || !isFinite(capital) ? 0 : Math.max(0, capital);
}

  private calculateCapitalWithInsurance(
  maxPayment: number, 
  annualRate: number, 
  durationMonths: number, 
  insuranceRate: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const annualInsuranceRate = insuranceRate / 100;
  
  // Si taux nul, calcul simplifié
  if (monthlyRate === 0) {
    return (maxPayment * durationMonths) / (1 + (annualInsuranceRate * durationMonths / 12));
  }

  // Méthode itérative de Newton-Raphson pour trouver le capital optimal
  let capital = maxPayment * durationMonths * 0.8; // Estimation initiale
  let iterations = 0;
  const maxIterations = 50;
  const tolerance = 1; // Précision de 1 FCFA

  while (iterations < maxIterations) {
    // Calcul de la mensualité crédit pour ce capital
    const creditPayment = capital * monthlyRate * Math.pow(1 + monthlyRate, durationMonths) / 
                         (Math.pow(1 + monthlyRate, durationMonths) - 1);
    
    // Calcul de l'assurance mensuelle
    const insurancePayment = (capital * annualInsuranceRate) / 12;
    
    // Paiement total mensuel
    const totalPayment = creditPayment + insurancePayment;
    
    // Écart par rapport au maximum autorisé
    const difference = maxPayment - totalPayment;
    
    // Convergence atteinte
    if (Math.abs(difference) < tolerance) {
      break;
    }
    
    // Ajustement du capital (méthode de Newton simplifiée)
    const adjustmentFactor = difference / maxPayment;
    capital = capital * (1 + adjustmentFactor * 0.5); // Facteur de 0.5 pour stabilité
    
    // Éviter les valeurs négatives
    if (capital <= 0) {
      capital = 1000; // Valeur minimale
      break;
    }
    
    iterations++;
  }

  return Math.max(0, capital);
}
  private generateAmortizationPoints(
    capital: number, 
    annualRate: number, 
    durationInMonths: number,
    monthlyInsurance: number = 0
  ): AmortizationPoint[] {
    const monthlyRate = annualRate / 100 / 12;

    if (monthlyRate === 0) {
      const monthlyPrincipal = capital / durationInMonths;
      return Array.from({ length: Math.min(12, durationInMonths) }, (_, i) => {
        const month = (i + 1) * Math.max(1, Math.floor(durationInMonths / 12));
        return {
          month,
          remainingDebt: Math.max(0, capital - (monthlyPrincipal * month)),
          paidPrincipal: monthlyPrincipal * month,
          cumulativeInterest: 0,
          monthlyPayment: monthlyPrincipal + monthlyInsurance
        };
      });
    }

    const monthlyPayment = capital * monthlyRate * Math.pow(1 + monthlyRate, durationInMonths) / 
                         (Math.pow(1 + monthlyRate, durationInMonths) - 1);

    let remainingDebt = capital;
    let cumulativeInterest = 0;
    const amortizationPoints: AmortizationPoint[] = [];

    for (let month = 1; month <= durationInMonths; month++) {
      const interest = remainingDebt * monthlyRate;
      const paidPrincipal = monthlyPayment - interest;
      cumulativeInterest += interest;
      remainingDebt = Math.max(0, remainingDebt - paidPrincipal);

      if (month % Math.max(1, Math.floor(durationInMonths / 12)) === 0 || month === durationInMonths) {
        amortizationPoints.push({
          month: month,
          remainingDebt: Math.round(remainingDebt),
          paidPrincipal: Math.round(capital - remainingDebt),
          cumulativeInterest: Math.round(cumulativeInterest),
          monthlyPayment: Math.round((monthlyPayment + monthlyInsurance) * 100) / 100
        });
      }
    }

    return amortizationPoints;
  }

  private generateEvolutionData(formData: any): EvolutionPoint[] {
    const durations = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60];
    const totalIncome = formData.monthlyIncome + (formData.additionalIncome || 0);
    const maxDebtRatio = this.getMaxDebtRatio(formData);
    const currentMonthlyDebts = formData.currentDebts || 0;
    
    const maxMonthlyPayment = Math.max(0, (totalIncome * maxDebtRatio / 100) - currentMonthlyDebts);

    return durations.map(duration => {
      if (maxMonthlyPayment <= 0) {
        return {
          durationInMonths: duration,
          duration: Math.round((duration / 12) * 10) / 10,
          capacity: 0,
          monthlyPayment: 0,
          totalCost: 0
        };
      }

      const monthlyRate = formData.interestRate / 100 / 12;
      let adjustedPayment = maxMonthlyPayment;
      
      if (formData.hasInsurance && formData.insuranceRate > 0) {
        const estimatedCapital = this.calculateLoanAmount(maxMonthlyPayment * 0.9, monthlyRate, duration);
        const monthlyInsurance = (estimatedCapital * formData.insuranceRate / 100) / 12;
        adjustedPayment = maxMonthlyPayment - monthlyInsurance;
      }
      
      const capacity = this.calculateLoanAmount(adjustedPayment, monthlyRate, duration);
      
      return {
        durationInMonths: duration,
        duration: Math.round((duration / 12) * 10) / 10,
        capacity: Math.round(capacity),
        monthlyPayment: Math.round(maxMonthlyPayment),
        totalCost: Math.round(maxMonthlyPayment * duration)
      };
    }).filter(item => item.capacity > 0);
  }

  private generateComparisonData(formData: any): ComparisonPoint[] {
    const rates = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
    const totalIncome = formData.monthlyIncome + (formData.additionalIncome || 0);
    const maxDebtRatio = this.getMaxDebtRatio(formData);
    const currentMonthlyDebts = formData.currentDebts || 0;
    const maxMonthlyPayment = Math.max(0, (totalIncome * maxDebtRatio / 100) - currentMonthlyDebts);
    const currentRate = formData.interestRate;

    let currentMonthlyNet = maxMonthlyPayment;
    if (formData.hasInsurance && formData.insuranceRate > 0) {
      const estimatedCapital = this.calculateLoanAmount(maxMonthlyPayment * 0.9, currentRate / 100 / 12, formData.duration);
      const monthlyInsurance = (estimatedCapital * formData.insuranceRate / 100) / 12;
      currentMonthlyNet = maxMonthlyPayment - monthlyInsurance;
    }
    
    const currentCapacity = this.calculateLoanAmount(
      currentMonthlyNet, 
      currentRate / 100 / 12, 
      formData.duration
    );

    return rates.map(rate => {
      if (maxMonthlyPayment <= 0) {
        return {
          rate,
          capacity: 0,
          difference: 0,
          monthlyPayment: 0
        };
      }

      const monthlyRate = rate / 100 / 12;
      let adjustedPayment = maxMonthlyPayment;
      
      if (formData.hasInsurance && formData.insuranceRate > 0) {
        const estimatedCapital = this.calculateLoanAmount(maxMonthlyPayment * 0.9, monthlyRate, formData.duration);
        const monthlyInsurance = (estimatedCapital * formData.insuranceRate / 100) / 12;
        adjustedPayment = maxMonthlyPayment - monthlyInsurance;
      }
      
      const capacity = this.calculateLoanAmount(adjustedPayment, monthlyRate, formData.duration);
      
      return {
        rate,
        capacity: Math.round(capacity),
        difference: Math.round(capacity - currentCapacity),
        monthlyPayment: Math.round(maxMonthlyPayment)
      };
    }).filter(item => item.capacity > 0);
  }

  private calculateRiskLevel(debtRatio: number, formData: any): RiskLevel {
    let riskScore = 0;
    
    if (debtRatio > 35) riskScore += 3;
    else if (debtRatio > 30) riskScore += 2;
    else if (debtRatio > 25) riskScore += 1;
    
    switch(formData.incomeStability) {
      case 'unstable': riskScore += 2; break;
      case 'variable': riskScore += 1; break;
      case 'freelance': riskScore += 1; break;
    }
    
    const profession = this.professionTypes.find(p => p.value === formData.profession);
    if (profession) {
      riskScore += Math.max(0, profession.riskFactor);
    }
    
    if (formData.age > 60) riskScore += 2;
    else if (formData.age > 55) riskScore += 1;
    else if (formData.age < 25) riskScore += 1;
    
    if (formData.workExperience < 2) riskScore += 1;
    
    const downPaymentRatio = formData.downPayment / (this.results?.totalProjectCapacity || 1);
    if (downPaymentRatio < 0.1) riskScore += 1;
    
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  private generateRecommendations(debtRatio: number, capacity: number, formData: any): string[] {
    const recommendations: string[] = [];
    
    if (debtRatio > 30) {
      recommendations.push('Votre taux d\'endettement est élevé. Considérez réduire vos charges actuelles avant d\'emprunter.');
    }
    
    const projectValue = capacity + (formData.downPayment || 0);
    const downPaymentRatio = (formData.downPayment || 0) / projectValue;
    
    if (downPaymentRatio < 0.1) {
      recommendations.push('Un apport personnel d\'au moins 10% améliorerait vos conditions de financement.');
    } else if (downPaymentRatio >= 0.2) {
      recommendations.push('Excellent apport personnel ! Vous bénéficierez de conditions préférentielles.');
    }
    
    if (formData.duration < 12) {
      recommendations.push('Durée très courte : vérifiez que les mensualités restent soutenables.');
    } else if (formData.duration > 48) {
      recommendations.push('Durée longue : le coût total sera plus élevé mais les mensualités plus faibles.');
    }
    
    if (formData.interestRate > 8) {
      recommendations.push('Taux élevé : négociez avec votre banque ou comparez avec d\'autres établissements.');
    } else if (formData.interestRate < 4) {
      recommendations.push('Excellent taux ! Profitez de cette opportunité.');
    }
    
    if (!formData.hasInsurance && capacity > 5000000) {
      recommendations.push('Pour un montant important, l\'assurance emprunteur est fortement recommandée.');
    }
    
    if (formData.profession === 'entrepreneur' || formData.profession === 'freelance') {
      recommendations.push('Profil indépendant : constituez une épargne de précaution équivalente à 6 mois de charges.');
    }
    
    if (formData.age > 55) {
      recommendations.push('Proche de la retraite : vérifiez que vos revenus futurs permettront le remboursement.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Excellent profil emprunteur ! Vous pouvez négocier des conditions préférentielles.');
      recommendations.push('Votre situation financière est solide et rassurante pour les banques.');
    }
    
    return recommendations;
  }

  private createErrorResult(message: string): BorrowingCapacityResult {
    return {
      borrowingCapacity: 0,
      maxMonthlyPayment: 0,
      totalProjectCapacity: 0,
      debtRatio: 0,
      riskLevel: 'high',
      recommendations: [message],
      monthlyInsurance: 0,
      totalInterest: 0,
      effectiveRate: 0,
      amortizationData: [],
      evolutionData: [],
      comparisonData: [],
      budgetBreakdown: {
        totalIncome: 0,
        maxDebtPayment: 0,
        currentDebts: 0,
        availableForCredit: 0,
        remainingIncome: 0
      }
    };
  }

  // Simulation avec une banque spécifique
  async simulateWithBank(product: CreditProduct): Promise<void> {
    if (!this.results) return;

    const formData = this.capacityForm.value;
    
    try {
      const simulationRequest = {
        credit_product_id: product.id,
        requested_amount: this.results.borrowingCapacity,
        duration_months: formData.duration,
        monthly_income: formData.monthlyIncome,
        current_debts: formData.currentDebts || 0,
        down_payment: formData.downPayment || 0
      };

      const simulation = await this.apiService.simulateCredit(simulationRequest).pipe(
        catchError(error => {
          console.error('Erreur simulation:', error);
          this.notificationService.showError(`Erreur lors de la simulation avec ${product.bank.name}`);
          return of(null);
        })
      ).toPromise();

      if (simulation) {
        this.notificationService.showSuccess(`Simulation réussie avec ${product.bank.name}`);
        
        // Optionnel: naviguer vers une page de détail
        this.router.navigate(['/simulation-details'], { 
          queryParams: { simulationId: simulation.simulation_id }
        });
      }

    } catch (error) {
      console.error('Erreur lors de la simulation:', error);
      this.notificationService.showError('Erreur lors de la simulation');
    }
  }

  // Navigation vers le comparateur avec données pré-remplies
  goToComparator(): void {
    if (!this.results) return;

    const queryParams = {
      creditType: this.selectedCreditType,
      requestedAmount: this.results.borrowingCapacity,
      duration: this.capacityForm.get('duration')?.value,
      monthlyIncome: this.capacityForm.get('monthlyIncome')?.value,
      from: 'capacity_simulator'
    };

    this.trackNavigation('comparator', queryParams);
    this.router.navigate(['/multi-bank-comparator'], { queryParams });
  }

  // Export avec données backend
  async exportResults(): Promise<void> {
    if (!this.results) return;

    try {
      // Si on a une simulation sauvegardée, l'exporter via l'API
      if (this.results.bankComparisons && this.results.bankComparisons.length > 0) {
        const bestOffer = this.results.bankComparisons[0];
        if (bestOffer.simulationId) {
          const pdfBlob = await this.apiService.exportSimulationPDF(bestOffer.simulationId).pipe(
            catchError(error => {
              console.error('Erreur export PDF:', error);
              return this.exportLocalResults(); // Fallback vers export local
            })
          ).toPromise();

          if (pdfBlob) {
            this.downloadBlob(pdfBlob, `capacite-emprunt-${Date.now()}.pdf`);
            this.notificationService.showSuccess('Export PDF généré avec succès');
            this.trackExport('pdf');
            return;
          }
        }
      }

      // Fallback vers export local
      this.exportLocalResults();

    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.notificationService.showError('Erreur lors de l\'export du PDF');
    }
  }

  private exportLocalResults(): Promise<Blob> {
    // Export local comme avant
    const exportData = {
      type: 'borrowing_capacity',
      timestamp: new Date().toISOString(),
      inputs: this.capacityForm.value,
      results: this.results,
      metadata: {
        version: '2.0',
        currency: 'XAF',
        country: 'GA'
      }
    };

    // Créer un blob local ou utiliser un service d'export local
    const dataStr = JSON.stringify(exportData, null, 2);
    return Promise.resolve(new Blob([dataStr], { type: 'application/json' }));
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Méthodes d'interface utilisateur
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.trackTabChange(tab);
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
    this.trackAdvancedOptionsToggle(this.showAdvancedOptions);
  }

  resetForm(): void {
    this.capacityForm.reset({
      monthlyIncome: 750000,
      additionalIncome: 0,
      incomeType: 'salary',
      incomeStability: 'stable',
      currentDebts: 0,
      rentOrMortgage: 0,
      livingExpenses: 200000,
      duration: 24,
      interestRate: 6.5,
      downPayment: 0,
      hasInsurance: true,
      insuranceRate: 0.36,
      includePropertyTax: false,
      propertyTaxRate: 1.2,
      includeMaintenanceCosts: false,
      maintenanceRate: 1.0,
      age: 35,
      profession: 'employee',
      workExperience: 5
    });
    this.results = null;
    this.trackFormReset();
  }

  // Test de connexion backend
  async testBackendConnection(): Promise<void> {
    try {
      this.notificationService.showInfo('Test de connexion en cours...');
      
      const healthCheck = await this.apiService.testConnection().pipe(
        catchError(error => {
          console.error('Erreur de connexion:', error);
          return of({ status: 'error', message: error.message });
        })
      ).toPromise();

      if (healthCheck?.status === 'ok') {
        this.notificationService.showSuccess('Connexion backend réussie');
      } else {
        this.notificationService.showError('Connexion backend échouée');
      }

    } catch (error) {
      console.error('Erreur test backend:', error);
      this.notificationService.showError('Impossible de se connecter au backend');
    }
  }

  // Partage des résultats avec données backend
  shareResults(): void {
    if (!this.results) return;

    const durationText = this.getDurationText(this.capacityForm.get('duration')?.value || 0);
    
    let shareText = `Ma capacité d'emprunt calculée avec Bamboo Credit:
💰 Capital: ${this.formatCurrency(this.results.borrowingCapacity)}
⏱️ Durée: ${durationText}
🏠 Projet total: ${this.formatCurrency(this.results.totalProjectCapacity)}
📊 Taux d'endettement: ${this.formatPercent(this.results.debtRatio)}`;

    // Ajouter les meilleures offres si disponibles
    if (this.results.bankComparisons && this.results.bankComparisons.length > 0) {
      const bestOffer = this.results.bankComparisons[0];
      shareText += `\n\n🏆 Meilleure offre: ${bestOffer.bank.name}
💳 Mensualité: ${this.formatCurrency(bestOffer.monthlyPayment)}`;
    }

    shareText += `\n\nCalculez la vôtre sur ${window.location.origin}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Ma capacité d\'emprunt - Bamboo Credit',
        text: shareText,
        url: window.location.href
      }).then(() => {
        this.trackShare('native');
      }).catch(() => {
        this.fallbackShare(shareText);
      });
    } else {
      this.fallbackShare(shareText);
    }
  }

  private fallbackShare(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.notificationService.showSuccess('Résultats copiés dans le presse-papier');
        this.trackShare('clipboard');
      }).catch(() => {
        this.showShareModal(text);
      });
    } else {
      this.showShareModal(text);
    }
  }

  private showShareModal(text: string): void {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div style="background: white; padding: 2rem; border-radius: 1rem; max-width: 500px; margin: 1rem;">
          <h3 style="margin: 0 0 1rem; color: #1a4d3a;">Partager mes résultats</h3>
          <textarea readonly style="width: 100%; height: 150px; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-family: inherit; resize: none;">${text}</textarea>
          <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: flex-end;">
            <button onclick="this.closest('div').remove()" style="padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer;">Fermer</button>
            <button onclick="navigator.clipboard.writeText('${text}').then(() => { alert('Copié !'); this.closest('div').remove(); })" style="padding: 0.5rem 1rem; background: #1a4d3a; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">Copier</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.trackShare('modal');
  }

  // Méthodes utilitaires améliorées
  formatCurrency(amount: number): string {
    if (amount === 0) return '0 FCFA';
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatNumber(value: number): string {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}Md`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('fr-FR');
  }

  getDurationText(months: number): string {
    if (months < 12) {
      return `${months} mois`;
    } else if (months % 12 === 0) {
      const years = months / 12;
      return `${years} an${years > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return `${years} an${years > 1 ? 's' : ''} et ${remainingMonths} mois`;
    }
  }

  getRiskColor(level: string): string {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getRiskLabel(level: string): string {
    switch (level) {
      case 'low': return 'Risque faible';
      case 'medium': return 'Risque modéré';
      case 'high': return 'Risque élevé';
      default: return 'Non évalué';
    }
  }

   getRiskWidth(level: string): string {
    switch (level) {
      case 'low': return '33%';
      case 'medium': return '66%';
      case 'high': return '100%';
      default: return '0%';
    }
  }

  // Validation améliorée
  hasError(controlName: string): boolean {
    const control = this.capacityForm.get(controlName);
    return !!(control?.errors && control?.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.capacityForm.get(controlName);
    if (!control?.errors) return '';

    const errors = control.errors;
    
    if (errors['required']) return 'Ce champ est requis';
    if (errors['min']) return `Valeur minimum: ${this.formatCurrency(errors['min'].min)}`;
    if (errors['max']) return `Valeur maximum: ${this.formatCurrency(errors['max'].max)}`;
    if (errors['email']) return 'Format email invalide';
    
    return 'Valeur invalide';
  }

  // Méthodes de tracking améliorées
  private trackPageView(): void {
    this.analyticsService.trackPageView('borrowing_capacity_simulator', {
      page_title: 'Simulateur Capacité d\'Emprunt',
      page_version: '2.0',
      backend_enabled: true,
      banks_count: this.banks.length,
      products_count: this.creditProducts.length
    });
  }

  private trackCalculationCompleted(): void {
    if (!this.results) return;

    this.analyticsService.trackEvent('capacity_calculation_completed', {
      borrowing_capacity: this.results.borrowingCapacity,
      debt_ratio: this.results.debtRatio,
      risk_level: this.results.riskLevel,
      monthly_income: this.capacityForm.get('monthlyIncome')?.value,
      duration_months: this.capacityForm.get('duration')?.value,
      has_insurance: this.capacityForm.get('hasInsurance')?.value,
      profession: this.capacityForm.get('profession')?.value,
      bank_comparisons_count: this.results.bankComparisons?.length || 0,
      has_backend_data: !!(this.results.bankComparisons && this.results.bankComparisons.length > 0)
    });
  }

  private trackTabChange(tab: string): void {
    this.analyticsService.trackEvent('tab_changed', {
      tab: tab,
      page: 'borrowing_capacity'
    });
  }

  private trackAdvancedOptionsToggle(shown: boolean): void {
    this.analyticsService.trackEvent('advanced_options_toggled', {
      shown: shown,
      page: 'borrowing_capacity'
    });
  }

  private trackFormReset(): void {
    this.analyticsService.trackEvent('form_reset', {
      page: 'borrowing_capacity'
    });
  }

  private trackNavigation(destination: string, params?: any): void {
    this.analyticsService.trackEvent('navigation', {
      from: 'borrowing_capacity',
      to: destination,
      params: params
    });
  }

  private trackExport(type: string): void {
    this.analyticsService.trackEvent('export_results', {
      type: type,
      page: 'borrowing_capacity',
      capacity: this.results?.borrowingCapacity,
      has_backend_data: !!(this.results?.bankComparisons && this.results.bankComparisons.length > 0)
    });
  }

  private trackShare(method: string): void {
    this.analyticsService.trackEvent('share_results', {
      method: method,
      page: 'borrowing_capacity',
      capacity: this.results?.borrowingCapacity
    });
  }

  // Getters pour le template
  get isFormValid(): boolean {
    return this.capacityForm.valid;
  }

  get canExport(): boolean {
    return !!this.results && this.results.borrowingCapacity > 0;
  }

  get canShare(): boolean {
    return !!this.results && this.results.borrowingCapacity > 0;
  }

  get maxLoanToValueRatio(): number {
    if (!this.results || this.results.totalProjectCapacity === 0) return 0;
    return Math.round((this.results.borrowingCapacity / this.results.totalProjectCapacity) * 1000) / 10;
  }

  get monthlyBudgetAfterLoan(): number {
    if (!this.results) return 0;
    return this.results.budgetBreakdown.remainingIncome;
  }

  get totalMonthlyCosts(): number {
    if (!this.results) return 0;
    const formData = this.capacityForm.value;
    let total = this.results.maxMonthlyPayment;
    
    if (formData.includePropertyTax && this.results.totalProjectCapacity > 0) {
      total += (this.results.totalProjectCapacity * formData.propertyTaxRate / 100 / 12);
    }
    
    if (formData.includeMaintenanceCosts && this.results.totalProjectCapacity > 0) {
      total += (this.results.totalProjectCapacity * formData.maintenanceRate / 100 / 12);
    }
    
    return Math.round(total * 100) / 100;
  }

  get formattedDuration(): string {
    const duration = this.capacityForm.get('duration')?.value || 0;
    return this.getDurationText(duration);
  }

  get durationInYears(): number {
    const duration = this.capacityForm.get('duration')?.value || 0;
    return Math.round((duration / 12) * 10) / 10;
  }

  get selectedIncomeType(): any {
    const selectedId = this.capacityForm.get('incomeType')?.value;
    return this.incomeTypes.find(type => type.id === selectedId);
  }

  get selectedProfession(): any {
    const selectedValue = this.capacityForm.get('profession')?.value;
    return this.professionTypes.find(prof => prof.value === selectedValue);
  }

  get recommendedDurations(): any[] {
    return this.durationOptions.filter(option => option.recommended);
  }

  get allDurations(): any[] {
    return this.durationOptions;
  }

  get bestBankOffer(): BankComparison | null {
    if (!this.results?.bankComparisons || this.results.bankComparisons.length === 0) {
      return null;
    }
    return this.results.bankComparisons[0]; // Déjà triés par mensualité croissante
  }

  get eligibleBankOffers(): BankComparison[] {
    if (!this.results?.bankComparisons) return [];
    return this.results.bankComparisons.filter(offer => offer.eligible);
  }

  get totalBankOffersCount(): number {
    return this.results?.bankComparisons?.length || 0;
  }

  get eligibleBankOffersCount(): number {
    return this.eligibleBankOffers.length;
  }

  // Status backend
  get backendStatus(): string {
    if (this.isLoadingBanks) return 'loading';
    if (this.banks.length === 0) return 'offline';
    return 'online';
  }

  get backendStatusMessage(): string {
    switch (this.backendStatus) {
      case 'loading': return 'Chargement des données...';
      case 'offline': return 'Mode hors-ligne - Calculs locaux uniquement';
      case 'online': return `${this.banks.length} banques disponibles`;
      default: return '';
    }
  }
}