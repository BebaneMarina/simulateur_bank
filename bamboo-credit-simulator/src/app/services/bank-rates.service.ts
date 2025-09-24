// services/bank-rates.service.ts - Service dédié pour les taux bancaires et conditions

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, map, timeout, tap, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';

// Interfaces spécifiques au service Bank Rates
export interface BankFee {
  type: string;
  amount: number;
  frequency: string;
  description: string;
}

export interface BankAccountConditions {
  minimum_deposit: number;
  required_documents: string[];
  eligibility_criteria: string[];
  fees: BankFee[];
  processing_time: string;
}

export interface BankService {
  name: string;
  available: boolean;
  description?: string;
}

export interface BranchLocation {
  name: string;
  address?: string;
  phone?: string;
  services?: string[];
}

export interface ExtendedBank {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  is_active: boolean;
  account_conditions: BankAccountConditions;
  available_services: string[];
  branch_locations: string[];
  created_at?: Date;
  updated_at?: Date;
  rating?: number;
  market_share?: number;
  established_year?: number;
}

export interface CreditProductRate {
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
  features?: string[];
  advantages?: string[];
  special_conditions?: string;
  is_active: boolean;
  is_featured: boolean;
  bank: ExtendedBank;
  special_offers?: SpecialOffer[];
}

export interface SavingsProductRate {
  id: string;
  bank_id: string;
  name: string;
  type: string;
  description?: string;
  interest_rate: number;
  minimum_deposit: number;
  maximum_deposit?: number;
  minimum_balance: number;
  liquidity: string;
  notice_period_days?: number;
  term_months?: number;
  compounding_frequency: string;
  fees?: any;
  features?: string[];
  advantages?: string[];
  tax_benefits?: string[];
  risk_level: number;
  early_withdrawal_penalty?: number;
  is_islamic_compliant: boolean;
  is_active: boolean;
  bank: ExtendedBank;
}

export interface InsuranceProductRate {
  id: string;
  name: string;
  type: string;
  description: string;
  base_premium: number;
  coverage_details: any;
  features: string[];
  exclusions: string[];
  company: InsuranceCompany;
  partner_banks: string[];
  special_offers: string[];
  advantages?: string[];
}

export interface InsuranceCompany {
  id: string;
  name: string;
  full_name?: string;
  logo_url?: string;
  rating?: number;
  solvency_ratio?: number;
  contact_phone?: string;
  contact_email?: string;
}

export interface SpecialOffer {
  title: string;
  description: string;
  rate?: number;
  discount?: number;
  valid_until: Date;
  conditions: string[];
  offer_type: 'rate_reduction' | 'fee_waiver' | 'bonus' | 'extended_coverage';
}

export interface BankAllProducts {
  credit_products: CreditProductRate[];
  savings_products: SavingsProductRate[];
  insurance_products: InsuranceProductRate[];
}

export interface BankRatesFilters {
  product_type?: 'credit' | 'savings' | 'insurance' | 'conditions';
  sub_type?: string;
  bank_id?: string;
  min_amount?: number;
  max_amount?: number;
  sort_by?: 'bank' | 'rate' | 'conditions' | 'popularity';
  min_rate?: number;
  max_rate?: number;
}

export interface MarketAnalysis {
  best_credit_rate: {
    rate: number;
    bank_name: string;
    product_name: string;
  };
  average_savings_rate: number;
  lowest_account_fee: {
    amount: number;
    bank_name: string;
    fee_type: string;
  };
  most_branches: {
    count: number;
    bank_name: string;
  };
  total_banks: number;
  total_products: number;
}

@Injectable({
  providedIn: 'root'
})
export class BankRatesService {
  private readonly baseUrl = environment.apiUrl;
  private readonly enhancedBaseUrl = `${this.baseUrl}/enhanced-banks`;

  // Headers HTTP par défaut
  private readonly defaultHeaders = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  });

  constructor(private http: HttpClient) {
    console.log('BankRatesService initialized with baseUrl:', this.baseUrl);
  }

  // Options HTTP standard
  private getHttpOptions() {
    return {
      headers: this.defaultHeaders,
      timeout: 30000
    };
  }

  // Gestion d'erreur centralisée
  private handleError = (operation: string) => (error: HttpErrorResponse): Observable<never> => {
    console.error(`${operation} failed:`, error);
    
    let userMessage: string;
    
    if (error.status === 0) {
      userMessage = 'Impossible de se connecter au serveur. Vérifiez la connexion.';
    } else if (error.status === 404) {
      userMessage = 'Service non disponible';
    } else if (error.status === 500) {
      userMessage = 'Erreur serveur temporaire';
    } else {
      userMessage = error.error?.detail || 'Une erreur inattendue s\'est produite';
    }

    return throwError(() => userMessage);
  };

  // MÉTHODES PRINCIPALES DU SERVICE

  /**
   * Récupérer toutes les banques avec leurs conditions étendues
   */
  getBanksWithConditions(): Observable<ExtendedBank[]> {
    return this.http.get<ExtendedBank[]>(
      `${this.enhancedBaseUrl}/with-conditions`,
      this.getHttpOptions()
    ).pipe(
      timeout(30000),
      map(banks => this.mapBankResponses(banks)),
      catchError(error => {
        console.warn('Enhanced banks API non disponible, utilisation du fallback');
        return this.getBanksWithConditionsFallback();
      })
    );
  }

  /**
   * Récupérer les conditions d'ouverture pour une banque spécifique
   */
  getBankAccountConditions(bankId: string): Observable<BankAccountConditions> {
    return this.http.get<BankAccountConditions>(
      `${this.enhancedBaseUrl}/${bankId}/account-conditions`,
      this.getHttpOptions()
    ).pipe(
      timeout(15000),
      catchError(error => {
        console.warn(`Conditions pour ${bankId} non disponibles, utilisation des données par défaut`);
        return of(this.getDefaultAccountConditions(bankId));
      })
    );
  }

  /**
   * Récupérer tous les produits d'une banque (crédit + épargne + assurance)
   */
  getBankAllProducts(bankId: string): Observable<BankAllProducts> {
    return this.http.get<BankAllProducts>(
      `${this.enhancedBaseUrl}/${bankId}/all-products`,
      this.getHttpOptions()
    ).pipe(
      timeout(30000),
      catchError(error => {
        console.warn(`Produits pour ${bankId} non disponibles via API, récupération séparée`);
        return this.getBankProductsFallback(bankId);
      })
    );
  }

  /**
   * Récupérer tous les produits avec filtres
   */
  getAllProductsWithFilters(filters?: BankRatesFilters): Observable<{
    banks: ExtendedBank[];
    market_analysis: MarketAnalysis;
  }> {
    // Construire les paramètres de requête
    let params = new HttpParams();
    if (filters?.product_type) params = params.set('product_type', filters.product_type);
    if (filters?.sub_type) params = params.set('sub_type', filters.sub_type);
    if (filters?.bank_id) params = params.set('bank_id', filters.bank_id);
    if (filters?.sort_by) params = params.set('sort_by', filters.sort_by);

    return forkJoin({
      banks: this.getBanksWithConditions(),
      products: this.getAllBanksProducts()
    }).pipe(
      map(({ banks, products }) => {
        const enrichedBanks = this.enrichBanksWithProducts(banks, products);
        const filteredBanks = this.applyFilters(enrichedBanks, filters);
        const marketAnalysis = this.generateMarketAnalysis(enrichedBanks);
        
        return {
          banks: filteredBanks,
          market_analysis: marketAnalysis
        };
      })
    );
  }

  /**
   * Comparer les taux de plusieurs banques pour un type de produit
   */
  compareRates(productType: 'credit' | 'savings' | 'insurance', amount?: number): Observable<{
    best_rates: any[];
    comparison_table: any[];
    recommendations: string[];
  }> {
    return this.getAllProductsWithFilters({ product_type: productType }).pipe(
      map(({ banks }) => {
        const comparison = this.generateRatesComparison(banks, productType, amount);
        return comparison;
      })
    );
  }

  // MÉTHODES DE FALLBACK

  private getBanksWithConditionsFallback(): Observable<ExtendedBank[]> {
    return this.http.get<any[]>(`${this.baseUrl}/banks/`, this.getHttpOptions()).pipe(
      map(banks => banks.map(bank => this.mapToExtendedBank(bank)))
    );
  }

  private getBankProductsFallback(bankId: string): Observable<BankAllProducts> {
    return forkJoin({
      credit_products: this.http.get<any[]>(`${this.baseUrl}/banks/${bankId}/credit-products`).pipe(
        catchError(() => of([]))
      ),
      savings_products: this.http.get<any[]>(`${this.baseUrl}/banks/${bankId}/savings-products`).pipe(
        catchError(() => of([]))
      ),
      insurance_products: of([]) // Fallback vide pour l'assurance
    }).pipe(
      map(products => ({
        credit_products: products.credit_products.map(p => this.mapCreditProduct(p)),
        savings_products: products.savings_products.map(p => this.mapSavingsProduct(p)),
        insurance_products: []
      }))
    );
  }

  private getAllBanksProducts(): Observable<{
    credit: any[];
    savings: any[];
    insurance: any[];
  }> {
    return forkJoin({
      credit: this.http.get<any[]>(`${this.baseUrl}/credits/products`).pipe(catchError(() => of([]))),
      savings: this.http.get<any[]>(`${this.baseUrl}/savings/products`).pipe(catchError(() => of([]))),
      insurance: this.http.get<any[]>(`${this.baseUrl}/insurance/products`).pipe(catchError(() => of([])))
    });
  }

  // MÉTHODES UTILITAIRES

  private mapBankResponses(banks: any[]): ExtendedBank[] {
    return banks.map(bank => ({
      ...bank,
      account_conditions: bank.account_conditions || this.getDefaultAccountConditions(bank.id),
      available_services: bank.available_services || [],
      branch_locations: bank.branch_locations || []
    }));
  }

  private mapToExtendedBank(bank: any): ExtendedBank {
    return {
      id: bank.id,
      name: bank.name,
      full_name: bank.full_name,
      description: bank.description,
      logo_url: bank.logo_url,
      website: bank.website,
      contact_phone: bank.contact_phone,
      contact_email: bank.contact_email,
      address: bank.address,
      is_active: bank.is_active,
      account_conditions: this.getDefaultAccountConditions(bank.id),
      available_services: this.getDefaultServices(bank.id),
      branch_locations: this.getDefaultBranchLocations(bank.id),
      created_at: bank.created_at ? new Date(bank.created_at) : undefined,
      updated_at: bank.updated_at ? new Date(bank.updated_at) : undefined
    };
  }

  private getDefaultAccountConditions(bankId: string): BankAccountConditions {
    const conditions: { [key: string]: BankAccountConditions } = {
      'bgfi': {
        minimum_deposit: 25000,
        required_documents: [
          'Pièce d\'identité en cours de validité',
          'Justificatif de domicile récent',
          'Justificatif de revenus',
          'Photo d\'identité'
        ],
        eligibility_criteria: [
          'Être âgé de 18 ans minimum',
          'Résider au Gabon',
          'Avoir des revenus réguliers'
        ],
        fees: [
          { type: 'Ouverture', amount: 5000, frequency: 'unique', description: 'Frais d\'ouverture' },
          { type: 'Tenue de compte', amount: 2500, frequency: 'mensuel', description: 'Gestion mensuelle' },
          { type: 'Carte bancaire', amount: 15000, frequency: 'annuel', description: 'Carte Visa' }
        ],
        processing_time: '24-48 heures'
      },
      'ugb': {
        minimum_deposit: 20000,
        required_documents: [
          'Carte d\'identité nationale',
          'Attestation de résidence',
          'Bulletin de salaire'
        ],
        eligibility_criteria: [
          'Majorité civile',
          'Résidence au Gabon'
        ],
        fees: [
          { type: 'Ouverture', amount: 3000, frequency: 'unique', description: 'Frais d\'ouverture' },
          { type: 'Tenue de compte', amount: 2000, frequency: 'mensuel', description: 'Gestion mensuelle' }
        ],
        processing_time: '2-3 jours'
      },
      'bicig': {
        minimum_deposit: 30000,
        required_documents: [
          'Pièce d\'identité officielle',
          'Justificatif de domicile',
          'Attestation de salaire'
        ],
        eligibility_criteria: [
          'Âge minimum 18 ans',
          'Revenus minimums 150,000 FCFA'
        ],
        fees: [
          { type: 'Ouverture', amount: 7500, frequency: 'unique', description: 'Ouverture et étude' },
          { type: 'Tenue de compte', amount: 3500, frequency: 'mensuel', description: 'Gestion mensuelle' }
        ],
        processing_time: '3-5 jours'
      },
      'ecobank': {
        minimum_deposit: 15000,
        required_documents: [
          'Document d\'identité valide',
          'Justificatif d\'adresse',
          'Justificatif de revenus'
        ],
        eligibility_criteria: [
          'Âge légal minimum',
          'Résidence au Gabon'
        ],
        fees: [
          { type: 'Ouverture', amount: 2500, frequency: 'unique', description: 'Frais d\'ouverture' },
          { type: 'Gestion', amount: 1500, frequency: 'mensuel', description: 'Frais de gestion' }
        ],
        processing_time: '24-72 heures'
      },
      'cbao': {
        minimum_deposit: 18000,
        required_documents: [
          'CNI ou passeport',
          'Justificatif de domicile',
          'Bulletin de paie'
        ],
        eligibility_criteria: [
          'Majorité légale',
          'Domiciliation au Gabon'
        ],
        fees: [
          { type: 'Ouverture', amount: 4000, frequency: 'unique', description: 'Frais d\'ouverture' },
          { type: 'Tenue de compte', amount: 2200, frequency: 'mensuel', description: 'Frais mensuels' }
        ],
        processing_time: '2-4 jours'
      }
    };

    return conditions[bankId] || {
      minimum_deposit: 20000,
      required_documents: ['Pièce d\'identité', 'Justificatif de domicile'],
      eligibility_criteria: ['Âge minimum 18 ans'],
      fees: [
        { type: 'Ouverture', amount: 5000, frequency: 'unique', description: 'Frais d\'ouverture' }
      ],
      processing_time: '48-72 heures'
    };
  }

  private getDefaultServices(bankId: string): string[] {
    const services = [
      'Comptes courants',
      'Comptes d\'épargne',
      'Crédits',
      'Cartes bancaires',
      'Virements',
      'Banking en ligne'
    ];

    const bankSpecific: { [key: string]: string[] } = {
      'bgfi': [...services, 'Change', 'Trade finance'],
      'ecobank': [...services, 'Western Union', 'MoneyGram'],
      'bicig': [...services, 'Crédit-bail', 'Factoring'],
      'ugb': [...services, 'Assurance-vie'],
      'cbao': [...services, 'Microfinance']
    };

    return bankSpecific[bankId] || services;
  }

  private getDefaultBranchLocations(bankId: string): string[] {
    const locations = ['Libreville Centre', 'Port-Gentil', 'Franceville'];
    
    const bankLocations: { [key: string]: string[] } = {
      'bgfi': [...locations, 'Oyem', 'Lambaréné'],
      'ecobank': [...locations, 'Bitam', 'Tchibanga'],
      'ugb': [...locations, 'Koulamoutou'],
      'bicig': [...locations, 'Gamba'],
      'cbao': [...locations, 'Mitzic']
    };

    return bankLocations[bankId] || locations;
  }

  private enrichBanksWithProducts(banks: ExtendedBank[], products: any): ExtendedBank[] {
    // Enrichir les banques avec leurs produits
    return banks.map(bank => ({
      ...bank,
      // Ajouter logique d'enrichissement avec les produits
    }));
  }

  private applyFilters(banks: ExtendedBank[], filters?: BankRatesFilters): ExtendedBank[] {
    if (!filters) return banks;

    let filtered = [...banks];

    if (filters.bank_id) {
      filtered = filtered.filter(bank => bank.id === filters.bank_id);
    }

    // Ajouter d'autres filtres selon les besoins

    return filtered;
  }

  private generateMarketAnalysis(banks: ExtendedBank[]): MarketAnalysis {
    return {
      best_credit_rate: {
        rate: 6.5,
        bank_name: 'BGFI Bank',
        product_name: 'Crédit Habitat'
      },
      average_savings_rate: 3.2,
      lowest_account_fee: {
        amount: 1500,
        bank_name: 'Ecobank',
        fee_type: 'Tenue de compte'
      },
      most_branches: {
        count: 25,
        bank_name: 'BGFI Bank'
      },
      total_banks: banks.length,
      total_products: banks.reduce((sum, bank) => sum + bank.available_services.length, 0)
    };
  }

  private generateRatesComparison(banks: ExtendedBank[], productType: string, amount?: number): any {
    return {
      best_rates: [],
      comparison_table: [],
      recommendations: [
        'Comparez les conditions d\'ouverture',
        'Vérifiez les frais cachés',
        'Considérez la proximité des agences'
      ]
    };
  }

  private mapCreditProduct(product: any): CreditProductRate {
    return {
      ...product,
      min_rate: product.min_rate || product.average_rate - 1,
      max_rate: product.max_rate || product.average_rate + 1
    };
  }

  private mapSavingsProduct(product: any): SavingsProductRate {
    return {
      ...product
    };
  }

  // MÉTHODES UTILITAIRES PUBLIQUES

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

  getCreditTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'immobilier': 'Crédit Immobilier',
      'consommation': 'Crédit Consommation',
      'auto': 'Crédit Auto',
      'professionnel': 'Crédit Professionnel'
    };
    return labels[type] || type;
  }

  getSavingsTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'livret': 'Livret d\'Épargne',
      'terme': 'Dépôt à Terme',
      'plan_epargne': 'Plan d\'Épargne'
    };
    return labels[type] || type;
  }

  getInsuranceTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'auto': 'Assurance Auto',
      'habitation': 'Assurance Habitation',
      'vie': 'Assurance Vie',
      'sante': 'Assurance Santé'
    };
    return labels[type] || type;
  }

  // TEST DE CONNECTIVITÉ

  testEnhancedBanksEndpoint(): Observable<any> {
    return this.http.get(`${this.enhancedBaseUrl}/test-enhanced`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Test Enhanced Banks Endpoint'))
    );
  }
}