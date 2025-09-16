import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

interface SavingsApplicationRequest {
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
  
  // Documents et données
  application_data?: any;
}

interface SavingsApplicationNotification {
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

@Component({
  selector: 'app-savings-application-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" [class.show]="isVisible" (click)="onOverlayClick($event)">
      <div class="modal-container" [class.show]="isVisible">
        <div class="modal-header">
          <h2>{{ getModalTitle() }}</h2>
          <button class="close-button" (click)="close()" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- Étape 1: Formulaire de demande -->
          <div *ngIf="currentStep === 1" class="application-form">
            <div class="form-intro">
              <div class="simulation-summary">
                <h3>Récapitulatif de votre simulation</h3>
                <div class="summary-grid">
                  <div class="summary-item">
                    <span class="label">Produit:</span>
                    <span class="value">{{ simulationData?.productName || productData?.name }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Banque:</span>
                    <span class="value">{{ getBankName() }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Montant initial:</span>
                    <span class="value">{{ formatCurrency(simulationData?.initialAmount || 0) }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Durée:</span>
                    <span class="value">{{ simulationData?.timeHorizon || 0 }} an(s)</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Taux d'intérêt:</span>
                    <span class="value">{{ formatPercent(productData?.interest_rate || 0) }}</span>
                  </div>
                  <div class="summary-item highlight">
                    <span class="label">Capital final estimé:</span>
                    <span class="value">{{ formatCurrency(simulationData?.finalAmount || 0) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <form [formGroup]="applicationForm" (ngSubmit)="onSubmit()">
              <!-- Section Informations Personnelles -->
              <div class="form-section">
                <h4><i class="fas fa-user"></i> Informations personnelles</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="applicant_name">Nom complet *</label>
                    <input
                      type="text"
                      id="applicant_name"
                      formControlName="applicant_name"
                      class="form-input"
                      [class.error]="hasError('applicant_name')"
                      placeholder="Jean Dupont"
                    />
                    <div class="error-message" *ngIf="hasError('applicant_name')">
                      {{ getErrorMessage('applicant_name') }}
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="applicant_email">Email *</label>
                    <input
                      type="email"
                      id="applicant_email"
                      formControlName="applicant_email"
                      class="form-input"
                      [class.error]="hasError('applicant_email')"
                      placeholder="jean.dupont@email.com"
                    />
                    <div class="error-message" *ngIf="hasError('applicant_email')">
                      {{ getErrorMessage('applicant_email') }}
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="applicant_phone">Téléphone *</label>
                    <input
                      type="tel"
                      id="applicant_phone"
                      formControlName="applicant_phone"
                      class="form-input"
                      [class.error]="hasError('applicant_phone')"
                      placeholder="+241 01 23 45 67"
                    />
                    <div class="error-message" *ngIf="hasError('applicant_phone')">
                      {{ getErrorMessage('applicant_phone') }}
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label for="applicant_address">Adresse complète *</label>
                    <textarea
                      id="applicant_address"
                      formControlName="applicant_address"
                      class="form-textarea"
                      rows="2"
                      placeholder="Quartier, Ville"
                    ></textarea>
                  </div>

                  <div class="form-group">
                    <label for="birth_date">Date de naissance *</label>
                    <input
                      type="date"
                      id="birth_date"
                      formControlName="birth_date"
                      class="form-input"
                      [class.error]="hasError('birth_date')"
                    />
                    <div class="error-message" *ngIf="hasError('birth_date')">
                      {{ getErrorMessage('birth_date') }}
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="marital_status">Situation familiale</label>
                    <select id="marital_status" formControlName="marital_status" class="form-select">
                      <option value="">Sélectionner</option>
                      <option value="Célibataire">Célibataire</option>
                      <option value="Marié(e)">Marié(e)</option>
                      <option value="Divorcé(e)">Divorcé(e)</option>
                      <option value="Veuf(ve)">Veuf(ve)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section Informations professionnelles -->
              <div class="form-section">
                <h4><i class="fas fa-briefcase"></i> Informations professionnelles</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="profession">Profession *</label>
                    <input
                      type="text"
                      id="profession"
                      formControlName="profession"
                      class="form-input"
                      [class.error]="hasError('profession')"
                      placeholder="Ingénieur, Enseignant..."
                    />
                    <div class="error-message" *ngIf="hasError('profession')">
                      {{ getErrorMessage('profession') }}
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="employer">Employeur *</label>
                    <input
                      type="text"
                      id="employer"
                      formControlName="employer"
                      class="form-input"
                      [class.error]="hasError('employer')"
                      placeholder="Nom de l'entreprise"
                    />
                    <div class="error-message" *ngIf="hasError('employer')">
                      {{ getErrorMessage('employer') }}
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="monthly_income">Revenus mensuels nets (FCFA) *</label>
                    <input
                      type="number"
                      id="monthly_income"
                      formControlName="monthly_income"
                      class="form-input"
                      [class.error]="hasError('monthly_income')"
                      min="150000"
                      placeholder="750000"
                    />
                    <div class="error-message" *ngIf="hasError('monthly_income')">
                      {{ getErrorMessage('monthly_income') }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section Détails de l'épargne -->
              <div class="form-section">
                <h4><i class="fas fa-piggy-bank"></i> Détails de votre épargne</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="initial_deposit">Dépôt initial (FCFA) *</label>
                    <input
                      type="number"
                      id="initial_deposit"
                      formControlName="initial_deposit"
                      class="form-input"
                      [class.error]="hasError('initial_deposit')"
                      [min]="productData?.minimum_deposit || 0"
                      [max]="productData?.maximum_deposit || 999999999"
                      placeholder="1000000"
                    />
                    <div class="form-hint" *ngIf="productData">
                      Minimum: {{ formatCurrency(productData.minimum_deposit) }}
                      <span *ngIf="productData.maximum_deposit">
                        - Maximum: {{ formatCurrency(productData.maximum_deposit) }}
                      </span>
                    </div>
                    <div class="error-message" *ngIf="hasError('initial_deposit')">
                      {{ getErrorMessage('initial_deposit') }}
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="monthly_contribution">Versements mensuels (FCFA)</label>
                    <input
                      type="number"
                      id="monthly_contribution"
                      formControlName="monthly_contribution"
                      class="form-input"
                      min="0"
                      placeholder="200000"
                    />
                    <div class="form-hint">
                      Optionnel - Pour une épargne programmée
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label for="savings_goal">Objectif d'épargne *</label>
                    <select id="savings_goal" formControlName="savings_goal" class="form-select" [class.error]="hasError('savings_goal')">
                      <option value="">Sélectionner votre objectif</option>
                      <option value="Achat immobilier">Achat immobilier</option>
                      <option value="Véhicule">Achat véhicule</option>
                      <option value="Éducation enfants">Éducation des enfants</option>
                      <option value="Retraite">Préparation retraite</option>
                      <option value="Projet personnel">Projet personnel</option>
                      <option value="Fonds d'urgence">Constitution fonds d'urgence</option>
                      <option value="Voyage">Voyage</option>
                      <option value="Autre">Autre</option>
                    </select>
                    <div class="error-message" *ngIf="hasError('savings_goal')">
                      {{ getErrorMessage('savings_goal') }}
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="target_amount">Montant cible (FCFA)</label>
                    <input
                      type="number"
                      id="target_amount"
                      formControlName="target_amount"
                      class="form-input"
                      min="0"
                      placeholder="25000000"
                    />
                    <div class="form-hint">
                      Montant que vous souhaitez atteindre
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="target_date">Date cible</label>
                    <input
                      type="date"
                      id="target_date"
                      formControlName="target_date"
                      class="form-input"
                      [min]="getTomorrowDate()"
                    />
                    <div class="form-hint">
                      Date à laquelle vous souhaitez atteindre votre objectif
                    </div>
                  </div>
                </div>
              </div>

              <!-- Confirmation et consentement -->
              <div class="form-section">
                <div class="consent-section">
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        formControlName="data_consent"
                        class="form-checkbox"
                      />
                      <span class="checkmark"></span>
                      J'accepte le traitement de mes données personnelles pour cette demande *
                    </label>
                  </div>

                  <div class="form-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        formControlName="terms_consent"
                        class="form-checkbox"
                      />
                      <span class="checkmark"></span>
                      J'accepte les conditions générales de la banque *
                    </label>
                  </div>

                  <div class="form-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        formControlName="contact_consent"
                        class="form-checkbox"
                      />
                      <span class="checkmark"></span>
                      J'accepte d'être contacté pour le suivi de ma demande
                    </label>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <!-- Étape 2: Notification de réception -->
          <div *ngIf="currentStep === 2 && notification" class="notification-step">
            <div class="success-animation">
              <div class="checkmark-circle">
                <div class="checkmark"></div>
              </div>
            </div>

            <div class="notification-content">
              <h3>{{ notification.message }}</h3>
              
              <div class="application-details">
                <div class="detail-item">
                  <strong>Numéro de dossier:</strong>
                  <span class="application-number">{{ notification.application_number }}</span>
                  <button 
                    class="copy-button" 
                    (click)="copyToClipboard(notification.application_number)"
                    title="Copier le numéro">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
                <div class="detail-item">
                  <strong>Délai de traitement:</strong>
                  <span>{{ notification.expected_processing_time }}</span>
                </div>
              </div>

              <div class="next-steps">
                <h4>Prochaines étapes :</h4>
                <ul class="steps-list">
                  <li *ngFor="let step of notification.next_steps; let i = index">
                    <span class="step-number">{{ i + 1 }}</span>
                    <span class="step-text">{{ step }}</span>
                  </li>
                </ul>
              </div>

              <div class="contact-info">
                <h4>Informations de contact :</h4>
                <div class="contact-details">
                  <div class="contact-item">
                    <i class="fas fa-building"></i>
                    <span>{{ notification.contact_info.bank_name }}</span>
                  </div>
                  <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <a href="tel:{{ notification.contact_info.phone }}">{{ notification.contact_info.phone }}</a>
                  </div>
                  <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <a href="mailto:{{ notification.contact_info.email }}">{{ notification.contact_info.email }}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div *ngIf="currentStep === 1" class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="close()">
              Annuler
            </button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              [disabled]="applicationForm.invalid || isSubmitting"
              (click)="onSubmit()">
              <span *ngIf="isSubmitting" class="spinner"></span>
              {{ isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande' }}
            </button>
          </div>

          <div *ngIf="currentStep === 2" class="notification-actions">
            <button type="button" class="btn btn-primary" (click)="close()">
              Fermer
            </button>
            <button 
              type="button" 
              class="btn btn-outline" 
              (click)="downloadReceipt()"
              *ngIf="notification">
              <i class="fas fa-download"></i>
              Télécharger le récépissé
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  //styleUrls: ['./savings-application-modal.component.scss']
})
export class SavingsApplicationModalComponent implements OnInit {
  @Input() isVisible = false;
  @Input() simulationData: any = null;
  @Input() productData: any = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() applicationSubmitted = new EventEmitter<SavingsApplicationNotification>();

  applicationForm!: FormGroup;
  currentStep = 1;
  isSubmitting = false;
  notification: SavingsApplicationNotification | null = null;

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.applicationForm = this.fb.group({
      // Informations personnelles
      applicant_name: ['', [Validators.required, Validators.minLength(3)]],
      applicant_email: ['', [Validators.required, Validators.email]],
      applicant_phone: ['', [Validators.required, Validators.pattern(/^(\+241|241)?[0-9]{8}$/)]],
      applicant_address: ['', Validators.required],
      birth_date: ['', Validators.required],
      marital_status: [''],
      
      // Informations professionnelles
      profession: ['', Validators.required],
      employer: ['', Validators.required],
      monthly_income: ['', [Validators.required, Validators.min(150000)]],
      
      // Épargne
      initial_deposit: ['', [Validators.required, Validators.min(this.productData?.minimum_deposit || 0)]],
      monthly_contribution: [''],
      savings_goal: ['', Validators.required],
      target_amount: [''],
      target_date: [''],
      
      // Consentements
      data_consent: [false, Validators.requiredTrue],
      terms_consent: [false, Validators.requiredTrue],
      contact_consent: [true]
    });

    this.prefillFormData();
  }

  private prefillFormData(): void {
    if (!this.simulationData) return;

    const prefillData: any = {};

    if (this.simulationData.initialAmount) {
      prefillData.initial_deposit = this.simulationData.initialAmount;
    }

    if (this.simulationData.monthlyContribution) {
      prefillData.monthly_contribution = this.simulationData.monthlyContribution;
    }

    this.applicationForm.patchValue(prefillData);
  }

  async onSubmit(): Promise<void> {
    if (this.applicationForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      const formData = this.applicationForm.value;
      
      // Préparer les données de l'application
      const applicationData: SavingsApplicationRequest = {
        savings_product_id: this.productData?.id || '',
        simulation_id: this.simulationData?.id,
        applicant_name: formData.applicant_name,
        applicant_email: formData.applicant_email,
        applicant_phone: formData.applicant_phone,
        applicant_address: formData.applicant_address,
        birth_date: formData.birth_date,
        marital_status: formData.marital_status,
        profession: formData.profession,
        employer: formData.employer,
        monthly_income: formData.monthly_income,
        initial_deposit: formData.initial_deposit,
        monthly_contribution: formData.monthly_contribution,
        savings_goal: formData.savings_goal,
        target_amount: formData.target_amount,
        target_date: formData.target_date,
        application_data: {
          ...formData,
          simulation_reference: this.simulationData?.id,
          product_type: this.productData?.type,
          interest_rate: this.productData?.interest_rate,
          expected_final_amount: this.simulationData?.finalAmount
        }
      };

      // Simuler l'envoi à l'API
      const response = await this.simulateAPICall(applicationData);

      if (response && response.success) {
        this.notification = response;
        this.currentStep = 2;
        
        this.applicationSubmitted.emit(response);
        
        this.notificationService.showSuccess(
          `Votre demande d'épargne a été transmise à ${response.contact_info.bank_name}`,
          'Demande envoyée !'
        );
        
        setTimeout(() => {
          this.close();
        }, 5000);
        
      } else {
        throw new Error('La demande a échoué');
      }

    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      this.notificationService.showError('Une erreur est survenue lors de l\'envoi de votre demande');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async simulateAPICall(data: SavingsApplicationRequest): Promise<SavingsApplicationNotification> {
    // Simuler un délai d'API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const applicationNumber = `EPG-${Date.now().toString().slice(-6)}`;
    const bankName = this.getBankName();
    
    return {
      success: true,
      application_id: `app_${Date.now()}`,
      application_number: applicationNumber,
      message: 'Votre demande d\'ouverture de compte épargne a été reçue avec succès !',
      next_steps: [
        'Vous recevrez un email de confirmation dans les 24h',
        'Un conseiller vous contactera sous 48h pour finaliser l\'ouverture',
        'Préparez vos pièces justificatives (CNI, justificatifs de revenus)',
        'Votre compte sera ouvert sous 72h après validation de votre dossier'
      ],
      expected_processing_time: '48h à 72h',
      contact_info: {
        bank_name: bankName,
        phone: '+241 01 00 00 00',
        email: 'epargne@banque.ga',
        application_number: applicationNumber
      }
    };
  }

  getModalTitle(): string {
    if (this.currentStep === 1) {
      return 'Demande d\'Ouverture de Compte Épargne';
    } else {
      return 'Demande Reçue';
    }
  }

  getBankName(): string {
    return this.productData?.bank?.name || 'Banque';
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  hasError(fieldName: string): boolean {
    const field = this.applicationForm.get(fieldName);
    return !!(field?.errors && field?.touched);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.applicationForm.get(fieldName);
    if (!field?.errors) return '';

    const errors = field.errors;
    if (errors['required']) return 'Ce champ est requis';
    if (errors['email']) return 'Email invalide';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} caractères`;
    if (errors['pattern']) return 'Format invalide';
    if (errors['min']) return `Valeur minimum: ${errors['min'].min}`;

    return 'Valeur invalide';
  }

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

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.showSuccess('Numéro copié dans le presse-papier');
    });
  }

  downloadReceipt(): void {
    if (!this.notification) return;
    
    const receiptContent = this.generateReceiptContent();
    const blob = new Blob([receiptContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `recepisse_epargne_${this.notification.application_number}.html`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  private generateReceiptContent(): string {
    if (!this.notification) return '';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Récépissé de Demande d'Épargne - ${this.notification.application_number}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin-bottom: 20px; }
            .steps { margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Récépissé de Demande d'Épargne</h1>
            <h2>${this.notification.contact_info.bank_name}</h2>
        </div>
        
        <div class="details">
            <p><strong>Numéro de dossier:</strong> ${this.notification.application_number}</p>
            <p><strong>Type de produit:</strong> ${this.productData?.name}</p>
            <p><strong>Date de soumission:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            <p><strong>Délai de traitement:</strong> ${this.notification.expected_processing_time}</p>
        </div>
        
        <div class="steps">
            <h3>Prochaines étapes:</h3>
            <ol>
                ${this.notification.next_steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
        </div>
        
        <div class="contact">
            <h3>Contact:</h3>
            <p>Téléphone: ${this.notification.contact_info.phone}</p>
            <p>Email: ${this.notification.contact_info.email}</p>
        </div>
    </body>
    </html>
    `;
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.isVisible = false;
    this.currentStep = 1;
    this.notification = null;
    this.applicationForm?.reset();
    this.isSubmitting = false;
    this.closeModal.emit();
  }
}