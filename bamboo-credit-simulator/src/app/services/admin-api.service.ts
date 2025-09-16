// admin/src/app/services/admin-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import {
  Bank,
  InsuranceCompany,
  CreditProduct,
  SavingsProduct,
  InsuranceProduct,
  PaginatedResponse,
  DashboardStats,
  AuditLog,
  CreditSimulation,
  SavingsSimulation,
  CreditApplication,
  BankFormData,
  InsuranceCompanyFormData,
  CreditProductFormData,
  CreateRequest,
  UpdateRequest
} from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = error.error.message;
    } else {
      // Erreur côté serveur
      if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
    }
    
    console.error('Erreur API:', error);
    return throwError(() => new Error(errorMessage));
  }

  // ==================== DASHBOARD - URLs CORRIGÉES ====================
  
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/admin/dashboard/stats`)
      .pipe(catchError(this.handleError));
  }

  getRecentActivity(limit = 50): Observable<AuditLog[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<AuditLog[]>(`${this.baseUrl}/admin/dashboard/recent-activity`, { params })
      .pipe(catchError(this.handleError));
  }

  getPerformanceMetrics(days = 30): Observable<any> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<any>(`${this.baseUrl}/admin/dashboard/performance-metrics`, { params })
      .pipe(catchError(this.handleError));
  }

  // ==================== BANQUES - URLs CORRIGÉES ====================
  
  getBanks(params?: any): Observable<PaginatedResponse<Bank>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<Bank>>(`${this.baseUrl}/api/admin/banks`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getBank(id: string): Observable<Bank> {
    return this.http.get<Bank>(`${this.baseUrl}/api/admin/banks/${id}`)
      .pipe(catchError(this.handleError));
  }

  createBank(bank: CreateRequest<Bank>): Observable<Bank> {
    return this.http.post<Bank>(`${this.baseUrl}/api/admin/banks`, bank)
      .pipe(catchError(this.handleError));
  }

  updateBank(id: string, bank: UpdateRequest<Bank>): Observable<Bank> {
    return this.http.put<Bank>(`${this.baseUrl}/api/admin/banks/${id}`, bank)
      .pipe(catchError(this.handleError));
  }

  deleteBank(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/api/admin/banks/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== COMPAGNIES D'ASSURANCE - URLs CORRIGÉES ====================
  
  getInsuranceCompanies(params?: any): Observable<PaginatedResponse<InsuranceCompany>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<InsuranceCompany>>(`${this.baseUrl}/api/admin/insurance-companies`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getInsuranceCompany(id: string): Observable<InsuranceCompany> {
    return this.http.get<InsuranceCompany>(`${this.baseUrl}/api/admin/insurance-companies/${id}`)
      .pipe(catchError(this.handleError));
  }

  createInsuranceCompany(company: CreateRequest<InsuranceCompany>): Observable<InsuranceCompany> {
    return this.http.post<InsuranceCompany>(`${this.baseUrl}/api/admin/insurance-companies`, company)
      .pipe(catchError(this.handleError));
  }

  updateInsuranceCompany(id: string, company: UpdateRequest<InsuranceCompany>): Observable<InsuranceCompany> {
    return this.http.put<InsuranceCompany>(`${this.baseUrl}/api/admin/insurance-companies/${id}`, company)
      .pipe(catchError(this.handleError));
  }

  deleteInsuranceCompany(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/api/admin/insurance-companies/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== PRODUITS DE CRÉDIT - URLs CORRIGÉES ====================
  
  getCreditProducts(params?: any): Observable<PaginatedResponse<CreditProduct>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<CreditProduct>>(`${this.baseUrl}/api/admin/credit-products`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getCreditProduct(id: string): Observable<CreditProduct> {
    return this.http.get<CreditProduct>(`${this.baseUrl}/api/admin/credit-products/${id}`)
      .pipe(catchError(this.handleError));
  }

  createCreditProduct(product: CreateRequest<CreditProduct>): Observable<CreditProduct> {
    return this.http.post<CreditProduct>(`${this.baseUrl}/api/admin/credit-products`, product)
      .pipe(catchError(this.handleError));
  }

  updateCreditProduct(id: string, product: UpdateRequest<CreditProduct>): Observable<CreditProduct> {
    return this.http.put<CreditProduct>(`${this.baseUrl}/api/admin/credit-products/${id}`, product)
      .pipe(catchError(this.handleError));
  }

  deleteCreditProduct(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/api/admin/credit-products/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== PRODUITS D'ÉPARGNE - URLs CORRIGÉES ====================
  
  getSavingsProducts(params?: any): Observable<PaginatedResponse<SavingsProduct>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<SavingsProduct>>(`${this.baseUrl}/api/admin/savings-products`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getSavingsProduct(id: string): Observable<SavingsProduct> {
    return this.http.get<SavingsProduct>(`${this.baseUrl}/api/admin/savings-products/${id}`)
      .pipe(catchError(this.handleError));
  }

  createSavingsProduct(product: CreateRequest<SavingsProduct>): Observable<SavingsProduct> {
    return this.http.post<SavingsProduct>(`${this.baseUrl}/api/admin/savings-products`, product)
      .pipe(catchError(this.handleError));
  }

  updateSavingsProduct(id: string, product: UpdateRequest<SavingsProduct>): Observable<SavingsProduct> {
    return this.http.put<SavingsProduct>(`${this.baseUrl}/api/admin/savings-products/${id}`, product)
      .pipe(catchError(this.handleError));
  }

  deleteSavingsProduct(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/api/admin/savings-products/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== PRODUITS D'ASSURANCE - URLs CORRIGÉES ====================
  
  getInsuranceProducts(params?: any): Observable<PaginatedResponse<InsuranceProduct>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<InsuranceProduct>>(`${this.baseUrl}/api/admin/insurance-products`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getInsuranceProduct(id: string): Observable<InsuranceProduct> {
    return this.http.get<InsuranceProduct>(`${this.baseUrl}/api/admin/insurance-products/${id}`)
      .pipe(catchError(this.handleError));
  }

  createInsuranceProduct(product: CreateRequest<InsuranceProduct>): Observable<InsuranceProduct> {
    return this.http.post<InsuranceProduct>(`${this.baseUrl}/api/admin/insurance-products`, product)
      .pipe(catchError(this.handleError));
  }

  updateInsuranceProduct(id: string, product: UpdateRequest<InsuranceProduct>): Observable<InsuranceProduct> {
    return this.http.put<InsuranceProduct>(`${this.baseUrl}/api/admin/insurance-products/${id}`, product)
      .pipe(catchError(this.handleError));
  }

  deleteInsuranceProduct(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/api/admin/insurance-products/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== SIMULATIONS - URLs CORRIGÉES ====================
  
  getCreditSimulations(params?: any): Observable<PaginatedResponse<CreditSimulation>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<CreditSimulation>>(`${this.baseUrl}/api/admin/simulations/credit`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getSavingsSimulations(params?: any): Observable<PaginatedResponse<SavingsSimulation>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<SavingsSimulation>>(`${this.baseUrl}/api/admin/simulations/savings`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  // ==================== APPLICATIONS - URLs CORRIGÉES ====================
  
  getCreditApplications(params?: any): Observable<PaginatedResponse<CreditApplication>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<CreditApplication>>(`${this.baseUrl}/admin/applications/credit`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getCreditApplication(id: string): Observable<CreditApplication> {
    return this.http.get<CreditApplication>(`${this.baseUrl}/admin/applications/credit/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateCreditApplication(id: string, update: any): Observable<CreditApplication> {
    return this.http.put<CreditApplication>(`${this.baseUrl}/admin/applications/credit/${id}`, update)
      .pipe(catchError(this.handleError));
  }

  getCreditApplicationsStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/applications/credit/stats/summary`)
      .pipe(catchError(this.handleError));
  }

  // Applications d'assurance
  getInsuranceApplications(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<any>(`${this.baseUrl}/admin/applications/insurance`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getInsuranceApplication(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/applications/insurance/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateInsuranceApplication(id: string, update: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/applications/insurance/${id}`, update)
      .pipe(catchError(this.handleError));
  }

  updateInsuranceApplicationStatus(applicationId: string, status: string, notes?: string): Observable<any> {
    const updateData: any = { status };
    if (notes) {
      updateData.processing_notes = notes;
    }
    return this.updateInsuranceApplication(applicationId, updateData);
  }

  setMedicalExamRequired(applicationId: string, required: boolean): Observable<any> {
    return this.updateInsuranceApplication(applicationId, { medical_exam_required: required });
  }

  getInsuranceApplicationsStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/admin/applications/insurance/stats/summary`)
      .pipe(
        catchError(error => {
          console.warn('Insurance stats not available');
          return new Observable(observer => {
            observer.next({ total: 0, pending: 0, approved: 0, rejected: 0 });
            observer.complete();
          });
        })
      );
  }

  // ==================== AUDIT - URLs CORRIGÉES ====================
  
  getAuditLogs(params?: any): Observable<PaginatedResponse<AuditLog>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<AuditLog>>(`${this.baseUrl}/api/admin/audit`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  // ==================== UTILITAIRES ====================
  
  uploadFile(file: File, type: string): Observable<{ file_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return this.http.post<{ file_url: string }>(`${this.baseUrl}/api/admin/upload`, formData)
      .pipe(catchError(this.handleError));
  }

  exportData(entity: string, format: 'csv' | 'xlsx' = 'xlsx'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    
    return this.http.get(`${this.baseUrl}/api/admin/export/${entity}`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }
}

export type { PaginatedResponse, CreditProduct, Bank };