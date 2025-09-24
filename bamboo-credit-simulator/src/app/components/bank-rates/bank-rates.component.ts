import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, finalize, switchMap, map, catchError } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';
import { BankRatesService, ExtendedBank, BankAccountConditions, InsuranceProductRate, BankAllProducts, CreditProductRate, SavingsProductRate } from '../../services/bank-rates.service';

// Interface étendue pour afficher tous les produits
interface BankWithAllProducts extends ExtendedBank {
  creditProducts: CreditProductRate[];
  savingsProducts: SavingsProductRate[];
  insuranceProducts: InsuranceProductRate[];
  accountConditions: BankAccountConditions;
}

@Component({
  selector: 'enhanced-bank-rates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="enhanced-bank-rates-container">
      <div class="page-header">
        <div class="container">
          <h1>Services Bancaires et Assurances au Gabon</h1>
          <p class="subtitle">Comparez les taux, conditions et services de toutes les institutions partenaires</p>
          
          <!-- Loading indicator -->
          <div *ngIf="isLoading" class="loading-indicator">
            <div class="spinner"></div>
            <p>Chargement des données bancaires et d'assurance...</p>
          </div>

          <!-- Error message -->
          <div *ngIf="errorMessage" class="error-message">
            <p>{{ errorMessage }}</p>
            <button (click)="reloadData()" class="retry-btn">Réessayer</button>
          </div>
          
          <!-- Filtres -->
          <div class="filters-section" *ngIf="!isLoading && !errorMessage">
            <form [formGroup]="filtersForm" class="filters-form">
              <div class="filter-group">
                <label for="productType">Type de produit</label>
                <select formControlName="productType" id="productType" class="form-select">
                  <option value="">Tous les produits</option>
                  <option value="credit">Crédit</option>
                  <option value="savings">Épargne</option>
                  <option value="insurance">Assurance</option>
                  <option value="conditions">Conditions d'ouverture</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="creditType">Sous-type</label>
                <select formControlName="creditType" id="creditType" class="form-select">
                  <option value="">Tous les types</option>
                  <option value="immobilier">Crédit Immobilier</option>
                  <option value="consommation">Crédit Consommation</option>
                  <option value="auto">Crédit/Assurance Auto</option>
                  <option value="vie">Assurance Vie</option>
                  <option value="habitation">Assurance Habitation</option>
                  <option value="sante">Assurance Santé</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="sortBy">Trier par</label>
                <select formControlName="sortBy" id="sortBy" class="form-select">
                  <option value="bank">Nom banque</option>
                  <option value="rate">Taux/Prime croissant</option>
                  <option value="conditions">Conditions d'ouverture</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="bank">Institution</label>
                <select formControlName="selectedBank" id="bank" class="form-select">
                  <option value="">Toutes les institutions</option>
                  <option *ngFor="let bank of banksWithProducts" [value]="bank.id">
                    {{ bank.name }}
                  </option>
                </select>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Banks and Products Display -->
      <div class="products-section" *ngIf="!isLoading && !errorMessage">
        <div class="container">
          <div class="results-info">
            <p>{{ getBankCount() }} institution(s) - {{ getTotalProductsCount() }} produit(s) disponible(s)</p>
          </div>

          <div class="banks-grid">
            <div *ngFor="let bank of filteredBanks" class="bank-card">
              <!-- Bank Header -->
              <div class="bank-header">
                <div class="bank-logo">
                  <img [src]="bank.logo_url || '/assets/banks/default-logo.png'" [alt]="bank.name" />
                </div>
                <div class="bank-info">
                  <h2>{{ bank.name }}</h2>
                  <p class="bank-description">{{ bank.description }}</p>
                  <div class="bank-contact">
                    <span *ngIf="bank.contact_phone">📞 {{ bank.contact_phone }}</span>
                    <span *ngIf="bank.contact_email">✉️ {{ bank.contact_email }}</span>
                  </div>
                </div>
              </div>

              <!-- Tabs Navigation -->
              <div class="product-tabs">
                <button 
                  *ngFor="let tab of getAvailableTabs(bank)" 
                  [class]="'tab-btn ' + (getActiveTab(bank.id) === tab.id ? 'active' : '')"
                  (click)="setActiveTab(bank.id, tab.id)">
                  {{ tab.label }} ({{ tab.count }})
                </button>
              </div>

              <!-- Account Conditions Tab -->
              <div *ngIf="getActiveTab(bank.id) === 'conditions'" class="tab-content conditions-content">
                <div class="conditions-section">
                  <h3>Conditions d'ouverture de compte</h3>
                  
                  <div class="condition-item">
                    <h4>💰 Dépôt minimum</h4>
                    <p class="amount">{{ formatCurrency(bank.account_conditions.minimum_deposit) }}</p>
                  </div>

                  <div class="condition-item">
                    <h4>📄 Documents requis</h4>
                    <ul>
                      <li *ngFor="let doc of bank.account_conditions.required_documents">{{ doc }}</li>
                    </ul>
                  </div>

                  <div class="condition-item">
                    <h4>✅ Critères d'éligibilité</h4>
                    <ul>
                      <li *ngFor="let criteria of bank.account_conditions.eligibility_criteria">{{ criteria }}</li>
                    </ul>
                  </div>

                  <div class="condition-item">
                    <h4>💳 Frais et tarifs</h4>
                    <div class="fees-grid">
                      <div *ngFor="let fee of bank.account_conditions.fees" class="fee-item">
                        <span class="fee-type">{{ fee.type }}</span>
                        <span class="fee-amount">{{ formatCurrency(fee.amount) }}</span>
                        <span class="fee-frequency">{{ fee.frequency }}</span>
                        <p class="fee-description">{{ fee.description }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="condition-item">
                    <h4>⏱️ Délai de traitement</h4>
                    <p class="processing-time">{{ bank.account_conditions.processing_time }}</p>
                  </div>

                  <div class="condition-item">
                    <h4>🏢 Services disponibles</h4>
                    <div class="services-grid">
                      <span *ngFor="let service of bank.available_services" class="service-tag">{{ service }}</span>
                    </div>
                  </div>

                  <div class="condition-item" *ngIf="bank.branch_locations?.length">
                    <h4>📍 Agences</h4>
                    <div class="locations-grid">
                      <span *ngFor="let location of bank.branch_locations" class="location-tag">{{ location }}</span>
                    </div>
                  </div>
                </div>

                <div class="actions">
                  <button (click)="contactBank(bank)" class="btn-primary">
                    Ouvrir un compte
                  </button>
                  <button (click)="getBankInfo(bank)" class="btn-secondary">
                    Plus d'infos
                  </button>
                </div>
              </div>

              <!-- Credit Products Tab -->
              <div *ngIf="getActiveTab(bank.id) === 'credit'" class="tab-content products-content">
                <div *ngFor="let product of bank.creditProducts" class="product-card credit-product">
                  <div class="product-header">
                    <h4>{{ product.name }}</h4>
                    <span class="product-type">{{ getCreditTypeLabel(product.type) }}</span>
                  </div>
                  
                  <div class="product-details">
                    <div class="rate-info">
                      <span class="rate-label">Taux moyen</span>
                      <span class="rate-value">{{ formatPercent(product.average_rate) }}</span>
                    </div>
                    
                    <div class="product-specs">
                      <div class="spec-item">
                        <span class="label">Montant</span>
                        <span class="value">{{ formatCurrency(product.min_amount) }} - {{ formatCurrency(product.max_amount) }}</span>
                      </div>
                      <div class="spec-item">
                        <span class="label">Durée max</span>
                        <span class="value">{{ Math.floor(product.max_duration_months / 12) }} ans</span>
                      </div>
                      <div class="spec-item">
                        <span class="label">Délai</span>
                        <span class="value">{{ product.processing_time_hours }}h</span>
                      </div>
                    </div>
                  </div>

                  <div class="product-actions">
                    <button (click)="simulateCredit(product, bank)" class="btn-primary">
                      Simuler
                    </button>
                    <button (click)="getProductDetails(product)" class="btn-secondary">
                      Détails
                    </button>
                  </div>
                </div>
              </div>

              <!-- Savings Products Tab -->
              <div *ngIf="getActiveTab(bank.id) === 'savings'" class="tab-content products-content">
                <div *ngFor="let product of bank.savingsProducts" class="product-card savings-product">
                  <div class="product-header">
                    <h4>{{ product.name }}</h4>
                    <span class="product-type">{{ getSavingsTypeLabel(product.type) }}</span>
                  </div>
                  
                  <div class="product-details">
                    <div class="rate-info">
                      <span class="rate-label">Taux d'intérêt</span>
                      <span class="rate-value">{{ formatPercent(product.interest_rate) }}</span>
                    </div>
                    
                    <div class="product-specs">
                      <div class="spec-item">
                        <span class="label">Dépôt min</span>
                        <span class="value">{{ formatCurrency(product.minimum_deposit) }}</span>
                      </div>
                      <div class="spec-item">
                        <span class="label">Liquidité</span>
                        <span class="value">{{ getLiquidityLabel(product.liquidity) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="product-actions">
                    <button (click)="simulateSavings(product, bank)" class="btn-primary">
                      Simuler
                    </button>
                    <button (click)="getProductDetails(product)" class="btn-secondary">
                      Détails
                    </button>
                  </div>
                </div>
              </div>

              <!-- Insurance Products Tab -->
              <div *ngIf="getActiveTab(bank.id) === 'insurance'" class="tab-content products-content">
                <div *ngFor="let product of bank.insuranceProducts" class="product-card insurance-product">
                  <div class="product-header">
                    <h4>{{ product.name }}</h4>
                    <span class="product-type">{{ getInsuranceTypeLabel(product.type) }}</span>
                    <span class="company-badge">{{ product.company.name }}</span>
                  </div>
                  
                  <div class="product-details">
                    <div class="rate-info">
                      <span class="rate-label">Prime de base</span>
                      <span class="rate-value">{{ formatCurrency(product.base_premium) }}</span>
                    </div>
                    
                    <div class="product-specs">
                      <div class="spec-item" *ngIf="product.features?.length">
                        <span class="label">Garanties</span>
                        <div class="features-list">
                          <span *ngFor="let feature of product.features.slice(0, 3)" class="feature-tag">{{ feature }}</span>
                          <span *ngIf="product.features.length > 3" class="more-features">+{{ product.features.length - 3 }} autres</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="product-actions">
                    <button (click)="getInsuranceQuote(product)" class="btn-primary">
                      Devis
                    </button>
                    <button (click)="getProductDetails(product)" class="btn-secondary">
                      Détails
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No results -->
          <div *ngIf="filteredBanks.length === 0 && !isLoading" class="no-results">
            <h3>Aucune institution trouvée</h3>
            <p>Essayez de modifier vos critères de recherche</p>
            <button (click)="clearFilters()" class="btn-secondary">Effacer les filtres</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./bank-rates.component.scss']
})
export class BankRatesComponent implements OnInit, OnDestroy {
  filtersForm!: FormGroup;
  banksWithProducts: BankWithAllProducts[] = [];
  filteredBanks: BankWithAllProducts[] = [];
  
  // Active tabs per bank
  activeTabs: { [bankId: string]: string } = {};
  
  // Loading and error states
  isLoading = false;
  errorMessage = '';
  
  // Expose Math to template
  Math = Math;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    public bankRatesService: BankRatesService // Changé de private à public
  ) {}

  ngOnInit(): void {
    this.initializeFilters();
    this.setupFilters();
    this.loadInitialData();
    this.trackPageView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilters(): void {
    this.filtersForm = this.fb.group({
      productType: [''],
      creditType: [''],
      sortBy: ['bank'],
      selectedBank: ['']
    });
  }

  private setupFilters(): void {
    this.filtersForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Test de connexion d'abord
    this.bankRatesService.testEnhancedBanksEndpoint()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: () => {
          // Si la connexion est OK, charger les données
          this.loadBanksWithData();
        },
        error: (error) => {
          console.error('Erreur de connexion API:', error);
          this.errorMessage = 'Impossible de se connecter au serveur. Chargement des données de démonstration.';
          this.loadBanksWithFallback();
        }
      });
  }

  private loadBanksWithData(): void {
    this.bankRatesService.getBanksWithConditions()
      .pipe(
        takeUntil(this.destroy$),
        switchMap(banks => {
          // Charger les produits pour chaque banque
          const bankProductRequests = banks.map(bank =>
            this.bankRatesService.getBankAllProducts(bank.id).pipe(
              map(products => ({
                ...bank,
                creditProducts: products.credit_products,
                savingsProducts: products.savings_products,
                insuranceProducts: products.insurance_products,
                accountConditions: bank.account_conditions // Ajout explicite
              })),
              catchError(error => {
                console.warn(`Erreur lors du chargement des produits pour ${bank.name}:`, error);
                return of({
                  ...bank,
                  creditProducts: [],
                  savingsProducts: [],
                  insuranceProducts: [],
                  accountConditions: bank.account_conditions // Ajout explicite
                });
              })
            )
          );

          return forkJoin(bankProductRequests);
        })
      )
      .subscribe({
        next: (banksWithProducts) => {
          this.banksWithProducts = banksWithProducts;
          this.setDefaultActiveTabs();
          this.applyFilters();
          console.log('Banques avec produits chargées:', banksWithProducts);
        },
        error: (error) => {
          console.error('Erreur lors du chargement:', error);
          this.errorMessage = 'Erreur lors du chargement des données bancaires.';
          this.loadBanksWithFallback();
        }
      });
  }

  private loadBanksWithFallback(): void {
    // Utiliser les données de fallback du service
    this.bankRatesService.getBanksWithConditions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (banks) => {
          this.banksWithProducts = banks.map(bank => ({
            ...bank,
            creditProducts: [],
            savingsProducts: [],
            insuranceProducts: [],
            accountConditions: bank.account_conditions // Ajout explicite
          }));
          this.setDefaultActiveTabs();
          this.applyFilters();
        },
        error: (error) => {
          console.error('Erreur fallback:', error);
          this.errorMessage = 'Impossible de charger les données.';
        }
      });
  }

  private setDefaultActiveTabs(): void {
    this.banksWithProducts.forEach(bank => {
      this.activeTabs[bank.id] = 'conditions';
    });
  }

  getAvailableTabs(bank: BankWithAllProducts): { id: string; label: string; count: number }[] {
    const tabs = [
      { id: 'conditions', label: 'Conditions', count: 1 }
    ];

    if (bank.creditProducts?.length > 0) {
      tabs.push({ id: 'credit', label: 'Crédits', count: bank.creditProducts.length });
    }

    if (bank.savingsProducts?.length > 0) {
      tabs.push({ id: 'savings', label: 'Épargne', count: bank.savingsProducts.length });
    }

    if (bank.insuranceProducts?.length > 0) {
      tabs.push({ id: 'insurance', label: 'Assurances', count: bank.insuranceProducts.length });
    }

    return tabs;
  }

  getActiveTab(bankId: string): string {
    return this.activeTabs[bankId] || 'conditions';
  }

  setActiveTab(bankId: string, tabId: string): void {
    this.activeTabs[bankId] = tabId;
  }

  private applyFilters(): void {
    const { productType, creditType, sortBy, selectedBank } = this.filtersForm.value;
    
    let filtered = [...this.banksWithProducts];

    // Filtrer par banque
    if (selectedBank) {
      filtered = filtered.filter(bank => bank.id === selectedBank);
    }

    // Filtrer par type de produit
    if (productType) {
      filtered = filtered.filter(bank => {
        switch (productType) {
          case 'credit':
            return bank.creditProducts?.length > 0;
          case 'savings':
            return bank.savingsProducts?.length > 0;
          case 'insurance':
            return bank.insuranceProducts?.length > 0;
          case 'conditions':
            return true; // Toutes les banques ont des conditions
          default:
            return true;
        }
      });
    }

    // Filtrer par sous-type
    if (creditType) {
      filtered = filtered.filter(bank => {
        switch (creditType) {
          case 'immobilier':
          case 'consommation':
            return bank.creditProducts?.some(p => p.type === creditType);
          case 'auto':
            return bank.creditProducts?.some(p => p.type === 'auto') ||
                   bank.insuranceProducts?.some(p => p.type === 'auto');
          case 'vie':
          case 'habitation':
          case 'sante':
            return bank.insuranceProducts?.some(p => p.type === creditType);
          default:
            return true;
        }
      });
    }

    // Trier
    switch (sortBy) {
      case 'bank':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rate':
        filtered.sort((a, b) => this.getMinRate(a) - this.getMinRate(b));
        break;
      case 'conditions':
        filtered.sort((a, b) => a.accountConditions.minimum_deposit - b.accountConditions.minimum_deposit);
        break;
    }

    this.filteredBanks = filtered;
  }

  private getMinRate(bank: BankWithAllProducts): number {
    let minRate = Infinity;
    
    // Chercher le taux minimum parmi les crédits
    bank.creditProducts?.forEach(p => {
      if (p.average_rate < minRate) {
        minRate = p.average_rate;
      }
    });

    // Chercher parmi les produits d'épargne
    bank.savingsProducts?.forEach(p => {
      if (p.interest_rate < minRate) {
        minRate = p.interest_rate;
      }
    });

    return minRate === Infinity ? 0 : minRate;
  }

  clearFilters(): void {
    this.filtersForm.reset({
      productType: '',
      creditType: '',
      sortBy: 'bank',
      selectedBank: ''
    });
  }

  reloadData(): void {
    this.loadInitialData();
  }

  getBankCount(): number {
    return this.filteredBanks.length;
  }

  getTotalProductsCount(): number {
    return this.filteredBanks.reduce((total, bank) => {
      return total + 
        (bank.creditProducts?.length || 0) + 
        (bank.savingsProducts?.length || 0) + 
        (bank.insuranceProducts?.length || 0) + 
        1; // +1 pour les conditions d'ouverture
    }, 0);
  }

  // Ajout de la méthode trackPageView manquante
  private trackPageView(): void {
    this.analyticsService.trackEvent('page_view', {
      page: 'bank-rates',
      section: 'enhanced-bank-rates'
    });
  }

  // Actions handlers
  contactBank(bank: BankWithAllProducts): void {
    this.analyticsService.trackEvent('bank_contact', {
      bank_id: bank.id,
      bank_name: bank.name,
      action: 'account_opening'
    });

    const message = `Contact ${bank.name} pour ouverture de compte:\n` +
                   `Téléphone: ${bank.contact_phone}\n` +
                   `Email: ${bank.contact_email}\n` +
                   `Dépôt minimum: ${this.formatCurrency(bank.accountConditions.minimum_deposit)}`;
    
    this.notificationService.showInfo(message);
  }

  getBankInfo(bank: BankWithAllProducts): void {
    this.notificationService.showInfo(`Plus d'informations sur ${bank.name}: ${bank.description}`);
  }

  simulateCredit(product: CreditProductRate, bank: BankWithAllProducts): void {
    this.analyticsService.trackEvent('credit_simulation_started', {
      bank_id: bank.id,
      product_id: product.id,
      product_type: product.type
    });
    
    this.notificationService.showInfo(`Redirection vers simulation crédit ${product.name}...`);
  }

  simulateSavings(product: SavingsProductRate, bank: BankWithAllProducts): void {
    this.analyticsService.trackEvent('savings_simulation_started', {
      bank_id: bank.id,
      product_id: product.id,
      interest_rate: product.interest_rate
    });
    
    this.notificationService.showInfo(`Redirection vers simulation épargne ${product.name}...`);
  }

  getInsuranceQuote(product: InsuranceProductRate): void {
    this.analyticsService.trackEvent('insurance_quote_started', {
      product_id: product.id,
      company_id: product.company.id,
      product_type: product.type
    });
    
    this.notificationService.showInfo(`Redirection vers devis assurance ${product.name}...`);
  }

  getProductDetails(product: any): void {
    this.notificationService.showInfo(`Détails du produit: ${product.name} - ${product.description || 'Plus d\'informations disponibles en agence'}`);
  }

  // Utility methods for labels - utilise maintenant les méthodes du service
  getCreditTypeLabel(type: string): string {
    return this.bankRatesService.getCreditTypeLabel(type);
  }

  getSavingsTypeLabel(type: string): string {
    return this.bankRatesService.getSavingsTypeLabel(type);
  }

  getInsuranceTypeLabel(type: string): string {
    return this.bankRatesService.getInsuranceTypeLabel(type);
  }

  getLiquidityLabel(liquidity: string): string {
    const labels: { [key: string]: string } = {
      'immediate': 'Immédiate',
      'notice': 'Avec préavis',
      'term': 'À terme'
    };
    return labels[liquidity] || liquidity;
  }

  // Formatting methods - utilise maintenant les méthodes du service
  formatCurrency(amount: number): string {
    return this.bankRatesService.formatCurrency(amount);
  }

  formatPercent(value: number): string {
    return this.bankRatesService.formatPercent(value);
  }
}