import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

// Interfaces correspondant exactement à la base de données
export interface BankAdmin {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
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
  created_at: Date;
  updated_at: Date;
  
  // Statistiques calculées
  credit_products_count?: number;
  savings_products_count?: number;
  total_simulations?: number;
  last_simulation_date?: Date;
}

export interface BankCreate {
  id: string;
  name: string;
  full_name?: string | null;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  swift_code?: string | null;
  license_number?: string | null;
  established_year?: number | null;
  total_assets?: number | null;
  rating?: string | null;
  is_active?: boolean;
}

export interface BankUpdate {
  name?: string;
  full_name?: string | null;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  swift_code?: string | null;
  license_number?: string | null;
  established_year?: number | null;
  total_assets?: number | null;
  rating?: string | null;
  is_active?: boolean;
}

export interface BankListResponse {
  banks: BankAdmin[];
  total: number;
  skip: number;
  limit: number;
}

export interface BankStats {
  banks: {
    total: number;
    active: number;
    inactive: number;
  };
  products: {
    credit_total: number;
    savings_total: number;
    total: number;
  };
  simulations: {
    total: number;
    this_month: number;
  };
  top_banks: Array<{
    bank_id: string;
    bank_name: string;
    simulations_count: number;
  }>;
}

export interface BankValidationResponse {
  available: boolean;
}

export interface BankProduct {
  id: string;
  name: string;
  type: string;
  average_rate?: number;
  interest_rate?: number;
  min_amount?: number;
  max_amount?: number;
  minimum_deposit?: number;
  maximum_deposit?: number;
  is_active: boolean;
  created_at: Date;
}

export interface BankProductsResponse {
  credit: BankProduct[];
  savings: BankProduct[];
}

export interface BankPerformance {
  bank_id: string;
  bank_name: string;
  period: string;
  monthly_simulations: {
    credit: Array<{ month: string; count: number }>;
    savings: Array<{ month: string; count: number }>;
  };
  volumes: {
    total_credit_volume: number;
    total_savings_volume: number;
    total_volume: number;
  };
}

export interface BankSimulation {
  id: string;
  product_name: string;
  requested_amount?: number;
  initial_amount?: number;
  duration_months: number;
  monthly_payment?: number;
  monthly_contribution?: number;
  applied_rate?: number;
  final_amount?: number;
  eligible?: boolean;
  created_at: Date;
}

export interface BankSimulationsResponse {
  credit_simulations: BankSimulation[];
  savings_simulations: BankSimulation[];
  total_credit: number;
  total_savings: number;
}

export interface ToggleStatusResponse {
  message: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BankAdminService {
  private apiUrl = `${environment.apiUrl}/admin/banks`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD OPERATIONS ====================

  getBanks(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    rating?: string;
  }): Observable<BankListResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.skip !== undefined) httpParams = httpParams.set('skip', params.skip.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.is_active !== undefined) httpParams = httpParams.set('is_active', params.is_active.toString());
      if (params.rating) httpParams = httpParams.set('rating', params.rating);
    }

    return this.http.get<BankListResponse>(`${this.apiUrl}`, { params: httpParams })
      .pipe(
        map(response => {
          console.log('Réponse API brute:', response); // Debug
          return {
            ...response,
            banks: response.banks.map(bank => {
              const mappedBank = {
                ...bank,
                created_at: new Date(bank.created_at),
                updated_at: new Date(bank.updated_at),
                last_simulation_date: bank.last_simulation_date ? new Date(bank.last_simulation_date) : undefined,
                // S'assurer que les statistiques sont bien mappées avec des valeurs par défaut
                credit_products_count: bank.credit_products_count ?? 0,
                savings_products_count: bank.savings_products_count ?? 0,
                total_simulations: bank.total_simulations ?? 0
              };
              console.log(`Banque mappée ${bank.name}:`, {
                credit_products_count: mappedBank.credit_products_count,
                savings_products_count: mappedBank.savings_products_count,
                total_simulations: mappedBank.total_simulations
              }); // Debug
              return mappedBank;
            })
          };
        }),
        catchError(this.handleError)
      );
  }

  getBank(bankId: string): Observable<BankAdmin> {
    return this.http.get<BankAdmin>(`${this.apiUrl}/${bankId}`)
      .pipe(
        map(bank => ({
          ...bank,
          created_at: new Date(bank.created_at),
          updated_at: new Date(bank.updated_at),
          last_simulation_date: bank.last_simulation_date ? new Date(bank.last_simulation_date) : undefined,
          credit_products_count: bank.credit_products_count ?? 0,
          savings_products_count: bank.savings_products_count ?? 0,
          total_simulations: bank.total_simulations ?? 0
        })),
        catchError(this.handleError)
      );
  }

  createBank(bankData: BankCreate): Observable<BankAdmin> {
    return this.http.post<BankAdmin>(`${this.apiUrl}`, bankData)
      .pipe(
        map(bank => ({
          ...bank,
          created_at: new Date(bank.created_at),
          updated_at: new Date(bank.updated_at),
          credit_products_count: 0,
          savings_products_count: 0,
          total_simulations: 0
        })),
        catchError(this.handleError)
      );
  }

  updateBank(bankId: string, bankData: BankUpdate): Observable<BankAdmin> {
    return this.http.put<BankAdmin>(`${this.apiUrl}/${bankId}`, bankData)
      .pipe(
        map(bank => ({
          ...bank,
          created_at: new Date(bank.created_at),
          updated_at: new Date(bank.updated_at),
          last_simulation_date: bank.last_simulation_date ? new Date(bank.last_simulation_date) : undefined,
          credit_products_count: bank.credit_products_count ?? 0,
          savings_products_count: bank.savings_products_count ?? 0,
          total_simulations: bank.total_simulations ?? 0
        })),
        catchError(this.handleError)
      );
  }

  deleteBank(bankId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${bankId}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== VALIDATION ====================

  validateBankId(id: string): Observable<BankValidationResponse> {
    const params = new HttpParams().set('id', id);
    return this.http.get<BankValidationResponse>(`${this.apiUrl}/validate-id`, { params })
      .pipe(catchError(this.handleError));
  }

  // ==================== STATISTIQUES ====================

  getAdminStats(): Observable<BankStats> {
    return this.http.get<BankStats>(`${this.apiUrl}/stats`)
      .pipe(
        map(stats => {
          console.log('Stats globales reçues:', stats); // Debug
          return stats;
        }),
        catchError(this.handleError)
      );
  }

  getBankPerformance(bankId: string, period: string = '6m'): Observable<BankPerformance> {
    const params = new HttpParams().set('period', period);
    return this.http.get<BankPerformance>(`${this.apiUrl}/${bankId}/performance`, { params })
      .pipe(catchError(this.handleError));
  }

  // ==================== PRODUITS LIÉS ====================

  getBankProducts(bankId: string, type?: 'credit' | 'savings'): Observable<BankProductsResponse> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<BankProductsResponse>(`${this.apiUrl}/${bankId}/products`, { params })
      .pipe(
        map(response => ({
          ...response,
          credit: response.credit.map(product => ({
            ...product,
            created_at: new Date(product.created_at)
          })),
          savings: response.savings.map(product => ({
            ...product,
            created_at: new Date(product.created_at)
          }))
        })),
        catchError(this.handleError)
      );
  }

  // ==================== SIMULATIONS ====================

  getBankSimulations(
    bankId: string,
    params?: {
      skip?: number;
      limit?: number;
      date_from?: string;
      date_to?: string;
    }
  ): Observable<BankSimulationsResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.skip !== undefined) httpParams = httpParams.set('skip', params.skip.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.date_from) httpParams = httpParams.set('date_from', params.date_from);
      if (params.date_to) httpParams = httpParams.set('date_to', params.date_to);
    }

    return this.http.get<BankSimulationsResponse>(`${this.apiUrl}/${bankId}/simulations`, { params: httpParams })
      .pipe(
        map(response => ({
          ...response,
          credit_simulations: response.credit_simulations.map(sim => ({
            ...sim,
            created_at: new Date(sim.created_at)
          })),
          savings_simulations: response.savings_simulations.map(sim => ({
            ...sim,
            created_at: new Date(sim.created_at)
          }))
        })),
        catchError(this.handleError)
      );
  }

uploadBankLogo(bankId: string, file: File): Observable<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  return this.http.post<any>(
    `${this.apiUrl}/${bankId}/upload-logo`,
    formData,
    {
      reportProgress: true,
      observe: 'events'
    }
  ).pipe(
    filter(event => event.type === HttpEventType.Response),
    map(event => event.body)
  );
}

// Dans bankAdminService
deleteBankLogo(bankId: string): Observable<any> {
  return this.http.delete<any>(`${this.apiUrl}/${bankId}/logo`);
}

  // ==================== ACTIONS RAPIDES ====================

  toggleBankStatus(bankId: string): Observable<ToggleStatusResponse> {
    return this.http.patch<ToggleStatusResponse>(`${this.apiUrl}/${bankId}/toggle-status`, {})
      .pipe(catchError(this.handleError));
  }

  // Méthodes de compatibilité avec l'ancienne API
  activateBank(bankId: string): Observable<BankAdmin> {
    return this.updateBank(bankId, { is_active: true });
  }

  deactivateBank(bankId: string): Observable<BankAdmin> {
    return this.updateBank(bankId, { is_active: false });
  }

  // Nouvelle méthode recommandée utilisant l'endpoint toggle-status
  toggleBankStatusNew(bankId: string): Observable<ToggleStatusResponse> {
    return this.toggleBankStatus(bankId);
  }

  // ==================== EXPORT ====================

  exportBanks(format: 'csv' | 'excel' = 'csv'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    }).pipe(catchError(this.handleError));
  }

  // ==================== UTILITAIRES PRIVÉES ====================

  private isValidNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  private safeNumber(value: number | null | undefined, defaultValue: number = 0): number {
    return this.isValidNumber(value) ? value : defaultValue;
  }

  // ==================== UTILITAIRES ====================

  getBankRatings(): string[] {
    return [
      'AAA', 'AA+', 'AA', 'AA-', 
      'A+', 'A', 'A-', 
      'BBB+', 'BBB', 'BBB-', 
      'BB+', 'BB', 'BB-', 
      'B+', 'B', 'B-', 
      'CCC', 'CC', 'C', 'D'
    ];
  }

  formatAssets(amount: number | null | undefined): string {
    const safeAmount = this.safeNumber(amount);
    if (safeAmount === 0) return 'N/A';
    
    const trillions = safeAmount / 1000000000000;
    const billions = safeAmount / 1000000000;
    const millions = safeAmount / 1000000;
    
    if (trillions >= 1) {
      return `${this.formatNumber(trillions, 2)} T FCFA`;
    } else if (billions >= 1) {
      return `${this.formatNumber(billions, 2)} Md FCFA`;
    } else if (millions >= 1) {
      return `${this.formatNumber(millions, 2)} M FCFA`;
    } else {
      return this.formatCurrency(safeAmount);
    }
  }

  formatCurrency(amount: number | null | undefined, currency: string = 'XAF'): string {
    const safeAmount = this.safeNumber(amount);
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  }

  formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  formatPercentage(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  }

  getRatingColor(rating: string): string {
    const colors: { [key: string]: string } = {
      // Excellente qualité
      'AAA': '#00C851', 'AA+': '#00C851', 'AA': '#00C851', 'AA-': '#00C851',
      // Haute qualité
      'A+': '#4CAF50', 'A': '#4CAF50', 'A-': '#4CAF50',
      // Bonne qualité
      'BBB+': '#8BC34A', 'BBB': '#8BC34A', 'BBB-': '#8BC34A',
      // Qualité spéculative
      'BB+': '#FFC107', 'BB': '#FFC107', 'BB-': '#FFC107',
      // Hautement spéculatif
      'B+': '#FF9800', 'B': '#FF9800', 'B-': '#FF9800',
      // Très risqué
      'CCC': '#F44336', 'CC': '#F44336', 'C': '#F44336', 'D': '#F44336'
    };
    return colors[rating] || '#9E9E9E';
  }

  getRatingDescription(rating: string): string {
    const descriptions: { [key: string]: string } = {
      'AAA': 'Qualité exceptionnelle, risque minimal',
      'AA+': 'Très haute qualité, risque très faible', 'AA': 'Très haute qualité, risque très faible', 'AA-': 'Très haute qualité, risque très faible',
      'A+': 'Haute qualité, risque faible', 'A': 'Haute qualité, risque faible', 'A-': 'Haute qualité, risque faible',
      'BBB+': 'Bonne qualité, risque modéré', 'BBB': 'Bonne qualité, risque modéré', 'BBB-': 'Bonne qualité, risque modéré',
      'BB+': 'Qualité spéculative, risque élevé', 'BB': 'Qualité spéculative, risque élevé', 'BB-': 'Qualité spéculative, risque élevé',
      'B+': 'Hautement spéculatif, risque très élevé', 'B': 'Hautement spéculatif, risque très élevé', 'B-': 'Hautement spéculatif, risque très élevé',
      'CCC': 'Très risqué, défaut probable', 'CC': 'Extrêmement risqué', 'C': 'En défaut', 'D': 'En défaut'
    };
    return descriptions[rating] || 'Notation non reconnue';
  }

  // ==================== VALIDATION CÔTÉ CLIENT ====================

  validateBankData(bankData: Partial<BankCreate>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // ID obligatoire et format
    if (!bankData.id) {
      errors.push('L\'ID de la banque est obligatoire');
    } else if (!/^[a-z0-9_-]+$/.test(bankData.id)) {
      errors.push('L\'ID doit contenir uniquement des lettres minuscules, chiffres, tirets et underscores');
    }

    // Nom obligatoire
    if (!bankData.name || bankData.name.trim().length < 2) {
      errors.push('Le nom de la banque est obligatoire (minimum 2 caractères)');
    }

    // Email format
    if (bankData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bankData.contact_email)) {
      errors.push('Format d\'email invalide');
    }

    // URL format
    if (bankData.website && !/^https?:\/\/.+/.test(bankData.website)) {
      errors.push('L\'URL du site web doit commencer par http:// ou https://');
    }

    if (bankData.logo_url && !/^https?:\/\/.+/.test(bankData.logo_url)) {
      errors.push('L\'URL du logo doit commencer par http:// ou https://');
    }

    // SWIFT code format
    if (bankData.swift_code && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bankData.swift_code.toUpperCase())) {
      errors.push('Format de code SWIFT invalide');
    }

    // Année de création
    if (bankData.established_year) {
      const currentYear = new Date().getFullYear();
      if (bankData.established_year < 1800 || bankData.established_year > currentYear) {
        errors.push(`L'année de création doit être entre 1800 et ${currentYear}`);
      }
    }

    // Total des actifs
    if (bankData.total_assets !== undefined && bankData.total_assets !== null && bankData.total_assets < 0) {
      errors.push('Le total des actifs ne peut pas être négatif');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ==================== RECHERCHE ET FILTRAGE ====================

  searchBanks(query: string, limit: number = 10): Observable<BankAdmin[]> {
    return this.getBanks({ search: query, limit, skip: 0 })
      .pipe(
        map(response => response.banks),
        catchError(this.handleError)
      );
  }

  getBanksByStatus(isActive: boolean): Observable<BankAdmin[]> {
    return this.getBanks({ is_active: isActive, limit: 1000 })
      .pipe(
        map(response => response.banks),
        catchError(this.handleError)
      );
  }

  getBanksByRating(rating: string): Observable<BankAdmin[]> {
    return this.getBanks({ rating, limit: 1000 })
      .pipe(
        map(response => response.banks),
        catchError(this.handleError)
      );
  }

  // ==================== GESTION D'ERREURS ====================

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';
    
    console.error('Erreur BankAdminService:', error);
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur réseau: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = error.error?.detail || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Session expirée, veuillez vous reconnecter';
          break;
        case 403:
          errorMessage = 'Accès non autorisé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 409:
          errorMessage = error.error?.detail || 'Conflit de données (ID déjà utilisé)';
          break;
        case 422:
          errorMessage = 'Données de validation invalides';
          if (error.error?.detail) {
            errorMessage += `: ${error.error.detail}`;
          }
          break;
        case 429:
          errorMessage = 'Trop de requêtes, veuillez patienter';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne, veuillez réessayer plus tard';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporairement indisponible';
          break;
        default:
          errorMessage = error.error?.detail || `Erreur ${error.status}: ${error.statusText}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  };
}