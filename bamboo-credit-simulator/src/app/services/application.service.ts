import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface CreditApplicationRequest {
  credit_product_id: string;
  
  // Informations personnelles - mappées aux champs DB
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  applicant_address?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  
  // Informations professionnelles
  profession?: string;
  employer?: string;
  work_address?: string;
  employment_type?: string;
  employment_duration_months?: number;
  monthly_income?: number;
  other_income?: number;
  
  // Informations sur le crédit - CHAMPS OBLIGATOIRES DB
  requested_amount: number;
  duration_months?: number;
  purpose?: string;
  
  // Données d'application en JSON
  application_data?: any;
  
  // Champs optionnels pour métadonnées
  client_ip?: string;
  user_agent?: string;
}

// NOUVELLE INTERFACE POUR ASSURANCE
export interface InsuranceApplicationRequest {
  insurance_product_id: string;
  quote_id?: string;
  
  // Informations personnelles
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  applicant_address?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  
  // Informations spécifiques
  profession?: string;
  employer?: string;
  coverage_amount?: number;
  
  // Bénéficiaires (pour assurance vie)
  beneficiaries?: string;
  
  // Informations véhicule (pour assurance auto)
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_value?: number;
  
  // Informations logement (pour assurance habitation)
  property_type?: string;
  property_value?: number;
  property_address?: string;
  
  // Informations santé
  medical_history?: string;
  current_treatments?: string;
  
  // Données d'application
  application_data?: any;
}

export interface ApplicationNotification {
  success: boolean;
  application_id: string;
  application_number: string;
  message: string;
  next_steps: string[];
  expected_processing_time: string;
  contact_info: {
    bank_name?: string;
    company_name?: string;
    phone: string;
    email: string;
    application_number: string;
  };
}

export interface ApplicationStatus {
  application_id: string;
  status: string;
  status_message: string;
  submitted_at: string;
  updated_at: string;
  processing_notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private baseUrl = `${environment.apiUrl}/applications`;

  constructor(private http: HttpClient) {}

  // APPLICATIONS DE CRÉDIT
  
  submitCreditApplication(application: CreditApplicationRequest): Observable<ApplicationNotification> {
    const processedApplication = {
      ...application,
      requested_amount: Number(application.requested_amount),
      duration_months: Number(application.duration_months || 60),
      monthly_income: Number(application.monthly_income || 0),
      other_income: Number(application.other_income || 0),
      employment_duration_months: Number(application.employment_duration_months || 0),
      client_ip: application.client_ip || '',
      user_agent: application.user_agent || navigator.userAgent || ''
    };

    console.log('Sending credit application:', processedApplication);
    
    return this.http.post<ApplicationNotification>(`${this.baseUrl}/credit`, processedApplication);
  }

  // APPLICATIONS D'ASSURANCE
  
  submitInsuranceApplication(application: InsuranceApplicationRequest): Observable<ApplicationNotification> {
    const processedApplication = {
      ...application,
      // Conversion des valeurs numériques
      coverage_amount: application.coverage_amount ? Number(application.coverage_amount) : undefined,
      vehicle_year: application.vehicle_year ? Number(application.vehicle_year) : undefined,
      vehicle_value: application.vehicle_value ? Number(application.vehicle_value) : undefined,
      property_value: application.property_value ? Number(application.property_value) : undefined,
      
      // Formatage du téléphone
      applicant_phone: application.applicant_phone ? this.formatPhoneNumber(application.applicant_phone) : undefined,
      
      // Ajout des métadonnées client
      application_data: {
        ...application.application_data,
        client_metadata: {
          ip: this.getClientIP(),
          user_agent: navigator.userAgent || '',
          submitted_via: 'web_portal',
          submission_timestamp: new Date().toISOString()
        }
      }
    };

    console.log('Sending insurance application:', processedApplication);
    
    return this.http.post<ApplicationNotification>(`${this.baseUrl}/insurance`, processedApplication);
  }
  
  getCreditApplication(applicationId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/credit/${applicationId}`);
  }

  getInsuranceApplication(applicationId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/insurance/${applicationId}`);
  }
  
  getCreditApplications(params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/credit`, { params });
  }

  getInsuranceApplications(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    insurance_type?: string;
  }): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/insurance`, { params });
  }

  // VÉRIFICATION DE STATUT
  
  checkCreditApplicationStatus(applicationId: string): Observable<ApplicationStatus> {
    return this.http.get<ApplicationStatus>(`${this.baseUrl}/status/credit/${applicationId}`);
  }

  checkInsuranceApplicationStatus(applicationId: string): Observable<ApplicationStatus> {
    return this.http.get<ApplicationStatus>(`${this.baseUrl}/status/insurance/${applicationId}`);
  }

  // MÉTHODES UTILITAIRES
  
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    phone = phone.replace(/[\s-]/g, '');
    
    if (phone.startsWith('+241')) {
      return phone;
    }
    
    if (phone.startsWith('241')) {
      return `+${phone}`;
    }
    
    if (phone.startsWith('0')) {
      return `+241${phone.substring(1)}`;
    }
    
    if (phone.length === 8 && /^\d{8}$/.test(phone)) {
      return `+241${phone}`;
    }
    
    return phone;
  }

  validateCreditApplicationData(data: CreditApplicationRequest): string[] {
    const errors: string[] = [];
    
    if (!data.applicant_name?.trim()) {
      errors.push('Le nom complet est requis');
    }
    
    if (data.applicant_email && !this.isValidEmail(data.applicant_email)) {
      errors.push('L\'email n\'est pas valide');
    }
    
    if (data.applicant_phone && !this.isValidGabonPhone(data.applicant_phone)) {
      errors.push('Le numéro de téléphone gabonais n\'est pas valide');
    }
    
    if (!data.requested_amount || data.requested_amount <= 0) {
      errors.push('Le montant demandé doit être supérieur à 0');
    }
    
    if (!data.credit_product_id?.trim()) {
      errors.push('ID du produit de crédit requis');
    }
    
    if (data.monthly_income && data.monthly_income < 150000) {
      errors.push('Le revenu mensuel doit être d\'au moins 150 000 FCFA');
    }
    
    return errors;
  }

  validateInsuranceApplicationData(data: InsuranceApplicationRequest): string[] {
    const errors: string[] = [];
    
    if (!data.applicant_name?.trim()) {
      errors.push('Le nom complet est requis');
    }
    
    if (!data.insurance_product_id?.trim()) {
      errors.push('ID du produit d\'assurance requis');
    }
    
    if (data.applicant_email && !this.isValidEmail(data.applicant_email)) {
      errors.push('L\'email n\'est pas valide');
    }
    
    if (data.applicant_phone && !this.isValidGabonPhone(data.applicant_phone)) {
      errors.push('Le numéro de téléphone gabonais n\'est pas valide');
    }
    
    if (!data.birth_date) {
      errors.push('La date de naissance est requise');
    }
    
    if (!data.profession?.trim()) {
      errors.push('La profession est requise');
    }
    
    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidGabonPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const gabonPhoneRegex = /^(\+241|241)?[0-9]{8}$/;
    return gabonPhoneRegex.test(cleanPhone);
  }

  private getClientIP(): string {
    // Dans un environnement réel, vous obtiendrez l'IP côté serveur
    // Ici on retourne une valeur par défaut
    return '127.0.0.1';
  }

  debugApplicationData(data: CreditApplicationRequest | InsuranceApplicationRequest): void {
    console.group('🔍 Debug Application Data');
    console.log('Données complètes:', data);
    
    if ('credit_product_id' in data) {
      const errors = this.validateCreditApplicationData(data);
      if (errors.length > 0) {
        console.error('❌ Erreurs de validation crédit:', errors);
      } else {
        console.log('✅ Validation crédit réussie');
      }
    } else if ('insurance_product_id' in data) {
      const errors = this.validateInsuranceApplicationData(data);
      if (errors.length > 0) {
        console.error('❌ Erreurs de validation assurance:', errors);
      } else {
        console.log('✅ Validation assurance réussie');
      }
    }
    
    console.groupEnd();
  }
}