import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface SavingsApplicationRequest {
  savings_product_id: string;
  simulation_id?: string;
  
  // Informations personnelles
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
  monthly_income?: number;
  
  // Informations épargne
  initial_deposit: number;
  monthly_contribution?: number;
  savings_goal?: string;
  target_amount?: number;
  target_date?: string;
  
  application_data?: any;
  client_ip?: string;
  user_agent?: string;
}

export interface SavingsApplicationNotification {
  success: boolean;
  application_id: string;
  application_number: string;
  message: string;
  next_steps: string[];
  expected_processing_time: string;
  contact_info: {
    bank_name: string;
    phone: string;
    email: string;
    application_number: string;
  };
}

export interface SavingsApplicationStatus {
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
export class SavingsApplicationService {
  private baseUrl = `${environment.apiUrl}/applications`;

  constructor(private http: HttpClient) {}

  // APPLICATIONS D'ÉPARGNE
  
 submitSavingsApplication(application: SavingsApplicationRequest): Observable<SavingsApplicationNotification> {
  const processedApplication = {
    ...application,
    initial_deposit: Number(application.initial_deposit),
    monthly_contribution: Number(application.monthly_contribution || 0),
    monthly_income: Number(application.monthly_income || 0),
    target_amount: Number(application.target_amount || 0),
    client_ip: this.getClientIP(),
    user_agent: navigator.userAgent || '',
    // Ajouter les métadonnées de soumission
    submission_metadata: {
      submitted_via: 'web_portal',
      browser_info: this.getBrowserInfo(),
      timestamp: new Date().toISOString()
    }
  };

  console.log('Envoi demande épargne:', processedApplication);
  
  return this.http.post<SavingsApplicationNotification>(`${this.baseUrl}/savings`, processedApplication)
    .pipe(
      tap(response => {
        console.log('✅ Réponse API reçue:', response);
        // Vérifier que la réponse a la structure attendue
        if (!response.success) {
          console.warn('⚠️ Réponse API sans success=true:', response);
        }
      }),
      retry(1), // Retry une fois en cas d'erreur réseau
      catchError((error) => {
        console.error('❌ Erreur dans submitSavingsApplication:', error);
        
        // Si c'est une erreur HTTP 200 mais avec une réponse malformée
        if (error.status === 200 && error.error) {
          console.log('Tentative de parsing de la réponse d\'erreur:', error.error);
          // Parfois l'erreur contient en fait la bonne réponse
          if (error.error.success) {
            console.log('🔄 Correction: retour de la réponse depuis l\'erreur');
            return of(error.error);
          }
        }
        
        // Gérer les vraies erreurs
        return this.handleError(error);
      })
    );
}
  getSavingsApplication(applicationId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/savings/${applicationId}`)
      .pipe(catchError(this.handleError));
  }
  
  getSavingsApplications(params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/savings`, { params })
      .pipe(catchError(this.handleError));
  }

  // VÉRIFICATION DE STATUT
  
  checkSavingsApplicationStatus(applicationId: string): Observable<SavingsApplicationStatus> {
    return this.http.get<SavingsApplicationStatus>(`${this.baseUrl}/status/savings/${applicationId}`)
      .pipe(catchError(this.handleError));
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

  validateSavingsApplicationData(data: SavingsApplicationRequest): string[] {
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
    
    if (!data.savings_product_id?.trim()) {
      errors.push('ID du produit d\'épargne requis');
    }
    
    if (!data.initial_deposit || data.initial_deposit <= 0) {
      errors.push('Le dépôt initial doit être supérieur à 0');
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
    
    if (!data.employer?.trim()) {
      errors.push('L\'employeur est requis');
    }
    
    if (!data.monthly_income || data.monthly_income < 150000) {
      errors.push('Le revenu mensuel doit être d\'au moins 150 000 FCFA');
    }
    
    if (!data.savings_goal?.trim()) {
      errors.push('L\'objectif d\'épargne est requis');
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
    // Note: L'IP réelle sera récupérée côté serveur
    return '127.0.0.1';
  }

  private getBrowserInfo(): any {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timestamp: new Date().toISOString()
    };
  }

  private handleError(error: any): Observable<never> {
  console.error('🔴 HandleError appelé avec:', error);
  
  let errorMessage = 'Une erreur est survenue';
  
  if (error.error instanceof ErrorEvent) {
    // Erreur côté client
    errorMessage = `Erreur: ${error.error.message}`;
  } else {
    // Erreur côté serveur
    console.log('Status:', error.status);
    console.log('Error body:', error.error);
    
    // Cas particulier : parfois une réponse de succès est mal interprétée comme une erreur
    if (error.status === 200 && error.error && error.error.success) {
      console.log('⚠️ Réponse de succès détectée dans handleError - ne pas traiter comme une erreur');
      // Ne pas traiter ceci comme une erreur
      return throwError(() => error);
    }
    
    switch (error.status) {
      case 400:
        errorMessage = error.error?.message || 'Données invalides';
        break;
      case 401:
        errorMessage = 'Non autorisé';
        break;
      case 403:
        errorMessage = 'Accès refusé';
        break;
      case 404:
        errorMessage = 'Service non trouvé';
        break;
      case 500:
        errorMessage = 'Erreur serveur interne';
        break;
      case 0:
        errorMessage = 'Impossible de contacter le serveur';
        break;
      default:
        errorMessage = error.error?.message || `Erreur ${error.status}`;
    }
  }
  
  console.error('Message d\'erreur final:', errorMessage);
  return throwError(() => new Error(errorMessage));
}
  debugSavingsApplicationData(data: SavingsApplicationRequest): void {
    console.group('🔍 Debug Savings Application Data');
    console.log('Données complètes:', data);
    
    const errors = this.validateSavingsApplicationData(data);
    if (errors.length > 0) {
      console.error('❌ Erreurs de validation:', errors);
    } else {
      console.log('✅ Validation réussie');
    }
    
    console.log('Champs obligatoires épargne:');
    console.log('  - savings_product_id:', data.savings_product_id);
    console.log('  - applicant_name:', data.applicant_name);
    console.log('  - applicant_email:', data.applicant_email);
    console.log('  - initial_deposit:', data.initial_deposit);
    console.log('  - profession:', data.profession);
    console.log('  - employer:', data.employer);
    console.log('  - monthly_income:', data.monthly_income);
    console.log('  - savings_goal:', data.savings_goal);
    
    console.groupEnd();
  }

  // MÉTHODES SPÉCIFIQUES À L'ÉPARGNE

  calculateMinimumDeposit(productData: any): number {
    return productData?.minimum_deposit || 50000;
  }

  calculateMaximumDeposit(productData: any): number {
    return productData?.maximum_deposit || 100000000;
  }

  validateDepositAmount(amount: number, productData: any): boolean {
    const min = this.calculateMinimumDeposit(productData);
    const max = this.calculateMaximumDeposit(productData);
    return amount >= min && amount <= max;
  }

  getSavingsGoalOptions(): { value: string; label: string }[] {
    return [
      { value: 'Achat immobilier', label: 'Achat immobilier' },
      { value: 'Véhicule', label: 'Achat véhicule' },
      { value: 'Éducation enfants', label: 'Éducation des enfants' },
      { value: 'Retraite', label: 'Préparation retraite' },
      { value: 'Projet personnel', label: 'Projet personnel' },
      { value: 'Fonds d\'urgence', label: 'Constitution fonds d\'urgence' },
      { value: 'Voyage', label: 'Voyage' },
      { value: 'Autre', label: 'Autre' }
    ];
  }

  calculateProjectedSavings(
    initialDeposit: number,
    monthlyContribution: number,
    interestRate: number,
    durationMonths: number
  ): {
    finalAmount: number;
    totalContributions: number;
    totalInterest: number;
  } {
    const monthlyRate = interestRate / 100 / 12;
    let currentAmount = initialDeposit;
    let totalContributions = initialDeposit;

    for (let month = 1; month <= durationMonths; month++) {
      // Intérêts sur le montant actuel
      currentAmount *= (1 + monthlyRate);
      
      // Ajout de la contribution mensuelle
      currentAmount += monthlyContribution;
      totalContributions += monthlyContribution;
    }

    const finalAmount = Math.round(currentAmount);
    const totalInterest = finalAmount - totalContributions;

    return {
      finalAmount,
      totalContributions,
      totalInterest
    };
  }

  getRecommendedTargetDate(savingsGoal: string): Date {
    const today = new Date();
    const recommendations: { [key: string]: number } = {
      'Achat immobilier': 60, // 5 ans
      'Véhicule': 36, // 3 ans
      'Éducation enfants': 180, // 15 ans
      'Retraite': 300, // 25 ans
      'Projet personnel': 24, // 2 ans
      'Fonds d\'urgence': 12, // 1 an
      'Voyage': 18, // 1.5 ans
      'Autre': 36 // 3 ans par défaut
    };

    const monthsToAdd = recommendations[savingsGoal] || 36;
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() + monthsToAdd);
    
    return targetDate;
  }

  formatSavingsGoal(goal: string): string {
    const formattedGoals: { [key: string]: string } = {
      'Achat immobilier': 'Acquisition d\'un bien immobilier',
      'Véhicule': 'Achat d\'un véhicule',
      'Éducation enfants': 'Financement des études des enfants',
      'Retraite': 'Préparation de la retraite',
      'Projet personnel': 'Réalisation d\'un projet personnel',
      'Fonds d\'urgence': 'Constitution d\'un fonds d\'urgence',
      'Voyage': 'Financement d\'un voyage',
      'Autre': 'Autre objectif d\'épargne'
    };

    return formattedGoals[goal] || goal;
  }
}