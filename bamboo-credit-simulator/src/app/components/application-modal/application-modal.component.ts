import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApplicationService, ApplicationNotification } from '../../services/application.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-application-modal',
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
                    <span class="label">Montant demandé:</span>
                    <span class="value">{{ formatCurrency(simulationData?.requested_amount || 0) }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Mensualité:</span>
                    <span class="value">{{ formatCurrency(simulationData?.monthly_payment || 0) }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Durée:</span>
                    <span class="value">{{ simulationData?.duration_months || 0 }} mois</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Taux:</span>
                    <span class="value">{{ simulationData?.applied_rate || 0 }}%</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Banque:</span>
                    <span class="value">{{ getBankName() }}</span>
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
                    <label for="applicant_email">Email</label>
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
                    <label for="applicant_address">Adresse complète</label>
                    <textarea
                      id="applicant_address"
                      formControlName="applicant_address"
                      class="form-textarea"
                      rows="2"
                      placeholder="Quartier, Ville"
                    ></textarea>
                  </div>

                  <div class="form-group">
                    <label for="birth_date">Date de naissance</label>
                    <input
                      type="date"
                      id="birth_date"
                      formControlName="birth_date"
                      class="form-input"
                    />
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
                    <label for="employment_type">Type de contrat</label>
                    <select id="employment_type" formControlName="employment_type" class="form-select">
                      <option value="">Sélectionner</option>
                      <option value="CDI">CDI</option>
                      <option value="CDD">CDD</option>
                      <option value="Indépendant">Indépendant</option>
                      <option value="Fonctionnaire">Fonctionnaire</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="employment_duration_months">Ancienneté (mois)</label>
                    <input
                      type="number"
                      id="employment_duration_months"
                      formControlName="employment_duration_months"
                      class="form-input"
                      min="1"
                      placeholder="12"
                    />
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

                  <div class="form-group">
                    <label for="other_income">Autres revenus (FCFA)</label>
                    <input
                      type="number"
                      id="other_income"
                      formControlName="other_income"
                      class="form-input"
                      min="0"
                      placeholder="0"
                    />
                  </div>

                  <div class="form-group full-width">
                    <label for="purpose">Objet du crédit</label>
                    <input
                      type="text"
                      id="purpose"
                      formControlName="purpose"
                      class="form-input"
                      placeholder="Achat véhicule, travaux..."
                    />
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
  styleUrls: ['./application-modal.component.scss']
})
export class ApplicationModalComponent implements OnInit {
  @Input() isVisible = false;
  @Input() simulationData: any = null;
  @Input() productData: any = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() applicationSubmitted = new EventEmitter<ApplicationNotification>();

  applicationForm!: FormGroup;
  currentStep = 1;
  isSubmitting = false;
  notification: ApplicationNotification | null = null;

  constructor(
    private fb: FormBuilder,
    private applicationService: ApplicationService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.applicationForm = this.fb.group({
      // Informations personnelles
      applicant_name: ['', [Validators.required, Validators.minLength(3)]],
      applicant_email: ['', [Validators.email]],
      applicant_phone: ['', [Validators.required, Validators.pattern(/^(\+241|241)?[0-9]{8}$/)]],
      applicant_address: [''],
      birth_date: [''],
      marital_status: [''],
      
      // Informations professionnelles
      profession: ['', Validators.required],
      employer: ['', Validators.required],
      employment_type: [''],
      employment_duration_months: [''],
      monthly_income: ['', [Validators.required, Validators.min(150000)]],
      other_income: [''],
      purpose: [''],
      
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

    if (this.simulationData.monthly_income) {
      prefillData.monthly_income = this.simulationData.monthly_income;
    }

    this.applicationForm.patchValue(prefillData);
  }

  async onSubmit(): Promise<void> {
    if (this.applicationForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      const formData = this.applicationForm.value;
      
      // Formater le numéro de téléphone
      if (formData.applicant_phone) {
        formData.applicant_phone = this.applicationService.formatPhoneNumber(formData.applicant_phone);
      }

      // Préparer les données de l'application
      const applicationData = {
        credit_product_id: this.productData.id,
        applicant_name: formData.applicant_name,
        applicant_email: formData.applicant_email,
        applicant_phone: formData.applicant_phone,
        applicant_address: formData.applicant_address,
        birth_date: formData.birth_date,
        marital_status: formData.marital_status,
        profession: formData.profession,
        employer: formData.employer,
        employment_type: formData.employment_type,
        employment_duration_months: formData.employment_duration_months,
        monthly_income: formData.monthly_income,
        other_income: formData.other_income,
        purpose: formData.purpose,
        requested_amount: this.simulationData?.requested_amount || 0,
        duration_months: this.simulationData?.duration_months || 60,
        application_data: {
          ...formData,
          simulation_reference: this.simulationData?.id,
          applied_rate: this.simulationData?.applied_rate,
          monthly_payment: this.simulationData?.monthly_payment,
          total_cost: this.simulationData?.total_cost,
          eligible: this.simulationData?.eligible
        }
      };

      const response = await this.applicationService.submitCreditApplication(applicationData).toPromise();

      if (response && response.success) {
        this.notification = response;
        this.currentStep = 2;
        
        // Émettre l'événement pour le composant parent
        this.applicationSubmitted.emit(response);
        
        // Afficher la notification de succès immédiatement
        this.notificationService.showApplicationSuccess(
          response.application_number, 
          response.contact_info.bank_name || ''
        );
        
        // Fermer automatiquement la modal après 5 secondes
        setTimeout(() => {
          this.close();
        }, 5000);
        
      } else {
        throw new Error('La demande a échoué');
      }

    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      
      let errorMessage = 'Une erreur est survenue lors de l\'envoi de votre demande';
      
      if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.notificationService.showError(errorMessage);
      
    } finally {
      this.isSubmitting = false;
    }
  }

  getModalTitle(): string {
    if (this.currentStep === 1) {
      return 'Demande de Crédit';
    } else {
      return 'Demande Reçue';
    }
  }

  getBankName(): string {
    return this.productData?.bank?.name || 'Banque';
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
    link.download = `recepisse_${this.notification.application_number}.html`;
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
        <title>Récépissé de Demande - ${this.notification.application_number}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin-bottom: 20px; }
            .steps { margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Récépissé de Demande</h1>
            <h2>${this.notification.contact_info.bank_name}</h2>
        </div>
        
        <div class="details">
            <p><strong>Numéro de dossier:</strong> ${this.notification.application_number}</p>
            <p><strong>Type de demande:</strong> Crédit</p>
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