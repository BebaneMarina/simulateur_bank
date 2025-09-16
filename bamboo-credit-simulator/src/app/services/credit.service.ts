// credit.service.ts - Version corrigée adaptée aux endpoints
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Interfaces mises à jour selon votre backend
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
  min_rate?: number;
  max_rate?: number;
  processing_time_hours: number;
  required_documents: string[];
  eligibility_criteria: any;
  fees: any;
  features: string[];
  advantages: string[];
  special_conditions: string[];
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bank: Bank;
}

export interface Bank {
  id: string;
  name: string;
  full_name: string;
  description: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  swift_code?: string;
  license_number?: string;
  established_year?: number;
  total_assets?: number;
  rating?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditSimulationRequest {
  credit_product_id: string;
  session_id?: string;
  requested_amount: number;
  duration_months: number;
  monthly_income: number;
  current_debts?: number;
  down_payment?: number;
}

export interface CreditSimulationResponse {
  simulation_id: string;
  applied_rate: number;
  monthly_payment: number;
  total_interest: number;
  total_cost: number;
  debt_ratio: number;
  eligible: boolean;
  recommendations: string[];
  amortization_schedule: AmortizationEntry[];
  bank_info: {
    name: string;
    logo?: string;
  };
}

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining_balance: number;
}

export interface CreditComparisonRequest {
  credit_type: string;
  amount: number;
  duration: number;
  monthly_income: number;
  current_debts?: number;
}

// Interface mise à jour selon votre endpoint /compare
export interface CreditComparisonResponse {
  comparisons: BankComparison[];
  statistics: {
    total_offers: number;
    eligible_offers: number;
    best_rate: number;
    average_rate: number;
    lowest_monthly: number;
    highest_monthly: number;
    max_savings: number;
  };
  search_params: {
    credit_type: string;
    amount: number;
    duration: number;
    monthly_income: number;
    current_debts: number;
  };
}

export interface BankComparison {
  bank: {
    id: string;
    name: string;
    logo?: string;
    short_name: string;
  };
  product: {
    id: string;
    name: string;
    rate: number;
    processing_time: number;
    features: string[];
  };
  monthly_payment: number;
  total_cost: number;
  total_interest: number;
  debt_ratio: number;
  eligible: boolean;
  savings_vs_best: number;
}

export interface BorrowingCapacityRequest {
  monthly_income: number;
  current_debts?: number;
  duration_months?: number;
  interest_rate?: number;
  max_debt_ratio?: number;
  down_payment?: number;
  include_insurance?: boolean;
  insurance_rate?: number;
}

export interface BorrowingCapacityResponse {
  borrowing_capacity: number;
  max_monthly_payment: number;
  total_project_capacity: number;
  debt_ratio: number;
  monthly_insurance: number;
  total_interest: number;
  total_cost: number;
  effective_rate: number;
  recommendations: string[];
  details: {
    monthly_income: number;
    current_debts: number;
    available_for_credit: number;
    down_payment: number;
    duration_months: number;
    duration_years: number;
    interest_rate: number;
    insurance_rate: number;
    max_debt_ratio: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CreditService {
  private readonly API_URL = 'http://localhost:8000/api/credits';
  saveCreditSimulation: any;

  constructor(private http: HttpClient) {}

  /**
   * Récupère les produits de crédit avec filtres optionnels
   * Utilise l'endpoint GET /products
   */
  getCreditProducts(filters?: {
    credit_type?: string;
    min_amount?: number;
    max_amount?: number;
  }): Observable<CreditProduct[]> {
    let params = new HttpParams();
    
    if (filters?.credit_type) {
      params = params.set('credit_type', filters.credit_type);
    }
    if (filters?.min_amount !== undefined) {
      params = params.set('min_amount', filters.min_amount.toString());
    }
    if (filters?.max_amount !== undefined) {
      params = params.set('max_amount', filters.max_amount.toString());
    }

    return this.http.get<CreditProduct[]>(`${this.API_URL}/products`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les produits compatibles avec une simulation
   */
  getCompatibleProducts(
    creditType: string,
    amount: number,
    duration: number
  ): Observable<CreditProduct[]> {
    return this.getCreditProducts({ credit_type: creditType, min_amount: amount, max_amount: amount })
      .pipe(
        map(products => products.filter(product => 
          duration >= product.min_duration_months && 
          duration <= product.max_duration_months &&
          product.is_active &&
          product.bank.is_active
        ))
      );
  }

  /**
   * Simule un crédit spécifique avec sauvegarde en base
   * Utilise l'endpoint POST /simulate
   */
  simulateCredit(request: CreditSimulationRequest): Observable<CreditSimulationResponse> {
    return this.http.post<CreditSimulationResponse>(`${this.API_URL}/simulate`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Simule un crédit sans sauvegarde en base (plus rapide)
   * Utilise l'endpoint POST /simulate-light
   */
  simulateCreditLight(request: CreditSimulationRequest): Observable<CreditSimulationResponse> {
    return this.http.post<CreditSimulationResponse>(`${this.API_URL}/simulate-light`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Compare les offres de crédit de différentes banques
   * Utilise l'endpoint GET /compare
   */
  compareCreditOffers(request: CreditComparisonRequest): Observable<CreditComparisonResponse> {
    const params = new HttpParams()
      .set('credit_type', request.credit_type)
      .set('amount', request.amount.toString())
      .set('duration', request.duration.toString())
      .set('monthly_income', request.monthly_income.toString())
      .set('current_debts', (request.current_debts || 0).toString());

    return this.http.get<CreditComparisonResponse>(`${this.API_URL}/compare`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Calcule la capacité d'emprunt maximale
   * Utilise l'endpoint GET /borrowing-capacity
   */
  calculateBorrowingCapacity(request: BorrowingCapacityRequest): Observable<BorrowingCapacityResponse> {
    let params = new HttpParams()
      .set('monthly_income', request.monthly_income.toString());

    if (request.current_debts !== undefined) {
      params = params.set('current_debts', request.current_debts.toString());
    }
    if (request.duration_months !== undefined) {
      params = params.set('duration_months', request.duration_months.toString());
    }
    if (request.interest_rate !== undefined) {
      params = params.set('interest_rate', request.interest_rate.toString());
    }
    if (request.max_debt_ratio !== undefined) {
      params = params.set('max_debt_ratio', request.max_debt_ratio.toString());
    }
    if (request.down_payment !== undefined) {
      params = params.set('down_payment', request.down_payment.toString());
    }
    if (request.include_insurance !== undefined) {
      params = params.set('include_insurance', request.include_insurance.toString());
    }
    if (request.insurance_rate !== undefined) {
      params = params.set('insurance_rate', request.insurance_rate.toString());
    }

    return this.http.get<BorrowingCapacityResponse>(`${this.API_URL}/borrowing-capacity`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Teste la connectivité avec l'API
   */
  testConnection(): Observable<any> {
    return this.http.get(`${this.API_URL}/test`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Méthodes utilitaires pour les composants
   */

  /**
   * Calcule le score d'une offre (pour tri/ranking)
   */
  calculateOfferScore(comparison: BankComparison, weights?: {
    rate?: number;
    eligibility?: number;
    processing_time?: number;
    monthly_payment?: number;
  }): number {
    const w = {
      rate: weights?.rate || 0.4,
      eligibility: weights?.eligibility || 0.3,
      processing_time: weights?.processing_time || 0.15,
      monthly_payment: weights?.monthly_payment || 0.15
    };

    const rateScore = (20 - comparison.product.rate) / 20;
    const eligibilityScore = comparison.eligible ? 1 : 0;
    const timeScore = Math.max(0, (168 - comparison.product.processing_time) / 168);
    const paymentScore = Math.max(0, (5000000 - comparison.monthly_payment) / 5000000);

    return (
      rateScore * w.rate +
      eligibilityScore * w.eligibility +
      timeScore * w.processing_time +
      paymentScore * w.monthly_payment
    );
  }

  /**
   * Formate les montants en FCFA
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Formate les pourcentages
   */
  formatPercent(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Convertit les heures en texte lisible
   */
  formatProcessingTime(hours: number): string {
    if (hours <= 24) return `${hours}h`;
    const days = Math.ceil(hours / 24);
    return `${days} jour${days > 1 ? 's' : ''}`;
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'Impossible de se connecter au serveur';
      } else if (error.status >= 400 && error.status < 500) {
        errorMessage = error.error?.detail || 'Erreur dans les données envoyées';
      } else if (error.status >= 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard';
      }
    }

    console.error('Erreur API Credit Service:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Validation des données avant envoi
   */
  validateSimulationRequest(request: CreditSimulationRequest): string[] {
    const errors: string[] = [];

    if (!request.credit_product_id) {
      errors.push('ID du produit de crédit requis');
    }
    if (!request.requested_amount || request.requested_amount <= 0) {
      errors.push('Montant demandé invalide');
    }
    if (!request.duration_months || request.duration_months <= 0) {
      errors.push('Durée invalide');
    }
    if (!request.monthly_income || request.monthly_income <= 0) {
      errors.push('Revenus mensuels invalides');
    }
    if (request.current_debts && request.current_debts < 0) {
      errors.push('Dettes actuelles ne peuvent pas être négatives');
    }
    if (request.down_payment && request.down_payment < 0) {
      errors.push('Apport personnel ne peut pas être négatif');
    }

    return errors;
  }

  /**
   * Validation des données de comparaison
   */
  validateComparisonRequest(request: CreditComparisonRequest): string[] {
    const errors: string[] = [];

    if (!request.credit_type) {
      errors.push('Type de crédit requis');
    }
    if (!request.amount || request.amount <= 0) {
      errors.push('Montant invalide');
    }
    if (!request.duration || request.duration <= 0) {
      errors.push('Durée invalide');
    }
    if (!request.monthly_income || request.monthly_income <= 0) {
      errors.push('Revenus mensuels invalides');
    }
    if (request.current_debts && request.current_debts < 0) {
      errors.push('Dettes actuelles ne peuvent pas être négatives');
    }

    return errors;
  }
}