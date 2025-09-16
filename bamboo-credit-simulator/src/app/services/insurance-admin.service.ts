// services/insurance-admin.service.ts - Version corrigée pour l'endpoint FastAPI
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface InsuranceCompany {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  license_number?: string;
  established_year?: number;
  solvency_ratio?: number;
  rating?: string;
  specialties?: string[];
  coverage_areas?: string[];
  is_active: boolean;
  products_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface InsuranceCompanyCreate {
  name: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  license_number?: string;
  established_year?: number;
  solvency_ratio?: number;
  rating?: string;
  specialties?: string[];
  coverage_areas?: string[];
}

export interface Guarantee {
  name: string;
  amount: number;
  description?: string;
}

export interface InsuranceProductAdmin {
  id: string;
  name: string;
  type: string;
  description?: string;
  insurance_company_id: string;
  base_premium: number;
  coverage_details: any;
  deductible_options?: any;
  deductibles?: any;
  age_limits: any;
  exclusions: string[];
  features: string[];
  advantages?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  quotes_count?: number;
  last_quote_date?: Date;
  insurance_company?: InsuranceCompany;
}

export interface InsuranceProductCreate {
  name: string;
  type: string;
  description?: string;
  insurance_company_id: string;
  base_premium: number;
  coverage_details?: any;
  deductibles?: any;
  age_limits?: any;
  exclusions?: string[];
  features?: string[];
  guarantees?: Guarantee[];
  max_coverage?: number;
  duration_years?: number;
  age_min?: number;
  age_max?: number;
  requires_medical_exam?: boolean;
  accepts_preexisting_conditions?: boolean;
  is_renewable?: boolean;
  has_waiting_period?: boolean;
  waiting_period_days?: number;
  status?: string;
  is_active?: boolean;
}

export interface AdminStats {
  companies: {
    total: number;
    active: number;
    inactive: number;
  };
  products: {
    total: number;
    active: number;
    inactive: number;
  };
  quotes: {
    total: number;
  };
  products_by_type: Array<{
    type: string;
    count: number;
  }>;
  average_premium: number;
}

export interface InsuranceProductListResponse {
  products: InsuranceProductAdmin[];
  total: number;
  skip: number;
  limit: number;
}

export interface InsuranceCompanyListResponse {
  companies: InsuranceCompany[];
  total: number;
  skip: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class InsuranceAdminService {
  private apiUrl = `${environment.apiUrl}/admin/insurance`;

  constructor(private http: HttpClient) {}

  private handleError = (operation: string) => (error: any): Observable<never> => {
    console.error(`${operation} failed:`, error);
    throw error;
  };

  // ==================== COMPAGNIES D'ASSURANCE ====================

  getInsuranceCompanies(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }): Observable<InsuranceCompanyListResponse> {
    let httpParams = new HttpParams();
    if (params?.skip !== undefined) httpParams = httpParams.set('skip', params.skip.toString());
    if (params?.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', params.is_active.toString());

    return this.http.get<InsuranceCompanyListResponse>(`${this.apiUrl}/companies`, { params: httpParams })
      .pipe(
        map((response: InsuranceCompanyListResponse) => ({
          ...response,
          companies: response.companies.map((company: any) => ({
            ...company,
            created_at: new Date(company.created_at),
            updated_at: new Date(company.updated_at)
          }))
        })),
        catchError(this.handleError('Get Insurance Companies'))
      );
  }

  getInsuranceCompany(id: string): Observable<InsuranceCompany> {
    return this.http.get<any>(`${this.apiUrl}/companies/${id}`)
      .pipe(
        map((company: any) => ({
          ...company,
          created_at: new Date(company.created_at),
          updated_at: new Date(company.updated_at)
        })),
        catchError(this.handleError('Get Insurance Company'))
      );
  }

  createInsuranceCompany(company: InsuranceCompanyCreate): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/companies`, company)
      .pipe(catchError(this.handleError('Create Insurance Company')));
  }

  updateInsuranceCompany(id: string, company: Partial<InsuranceCompanyCreate>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/companies/${id}`, company)
      .pipe(catchError(this.handleError('Update Insurance Company')));
  }

  deleteInsuranceCompany(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/companies/${id}`)
      .pipe(catchError(this.handleError('Delete Insurance Company')));
  }

  // ==================== PRODUITS D'ASSURANCE ====================

  getInsuranceProducts(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    type?: string;
    company_id?: string;
    min_premium?: number;
    max_premium?: number;
  }): Observable<InsuranceProductListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.skip !== undefined) httpParams = httpParams.set('skip', params.skip.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.is_active !== undefined) httpParams = httpParams.set('is_active', params.is_active.toString());
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.company_id) httpParams = httpParams.set('company_id', params.company_id);
      if (params.min_premium !== undefined) httpParams = httpParams.set('min_premium', params.min_premium.toString());
      if (params.max_premium !== undefined) httpParams = httpParams.set('max_premium', params.max_premium.toString());
    }

    const url = `${this.apiUrl}/products`;
    console.log('Calling products URL:', url, 'Params:', params);

    return this.http.get<InsuranceProductListResponse>(url, { params: httpParams })
      .pipe(
        map((response: InsuranceProductListResponse) => {
          console.log('Réponse API brute (produits):', response);

          return {
            ...response,
            products: response.products.map((product: any) => {
              const mappedProduct: InsuranceProductAdmin = {
                ...product,
                created_at: new Date(product.created_at),
                updated_at: new Date(product.updated_at),
                last_quote_date: product.last_quote_date ? new Date(product.last_quote_date) : undefined,
                base_premium: product.base_premium ?? 0,
                type: product.type ?? 'inconnu',
                quotes_count: product.quotes_count ?? 0,
                insurance_company: product.insurance_company ?? undefined
              };

              console.log(`Produit mappé ${product.name}:`, {
                base_premium: mappedProduct.base_premium,
                type: mappedProduct.type,
                quotes_count: mappedProduct.quotes_count
              });

              return mappedProduct;
            })
          };
        }),
        catchError(this.handleError('Get Insurance Products'))
      );
  }

  getInsuranceProduct(id: string): Observable<InsuranceProductAdmin> {
    return this.http.get<any>(`${this.apiUrl}/products/${id}`)
      .pipe(
        map((product: any) => ({
          ...product,
          created_at: new Date(product.created_at),
          updated_at: new Date(product.updated_at),
          last_quote_date: product.last_quote_date ? new Date(product.last_quote_date) : undefined
        })),
        catchError(this.handleError('Get Insurance Product'))
      );
  }

  createInsuranceProduct(product: InsuranceProductCreate): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/products`, product)
      .pipe(catchError(this.handleError('Create Insurance Product')));
  }

  updateInsuranceProduct(id: string, product: Partial<InsuranceProductCreate>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/products/${id}`, product)
      .pipe(catchError(this.handleError('Update Insurance Product')));
  }

  deleteInsuranceProduct(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/products/${id}`)
      .pipe(catchError(this.handleError('Delete Insurance Product')));
  }

  duplicateInsuranceProduct(id: string): Observable<any> {
    return this.getInsuranceProduct(id).pipe(
      catchError(this.handleError('Duplicate Insurance Product'))
    );
  }

  // ==================== STATISTIQUES ====================

  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`)
      .pipe(
        map((stats: any) => {
          console.log('Stats globales reçues:', stats);
          return stats;
        }),
        catchError(this.handleError('Get Admin Stats'))
      );
  }

  // ==================== UTILITAIRES ====================

  getInsuranceTypes(): { code: string; name: string; icon: string }[] {
    return [
      { code: 'vie', name: 'Assurance Vie', icon: '👨‍👩‍👧‍👦' },
      { code: 'sante', name: 'Assurance Santé', icon: '🏥' },
      { code: 'auto', name: 'Assurance Auto', icon: '🚗' },
      { code: 'habitation', name: 'Assurance Habitation', icon: '🏠' },
      { code: 'voyage', name: 'Assurance Voyage', icon: '✈️' },
      { code: 'responsabilite', name: 'Responsabilité Civile', icon: '🏢' }
    ];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getTypeLabel(type: string): string {
    const types = this.getInsuranceTypes();
    const found = types.find(t => t.code === type);
    return found ? found.name : type;
  }

  getStatusLabel(status: string): string {
    const labels = {
      'active': 'Actif',
      'inactive': 'Inactif',
      'draft': 'Brouillon'
    };
    return labels[status as keyof typeof labels] || status;
  }
}