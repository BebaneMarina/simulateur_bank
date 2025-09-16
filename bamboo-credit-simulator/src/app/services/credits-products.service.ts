// credit-product.service.ts - Service mis à jour
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface CreditProduct {
  id: string;
  name: string;
  type: string;
  description?: string;
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  average_rate: number;
  min_rate?: number;
  max_rate?: number;
  processing_time_hours: number;
  required_documents?: string[];
  eligibility_criteria?: any;
  fees?: any;
  features?: string[];
  advantages?: string[];
  special_conditions?: string;
  is_active: boolean;
  is_featured: boolean;
  bank_id: string;
  bank?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreditProductCreate {
  name: string;
  type: string;
  description?: string;
  bank_id: string;
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  average_rate: number;
  min_rate?: number;
  max_rate?: number;
  processing_time_hours: number;
  required_documents?: string[];
  eligibility_criteria?: any;
  fees?: any;
  features?: string[];
  advantages?: string[];
  special_conditions?: string;
  is_featured: boolean;
  is_active: boolean;
}

export interface CreditProductUpdate extends Partial<CreditProductCreate> {}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreditProductsStats {
  total_products: number;
  active_products: number;
  average_rate: number;
}

export interface CreditProductsFilters {
  search?: string;
  bank_id?: string;
  type?: string;
  is_active?: string;
  page?: number;
  limit?: number;
}

export interface Bank {
  id: string;
  name: string;
  full_name?: string;
  logo_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreditProductService {
  private apiUrl = `${environment.apiUrl}/admin/credit-products`;
  private banksUrl = `${environment.apiUrl}/banks`;

  constructor(private http: HttpClient) {}

  /**
   * Récupère tous les produits de crédit avec pagination et filtres
   */
  getCreditProducts(filters: CreditProductsFilters = {}): Observable<PaginatedResponse<CreditProduct>> {
    let params = new HttpParams();
    
    // Ajouter les paramètres de filtrage
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof CreditProductsFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.append(key, value.toString());
      }
    });

    return this.http.get<PaginatedResponse<CreditProduct>>(this.apiUrl, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupère un produit de crédit par son ID
   */
  getCreditProduct(id: string): Observable<CreditProduct> {
    return this.http.get<CreditProduct>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Crée un nouveau produit de crédit
   */
  createCreditProduct(product: CreditProductCreate): Observable<{ message: string; id: string }> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    return this.http.post<{ message: string; id: string }>(this.apiUrl, product, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Met à jour un produit de crédit existant
   */
  updateCreditProduct(id: string, product: CreditProductUpdate): Observable<{ message: string }> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, product, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Supprime un produit de crédit
   */
  deleteCreditProduct(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les statistiques des produits de crédit
   */
  getCreditProductsStats(): Observable<CreditProductsStats> {
    return this.http.get<CreditProductsStats>(`${this.apiUrl}/stats`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupère la liste des banques
   */
  getBanks(): Observable<Bank[]> {
    return this.http.get<Bank[]>(this.banksUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Transforme les données du formulaire pour l'API
   */
  transformFormData(formData: any): CreditProductCreate {
    // Conversion des chaînes multilignes en tableaux
    const featuresArray = formData.features ? 
      formData.features.split('\n')
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0) : [];
    
    const advantagesArray = formData.advantages ? 
      formData.advantages.split('\n')
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0) : [];

    return {
      ...formData,
      features: featuresArray,
      advantages: advantagesArray,
      required_documents: formData.required_documents || {},
      eligibility_criteria: formData.eligibility_criteria || {},
      fees: formData.fees || {}
    };
  }

  /**
   * Transforme les données de l'API pour le formulaire
   */
  transformApiData(product: CreditProduct): any {
    return {
      ...product,
      features: Array.isArray(product.features) ? product.features.join('\n') : '',
      advantages: Array.isArray(product.advantages) ? product.advantages.join('\n') : ''
    };
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.status === 0) {
        errorMessage = 'Impossible de se connecter au serveur';
      } else if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Erreur ${error.status}: ${error.statusText}`;
      }
    }
    
    console.error('CreditProductService error:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Utilitaires de formatage
   */
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

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'immobilier': 'Crédit Immobilier',
      'consommation': 'Crédit Consommation',
      'auto': 'Crédit Auto',
      'professionnel': 'Crédit Professionnel',
      'equipement': 'Crédit Équipement',
      'travaux': 'Crédit Travaux'
    };
    return labels[type] || type;
  }
}