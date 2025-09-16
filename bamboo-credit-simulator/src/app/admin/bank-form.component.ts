import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { lastValueFrom, Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { 
  BankAdminService, 
  BankAdmin, 
  BankCreate 
} from '../services/bank-admin.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-bank-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bank-form">
      <div class="header">
        <h1>{{ isEditMode ? 'Modifier' : 'Créer' }} une banque</h1>
        <div class="breadcrumb">
          <a routerLink="/admin/banks">Banques</a>
          <span>></span>
          <span>{{ isEditMode ? 'Modifier' : 'Créer' }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="isLoading && !bankForm">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>

      <div class="form-container" *ngIf="bankForm">
        <form [formGroup]="bankForm" (ngSubmit)="onSubmit()" class="form">
          <!-- Informations générales -->
          <div class="form-section">
            <h3>Informations générales</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="id">Code banque *</label>
                <input 
                  type="text" 
                  id="id"
                  formControlName="id"
                  [readonly]="isEditMode"
                  class="form-input"
                  [class.invalid]="isFieldInvalid('id')"
                  placeholder="Ex: bgfi, ugb, bicig..."
                />
                <div class="field-hint">
                  <small>Code unique en minuscules, chiffres, tirets et underscores uniquement</small>
                </div>
                <div *ngIf="isFieldInvalid('id')" class="error-message">
                  {{ getFieldError('id') }}
                </div>
                <div *ngIf="idAvailabilityMessage" 
                     class="availability-message" 
                     [class.available]="idAvailable"
                     [class.unavailable]="!idAvailable">
                  {{ idAvailabilityMessage }}
                </div>
              </div>

              <div class="form-group">
                <label for="name">Nom affiché *</label>
                <input 
                  type="text" 
                  id="name"
                  formControlName="name"
                  class="form-input"
                  [class.invalid]="isFieldInvalid('name')"
                  placeholder="Ex: BGFI Bank, UGB"
                />
                <div *ngIf="isFieldInvalid('name')" class="error-message">
                  {{ getFieldError('name') }}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="full_name">Nom complet</label>
              <input 
                type="text" 
                id="full_name"
                formControlName="full_name"
                class="form-input"
                placeholder="Ex: Banque Gabonaise et Française Internationale"
              />
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea 
                id="description"
                formControlName="description"
                class="form-textarea"
                rows="3"
                placeholder="Description de la banque et de ses services..."
              ></textarea>
            </div>

            <div class="form-group">
                <label for="logo_upload">Logo de la banque</label>
                
                <!-- Input file caché -->
                <input 
                  type="file" 
                  id="logo_upload"
                  accept="image/*"
                  (change)="onFileSelected($event)"
                  style="display: none"
                  #fileInput
               />
          </div>
                 <!-- Bouton d'upload -->
              <div class="upload-container" *ngIf="!logoPreview && !bankForm.get('logo_url')?.value">
                <button 
                  type="button" 
                  class="btn btn-outline"
                  (click)="fileInput.click()">
                  <i class="upload-icon">📁</i>
                  Sélectionner une image
                </button>
                <small class="form-hint">Formats acceptés: JPG, PNG, SVG. Max 5MB</small>
              </div>

              <!-- Prévisualisation -->
              <div class="logo-preview-container" *ngIf="logoPreview || bankForm.get('logo_url')?.value">
                <div class="preview-image">
                  <img 
                    [src]="logoPreview || bankForm.get('logo_url')?.value" 
                    alt="Aperçu du logo" 
                  />
                </div>
                
                <div class="preview-actions">
                  <button 
                    type="button" 
                    class="btn btn-outline btn-small"
                    (click)="fileInput.click()">
                    Changer
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-outline btn-small"
                    (click)="removeLogo()">
                    Supprimer
                  </button>
                  
                  <!-- Bouton upload séparé pour le mode édition -->
                  <button 
                    *ngIf="isEditMode && selectedFile"
                    type="button" 
                    class="btn btn-primary btn-small"
                    (click)="uploadLogo()"
                    [disabled]="isUploadingLogo">
                    <span *ngIf="isUploadingLogo" class="spinner-small"></span>
                    {{ isUploadingLogo ? 'Upload...' : 'Uploader' }}
                  </button>
                </div>
              </div>

              <!-- Champ URL caché pour le logo -->
              <input type="hidden" formControlName="logo_url" />
            </div>
          <!-- Coordonnées -->
          <div class="form-section">
            <h3>Coordonnées</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="contact_phone">Téléphone</label>
                <input 
                  type="tel" 
                  id="contact_phone"
                  formControlName="contact_phone"
                  class="form-input"
                  placeholder="+241 XX XX XX XX"
                />
              </div>

              <div class="form-group">
                <label for="contact_email">Email</label>
                <input 
                  type="email" 
                  id="contact_email"
                  formControlName="contact_email"
                  class="form-input"
                  [class.invalid]="isFieldInvalid('contact_email')"
                  placeholder="contact@banque.ga"
                />
                <div *ngIf="isFieldInvalid('contact_email')" class="error-message">
                  Format email invalide
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="website">Site web</label>
              <input 
                type="url" 
                id="website"
                formControlName="website"
                class="form-input"
                [class.invalid]="isFieldInvalid('website')"
                placeholder="https://www.banque.ga"
              />
              <div *ngIf="isFieldInvalid('website')" class="error-message">
                URL invalide
              </div>
            </div>

            <div class="form-group">
              <label for="address">Adresse</label>
              <textarea 
                id="address"
                formControlName="address"
                class="form-textarea"
                rows="3"
                placeholder="Adresse complète du siège social"
              ></textarea>
            </div>
          </div>

          <!-- Informations techniques -->
          <div class="form-section">
            <h3>Informations techniques</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="swift_code">Code SWIFT</label>
                <input 
                  type="text" 
                  id="swift_code"
                  formControlName="swift_code"
                  class="form-input"
                  [class.invalid]="isFieldInvalid('swift_code')"
                  placeholder="BGFIGALI"
                  maxlength="11"
                />
                <div class="field-hint">
                  <small>Format: 4 lettres (banque) + 2 lettres (pays) + 2 caractères (ville) + 3 caractères optionnels</small>
                </div>
                <div *ngIf="isFieldInvalid('swift_code')" class="error-message">
                  Format SWIFT invalide
                </div>
              </div>

              <div class="form-group">
                <label for="license_number">Numéro de licence</label>
                <input 
                  type="text" 
                  id="license_number"
                  formControlName="license_number"
                  class="form-input"
                  placeholder="BG2021001"
                />
              </div>
            </div>
          </div>

          <!-- Données financières -->
          <div class="form-section">
            <h3>Données financières</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="established_year">Année de création</label>
                <input 
                  type="number" 
                  id="established_year"
                  formControlName="established_year"
                  class="form-input"
                  [class.invalid]="isFieldInvalid('established_year')"
                  min="1800"
                  max="2030"
                  placeholder="1971"
                />
                <div *ngIf="isFieldInvalid('established_year')" class="error-message">
                  Année invalide (1800-2030)
                </div>
              </div>

              <div class="form-group">
                <label for="rating">Notation</label>
                <select 
                  id="rating"
                  formControlName="rating"
                  class="form-select"
                >
                  <option value="">Sélectionner une notation</option>
                  <option *ngFor="let rating of ratings" [value]="rating">{{ rating }}</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="total_assets">Total des actifs (FCFA)</label>
              <input 
                type="number" 
                id="total_assets"
                formControlName="total_assets"
                class="form-input"
                [class.invalid]="isFieldInvalid('total_assets')"
                min="0"
                step="1000000"
                placeholder="1250000000000"
              />
              <div class="field-hint">
                <small>Montant en FCFA (ex: 1250000000000 pour 1,25 trillion FCFA)</small>
              </div>
              <div *ngIf="bankForm.get('total_assets')?.value" class="assets-preview">
                Équivaut à: {{ formatAssets(bankForm.get('total_assets')?.value) }}
              </div>
              <div *ngIf="isFieldInvalid('total_assets')" class="error-message">
                Montant invalide
              </div>
            </div>
          </div>

          <!-- Paramètres -->
          <div class="form-section">
            <h3>Paramètres</h3>
            
            <div class="form-group">
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="is_active"
                  />
                  <span class="checkmark"></span>
                  Banque active
                </label>
                <small class="form-hint">
                  Une banque inactive n'apparaîtra pas dans les simulations
                </small>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button 
              type="button" 
              (click)="goBack()"
              class="btn btn-outline">
              Annuler
            </button>
            <button 
              type="submit" 
              [disabled]="bankForm.invalid || isSubmitting"
              class="btn btn-primary">
              <span *ngIf="isSubmitting" class="spinner-small"></span>
              {{ isSubmitting ? (isEditMode ? 'Modification...' : 'Création...') : (isEditMode ? 'Modifier' : 'Créer') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .bank-form {
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }

    .header h1 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
      font-size: 14px;
    }

    .breadcrumb a {
      color: #007bff;
      text-decoration: none;
    }

    .breadcrumb a:hover {
      text-decoration: underline;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    .spinner-small {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .form-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }

    .form-section {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid #eee;
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .form-section h3 {
      margin: 0 0 25px 0;
      color: #333;
      font-size: 18px;
      font-weight: 600;
      padding-bottom: 10px;
      border-bottom: 2px solid #007bff;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #555;
      font-size: 14px;
    }

    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.3s;
      background: #fafafa;
    }

    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: #007bff;
      background: white;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    .form-input.invalid, .form-select.invalid, .form-textarea.invalid {
      border-color: #dc3545;
      background: #fff5f5;
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .field-hint {
      margin-top: 5px;
    }

    .field-hint small {
      color: #666;
      font-size: 12px;
    }

    .error-message {
      color: #dc3545;
      font-size: 12px;
      margin-top: 5px;
      font-weight: 500;
    }

    .availability-message {
      font-size: 12px;
      margin-top: 5px;
      font-weight: 500;
    }

    .availability-message.available {
      color: #28a745;
    }

    .availability-message.unavailable {
      color: #dc3545;
    }

    .logo-preview {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      background: #f8f9fa;
      text-align: center;
    }

    .logo-preview img {
      max-width: 200px;
      max-height: 100px;
      object-fit: contain;
    }

    .assets-preview {
      margin-top: 5px;
      padding: 8px 12px;
      background: #e3f2fd;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      color: #1976d2;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: normal;
      cursor: pointer;
      margin-bottom: 0;
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .checkmark {
      display: flex;
      align-items: center;
    }

    .form-hint {
      color: #666;
      font-size: 12px;
      margin-top: 5px;
      display: block;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #f0f0f0;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s;
      font-size: 14px;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,123,255,0.3);
    }

    .btn-outline {
      border: 1px solid #ddd;
      background: white;
      color: #333;
    }

    .btn-outline:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #007bff;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    @media (max-width: 768px) {
      .bank-form {
        padding: 15px;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column-reverse;
      }
    }
      /* Styles pour l'upload */
.upload-container {
  border: 2px dashed #ddd;
  padding: 20px;
  text-align: center;
  border-radius: 8px;
  background: #fafafa;
}

.upload-container:hover {
  border-color: #007bff;
  background: #f0f8ff;
}

.upload-icon {
  font-size: 24px;
  margin-right: 8px;
}

.logo-preview-container {
  margin-top: 15px;
}

.preview-image {
  text-align: center;
  margin-bottom: 15px;
}

.preview-image img {
  max-width: 200px;
  max-height: 120px;
  border-radius: 6px;
  border: 1px solid #eee;
}

.preview-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-small {
  padding: 8px 16px;
  font-size: 12px;
}



.form-hint {
  display: block;
  margin-top: 5px;
  color: #666;
  font-size: 12px;
}

.upload-container {
  border: 2px dashed #ddd;
  padding: 30px 20px;
  text-align: center;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.upload-container:hover {
  border-color: #007bff;
  background: #f0f8ff;
}
  `]
})
export class BankFormComponent implements OnInit, OnDestroy {
  bankForm!: FormGroup;
  ratings: string[] = [];
  
  isEditMode = false;
  isLoading = false;
  isSubmitting = false;
  bankId?: string;
  
  // Validation ID
  idAvailable = true;
  idAvailabilityMessage = '';

  selectedFile: File | null = null;
  logoPreview: string | ArrayBuffer | null = null;
  isUploadingLogo = false;
  
  private destroy$ = new Subject<void>();
  private idCheckSubject = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private bankAdminService: BankAdminService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.ratings = this.bankAdminService.getBankRatings();
  }

  ngOnInit(): void {
    this.bankId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEditMode = !!this.bankId;
    
    this.createForm();
    this.setupIdValidation();
    
    if (this.isEditMode) {
      this.loadBank();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validation du type de fichier
      if (!file.type.startsWith('image/')) {
        this.notificationService.showError('Veuillez sélectionner une image');
        return;
      }

      // Validation de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.showError('L\'image ne doit pas dépasser 5MB');
        return;
      }

      this.selectedFile = file;

      // Prévisualisation
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

async uploadLogo(): Promise<void> {
  if (!this.selectedFile || !this.bankId) return;

  this.isUploadingLogo = true;

  try {
    const response = await lastValueFrom(
      this.bankAdminService.uploadBankLogo(this.bankId, this.selectedFile)
    );
    
    // Mettre à jour le formulaire avec l'URL du logo
    this.bankForm.patchValue({
      logo_url: response.logo_url
    });

    // IMPORTANT: Forcer le rechargement de l'image
    // Avec le stockage en base, l'URL peut être la même mais le contenu différent
    this.logoPreview = response.logo_url;
    
    // Alternative si problème de cache avec les URLs data :
    // this.logoPreview = response.logo_url + '?t=' + Date.now();

    this.notificationService.showSuccess('Logo uploadé avec succès');
    this.selectedFile = null;

  } catch (error: any) {
    console.error('Erreur upload:', error);
    const message = error.error?.detail || error.message || 'Erreur lors de l\'upload du logo';
    this.notificationService.showError(message);
  } finally {
    this.isUploadingLogo = false;
  }
}

removeLogo(): void {
  this.selectedFile = null;
  this.logoPreview = null;
  this.bankForm.patchValue({
    logo_url: ''
  });


}

 private async deleteLogoFromServer(): Promise<void> {
  if (!this.bankId) return;
  
  try {
    await lastValueFrom(
      this.bankAdminService.deleteBankLogo(this.bankId)
    );
    this.notificationService.showSuccess('Logo supprimé avec succès');
  } catch (error) {
    console.error('Erreur suppression logo:', error);
    const message = this.extractErrorMessage(error);
    this.notificationService.showError(message);
  }
}

// Méthode utilitaire pour extraire le message d'erreur
private extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const httpError = error as { error?: { detail?: string }, message?: string };
    return httpError.error?.detail || httpError.message || 'Une erreur est survenue';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Une erreur inconnue est survenue';
}
  private createForm(): void {
    this.bankForm = this.fb.group({
      id: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      full_name: [''],
      description: [''],
      logo_url: [''],
      contact_phone: [''],
      contact_email: ['', [Validators.email]],
      website: [''],
      address: [''],
      swift_code: [''],
      license_number: [''],
      established_year: ['', [Validators.min(1800), Validators.max(2030)]],
      total_assets: ['', [Validators.min(0)]],
      rating: [''],
      is_active: [true]
    });

    // Désactiver le champ ID en mode édition
    if (this.isEditMode) {
      this.bankForm.get('id')?.disable();
    }
  }

  private setupIdValidation(): void {
    if (!this.isEditMode) {
      this.idCheckSubject.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(id => {
        if (id && id.length >= 2) {
          this.checkIdAvailability(id);
        } else {
          this.idAvailabilityMessage = '';
        }
      });

      this.bankForm.get('id')?.valueChanges.pipe(
        takeUntil(this.destroy$)
      ).subscribe(value => {
        this.idCheckSubject.next(value);
      });
    }
  }

  private checkIdAvailability(id: string): void {
    this.bankAdminService.validateBankId(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.idAvailable = response.available;
          this.idAvailabilityMessage = response.available 
            ? 'ID disponible ✓' 
            : 'ID déjà utilisé ✗';
        },
        error: (error) => {
          console.error('Erreur validation ID:', error);
          this.idAvailabilityMessage = 'Erreur lors de la validation';
        }
      });
  }

  private loadBank(): void {
    if (!this.bankId) return;
    
    this.isLoading = true;
    
    this.bankAdminService.getBank(this.bankId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bank) => {
          this.populateForm(bank);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement banque:', error);
          this.notificationService.showError('Impossible de charger la banque');
          this.router.navigate(['/admin/banks']);
        }
      });
  }

  private populateForm(bank: BankAdmin): void {
    this.bankForm.patchValue({
      id: bank.id,
      name: bank.name,
      full_name: bank.full_name,
      description: bank.description,
      logo_url: bank.logo_url,
      contact_phone: bank.contact_phone,
      contact_email: bank.contact_email,
      website: bank.website,
      address: bank.address,
      swift_code: bank.swift_code,
      license_number: bank.license_number,
      established_year: bank.established_year,
      total_assets: bank.total_assets,
      rating: bank.rating,
      is_active: bank.is_active
    });
  }

  async onSubmit(): Promise<void> {
    if (this.bankForm.invalid) {
      this.markFormGroupTouched();
      this.notificationService.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (!this.isEditMode && !this.idAvailable) {
      this.notificationService.showError('L\'ID de la banque n\'est pas disponible');
      return;
    }

    this.isSubmitting = true;

    try {
      // D'abord créer/mettre à jour la banque
      const formData: BankCreate = {
        ...this.bankForm.value,
        id: this.bankForm.get('id')?.value
      };

      const request = this.isEditMode 
        ? this.bankAdminService.updateBank(this.bankId!, formData)
        : this.bankAdminService.createBank(formData);

      const response = await lastValueFrom(request);

      // Si un fichier est sélectionné, uploader le logo
      if (this.selectedFile && this.isEditMode) {
        await this.uploadLogo();
      }

      const action = this.isEditMode ? 'mise à jour' : 'création';
      this.notificationService.showSuccess(`Banque ${action} avec succès`);
      this.router.navigate(['/admin/banks']);

    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      const message = error.error?.detail || 'Erreur lors de la sauvegarde';
      this.notificationService.showError(message);
    } finally {
      this.isSubmitting = false;
    }
  }

  goBack(): void {
    if (this.bankForm.dirty && !confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?')) {
      return;
    }
    this.router.navigate(['/admin/banks']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.bankForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.bankForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Ce champ est requis';
    if (field.errors['email']) return 'Format email invalide';
    if (field.errors['pattern']) return 'Format invalide (lettres minuscules, chiffres, tirets et underscores uniquement)';
    if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    if (field.errors['min']) return `Valeur minimum: ${field.errors['min'].min}`;
    if (field.errors['max']) return `Valeur maximum: ${field.errors['max'].max}`;

    return 'Valeur invalide';
  }

  formatAssets(amount: number): string {
    return this.bankAdminService.formatAssets(amount);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.bankForm.controls).forEach(key => {
      const control = this.bankForm.get(key);
      control?.markAsTouched();
    });
  }
}