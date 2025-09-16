// api.service.ts - Version complète avec fonctionnalités d'épargne
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout, tap, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface CreditSimulationRequest {
  credit_product_id: string;
  requested_amount: number;
  duration_months: number;
  monthly_income: number;
  current_debts?: number;
  down_payment?: number;
  user_id?: string;
  session_id?: string;
}

export interface CreditSimulationResponse {
  simulation_id: string;
  applied_rate: number;
  monthly_payment: number;
  total_interest: number;
  total_cost: number;
  debt_ratio: number;
  amortization_schedule: AmortizationEntry[];
  recommendations: string[];
  bank_info: {
    name: string;
    logo: string;
  };
}

export interface AmortizationEntry {
  month: number;
  principal: number;
  interest: number;
  remaining_balance: number;
}

export interface Bank {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  address?: string;
  swift_code?: string;
  license_number?: string;
  established_year?: number;
  total_assets?: number;
  rating?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
  // Propriétés ajoutées pour compatibilité
  logo?: string; // Alias pour logo_url
  color?: string;
  short_name?: string;
  market_share?: number;
  processing_time?: number;
}

export interface CreditProduct {
  id: string;
  bank_id: string;
  name: string;
  type: string;
  description: string;
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  average_rate: number;
  min_rate: number;
  max_rate: number;
  processing_time_hours: number;
  bank: Bank;
  is_active?: boolean;
  is_featured?: boolean;
}

export interface SavingsProduct {
  id: string;
  bank_id: string;
  name: string;
  type: string;
  description?: string;
  interest_rate: number;
  minimum_deposit: number;
  maximum_deposit?: number;
  minimum_balance?: number;
  liquidity: string;
  notice_period_days?: number;
  term_months?: number;
  compounding_frequency?: string;
  fees?: any;
  features?: string[];
  advantages?: string[];
  tax_benefits?: string[];
  risk_level: number;
  early_withdrawal_penalty?: number;
  is_islamic_compliant?: boolean;
  is_featured?: boolean;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
  bank?: Bank;
}

export interface SavingsSimulationRequest {
  savings_product_id: string;
  initial_amount: number;
  monthly_contribution: number;
  duration_months: number;
  user_id?: string;
  session_id?: string;
}

export interface SavingsSimulationResponse {
  id: string;
  final_amount: number;
  total_contributions: number;
  total_interest: number;
  monthly_breakdown: MonthlyBreakdown[];
  recommendations: string[];
  created_at?: string;
  savings_product?: SavingsProduct;
  product_info?: {
    name: string;
    type: string;
    bank_name: string;
    interest_rate: number;
    risk_level: number;
  };
}

export interface MonthlyBreakdown {
  month: number;
  contribution: number;
  interest: number;
  cumulative_amount: number;
}

export interface InsuranceProduct {
  id: string;
  name: string;
  type: string;
  description: string;
  base_premium: number;
  coverage_details: any;
  features: string[];
  exclusions: string[];
  bank: Bank;
}

export interface InsuranceQuoteRequest {
  insurance_type: string;
  age: number;
  coverage_amount?: number;
  vehicle_value?: number;
  property_value?: number;
  risk_factors?: any;
  user_id?: string;
}

export interface InsuranceQuote {
  product_id: string;
  bank_name: string;
  product_name: string;
  monthly_premium: number;
  annual_premium: number;
  coverage_details: any;
  features: string[];
  exclusions: string[];
}

export interface InsuranceQuoteResponse {
  quotes: InsuranceQuote[];
  cheapest: InsuranceQuote | null;
  recommendations: string[];
}

export interface MarketStatistics {
  average_rate: number;
  trend: number;
  best_rate: number;
  best_rate_bank: string;
  average_processing_time: number;
  total_products: number;
  active_banks: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  // Headers HTTP par défaut
  private readonly defaultHeaders = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  });

  constructor(private http: HttpClient) {
    console.log('ApiService initialized with baseUrl:', this.baseUrl);
  }

  // Options HTTP standard avec timeout
  private getHttpOptions() {
    return {
      headers: this.defaultHeaders,
      timeout: 30000 // 30 secondes
    };
  }

  // Gestion d'erreur centralisée
  private handleError = (operation: string) => (error: HttpErrorResponse): Observable<never> => {
    console.error(`${operation} failed:`, error);
    
    let userMessage: string;
    
    if (error.status === 0) {
      userMessage = 'Impossible de se connecter au serveur. Vérifiez que l\'API est démarrée sur le port 8000.';
    } else if (error.status === 404) {
      userMessage = 'Ressource non trouvée';
    } else if (error.status === 400) {
      userMessage = error.error?.detail || 'Paramètres de requête invalides';
    } else if (error.status === 422) {
      // Erreur de validation Pydantic
      if (error.error?.detail && Array.isArray(error.error.detail)) {
        const validationErrors = error.error.detail.map((err: any) => {
          const field = err.loc?.slice(1).join('.') || 'champ';
          return `${field}: ${err.msg}`;
        }).join('; ');
        userMessage = `Erreurs de validation: ${validationErrors}`;
      } else {
        userMessage = error.error?.detail || 'Données de requête incorrectes';
      }
    } else if (error.status >= 500) {
      userMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    } else {
      userMessage = error.error?.detail || error.message || 'Une erreur inattendue s\'est produite';
    }

    return throwError(() => userMessage);
  };

  // Test de connexion amélioré
  testConnection(): Observable<any> {
    console.log('Testing connection to:', `${this.baseUrl}/health`);
    return this.http.get(`${this.baseUrl}/health`, this.getHttpOptions()).pipe(
      timeout(10000), // 10 secondes pour le test
      catchError(this.handleError('Test Connection'))
    );
  }

  testCors(): Observable<any> {
    return this.http.get(`${this.baseUrl}/test-cors`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Test CORS'))
    );
  }

  // Banques
  getBanks(): Observable<Bank[]> {
    return this.http.get<any[]>(`${this.baseUrl}/banks/`).pipe(
      map(response => {
        // Vérification si la réponse est un tableau
        if (!Array.isArray(response)) {
          console.error('Réponse inattendue de l\'API getBanks:', response);
          return [];
        }
        
        // Conversion explicite des objets en interface Bank
        return response.map(bankData => ({
          id: bankData.id || '',
          name: bankData.name || '',
          full_name: bankData.full_name || null,
          description: bankData.description || null,
          logo_url: bankData.logo_url || null,
          website: bankData.website || null,
          contact_phone: bankData.contact_phone || null,
          contact_email: bankData.contact_email || null,
          address: bankData.address || null,
          swift_code: bankData.swift_code || null,
          license_number: bankData.license_number || null,
          established_year: bankData.established_year || null,
          total_assets: bankData.total_assets || null,
          rating: bankData.rating || null,
          is_active: bankData.is_active !== false,
          created_at: bankData.created_at ? new Date(bankData.created_at) : new Date(),
          updated_at: bankData.updated_at ? new Date(bankData.updated_at) : new Date()
        }));
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des banques:', error);
        return of([]); // Retourner un tableau vide en cas d'erreur
      })
    );
  }

  // Nouvelle méthode pour calculer la capacité d'emprunt
  getBorrowingCapacity(params: {
    monthly_income: number;
    current_debts?: number;
    duration_months: number;
    interest_rate: number;
    max_debt_ratio?: number;
    down_payment?: number;
    include_insurance?: boolean;
    insurance_rate?: number;
  }): Observable<any> {
    let httpParams = new HttpParams()
      .set('monthly_income', params.monthly_income.toString())
      .set('duration_months', params.duration_months.toString())
      .set('interest_rate', params.interest_rate.toString());

    if (params.current_debts !== undefined) {
      httpParams = httpParams.set('current_debts', params.current_debts.toString());
    }
    if (params.max_debt_ratio !== undefined) {
      httpParams = httpParams.set('max_debt_ratio', params.max_debt_ratio.toString());
    }
    if (params.down_payment !== undefined) {
      httpParams = httpParams.set('down_payment', params.down_payment.toString());
    }
    if (params.include_insurance !== undefined) {
      httpParams = httpParams.set('include_insurance', params.include_insurance.toString());
    }
    if (params.insurance_rate !== undefined) {
      httpParams = httpParams.set('insurance_rate', params.insurance_rate.toString());
    }

    return this.http.get(`${this.baseUrl}/credits/borrowing-capacity`, {
      ...this.getHttpOptions(),
      params: httpParams
    }).pipe(
      catchError(this.handleError('Get Borrowing Capacity'))
    );
  }

  // Test de connexion avec l'endpoint de capacité d'emprunt
  testBorrowingCapacityEndpoint(): Observable<any> {
    const testParams = {
      monthly_income: 750000,
      duration_months: 24,
      interest_rate: 6.5
    };

    return this.getBorrowingCapacity(testParams).pipe(
      catchError(error => {
        console.error('Test endpoint capacité échoué:', error);
        return of({ error: true, message: error });
      })
    );
  }

  // Méthode améliorée pour la comparaison de crédits avec gestion d'erreurs
  compareCreditOffers(params: {
    credit_type: string;
    amount: number;
    duration: number;
    monthly_income: number;
    current_debts?: number;
  }): Observable<any> {
    // Validation des paramètres côté client
    if (params.amount <= 0) {
      return throwError(() => 'Le montant doit être supérieur à 0');
    }
    if (params.duration <= 0) {
      return throwError(() => 'La durée doit être supérieure à 0');
    }
    if (params.monthly_income <= 0) {
      return throwError(() => 'Les revenus doivent être supérieurs à 0');
    }

    let httpParams = new HttpParams()
      .set('credit_type', params.credit_type)
      .set('amount', params.amount.toString())
      .set('duration', params.duration.toString())
      .set('monthly_income', params.monthly_income.toString());

    if (params.current_debts !== undefined && params.current_debts >= 0) {
      httpParams = httpParams.set('current_debts', params.current_debts.toString());
    }

    return this.http.get(`${this.baseUrl}/credits/compare`, {
      ...this.getHttpOptions(),
      params: httpParams
    }).pipe(
      timeout(30000), // 30 secondes de timeout
      catchError(this.handleError('Compare Credit Offers'))
    );
  }

  // Diagnostic complet pour le simulateur de capacité
  runCapacitySimulatorDiagnostic(): Observable<any> {
    console.log('Lancement du diagnostic complet du simulateur de capacité...');
    
    return new Observable(observer => {
      const results: any = {
        baseUrl: this.baseUrl,
        tests: {},
        timestamp: new Date()
      };

      // Test 1: Santé générale de l'API
      this.testConnection().subscribe({
        next: (health) => {
          results.tests.health = { status: 'success', data: health };
          console.log('Health check OK');
          
          // Test 2: Endpoint des banques
          this.getBanks().subscribe({
            next: (banks) => {
              results.tests.banks = { status: 'success', count: banks?.length || 0 };
              console.log(`Banques chargées: ${banks?.length || 0}`);
              
              // Test 3: Endpoint des produits de crédit
              this.getCreditProducts({ credit_type: 'immobilier' }).subscribe({
                next: (products) => {
                  results.tests.creditProducts = { status: 'success', count: products?.length || 0 };
                  console.log(`Produits de crédit: ${products?.length || 0}`);
                  
                  // Test 4: Endpoint de capacité d'emprunt
                  this.testBorrowingCapacityEndpoint().subscribe({
                    next: (capacity) => {
                      results.tests.borrowingCapacity = { status: 'success', data: capacity };
                      console.log('Capacité d\'emprunt OK');
                      
                      // Test 5: Endpoint de comparaison
                      this.compareCreditOffers({
                        credit_type: 'immobilier',
                        amount: 5000000,
                        duration: 24,
                        monthly_income: 750000
                      }).subscribe({
                        next: (comparison) => {
                          results.tests.comparison = { status: 'success', data: comparison };
                          console.log('Comparaison OK');
                          observer.next(results);
                          observer.complete();
                        },
                        error: (compError) => {
                          results.tests.comparison = { status: 'error', error: compError };
                          console.log('Comparaison échouée:', compError);
                          observer.next(results);
                          observer.complete();
                        }
                      });
                    },
                    error: (capacityError) => {
                      results.tests.borrowingCapacity = { status: 'error', error: capacityError };
                      console.log('Capacité d\'emprunt échouée:', capacityError);
                      observer.next(results);
                      observer.complete();
                    }
                  });
                },
                error: (productsError) => {
                  results.tests.creditProducts = { status: 'error', error: productsError };
                  console.log('Produits de crédit échoués:', productsError);
                  observer.next(results);
                  observer.complete();
                }
              });
            },
            error: (banksError) => {
              results.tests.banks = { status: 'error', error: banksError };
              console.log('Banques échouées:', banksError);
              observer.next(results);
              observer.complete();
            }
          });
        },
        error: (healthError) => {
          results.tests.health = { status: 'error', error: healthError };
          console.log('Health check échoué:', healthError);
          observer.next(results);
          observer.complete();
        }
      });
    });
  }

  getBank(bankId: string): Observable<Bank> {
    return this.http.get<Bank>(`${this.baseUrl}/banks/${bankId}`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Get Bank'))
    );
  }

  // Produits de crédit
  getCreditProducts(params?: {
    credit_type?: string;
    min_amount?: number;
    max_amount?: number;
  }): Observable<CreditProduct[]> {
    let httpParams = new HttpParams();
    if (params?.credit_type) httpParams = httpParams.set('credit_type', params.credit_type);
    if (params?.min_amount) httpParams = httpParams.set('min_amount', params.min_amount.toString());
    if (params?.max_amount) httpParams = httpParams.set('max_amount', params.max_amount.toString());

    return this.http.get<CreditProduct[]>(`${this.baseUrl}/credits/products`, {
      ...this.getHttpOptions(),
      params: httpParams
    }).pipe(
      catchError(this.handleError('Get Credit Products'))
    );
  }

  getBankCreditProducts(bankId: string): Observable<CreditProduct[]> {
    return this.http.get<CreditProduct[]>(`${this.baseUrl}/banks/${bankId}/credit-products`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Get Bank Credit Products'))
    );
  }

  // Simulations de crédit
  simulateCredit(request: CreditSimulationRequest): Observable<CreditSimulationResponse> {
    console.log('Simulating credit with request:', request);
    return this.http.post<CreditSimulationResponse>(
      `${this.baseUrl}/credits/simulate`, 
      request, 
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError('Simulate Credit'))
    );
  }

  // === NOUVELLES MÉTHODES POUR L'ÉPARGNE ===

  // Produits d'épargne avec gestion d'erreurs robuste
  getSavingsProducts(params?: {
    product_type?: string;
    min_deposit?: number;
    max_deposit?: number;
  }): Observable<SavingsProduct[]> {
    console.log('Chargement des produits d\'épargne...');
    
    let httpParams = new HttpParams();
    if (params?.product_type) httpParams = httpParams.set('type', params.product_type);
    if (params?.min_deposit) httpParams = httpParams.set('min_deposit', params.min_deposit.toString());
    if (params?.max_deposit) httpParams = httpParams.set('max_deposit', params.max_deposit.toString());

    const url = `${this.baseUrl}/savings/products`;
    console.log('URL produits épargne:', url);

    return this.http.get<any[]>(url, {
      ...this.getHttpOptions(),
      params: httpParams
    }).pipe(
      tap(response => console.log('Réponse brute produits épargne:', response)),
      map(response => {
        if (!Array.isArray(response)) {
          console.error('Format de réponse inattendu:', response);
          throw new Error('Format de réponse invalide');
        }
        
        return response.map(product => this.mapSavingsProductFromAPI(product));
      }),
      tap(products => console.log(`${products.length} produits d'épargne mappés`)),
      catchError(this.handleError('Get Savings Products'))
    );
  }

  // Mapper un produit d'épargne depuis l'API
  private mapSavingsProductFromAPI(apiProduct: any): SavingsProduct {
    return {
      id: apiProduct.id || '',
      bank_id: apiProduct.bank_id || '',
      name: apiProduct.name || '',
      type: apiProduct.type || '',
      description: apiProduct.description || null,
      interest_rate: Number(apiProduct.interest_rate) || 0,
      minimum_deposit: Number(apiProduct.minimum_deposit) || 0,
      maximum_deposit: apiProduct.maximum_deposit ? Number(apiProduct.maximum_deposit) : undefined,
      minimum_balance: Number(apiProduct.minimum_balance) || 0,
      liquidity: apiProduct.liquidity || 'immediate',
      notice_period_days: Number(apiProduct.notice_period_days) || 0,
      term_months: apiProduct.term_months ? Number(apiProduct.term_months) : undefined,
      compounding_frequency: apiProduct.compounding_frequency || 'monthly',
      fees: apiProduct.fees || {},
      features: Array.isArray(apiProduct.features) ? apiProduct.features : [],
      advantages: Array.isArray(apiProduct.advantages) ? apiProduct.advantages : [],
      tax_benefits: Array.isArray(apiProduct.tax_benefits) ? apiProduct.tax_benefits : [],
      risk_level: Number(apiProduct.risk_level) || 1,
      early_withdrawal_penalty: apiProduct.early_withdrawal_penalty ? Number(apiProduct.early_withdrawal_penalty) : undefined,
      is_islamic_compliant: Boolean(apiProduct.is_islamic_compliant),
      is_featured: Boolean(apiProduct.is_featured),
      is_active: Boolean(apiProduct.is_active),
      created_at: apiProduct.created_at ? new Date(apiProduct.created_at) : new Date(),
      updated_at: apiProduct.updated_at ? new Date(apiProduct.updated_at) : new Date(),
      bank: apiProduct.bank ? {
        id: apiProduct.bank.id || '',
        name: apiProduct.bank.name || '',
        full_name: apiProduct.bank.full_name || null,
        description: apiProduct.bank.description || null,
        logo_url: apiProduct.bank.logo_url || null,
        website: apiProduct.bank.website || null,
        contact_phone: apiProduct.bank.contact_phone || null,
        contact_email: apiProduct.bank.contact_email || null,
        address: apiProduct.bank.address || null,
        swift_code: apiProduct.bank.swift_code || null,
        license_number: apiProduct.bank.license_number || null,
        established_year: apiProduct.bank.established_year || null,
        total_assets: apiProduct.bank.total_assets || null,
        rating: apiProduct.bank.rating || null,
        is_active: Boolean(apiProduct.bank.is_active),
        created_at: apiProduct.bank.created_at ? new Date(apiProduct.bank.created_at) : new Date(),
        updated_at: apiProduct.bank.updated_at ? new Date(apiProduct.bank.updated_at) : new Date()
      } : undefined
    };
  }

  // Simulation d'épargne avec validation et gestion d'erreurs complète
  simulateSavings(request: SavingsSimulationRequest): Observable<SavingsSimulationResponse> {
  console.log('Début simulation épargne:', request);
  
  // Validation côté client
  if (!request.savings_product_id) {
    return throwError(() => 'ID du produit d\'épargne manquant');
  }
  
  if (request.initial_amount < 0) {
    return throwError(() => 'Le montant initial ne peut pas être négatif');
  }
  
  if (request.monthly_contribution < 0) {
    return throwError(() => 'La contribution mensuelle ne peut pas être négative');
  }
  
  if (request.duration_months <= 0) {
    return throwError(() => 'La durée doit être positive');
  }

  const url = `${this.baseUrl}/savings/simulate`;
  console.log('URL simulation:', url);
  console.log('Payload:', JSON.stringify(request, null, 2));
  
  // CORRECTION: timeout dans pipe() au lieu des options HTTP
  return this.http.post<any>(url, request, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }).pipe(
    timeout(30000), // CORRIGÉ: timeout ici dans pipe()
    tap(response => {
      console.log('Réponse simulation reçue:', response);
      console.log('Type de réponse:', typeof response);
      console.log('Propriétés de la réponse:', Object.keys(response || {}));
    }),
    map(response => this.mapSimulationResponse(response)),
    tap(mappedResponse => console.log('Réponse mappée:', mappedResponse)),
    catchError(this.handleError('Simulate Savings'))
  );
}

  // Mapper la réponse de simulation
  private mapSimulationResponse(apiResponse: any): SavingsSimulationResponse {
    console.log('Mapping de la réponse simulation:', apiResponse);
    
    return {
      id: apiResponse.id || '',
      final_amount: Number(apiResponse.final_amount) || 0,
      total_contributions: Number(apiResponse.total_contributions) || 0,
      total_interest: Number(apiResponse.total_interest) || 0,
      monthly_breakdown: Array.isArray(apiResponse.monthly_breakdown) ? 
        apiResponse.monthly_breakdown.map((item: any) => ({
          month: Number(item.month) || 0,
          contribution: Number(item.contribution) || 0,
          interest: Number(item.interest) || 0,
          cumulative_amount: Number(item.balance || item.cumulative_amount) || 0
        })) : [],
      recommendations: Array.isArray(apiResponse.recommendations) ? apiResponse.recommendations : [],
      created_at: apiResponse.created_at || new Date().toISOString(),
      savings_product: apiResponse.savings_product ? this.mapSavingsProductFromAPI(apiResponse.savings_product) : undefined
    };
  }

  // Méthode de test complète pour l'épargne
  testSavingsSimulation(): Observable<any> {
    console.log('Test complet de la simulation d\'épargne');
    
    return this.getSavingsProducts().pipe(
      tap(products => console.log(`Produits disponibles pour test: ${products.length}`)),
      switchMap(products => {
        if (products.length === 0) {
          return throwError(() => 'Aucun produit d\'épargne disponible pour le test');
        }
        
        const testProduct = products[0];
        console.log('Test avec le produit:', testProduct.name);
        
        const testRequest: SavingsSimulationRequest = {
          savings_product_id: testProduct.id,
          initial_amount: Math.max(1000000, testProduct.minimum_deposit),
          monthly_contribution: 200000,
          duration_months: 24,
          session_id: 'test_' + Date.now()
        };
        
        console.log('Requête de test:', testRequest);
        return this.simulateSavings(testRequest);
      }),
      tap(result => console.log('Test de simulation réussi:', result)),
      catchError(error => {
        console.error('Test de simulation échoué:', error);
        return throwError(() => `Test échoué: ${error}`);
      })
    );
  }

  // Diagnostic complet pour l'épargne
  runSavingsDiagnostic(): Observable<any> {
    console.log('Diagnostic complet du système d\'épargne');
    
    return new Observable(observer => {
      const results: any = {
        timestamp: new Date().toISOString(),
        baseUrl: this.baseUrl,
        tests: {}
      };

      // Test 1: Santé de l'API
      this.testConnection().subscribe({
        next: (health) => {
          results.tests.health = { status: 'success', data: health };
          console.log('Health check OK');
          
          // Test 2: Chargement des produits
          this.getSavingsProducts().subscribe({
            next: (products) => {
              results.tests.products = { status: 'success', count: products.length };
              console.log(`Produits chargés: ${products.length}`);
              
              if (products.length > 0) {
                // Test 3: Simulation
                this.testSavingsSimulation().subscribe({
                  next: (simulation) => {
                    results.tests.simulation = { status: 'success', data: simulation };
                    console.log('Test simulation OK');
                    observer.next(results);
                    observer.complete();
                  },
                  error: (simError) => {
                    results.tests.simulation = { status: 'error', error: simError };
                    console.log('Test simulation échoué:', simError);
                    observer.next(results);
                    observer.complete();
                  }
                });
              } else {
                results.tests.simulation = { status: 'skipped', reason: 'Aucun produit disponible' };
                observer.next(results);
                observer.complete();
              }
            },
            error: (productError) => {
              results.tests.products = { status: 'error', error: productError };
              console.log('Chargement produits échoué:', productError);
              observer.next(results);
              observer.complete();
            }
          });
        },
        error: (healthError) => {
          results.tests.health = { status: 'error', error: healthError };
          console.log('Health check échoué:', healthError);
          observer.next(results);
          observer.complete();
        }
      });
    });
  }

  // === MÉTHODES EXISTANTES CONSERVÉES ===

  // Assurances
  getInsuranceProducts(params?: {
    insurance_type?: string;
  }): Observable<InsuranceProduct[]> {
    let httpParams = new HttpParams();
    if (params?.insurance_type) httpParams = httpParams.set('insurance_type', params.insurance_type);

    return this.http.get<InsuranceProduct[]>(`${this.baseUrl}/insurance/products`, {
      ...this.getHttpOptions(),
      params: httpParams
    }).pipe(
      catchError(this.handleError('Get Insurance Products'))
    );
  }

  getInsuranceQuote(request: InsuranceQuoteRequest): Observable<InsuranceQuoteResponse> {
    return this.http.post<InsuranceQuoteResponse>(
      `${this.baseUrl}/insurance/quote`, 
      request, 
      this.getHttpOptions()
    ).pipe(
      catchError(this.handleError('Get Insurance Quote'))
    );
  }

  // Analytics
  getPopularProducts(days: number = 30): Observable<any> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get(`${this.baseUrl}/simulations/analytics/popular-products`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      catchError(this.handleError('Get Popular Products'))
    );
  }

  getMarketTrends(): Observable<any> {
    return this.http.get(`${this.baseUrl}/simulations/analytics/market-trends`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Get Market Trends'))
    );
  }

  // MÉTHODE AJOUTÉE: Statistiques du marché
  getMarketStatistics(): Observable<MarketStatistics> {
    return this.http.get<MarketStatistics>(`${this.baseUrl}/analytics/market-statistics`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Get Market Statistics'))
    );
  }

  // Alternative: méthode pour générer des statistiques locales si l'endpoint n'existe pas
  generateMarketStatisticsFromProducts(products: CreditProduct[]): MarketStatistics {
    if (products.length === 0) {
      return {
        average_rate: 0,
        trend: 0,
        best_rate: 0,
        best_rate_bank: 'N/A',
        average_processing_time: 0,
        total_products: 0,
        active_banks: 0
      };
    }

    const rates = products.map(p => p.average_rate);
    const processingTimes = products.map(p => p.processing_time_hours);
    const uniqueBanks = new Set(products.map(p => p.bank_id));

    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const minRate = Math.min(...rates);
    const bestRateProduct = products.find(p => p.average_rate === minRate);
    const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;

    return {
      average_rate: avgRate,
      trend: -0.2, // Simulation d'une tendance
      best_rate: minRate,
      best_rate_bank: bestRateProduct?.bank.name || 'N/A',
      average_processing_time: Math.round(avgProcessingTime),
      total_products: products.length,
      active_banks: uniqueBanks.size
    };
  }

  // Statistiques API
  getApiStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Get API Stats'))
    );
  }

  // Recherche globale
  searchProducts(query: string, type?: string): Observable<any> {
    let httpParams = new HttpParams().set('q', query);
    if (type) httpParams = httpParams.set('type', type);

    return this.http.get(`${this.baseUrl}/search`, {
      ...this.getHttpOptions(),
      params: httpParams
    }).pipe(
      catchError(this.handleError('Search Products'))
    );
  }

  // Méthodes utilitaires
  getSavedSimulation(simulationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/simulations/${simulationId}`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Get Saved Simulation'))
    );
  }

  getUserSimulations(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/simulations/user/${userId}`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Get User Simulations'))
    );
  }

  deleteSimulation(simulationId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/simulations/${simulationId}`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Delete Simulation'))
    );
  }

  exportSimulationPDF(simulationId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/simulations/${simulationId}/pdf`, {
      headers: this.defaultHeaders,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError('Export PDF'))
    );
  }

  // Test de connectivité spécifique
  testBackendConnection(): Observable<any> {
    const testUrl = `${this.baseUrl}/test-cors`;
    console.log('Testing backend connection:', testUrl);
    
    return this.http.get(testUrl, {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }),
      observe: 'response' // Pour voir les headers de réponse
    }).pipe(
      timeout(5000),
      catchError((error: HttpErrorResponse) => {
        console.error('Connection test failed:', error);
        
        if (error.status === 0) {
          return throwError(() => 'Serveur non accessible. Vérifiez que l\'API FastAPI est démarrée sur http://localhost:8000');
        }
        
        return throwError(() => `Erreur ${error.status}: ${error.message}`);
      })
    );
  }

  // Test endpoint pour chaque router
  testBanksEndpoint(): Observable<any> {
    return this.http.get(`${this.baseUrl}/banks/test`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Test Banks Endpoint'))
    );
  }

  testCreditsEndpoint(): Observable<any> {
    return this.http.get(`${this.baseUrl}/credits/test`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Test Credits Endpoint'))
    );
  }

  testSavingsEndpoint(): Observable<any> {
    return this.http.get(`${this.baseUrl}/savings/test`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Test Savings Endpoint'))
    );
  }

  testInsuranceEndpoint(): Observable<any> {
    return this.http.get(`${this.baseUrl}/insurance/test`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Test Insurance Endpoint'))
    );
  }

  testSimulationsEndpoint(): Observable<any> {
    return this.http.get(`${this.baseUrl}/simulations/test`, this.getHttpOptions()).pipe(
      catchError(this.handleError('Test Simulations Endpoint'))
    );
  }

  // Méthode de diagnostic complète
  runDiagnostic(): Observable<any> {
    console.log('Running full API diagnostic...');
    
    return new Observable(observer => {
      const results: any = {
        baseUrl: this.baseUrl,
        tests: {},
        timestamp: new Date()
      };

      // Test de base
      this.testConnection().subscribe({
        next: (health) => {
          results.tests.health = { status: 'success', data: health };
          console.log('Health check passed');
          
          // Test CORS
          this.testCors().subscribe({
            next: (cors) => {
              results.tests.cors = { status: 'success', data: cors };
              console.log('CORS test passed');
              observer.next(results);
              observer.complete();
            },
            error: (corsError) => {
              results.tests.cors = { status: 'error', error: corsError };
              console.log('CORS test failed:', corsError);
              observer.next(results);
              observer.complete();
            }
          });
        },
        error: (healthError) => {
          results.tests.health = { status: 'error', error: healthError };
          console.log('Health check failed:', healthError);
          observer.next(results);
          observer.complete();
        }
      });
    });
  }

  // Utilitaire pour formater les montants
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  // Génération d'ID de session
  generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}