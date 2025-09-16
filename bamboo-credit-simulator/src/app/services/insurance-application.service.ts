import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

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
  beneficiaries?: string;
  
  // Véhicule (auto)
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_value?: number;
  
  // Logement (habitation)
  property_type?: string;
  property_value?: number;
  property_address?: string;
  
  // Santé
  medical_history?: string;
  current_treatments?: string;
  
  application_data?: any;
}

export interface InsuranceApplicationNotification {
  success: boolean;
  application_id: string;
  application_number: string;
  message: string;
  next_steps: string[];
  expected_processing_time: string;
  contact_info: {
    company_name: string;
    phone: string;
    email: string;
    application_number: string;
  };
}

export interface InsuranceApplicationStatus {
  application_id: string;
  status: string;
  status_message: string;
  submitted_at: string;
  updated_at: string;
  processing_notes?: string;
}

export interface InsuranceApplication {
  id: string;
  quote_id?: string;
  insurance_product_id: string;
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  applicant_address?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  profession?: string;
  employer?: string;
  coverage_amount?: number;
  beneficiaries?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_value?: number;
  property_type?: string;
  property_value?: number;
  property_address?: string;
  medical_history?: string;
  current_treatments?: string;
  status: string;
  processing_notes?: string;
  assigned_to?: string;
  insurance_response?: string;
  medical_exam_required?: boolean;
  application_data?: any;
  submitted_at: string;
  updated_at?: string;
  
  // Relations
  insurance_product?: {
    id: string;
    name: string;
    type: string;
    description: string;
    insurance_company?: {
      id: string;
      name: string;
      full_name: string;
      contact_phone?: string;
      contact_email?: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class InsuranceApplicationService {
  private baseUrl = `${environment.apiUrl}/applications`;

  constructor(private http: HttpClient) {}

  // APPLICATIONS D'ASSURANCE
  
  submitInsuranceApplication(application: InsuranceApplicationRequest): Observable<InsuranceApplicationNotification> {
    // Nettoyer et valider les données avant envoi
    const processedApplication = {
      ...application,
      coverage_amount: Number(application.coverage_amount || 0),
      vehicle_year: Number(application.vehicle_year || 0),
      vehicle_value: Number(application.vehicle_value || 0),
      property_value: Number(application.property_value || 0),
      // Ajouter les métadonnées client
      application_data: {
        ...application.application_data,
        submitted_from: 'web_client',
        browser_info: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Envoi demande assurance:', processedApplication);
    
    return this.http.post<InsuranceApplicationNotification>(`${this.baseUrl}/insurance`, processedApplication);
  }
  
  getInsuranceApplication(applicationId: string): Observable<InsuranceApplication> {
    return this.http.get<InsuranceApplication>(`${this.baseUrl}/insurance/${applicationId}`);
  }
  
  getInsuranceApplications(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    insurance_type?: string;
  }): Observable<{items: InsuranceApplication[], total: number, skip: number, limit: number}> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<{items: InsuranceApplication[], total: number, skip: number, limit: number}>(
      `${this.baseUrl}/insurance`, 
      { params: httpParams }
    );
  }

  updateInsuranceApplication(applicationId: string, updateData: Partial<InsuranceApplication>): Observable<InsuranceApplication> {
    return this.http.put<InsuranceApplication>(`${this.baseUrl}/insurance/${applicationId}`, updateData);
  }

  // VÉRIFICATION DE STATUT
  
  checkInsuranceApplicationStatus(applicationId: string): Observable<InsuranceApplicationStatus> {
    return this.http.get<InsuranceApplicationStatus>(`${this.baseUrl}/status/insurance/${applicationId}`);
  }

  // MÉTHODES UTILITAIRES
  
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Nettoyer le numéro
    phone = phone.replace(/[\s-]/g, '');
    
    // Formatter pour le Gabon
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

  validateInsuranceApplicationData(data: InsuranceApplicationRequest): string[] {
    const errors: string[] = [];
    
    // Validations obligatoires
    if (!data.applicant_name?.trim()) {
      errors.push('Le nom complet est requis');
    }
    
    if (data.applicant_email && !this.isValidEmail(data.applicant_email)) {
      errors.push('L\'email n\'est pas valide');
    }
    
    if (data.applicant_phone && !this.isValidGabonPhone(data.applicant_phone)) {
      errors.push('Le numéro de téléphone gabonais n\'est pas valide');
    }
    
    if (!data.insurance_product_id?.trim()) {
      errors.push('ID du produit d\'assurance requis');
    }
    
    if (!data.applicant_address?.trim()) {
      errors.push('L\'adresse est requise');
    }
    
    if (!data.birth_date) {
      errors.push('La date de naissance est requise');
    }
    
    if (!data.profession?.trim()) {
      errors.push('La profession est requise');
    }

    // Validations spécifiques par type d'assurance
    if (data.vehicle_make && !data.vehicle_model) {
      errors.push('Le modèle du véhicule est requis');
    }

    if (data.property_type && !data.property_value) {
      errors.push('La valeur du bien est requise');
    }

    if (data.coverage_amount && data.coverage_amount < 1000000) {
      errors.push('Le montant de couverture minimum est de 1 000 000 FCFA');
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

  // Utilitaires pour le formatage
  formatCurrency(amount: number): string {
    if (!amount) return '0 FCFA';
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
  }

  getInsuranceTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'auto': 'Automobile',
      'habitation': 'Habitation',
      'vie': 'Vie',
      'sante': 'Santé',
      'voyage': 'Voyage',
      'responsabilite': 'Responsabilité Civile'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'under_review': 'En cours d\'examen',
      'approved': 'Approuvé',
      'rejected': 'Refusé',
      'completed': 'Finalisé'
    };
    return labels[status] || status;
  }

  debugInsuranceApplicationData(data: InsuranceApplicationRequest): void {
    console.group('🔍 Debug Insurance Application Data');
    console.log('Données complètes:', data);
    
    const errors = this.validateInsuranceApplicationData(data);
    if (errors.length > 0) {
      console.error('❌ Erreurs de validation:', errors);
    } else {
      console.log('✅ Validation réussie');
    }
    
    console.log('Champs obligatoires assurance:');
    console.log('  - insurance_product_id:', data.insurance_product_id);
    console.log('  - applicant_name:', data.applicant_name);
    console.log('  - applicant_email:', data.applicant_email);
    console.log('  - applicant_address:', data.applicant_address);
    console.log('  - birth_date:', data.birth_date);
    console.log('  - profession:', data.profession);
    
    console.groupEnd();
  }

  // Méthodes pour l'admin
  assignInsuranceApplication(applicationId: string, assignedTo: string): Observable<InsuranceApplication> {
    return this.updateInsuranceApplication(applicationId, { assigned_to: assignedTo });
  }

  updateApplicationStatus(applicationId: string, status: string, notes?: string): Observable<InsuranceApplication> {
    const updateData: any = { status };
    if (notes) {
      updateData.processing_notes = notes;
    }
    return this.updateInsuranceApplication(applicationId, updateData);
  }

  addProcessingNotes(applicationId: string, notes: string): Observable<InsuranceApplication> {
    return this.updateInsuranceApplication(applicationId, { processing_notes: notes });
  }

  setMedicalExamRequired(applicationId: string, required: boolean): Observable<InsuranceApplication> {
    return this.updateInsuranceApplication(applicationId, { medical_exam_required: required });
  }
}