// insurance.service.ts - Corrections
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InsuranceService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // Compagnies d'assurance
  getInsuranceCompanies(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get(`${this.apiUrl}/insurance-companies`, { params });
  }

  getInsuranceCompany(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/insurance-companies/${id}`);
  }

  createInsuranceCompany(companyData: any): Observable<any> {
    // S'assurer que les données sont correctement formatées
    const formattedData = {
      ...companyData,
      // Convertir les specialties en array si c'est une string
      specialties: Array.isArray(companyData.specialties) 
        ? companyData.specialties 
        : (companyData.specialties || []),
      coverage_areas: Array.isArray(companyData.coverage_areas)
        ? companyData.coverage_areas
        : (companyData.coverage_areas || [])
    };
    
    return this.http.post(`${this.apiUrl}/insurance-companies`, formattedData);
  }

  updateInsuranceCompany(id: string, companyData: any): Observable<any> {
    const formattedData = {
      ...companyData,
      specialties: Array.isArray(companyData.specialties) 
        ? companyData.specialties 
        : (companyData.specialties || []),
      coverage_areas: Array.isArray(companyData.coverage_areas)
        ? companyData.coverage_areas
        : (companyData.coverage_areas || [])
    };
    
    return this.http.put(`${this.apiUrl}/insurance-companies/${id}`, formattedData);
  }

  deleteInsuranceCompany(id: string, force: boolean = false): Observable<any> {
    const params = force ? new HttpParams().set('force', 'true') : undefined;
    return this.http.delete(`${this.apiUrl}/insurance-companies/${id}`, { params });
  }

  // Produits d'assurance
  getInsuranceProducts(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get(`${this.apiUrl}/insurance-products`, { params });
  }

  getInsuranceProduct(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/insurance-products/${id}`);
  }

  createInsuranceProduct(productData: any): Observable<any> {
    const formattedData = {
      ...productData,
      features: Array.isArray(productData.features) 
        ? productData.features 
        : (productData.features || []),
      advantages: Array.isArray(productData.advantages)
        ? productData.advantages
        : (productData.advantages || []),
      exclusions: Array.isArray(productData.exclusions)
        ? productData.exclusions
        : (productData.exclusions || [])
    };
    
    return this.http.post(`${this.apiUrl}/insurance-products`, formattedData);
  }

  updateInsuranceProduct(id: string, productData: any): Observable<any> {
    const formattedData = {
      ...productData,
      features: Array.isArray(productData.features) 
        ? productData.features 
        : (productData.features || []),
      advantages: Array.isArray(productData.advantages)
        ? productData.advantages
        : (productData.advantages || []),
      exclusions: Array.isArray(productData.exclusions)
        ? productData.exclusions
        : (productData.exclusions || [])
    };
    
    return this.http.put(`${this.apiUrl}/insurance-products/${id}`, formattedData);
  }

  deleteInsuranceProduct(id: string, force: boolean = false): Observable<any> {
    const params = force ? new HttpParams().set('force', 'true') : undefined;
    return this.http.delete(`${this.apiUrl}/insurance-products/${id}`, { params });
  }
}