import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import { 
  InsuranceApplicationService, 
  InsuranceApplicationRequest, 
  InsuranceApplicationNotification 
} from '../../services/insurance-application.service';
import { AutoFillService } from '../../services/auto-fill.service';

@Component({
  selector: 'app-insurance-application-modal',
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
          <div class="quote-summary">
            <h3>Récapitulatif de votre devis</h3>
            
            <!-- Debug info - À retirer en production -->
            <div class="debug-quote-data" *ngIf="showDebug" style="background: #f0f0f0; padding: 10px; margin: 10px 0; font-size: 12px;">
              <strong>Debug - Données reçues:</strong><br>
              Monthly Premium: {{ quoteData?.monthlyPremium || quoteData?.monthly_premium || 'N/A' }}<br>
              Annual Premium: {{ quoteData?.annualPremium || quoteData?.annual_premium || 'N/A' }}<br>
              Deductible: {{ quoteData?.deductible || 'N/A' }}<br>
              Coverage: {{ quoteData?.coverageAmount || 'N/A' }}<br>
              Company: {{ quoteData?.companyName || quoteData?.company_name || 'N/A' }}<br>
            </div>

            <!-- SECTION CORRIGÉE des montants -->
            <div class="summary-grid">
              <div class="summary-item">
                <span class="label">Produit:</span>
                <span class="value">{{ getProductName() }}</span>
              </div>
              
              <div class="summary-item">
                <span class="label">Compagnie:</span>
                <span class="value">{{ getCompanyName() }}</span>
              </div>
              
              <div class="summary-item">
                <span class="label">Prime mensuelle:</span>
                <span class="value">{{ formatCurrency(getMonthlyPremium()) }}</span>
              </div>
              
              <div class="summary-item">
                <span class="label">Prime annuelle:</span>
                <span class="value">{{ formatCurrency(getAnnualPremium()) }}</span>
              </div>
              
              <div class="summary-item">
                <span class="label">Franchise:</span>
                <span class="value">{{ formatCurrency(getDeductible()) }}</span>
              </div>
              
              <!-- Afficher la couverture seulement si elle existe -->
              <div class="summary-item" *ngIf="getCoverageAmount() > 0">
                <span class="label">Montant couvert:</span>
                <span class="value">{{ formatCurrency(getCoverageAmount()) }}</span>
              </div>

              <!-- Afficher le type d'assurance -->
              <div class="summary-item">
                <span class="label">Type:</span>
                <span class="value">{{ getInsuranceTypeLabel() }}</span>
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
                  [class.error]="hasError('applicant_address')"
                ></textarea>
                <div class="error-message" *ngIf="hasError('applicant_address')">
                  {{ getErrorMessage('applicant_address') }}
                </div>
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
                <label for="nationality">Nationalité</label>
                <select id="nationality" formControlName="nationality" class="form-select">
                  <option value="">Sélectionner</option>
                  <option value="Gabonaise">Gabonaise</option>
                  <option value="Camerounaise">Camerounaise</option>
                  <option value="Française">Française</option>
                  <option value="Autre">Autre</option>
                </select>
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
                <label for="employer">Employeur</label>
                <input
                  type="text"
                  id="employer"
                  formControlName="employer"
                  class="form-input"
                  placeholder="Nom de l'entreprise"
                />
              </div>
            </div>
          </div>

          <!-- Sections spécifiques par type d'assurance -->
          
          <!-- Assurance Auto -->
          <div *ngIf="getInsuranceType() === 'auto'" class="form-section">
            <h4><i class="fas fa-car"></i> Informations véhicule</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="vehicle_make">Marque *</label>
                <input
                  type="text"
                  id="vehicle_make"
                  formControlName="vehicle_make"
                  class="form-input"
                  [class.error]="hasError('vehicle_make')"
                  placeholder="Toyota, Mercedes..."
                />
                <div class="error-message" *ngIf="hasError('vehicle_make')">
                  {{ getErrorMessage('vehicle_make') }}
                </div>
              </div>

              <div class="form-group">
                <label for="vehicle_model">Modèle *</label>
                <input
                  type="text"
                  id="vehicle_model"
                  formControlName="vehicle_model"
                  class="form-input"
                  [class.error]="hasError('vehicle_model')"
                  placeholder="Corolla, C-Class..."
                />
                <div class="error-message" *ngIf="hasError('vehicle_model')">
                  {{ getErrorMessage('vehicle_model') }}
                </div>
              </div>

              <div class="form-group">
                <label for="vehicle_year">Année *</label>
                <input
                  type="number"
                  id="vehicle_year"
                  formControlName="vehicle_year"
                  class="form-input"
                  [class.error]="hasError('vehicle_year')"
                  min="1990"
                  max="2025"
                  placeholder="2022"
                />
                <div class="error-message" *ngIf="hasError('vehicle_year')">
                  {{ getErrorMessage('vehicle_year') }}
                </div>
              </div>

              <div class="form-group">
                <label for="vehicle_value">Valeur du véhicule (FCFA) *</label>
                <input
                  type="number"
                  id="vehicle_value"
                  formControlName="vehicle_value"
                  class="form-input"
                  [class.error]="hasError('vehicle_value')"
                  min="1000000"
                  placeholder="15000000"
                />
                <div class="error-message" *ngIf="hasError('vehicle_value')">
                  {{ getErrorMessage('vehicle_value') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Assurance Habitation -->
          <div *ngIf="getInsuranceType() === 'habitation'" class="form-section">
            <h4><i class="fas fa-home"></i> Informations logement</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="property_type">Type de logement *</label>
                <select id="property_type" formControlName="property_type" class="form-select" [class.error]="hasError('property_type')">
                  <option value="">Sélectionner</option>
                  <option value="Appartement">Appartement</option>
                  <option value="Maison">Maison individuelle</option>
                  <option value="Villa">Villa</option>
                  <option value="Studio">Studio</option>
                </select>
                <div class="error-message" *ngIf="hasError('property_type')">
                  {{ getErrorMessage('property_type') }}
                </div>
              </div>

              <div class="form-group">
                <label for="property_value">Valeur du bien (FCFA) *</label>
                <input
                  type="number"
                  id="property_value"
                  formControlName="property_value"
                  class="form-input"
                  [class.error]="hasError('property_value')"
                  min="5000000"
                  placeholder="25000000"
                />
                <div class="error-message" *ngIf="hasError('property_value')">
                  {{ getErrorMessage('property_value') }}
                </div>
              </div>

              <div class="form-group full-width">
                <label for="property_address">Adresse du bien *</label>
                <textarea
                  id="property_address"
                  formControlName="property_address"
                  class="form-textarea"
                  [class.error]="hasError('property_address')"
                  rows="2"
                  placeholder="Adresse complète du bien à assurer"
                ></textarea>
                <div class="error-message" *ngIf="hasError('property_address')">
                  {{ getErrorMessage('property_address') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Assurance Vie -->
          <div *ngIf="getInsuranceType() === 'vie'" class="form-section">
            <h4><i class="fas fa-heart"></i> Informations assurance vie</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="coverage_amount">Capital assuré souhaité (FCFA) *</label>
                <input
                  type="number"
                  id="coverage_amount"
                  formControlName="coverage_amount"
                  class="form-input"
                  [class.error]="hasError('coverage_amount')"
                  min="5000000"
                  placeholder="50000000"
                />
                <div class="error-message" *ngIf="hasError('coverage_amount')">
                  {{ getErrorMessage('coverage_amount') }}
                </div>
              </div>

              <div class="form-group full-width">
                <label for="beneficiaries">Bénéficiaires *</label>
                <textarea
                  id="beneficiaries"
                  formControlName="beneficiaries"
                  class="form-textarea"
                  [class.error]="hasError('beneficiaries')"
                  rows="3"
                  placeholder="Nom, prénom et lien de parenté des bénéficiaires"
                ></textarea>
                <div class="error-message" *ngIf="hasError('beneficiaries')">
                  {{ getErrorMessage('beneficiaries') }}
                </div>
              </div>

              <div class="form-group full-width">
                <label for="medical_history">Antécédents médicaux</label>
                <textarea
                  id="medical_history"
                  formControlName="medical_history"
                  class="form-textarea"
                  rows="3"
                  placeholder="Décrivez vos antécédents médicaux importants"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Assurance Santé -->
          <div *ngIf="getInsuranceType() === 'sante'" class="form-section">
            <h4><i class="fas fa-plus-circle"></i> Informations santé</h4>
            <div class="form-grid">
              <div class="form-group full-width">
                <label for="current_treatments">Traitements en cours</label>
                <textarea
                  id="current_treatments"
                  formControlName="current_treatments"
                  class="form-textarea"
                  rows="3"
                  placeholder="Listez vos traitements médicaux en cours"
                ></textarea>
              </div>

              <div class="form-group full-width">
                <label for="medical_history">Historique médical</label>
                <textarea
                  id="medical_history"
                  formControlName="medical_history"
                  class="form-textarea"
                  rows="3"
                  placeholder="Décrivez votre historique médical"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Assurance Voyage -->
          <div *ngIf="getInsuranceType() === 'voyage'" class="form-section">
            <h4><i class="fas fa-plane"></i> Informations voyage</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="trip_destination">Destination *</label>
                <input
                  type="text"
                  id="trip_destination"
                  formControlName="trip_destination"
                  class="form-input"
                  [class.error]="hasError('trip_destination')"
                  placeholder="France, Europe, Monde..."
                />
                <div class="error-message" *ngIf="hasError('trip_destination')">
                  {{ getErrorMessage('trip_destination') }}
                </div>
              </div>

              <div class="form-group">
                <label for="trip_duration">Durée (jours) *</label>
                <input
                  type="number"
                  id="trip_duration"
                  formControlName="trip_duration"
                  class="form-input"
                  [class.error]="hasError('trip_duration')"
                  min="1"
                  max="365"
                  placeholder="14"
                />
                <div class="error-message" *ngIf="hasError('trip_duration')">
                  {{ getErrorMessage('trip_duration') }}
                </div>
              </div>

              <div class="form-group">
                <label for="trip_start_date">Date de départ *</label>
                <input
                  type="date"
                  id="trip_start_date"
                  formControlName="trip_start_date"
                  class="form-input"
                  [class.error]="hasError('trip_start_date')"
                />
                <div class="error-message" *ngIf="hasError('trip_start_date')">
                  {{ getErrorMessage('trip_start_date') }}
                </div>
              </div>

              <div class="form-group full-width">
                <label for="trip_activities">Activités prévues</label>
                <textarea
                  id="trip_activities"
                  formControlName="trip_activities"
                  class="form-textarea"
                  rows="2"
                  placeholder="Tourisme, sports, affaires..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Assurance Transport -->
          <div *ngIf="getInsuranceType() === 'transport'" class="form-section">
            <h4><i class="fas fa-truck"></i> Informations transport</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="cargo_description">Description des marchandises *</label>
                <textarea
                  id="cargo_description"
                  formControlName="cargo_description"
                  class="form-textarea"
                  [class.error]="hasError('cargo_description')"
                  rows="3"
                  placeholder="Type de marchandises à transporter..."
                ></textarea>
                <div class="error-message" *ngIf="hasError('cargo_description')">
                  {{ getErrorMessage('cargo_description') }}
                </div>
              </div>

              <div class="form-group">
                <label for="transport_route">Itinéraire *</label>
                <input
                  type="text"
                  id="transport_route"
                  formControlName="transport_route"
                  class="form-input"
                  [class.error]="hasError('transport_route')"
                  placeholder="De... vers..."
                />
                <div class="error-message" *ngIf="hasError('transport_route')">
                  {{ getErrorMessage('transport_route') }}
                </div>
              </div>

              <div class="form-group">
                <label for="transport_date">Date prévue *</label>
                <input
                  type="date"
                  id="transport_date"
                  formControlName="transport_date"
                  class="form-input"
                  [class.error]="hasError('transport_date')"
                />
                <div class="error-message" *ngIf="hasError('transport_date')">
                  {{ getErrorMessage('transport_date') }}
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
                  J'accepte les conditions générales de la compagnie d'assurance *
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
                <span>{{ notification.contact_info.company_name }}</span>
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
        
        <!-- Debug info - À supprimer en production -->
        <div class="debug-info" style="margin: 10px 0; font-size: 12px; color: #666;" *ngIf="showDebug">
          Form Valid: {{ applicationForm.valid }} | 
          Custom Valid: {{ isFormValid() }} | 
          Submitting: {{ isSubmitting }}
          <br>
          <button type="button" (click)="debugFormValidation()" style="font-size: 11px; padding: 2px 6px;">
            Debug Validation
          </button>
        </div>
        
        <button 
          type="button" 
          class="btn btn-primary" 
          (click)="onSubmit()"
          [disabled]="!isFormValid() || isSubmitting"
          [class.loading]="isSubmitting"
          [style.opacity]="isFormValid() ? '1' : '0.6'">
          <i class="fas fa-paper-plane" *ngIf="!isSubmitting"></i>
          {{ isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande' }}
        </button>
      </div>
      
      <button 
      type="button" 
      class="btn btn-link btn-small"
      (click)="clearAutoFillData()"
      title="Effacer les données pré-remplies">
      Vider les champs pré-remplis
    </button>
      <div *ngIf="currentStep === 2" class="form-actions">
        <button 
          type="button" 
          class="btn btn-outline" 
          (click)="downloadReceipt()"
          *ngIf="notification">
          <i class="fas fa-download"></i>
          Télécharger le récépissé
        </button>
        <button type="button" class="btn btn-primary" (click)="close()">
          Fermer
        </button>
      </div>
    </div>
  </div>
</div>
  `,
  styleUrls: ['./insurance-application-modal.component.scss']
})
export class InsuranceApplicationModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() quoteData: any = null;
  @Input() productData: any = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() applicationSubmitted = new EventEmitter<InsuranceApplicationNotification>();

  applicationForm!: FormGroup;
  currentStep = 1;
  isSubmitting = false;
  notification: InsuranceApplicationNotification | null = null;
  showDebug = false; // Mettre à true pour voir les infos de debug

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private insuranceApplicationService: InsuranceApplicationService,
    private autoFillService: AutoFillService
  ) {}

  ngOnInit(): void {
  this.initializeForm();
  
  // Attendre que les données soient disponibles
  setTimeout(() => {
    this.setConditionalValidators();
    
    // NOUVEAU: Préremplissage automatique
    this.attemptAutoFill();
  }, 100);
}
  ngOnChanges(): void {
    if (this.applicationForm) {
      this.setConditionalValidators();
    }
  }

  private attemptAutoFill(): void {
  const insuranceType = this.getInsuranceType();
  const autoFilled = this.autoFillService.prefillApplicationForm(
    this.applicationForm, 
    insuranceType
  );

  if (autoFilled) {
    this.notificationService.showInfo(
      'Formulaire prérempli avec vos données de simulation'
    );
    console.log(' Préremplissage automatique réussi');
  } else {
    console.log('ℹAucune donnée de simulation disponible pour le préremplissage');
  }
}


  // Méthodes à ajouter dans insurance-application-modal.component.ts

getMonthlyPremium(): number {
  return this.quoteData?.monthlyPremium || 
         this.quoteData?.monthly_premium || 
         0;
}

getAnnualPremium(): number {
  return this.quoteData?.annualPremium || 
         this.quoteData?.annual_premium || 
         0;
}

getDeductible(): number {
  return this.quoteData?.deductible || 0;
}

getCoverageAmount(): number {
  return this.quoteData?.coverageAmount || 
         this.quoteData?.coverage_amount ||
         0;
}

formatCurrency(amount: number | null | undefined): string {
  const validAmount = amount || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(validAmount).replace('XAF', 'FCFA');
}

  private initializeForm(): void {
    this.applicationForm = this.fb.group({
      // Informations personnelles
      applicant_name: ['', [Validators.required, Validators.minLength(3)]],
      applicant_email: ['', [Validators.required, Validators.email]],
      applicant_phone: ['', [Validators.required, Validators.pattern(/^(\+241|241)?[0-9]{8}$/)]],
      applicant_address: ['', Validators.required],
      birth_date: ['', Validators.required],
      nationality: [''],
      marital_status: [''],
      profession: ['', Validators.required],
      employer: [''],
      
      // Spécifique assurance auto
      vehicle_make: [''],
      vehicle_model: [''],
      vehicle_year: [''],
      vehicle_value: [''],
      
      // Spécifique assurance habitation
      property_type: [''],
      property_value: [''],
      property_address: [''],
      
      // Spécifique assurance vie
      coverage_amount: [''],
      beneficiaries: [''],
      
      // Spécifique assurance santé
      medical_history: [''],
      current_treatments: [''],
      
      // Consentements
      data_consent: [false, Validators.requiredTrue],
      terms_consent: [false, Validators.requiredTrue],
      contact_consent: [true]
    });
  }

  private clearConditionalValidators(): void {
    const conditionalFields = [
      'vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_value',
      'property_type', 'property_value', 'property_address',
      'coverage_amount', 'beneficiaries'
    ];
    
    conditionalFields.forEach(field => {
      this.applicationForm.get(field)?.clearValidators();
      this.applicationForm.get(field)?.updateValueAndValidity();
    });
  }

  private setConditionalValidators(): void {
    // Réinitialiser tous les validateurs d'abord
    this.clearConditionalValidators();
    
    const insuranceType = this.getInsuranceType();
    console.log('Setting validators for insurance type:', insuranceType);
    
    if (insuranceType === 'auto') {
      this.applicationForm.get('vehicle_make')?.setValidators(Validators.required);
      this.applicationForm.get('vehicle_model')?.setValidators(Validators.required);
      this.applicationForm.get('vehicle_year')?.setValidators([Validators.required, Validators.min(1990)]);
      this.applicationForm.get('vehicle_value')?.setValidators([Validators.required, Validators.min(1000000)]);
    }
    
    if (insuranceType === 'habitation') {
      this.applicationForm.get('property_type')?.setValidators(Validators.required);
      this.applicationForm.get('property_value')?.setValidators([Validators.required, Validators.min(5000000)]);
      this.applicationForm.get('property_address')?.setValidators(Validators.required);
    }
    
    if (insuranceType === 'vie') {
      this.applicationForm.get('coverage_amount')?.setValidators([Validators.required, Validators.min(5000000)]);
      this.applicationForm.get('beneficiaries')?.setValidators(Validators.required);
    }

    // Mettre à jour la validité de tous les champs
    Object.keys(this.applicationForm.controls).forEach(key => {
      this.applicationForm.get(key)?.updateValueAndValidity();
    });
  }

  getCompanyName(): string {
    console.log('🏢 getCompanyName - quoteData:', this.quoteData);
    console.log('🏢 getCompanyName - productData:', this.productData);
    
    // Essayer différentes sources pour le nom de la compagnie
    const companyName = 
      this.quoteData?.companyName || 
      this.quoteData?.company_name || 
      this.productData?.insurance_company?.name || 
      this.productData?.company?.name || 
      'Compagnie d\'Assurance';
    
    console.log('🏢 Nom de compagnie final:', companyName);
    return companyName;
  }

  isFormValid(): boolean {
    if (!this.applicationForm) return false;
    
    console.log('🔍 Vérification validité du formulaire');
    console.log('Form valid:', this.applicationForm.valid);
    
    // Vérifier les champs obligatoires de base
    const requiredFields = ['applicant_name', 'applicant_email', 'applicant_phone', 
                           'applicant_address', 'birth_date', 'profession'];
    
    for (const field of requiredFields) {
      const control = this.applicationForm.get(field);
      if (!control?.value || control.invalid) {
        console.log(`❌ Champ obligatoire manquant ou invalide: ${field}`, control?.value);
        return false;
      }
    }
    
    // Vérifier les consentements
    if (!this.applicationForm.get('data_consent')?.value || 
        !this.applicationForm.get('terms_consent')?.value) {
      console.log('❌ Consentements manquants');
      return false;
    }
    
    // Vérifier les champs spécifiques selon le type d'assurance
    const insuranceType = this.getInsuranceType();
    
    if (insuranceType === 'auto') {
      const autoFields = ['vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_value'];
      for (const field of autoFields) {
        const control = this.applicationForm.get(field);
        if (!control?.value) {
          console.log(`❌ Champ auto manquant: ${field}`);
          return false;
        }
      }
    }
    
    if (insuranceType === 'habitation') {
      const habitationFields = ['property_type', 'property_value', 'property_address'];
      for (const field of habitationFields) {
        const control = this.applicationForm.get(field);
        if (!control?.value) {
          console.log(`❌ Champ habitation manquant: ${field}`);
          return false;
        }
      }
    }
    
    if (insuranceType === 'vie') {
      const vieFields = ['coverage_amount', 'beneficiaries'];
      for (const field of vieFields) {
        const control = this.applicationForm.get(field);
        if (!control?.value) {
          console.log(`❌ Champ vie manquant: ${field}`);
          return false;
        }
      }
    }
    
    console.log('✅ Formulaire valide');
    return true;
  }

  debugFormValidation(): void {
    console.group('🐛 Debug validation du formulaire');
    console.log('Form valid:', this.applicationForm.valid);
    console.log('Form errors:', this.applicationForm.errors);
    console.log('Insurance type:', this.getInsuranceType());
    console.log('Product data:', this.productData);
    
    Object.keys(this.applicationForm.controls).forEach(key => {
      const control = this.applicationForm.get(key);
      if (control?.errors) {
        console.log(`❌ ${key}:`, control.errors, 'Value:', control.value);
      } else {
        console.log(`✅ ${key}:`, control?.value);
      }
    });
    
    console.groupEnd();
  }

  private validateRequiredData(): boolean {
    console.log('ProductData:', this.productData);
    console.log('QuoteData:', this.quoteData);
    
    if (!this.productData?.id) {
      this.notificationService.showError('Données du produit manquantes. Veuillez fermer et rouvrir cette fenêtre.');
      return false;
    }
    return true;
  }

  // Dans votre composant Angular insurance-application-modal.component.ts
// Modification de la fonction onSubmit()

async onSubmit(): Promise<void> {
  console.log('🚀 Début onSubmit');
  
  // Debug complet des données reçues
  console.log('=== DEBUG COMPLET ===');
  console.log('quoteData complet:', this.quoteData);
  console.log('productData complet:', this.productData);
  console.log('quote_id à envoyer:', this.quoteData?.id);
  console.log('Form valid:', this.applicationForm.valid);
  console.log('Custom valid:', this.isFormValid());
  console.log('===================');
  
  // Debug de validation
  this.debugFormValidation();
  
  if (!this.validateRequiredData()) {
    return;
  }

  if (!this.isFormValid() || this.isSubmitting) {
    console.log(' Formulaire invalide ou soumission en cours');
    this.markFormGroupTouched();
    return;
  }

  this.isSubmitting = true;

  try {
    const formData = this.applicationForm.value;
    console.log(' Données du formulaire:', formData);
    
    // Correction de l'ID produit
    let validProductId = this.validateProductId(this.productData?.id);
    const insuranceType = this.getInsuranceType();
    
    if (!validProductId || validProductId === 'main_offer') {
      const productIdMap = {
        'auto': 'ogar_auto_tr',
        'habitation': 'ogar_habitation',  
        'vie': 'nsia_vie',
        'sante': 'nsia_sante',
        'voyage': 'nsia_voyage'
      };
      
      validProductId = productIdMap[insuranceType as keyof typeof productIdMap] || 'ogar_auto_tr';
      console.log(`ID produit corrigé: ${validProductId} pour type: ${insuranceType}`);
    }
    
    // CORRECTION PRINCIPALE: Valider et nettoyer le quote_id
    let validQuoteId = this.quoteData?.id;
    
    if (validQuoteId) {
      // Patterns de quote_id invalides à ignorer
      const invalidPatterns = [
        /^quote_\d{13}$/,        // Pattern généré côté client
        /^main_offer$/,
        /^temp_/,
        /^fake_/,
        /^test_/,
        /^demo_/
      ];
      
      let isValidQuoteId = true;
      
      for (const pattern of invalidPatterns) {
        if (pattern.test(validQuoteId)) {
          console.warn(`⚠️ Quote ID suspect détecté: ${validQuoteId}, pattern: ${pattern}`);
          isValidQuoteId = false;
          break;
        }
      }
      
      // Si le quote_id semble suspect, le désactiver
      if (!isValidQuoteId) {
        console.log('🔧 Passage en mode sans devis (quote_id suspect)');
        validQuoteId = undefined;
      } else {
        console.log(`✅ Quote ID validé: ${validQuoteId}`);
      }
    } else {
      console.log('ℹ️ Aucun quote_id fourni');
    }
    
    // Préparer les données d'application
    const applicationData: InsuranceApplicationRequest = {
      insurance_product_id: validProductId,
      quote_id: validQuoteId, // Utiliser le quote_id validé ou undefined
      
      // Informations personnelles
      applicant_name: formData.applicant_name,
      applicant_email: formData.applicant_email,
      applicant_phone: formData.applicant_phone,
      applicant_address: formData.applicant_address,
      birth_date: formData.birth_date,
      nationality: formData.nationality || 'Gabonaise',
      marital_status: formData.marital_status,
      profession: formData.profession,
      employer: formData.employer,
      
      // Informations spécifiques selon le type
      coverage_amount: formData.coverage_amount ? Number(formData.coverage_amount) : undefined,
      beneficiaries: formData.beneficiaries,
      
      // Véhicule (auto)
      vehicle_make: formData.vehicle_make,
      vehicle_model: formData.vehicle_model,
      vehicle_year: formData.vehicle_year ? Number(formData.vehicle_year) : undefined,
      vehicle_value: formData.vehicle_value ? Number(formData.vehicle_value) : undefined,
      
      // Logement (habitation)
      property_type: formData.property_type,
      property_value: formData.property_value ? Number(formData.property_value) : undefined,
      property_address: formData.property_address,
      
      // Santé
      medical_history: formData.medical_history,
      current_treatments: formData.current_treatments,
      
      // Données d'application enrichies
      application_data: {
        // Référence du devis
        quote_reference: validQuoteId,
        original_quote_id: this.quoteData?.id, // Garder l'original pour debug
        quote_validation_status: validQuoteId ? 'valid' : 'bypassed',
        
        // Informations du devis
        insurance_type: insuranceType,
        monthly_premium: this.getMonthlyPremium(),
        annual_premium: this.getAnnualPremium(),
        deductible: this.getDeductible(),
        coverage_amount: this.getCoverageAmount(),
        coverage_details: this.quoteData?.coverage_details || this.quoteData?.coverageDetails,
        
        // Données du formulaire
        form_data: formData,
        
        // Consentements
        consent: {
          data_processing: formData.data_consent,
          terms_conditions: formData.terms_consent,
          contact_authorization: formData.contact_consent
        },
        
        // Métadonnées techniques
        submitted_from: 'web_client',
        browser_info: navigator.userAgent,
        timestamp: new Date().toISOString(),
        form_version: '1.0',
        
        // Debug info
        original_product_id: this.productData?.id,
        corrected_product_id: validProductId,
        company_name: this.getCompanyName(),
        product_name: this.getProductName(),
        
        // Données spécifiques par type d'assurance
        ...(insuranceType === 'auto' && {
          vehicle_info: {
            make: formData.vehicle_make,
            model: formData.vehicle_model,
            year: formData.vehicle_year,
            value: formData.vehicle_value
          }
        }),
        
        ...(insuranceType === 'habitation' && {
          property_info: {
            type: formData.property_type,
            value: formData.property_value,
            address: formData.property_address
          }
        }),
        
        ...(insuranceType === 'vie' && {
          life_insurance_info: {
            coverage_amount: formData.coverage_amount,
            beneficiaries: formData.beneficiaries,
            medical_history: formData.medical_history
          }
        }),
        
        ...(insuranceType === 'sante' && {
          health_info: {
            medical_history: formData.medical_history,
            current_treatments: formData.current_treatments
          }
        }),
        
        ...(insuranceType === 'voyage' && {
          travel_info: {
            destination: formData.trip_destination,
            duration: formData.trip_duration,
            start_date: formData.trip_start_date,
            activities: formData.trip_activities
          }
        })
      }
    };

    console.log('📤 Données préparées pour envoi:', applicationData);

    // Validation finale des données
    const validationErrors = this.insuranceApplicationService.validateInsuranceApplicationData(applicationData);
    if (validationErrors.length > 0) {
      console.error('❌ Erreurs de validation:', validationErrors);
      this.notificationService.showError('Erreurs de validation: ' + validationErrors.join(', '));
      this.isSubmitting = false;
      return;
    }

    console.log('✅ Validation réussie, envoi en cours...');

    // Debug des données
    this.insuranceApplicationService.debugInsuranceApplicationData(applicationData);

    // Appel au service avec gestion d'erreur améliorée
    this.insuranceApplicationService.submitInsuranceApplication(applicationData).subscribe({
      next: (response: InsuranceApplicationNotification) => {
        console.log('✅ Réponse reçue:', response);
        
        // Vérifier que la réponse est valide
        if (!response.success || !response.application_id) {
          throw new Error('Réponse invalide du serveur');
        }
        
        this.notification = response;
        this.currentStep = 2;
        
        // Émettre l'événement
        this.applicationSubmitted.emit(response);
        
        // Notification de succès
        this.notificationService.showSuccess(
          `Votre demande d'assurance ${this.getInsuranceTypeLabel()} a été transmise avec succès !`,
          'Demande envoyée !'
        );
        
        // Fermer automatiquement après 10 secondes si l'utilisateur ne fait rien
        setTimeout(() => {
          if (this.currentStep === 2 && this.isVisible) {
            console.log('Fermeture automatique de la modal après 10s');
            this.close();
          }
        }, 10000);
      },
      
      error: (error) => {
        console.error('❌ Erreur lors de l\'envoi de la demande:', error);
        
        // Gestion d'erreur détaillée
        let errorMessage = 'Une erreur est survenue lors de l\'envoi de votre demande';
        let errorDetail = '';
        
        if (error.status === 404) {
          errorMessage = 'Produit d\'assurance non trouvé';
          errorDetail = 'Veuillez recommencer votre simulation';
        } else if (error.status === 400) {
          errorMessage = 'Données invalides';
          if (error.error?.detail) {
            errorDetail = error.error.detail;
          }
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur temporaire';
          errorDetail = 'Veuillez réessayer dans quelques instants';
        } else if (error.error && error.error.detail) {
          errorMessage = error.error.detail;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // Affichage de l'erreur
        const fullErrorMessage = errorDetail ? `${errorMessage}: ${errorDetail}` : errorMessage;
        this.notificationService.showError(fullErrorMessage);
        
        // Log détaillé pour debug
        console.group('💥 Détails de l\'erreur');
        console.log('Status:', error.status);
        console.log('Error object:', error);
        console.log('Error detail:', error.error?.detail);
        console.log('Application data sent:', applicationData);
        console.groupEnd();
      },
      
      complete: () => {
        console.log('🏁 Requête terminée');
        this.isSubmitting = false;
      }
    });

  } catch (error: any) {
    console.error('💥 Exception lors de l\'envoi de la demande:', error);
    
    let errorMessage = 'Une erreur inattendue est survenue';
    if (error.message) {
      errorMessage += ': ' + error.message;
    }
    
    this.notificationService.showError(errorMessage);
    this.isSubmitting = false;
    
    // Stack trace pour debug
    console.log('Stack trace:', error.stack);
  }
}

private validateProductId(productId?: string): string {
  if (!productId) {
    // Produit par défaut selon le type
    return this.getDefaultProductId();
  }
  
  // ❌ Si c'est un quote_id déguisé
  if (productId.startsWith('quote_')) {
    console.warn(`Product ID suspect détecté: ${productId}, utilisation du produit par défaut`);
    return this.getDefaultProductId();
  }
  
  return productId;
}

private getDefaultProductId(): string {
  const insuranceType = this.getInsuranceType();
  const productIdMap = {
    'auto': 'ogar_auto_tr',
    'habitation': 'ogar_habitation',
    'vie': 'nsia_vie',
    'sante': 'nsia_sante',
    'voyage': 'nsia_voyage'
  };
  
  return productIdMap[insuranceType as keyof typeof productIdMap] || 'ogar_auto_tr';
}

  getModalTitle(): string {
    if (this.currentStep === 1) {
      return `Demande d'Assurance ${this.getInsuranceTypeLabel()}`;
    } else {
      return 'Demande Reçue';
    }
  }
 
  getProductName(): string {
    const productName = 
      this.quoteData?.productName || 
      this.quoteData?.product_name || 
      this.productData?.name || 
      `Assurance ${this.getInsuranceTypeLabel()}`;
    
    console.log('📦 Nom de produit:', productName);
    return productName;
  }

clearAutoFillData(): void {
  // Réinitialiser uniquement les champs pré-remplis, pas les champs utilisateur
  const fieldsToKeep = [
    'applicant_name', 'applicant_email', 'applicant_phone',
    'data_consent', 'terms_consent', 'contact_consent'
  ];

  Object.keys(this.applicationForm.controls).forEach(key => {
    if (!fieldsToKeep.includes(key)) {
      this.applicationForm.get(key)?.setValue('');
    }
  });

  this.autoFillService.clearSimulationData();
  this.notificationService.showInfo('Données pré-remplies effacées');
}

  getInsuranceType(): string {
    return this.productData?.type || this.quoteData?.insurance_type || 'auto';
  }

  getInsuranceTypeLabel(): string {
    const types: {[key: string]: string} = {
      'auto': 'Automobile',
      'habitation': 'Habitation',
      'vie': 'Vie',
      'sante': 'Santé',
      'voyage': 'Voyage'
    };
    return types[this.getInsuranceType()] || 'Générale';
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
    link.download = `recepisse_assurance_${this.notification.application_number}.html`;
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
        <title>Récépissé de Demande d'Assurance - ${this.notification.application_number}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin-bottom: 20px; }
            .steps { margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Récépissé de Demande d'Assurance</h1>
            <h2>${this.notification.contact_info.company_name}</h2>
        </div>
        
        <div class="details">
            <p><strong>Numéro de dossier:</strong> ${this.notification.application_number}</p>
            <p><strong>Type d'assurance:</strong> ${this.getInsuranceTypeLabel()}</p>
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

  private markFormGroupTouched(): void {
    Object.keys(this.applicationForm.controls).forEach(key => {
      const control = this.applicationForm.get(key);
      control?.markAsTouched();
    });
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