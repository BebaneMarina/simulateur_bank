import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ApiService, CreditProduct, SavingsProduct, Bank } from '../../services/api.service';

// Interfaces étendues pour affichage
interface BankRate {
  id: string;
  bank_id: string;
  name: string;
  type: string;
  description?: string;
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  min_rate: number;
  max_rate: number;
  average_rate: number;
  processing_time_hours: number;
  required_documents?: any;
  eligibility_criteria?: any;
  fees?: any;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
  bank: Bank;
  specialOffers?: SpecialOffer[];
}

interface SpecialOffer {
  title: string;
  description: string;
  rate: number;
  validUntil: Date;
  conditions: string[];
}

interface DisplayBank extends Bank {
  products: BankRate[];
}

@Component({
  selector: 'bank-rates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="bank-rates-container">
      <div class="page-header">
        <div class="container">
          <h1>Tarifs Bancaires au Gabon</h1>
          <p class="subtitle">Comparez les taux d'intérêt de toutes les banques partenaires</p>
          
          <!-- Loading indicator -->
          <div *ngIf="isLoading" class="loading-indicator">
            <div class="spinner"></div>
            <p>Chargement des données bancaires...</p>
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
                <label for="creditType">Type de crédit</label>
                <select formControlName="creditType" id="creditType" class="form-select">
                  <option value="">Tous les types</option>
                  <option value="immobilier">Crédit Immobilier</option>
                  <option value="consommation">Crédit Consommation</option>
                  <option value="auto">Crédit Auto</option>
                  <option value="professionnel">Crédit Professionnel</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="sortBy">Trier par</label>
                <select formControlName="sortBy" id="sortBy" class="form-select">
                  <option value="rate">Taux croissant</option>
                  <option value="bank">Nom banque</option>
                  <option value="processing">Délai traitement</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="bank">Banque</label>
                <select formControlName="selectedBank" id="bank" class="form-select">
                  <option value="">Toutes les banques</option>
                  <option *ngFor="let bank of banks" [value]="bank.id">
                    {{ bank.name }}
                  </option>
                </select>
              </div>

              <div class="filter-group">
                <label for="minAmount">Montant minimum</label>
                <input 
                  type="number" 
                  formControlName="minAmount" 
                  id="minAmount" 
                  class="form-input"
                  placeholder="0"
                />
              </div>

              <div class="filter-group">
                <label for="maxAmount">Montant maximum</label>
                <input 
                  type="number" 
                  formControlName="maxAmount" 
                  id="maxAmount" 
                  class="form-input"
                  placeholder="Illimité"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Rates Comparison Table -->
      <div class="rates-section" *ngIf="!isLoading && !errorMessage">
        <div class="container">
          <div class="results-info">
            <p>{{ filteredRates.length }} produit(s) trouvé(s)</p>
          </div>

          <div class="rates-grid">
            <div *ngFor="let rate of filteredRates" class="rate-card" [class.featured]="rate.specialOffers?.length">
              <div class="bank-header">
                <div class="bank-logo">
                  <img [src]="rate.bank.logo_url || '/assets/banks/default-logo.png'" [alt]="rate.bank.name" />
                </div>
                <div class="bank-info">
                  <h3>{{ rate.bank.name }}</h3>
                  <span class="credit-type">{{ getCreditTypeLabel(rate.type) }}</span>
                </div>
              </div>

              <div class="rate-details">
                <div class="main-rate">
                  <span class="rate-label">Taux moyen</span>
                  <span class="rate-value">{{ formatPercent(rate.average_rate) }}</span>
                </div>
                
                <div class="rate-range">
                  <span>De {{ formatPercent(rate.min_rate) }} à {{ formatPercent(rate.max_rate) }}</span>
                </div>

                <div class="amount-info">
                  <div class="info-item">
                    <span class="label">Montant</span>
                    <span class="value">
                      {{ formatCurrency(rate.min_amount) }} - {{ formatCurrency(rate.max_amount) }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="label">Durée max</span>
                    <span class="value">{{ Math.floor(rate.max_duration_months / 12) }} ans</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Délai</span>
                    <span class="value">{{ rate.processing_time_hours }}h</span>
                  </div>
                </div>
              </div>

              <!-- Product description -->
              <div class="product-description" *ngIf="rate.description">
                <p>{{ rate.description }}</p>
              </div>

              <!-- Special Offers -->
              <div *ngIf="rate.specialOffers?.length" class="special-offers">
                <h4>Offres spéciales</h4>
                <div *ngFor="let offer of rate.specialOffers" class="offer-item">
                  <div class="offer-header">
                    <span class="offer-title">{{ offer.title }}</span>
                    <span class="offer-rate">{{ formatPercent(offer.rate) }}</span>
                  </div>
                  <p class="offer-description">{{ offer.description }}</p>
                  <span class="offer-validity">
                    Valable jusqu'au {{ formatDate(offer.validUntil) }}
                  </span>
                </div>
              </div>

              <!-- Eligibility Criteria -->
              <div class="conditions" *ngIf="rate.eligibility_criteria">
                <h4>Conditions d'éligibilité</h4>
                <ul>
                  <li *ngFor="let criterion of getEligibilityCriteria(rate.eligibility_criteria)">
                    {{ criterion }}
                  </li>
                </ul>
              </div>

              <!-- Required Documents -->
              <div class="documents" *ngIf="rate.required_documents">
                <h4>Documents requis</h4>
                <ul>
                  <li *ngFor="let doc of getRequiredDocuments(rate.required_documents)">
                    {{ doc }}
                  </li>
                </ul>
              </div>

              <!-- Fees -->
              <div class="fees" *ngIf="rate.fees">
                <h4>Frais</h4>
                <div class="fees-list">
                  <div *ngFor="let fee of getFees(rate.fees)" class="fee-item">
                    <span class="fee-label">{{ fee.label }}</span>
                    <span class="fee-value">{{ fee.value }}</span>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <button (click)="simulateWithBank(rate)" class="btn-primary">
                  Simuler avec {{ rate.bank.name }}
                </button>
                <button (click)="contactBank(rate)" class="btn-secondary">
                  Contacter
                </button>
                <button (click)="viewBankDetails(rate.bank)" class="btn-outline">
                  Détails banque
                </button>
              </div>

              <div class="last-updated">
                Mis à jour le {{ formatDate(rate.updated_at) }}
              </div>
            </div>
          </div>

          <!-- No results -->
          <div *ngIf="filteredRates.length === 0 && !isLoading" class="no-results">
            <h3>Aucun produit trouvé</h3>
            <p>Essayez de modifier vos critères de recherche</p>
            <button (click)="clearFilters()" class="btn-secondary">Effacer les filtres</button>
          </div>
        </div>
      </div>

      <!-- Market Analysis -->
      <div class="market-analysis" *ngIf="!isLoading && marketStatistics">
        <div class="container">
          <h2>Analyse du marché</h2>
          <div class="analysis-grid">
            <div class="analysis-card">
              <h3>Taux moyen du marché</h3>
              <div class="stat-value">{{ formatPercent(marketStatistics.average_rate) }}</div>
              <span class="trend" [class.positive]="marketStatistics.trend > 0" [class.negative]="marketStatistics.trend < 0">
                {{ marketStatistics.trend > 0 ? '+' : '' }}{{ formatPercent(marketStatistics.trend) }} ce mois
              </span>
            </div>
            
            <div class="analysis-card">
              <h3>Meilleur taux disponible</h3>
              <div class="stat-value">{{ formatPercent(marketStatistics.best_rate) }}</div>
              <span class="bank-name">chez {{ marketStatistics.best_rate_bank }}</span>
            </div>
            
            <div class="analysis-card">
              <h3>Délai moyen de traitement</h3>
              <div class="stat-value">{{ marketStatistics.average_processing_time }}h</div>
              <span class="info">pour un dossier complet</span>
            </div>

            <div class="analysis-card">
              <h3>Banques partenaires</h3>
              <div class="stat-value">{{ banks.length }}</div>
              <span class="info">institutions financières</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./bank-rates.component.scss']
})
export class BankRatesComponent implements OnInit, OnDestroy {
  filtersForm!: FormGroup;
  bankRates: BankRate[] = [];
  filteredRates: BankRate[] = [];
  banks: Bank[] = [];
  savingsProducts: SavingsProduct[] = [];
  
  // Loading and error states
  isLoading = false;
  errorMessage = '';
  
  // Market statistics
  marketStatistics: any = null;
  
  selectedPeriod = '6m';
  chartPeriods = [
    { value: '1m', label: '1 mois' },
    { value: '3m', label: '3 mois' },
    { value: '6m', label: '6 mois' },
    { value: '1y', label: '1 an' }
  ];

  // Expose Math to template
  Math = Math;

  private destroy$ = new Subject<void>();
  loadDemoData: any;

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private apiService: ApiService
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
      creditType: [''],
      sortBy: ['rate'],
      selectedBank: [''],
      minAmount: [''],
      maxAmount: ['']
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
    this.apiService.testConnection()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: () => {
          // Si la connexion est OK, charger les données
          this.loadBanks();
          this.loadBankRates();
          this.loadMarketStatistics();
        },
        error: (error) => {
          console.error('Erreur de connexion API:', error);
          this.errorMessage = 'Impossible de se connecter au serveur. Utilisation des données de démonstration.';
          this.loadDemoData();
        }
      });
  }

  private loadBanks(): void {
    this.apiService.getBanks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (banks) => {
          this.banks = banks;
          console.log('Banques chargées:', banks);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des banques:', error);
          this.notificationService.showError('Erreur lors du chargement des banques');
        }
      });
  }

  private loadBankRates(): void {
    this.apiService.getCreditProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.bankRates = products.map(product => {
            const bankRate: BankRate = {
              id: product.id,
              bank_id: product.bank_id,
              name: product.name,
              type: product.type,
              description: product.description,
              min_amount: product.min_amount,
              max_amount: product.max_amount,
              min_duration_months: product.min_duration_months,
              max_duration_months: product.max_duration_months,
              min_rate: (product as any).min_rate || product.average_rate - 1,
              max_rate: (product as any).max_rate || product.average_rate + 1,
              average_rate: product.average_rate,
              processing_time_hours: product.processing_time_hours,
              required_documents: (product as any).required_documents,
              eligibility_criteria: (product as any).eligibility_criteria,
              fees: (product as any).fees,
              is_active: product['is_active'] ?? true,
              created_at: (product as any).created_at,
              updated_at: (product as any).updated_at || new Date(),
              bank: product.bank,
              specialOffers: this.generateSpecialOffers(product)
            };
            return bankRate;
          });
          this.applyFilters();
          console.log('Produits de crédit chargés:', products);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des produits:', error);
          this.notificationService.showError('Erreur lors du chargement des produits de crédit');
          this.loadDemoData();
        }
      });
  }

  private loadMarketStatistics(): void {
    this.apiService.getMarketStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats: any) => {
          this.marketStatistics = stats;
          console.log('Statistiques de marché chargées:', stats);
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des statistiques:', error);
          // Générer des statistiques par défaut si l'API ne répond pas
          this.generateDefaultStatistics();
        }
      });
  }

  private generateDefaultStatistics(): void {
    if (this.bankRates.length > 0) {
      const rates = this.bankRates.map(r => r.average_rate);
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      const minRate = Math.min(...rates);
      const bestRateProduct = this.bankRates.find(r => r.average_rate === minRate);
      const avgProcessingTime = this.bankRates.reduce((sum, r) => sum + r.processing_time_hours, 0) / this.bankRates.length;

      this.marketStatistics = {
        average_rate: avgRate,
        trend: -0.2, // Simulation
        best_rate: minRate,
        best_rate_bank: bestRateProduct?.bank.name || 'N/A',
        average_processing_time: Math.round(avgProcessingTime)
      };
    }
  }

  private generateSpecialOffers(product: CreditProduct): SpecialOffer[] {
    // Génération d'offres spéciales basées sur le type de produit
    const offers: SpecialOffer[] = [];
    
    if (product.type === 'immobilier' && Math.random() > 0.5) {
      offers.push({
        title: 'Offre Primo-accédants',
        description: 'Taux réduit pour les premiers achats immobiliers',
        rate: (product as any).min_rate || product.average_rate - 1,
        validUntil: new Date('2024-12-31'),
        conditions: ['Premier achat', 'Revenus < 800,000 FCFA']
      });
    }

    if (product.type === 'consommation' && Math.random() > 0.7) {
      offers.push({
        title: 'Offre Rentrée',
        description: 'Conditions préférentielles pour la rentrée scolaire',
        rate: product.average_rate - 0.5,
        validUntil: new Date('2024-10-31'),
        conditions: ['Usage éducatif', 'Dossier complet']
      });
    }

    return offers;
  }

  

  private applyFilters(): void {
    const { creditType, sortBy, selectedBank, minAmount, maxAmount } = this.filtersForm.value;
    
    let filtered = [...this.bankRates];

    // Filtrer par type de crédit
    if (creditType) {
      filtered = filtered.filter(rate => rate.type === creditType);
    }

    // Filtrer par banque
    if (selectedBank) {
      filtered = filtered.filter(rate => rate.bank_id === selectedBank);
    }

    // Filtrer par montant minimum
    if (minAmount && !isNaN(minAmount)) {
      filtered = filtered.filter(rate => rate.max_amount >= Number(minAmount));
    }

    // Filtrer par montant maximum
    if (maxAmount && !isNaN(maxAmount)) {
      filtered = filtered.filter(rate => rate.min_amount <= Number(maxAmount));
    }

    // Trier
    switch (sortBy) {
      case 'rate':
        filtered.sort((a, b) => a.average_rate - b.average_rate);
        break;
      case 'bank':
        filtered.sort((a, b) => a.bank.name.localeCompare(b.bank.name));
        break;
      case 'processing':
        filtered.sort((a, b) => a.processing_time_hours - b.processing_time_hours);
        break;
    }

    this.filteredRates = filtered;
  }

  clearFilters(): void {
    this.filtersForm.reset({
      creditType: '',
      sortBy: 'rate',
      selectedBank: '',
      minAmount: '',
      maxAmount: ''
    });
  }

  reloadData(): void {
    this.loadInitialData();
  }

  simulateWithBank(rate: BankRate): void {
    this.analyticsService.trackEvent('bank_simulation_started', {
      bank_id: rate.bank_id,
      bank_name: rate.bank.name,
      credit_type: rate.type,
      avg_rate: rate.average_rate
    });

    // Navigation vers simulateur avec paramètres pré-remplis
    this.notificationService.showInfo(`Redirection vers le simulateur ${rate.bank.name}...`);
  }

  contactBank(rate: BankRate): void {
    const message = `Contact ${rate.bank.name} : ${rate.bank.contact_phone}`;
    this.notificationService.showInfo(message);
    
    // Optionnel: ouvrir le lien de contact
    if (rate.bank.website) {
      window.open(rate.bank.website, '_blank');
    }
  }

  viewBankDetails(bank: Bank): void {
    this.notificationService.showInfo(`Détails de ${bank.name} : ${bank.description}`);
  }

  setChartPeriod(period: string): void {
    this.selectedPeriod = period;
    // Ici vous pourriez recharger les données du graphique
  }

  getCreditTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'immobilier': 'Crédit Immobilier',
      'consommation': 'Crédit Consommation',
      'auto': 'Crédit Auto',
      'professionnel': 'Crédit Professionnel'
    };
    return labels[type] || type;
  }

  getSelectedPeriodLabel(): string {
    const period = this.chartPeriods.find(p => p.value === this.selectedPeriod);
    return period?.label || '6 mois';
  }

  getEligibilityCriteria(criteria: any): string[] {
    if (criteria?.criteria && Array.isArray(criteria.criteria)) {
      return criteria.criteria;
    }
    return ['Informations non disponibles'];
  }

  getRequiredDocuments(documents: any): string[] {
    if (documents?.documents && Array.isArray(documents.documents)) {
      return documents.documents;
    }
    return ['Documents standards requis'];
  }

  getFees(fees: any): Array<{label: string, value: string}> {
    if (!fees || typeof fees !== 'object') {
      return [{label: 'Frais de dossier', value: 'Sur devis'}];
    }

    const feeList: Array<{label: string, value: string}> = [];
    
    Object.keys(fees).forEach(key => {
      const value = fees[key];
      const label = this.getFeeLabel(key);
      const formattedValue = typeof value === 'number' ? this.formatCurrency(value) : String(value);
      feeList.push({ label, value: formattedValue });
    });

    return feeList;
  }

  private getFeeLabel(key: string): string {
    const labels: { [key: string]: string } = {
      'dossier': 'Frais de dossier',
      'garantie': 'Frais de garantie',
      'assurance': 'Assurance',
      'notaire': 'Frais de notaire',
      'expertise': 'Frais d\'expertise'
    };
    return labels[key] || key;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Non spécifié';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR').format(dateObj);
  }

  private trackPageView(): void {
    this.analyticsService.trackPageView('bank_rates', {
      page_title: 'Tarifs Bancaires'
    });
  }
}