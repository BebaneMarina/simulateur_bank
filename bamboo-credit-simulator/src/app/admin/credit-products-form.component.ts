import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CreditProductService, CreditProduct, CreditProductCreate, Bank } from '../services/credits-products.service';

@Component({
  selector: 'app-credit-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
 <div class="page-container">
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="breadcrumb">
        <a routerLink="/admin/credit-products">Produits de Crédit</a>
        <span>/</span>
        <span>{{isEditMode ? 'Modifier' : 'Créer'}}</span>
      </div>
      <h1 class="title">
        {{isEditMode ? 'Modifier le produit de crédit' : 'Nouveau produit de crédit'}}
      </h1>
      <p class="subtitle">
        {{isEditMode ? 'Modifiez les informations du produit' : 'Créez un nouveau produit de crédit'}}
      </p>
    </div>

    <!-- Messages d'erreur globaux -->
    <div *ngIf="error" class="error-banner">
      <p>{{ error }}</p>
    </div>

    <!-- Loading state -->
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Chargement...</span>
    </div>

    <form *ngIf="!loading" [formGroup]="productForm" (ngSubmit)="onSubmit()" novalidate>
      <!-- Debug: Afficher l'état du formulaire -->
      <div class="debug-panel">
        <strong>Debug Info:</strong><br>
        Form Valid: {{ productForm.valid }}<br>
        Form Touched: {{ productForm.touched }}<br>
        Form Dirty: {{ productForm.dirty }}<br>
        Submitting: {{ isSubmitting }}
      </div>

      <!-- Informations générales -->
      <div class="form-section">
        <h2>Informations générales</h2>
        
        <div class="form-grid">
          <!-- Nom du produit -->
          <div class="form-group full-width">
            <label>
              Nom du produit <span class="required">*</span>
            </label>
            <input
              type="text"
              formControlName="name"
              [class.error]="isFieldInvalid('name')"
              placeholder="Ex: Crédit Personnel Flex">
            <div *ngIf="isFieldInvalid('name')" class="error-message">
              {{ getErrorMessage('name') }}
            </div>
          </div>

          <!-- Banque -->
          <div class="form-group">
            <label>
              Banque <span class="required">*</span>
            </label>
            <select
              formControlName="bank_id"
              [class.error]="isFieldInvalid('bank_id')">
              <option value="">Sélectionner une banque</option>
              <option *ngFor="let bank of banks" [value]="bank.id">{{ bank.name }}</option>
            </select>
            <div *ngIf="isFieldInvalid('bank_id')" class="error-message">
              La banque est requise
            </div>
          </div>

          <!-- Type de produit -->
          <div class="form-group">
            <label>
              Type de produit <span class="required">*</span>
            </label>
            <select
              formControlName="type"
              [class.error]="isFieldInvalid('type')">
              <option value="">Sélectionner un type</option>
              <option value="immobilier">Crédit Immobilier</option>
              <option value="consommation">Crédit Consommation</option>
              <option value="auto">Crédit Auto</option>
              <option value="professionnel">Crédit Professionnel</option>
              <option value="equipement">Crédit Équipement</option>
              <option value="travaux">Crédit Travaux</option>
            </select>
            <div *ngIf="isFieldInvalid('type')" class="error-message">
              Le type de produit est requis
            </div>
          </div>

          <!-- Description -->
          <div class="form-group full-width">
            <label>Description</label>
            <textarea
              formControlName="description"
              rows="3"
              placeholder="Description du produit de crédit..."></textarea>
          </div>
        </div>
      </div>

      <!-- Conditions financières -->
      <div class="form-section">
        <h2>Conditions financières</h2>
        
        <div class="form-grid">
          <!-- Montant minimum -->
          <div class="form-group">
            <label>
              Montant minimum (FCFA) <span class="required">*</span>
            </label>
            <input
              type="number"
              formControlName="min_amount"
              [class.error]="isFieldInvalid('min_amount')"
              placeholder="1000000">
            <div *ngIf="isFieldInvalid('min_amount')" class="error-message">
              {{ getErrorMessage('min_amount') }}
            </div>
          </div>

          <!-- Montant maximum -->
          <div class="form-group">
            <label>
              Montant maximum (FCFA) <span class="required">*</span>
            </label>
            <input
              type="number"
              formControlName="max_amount"
              [class.error]="isFieldInvalid('max_amount')"
              placeholder="50000000">
            <div *ngIf="isFieldInvalid('max_amount')" class="error-message">
              {{ getErrorMessage('max_amount') }}
            </div>
          </div>

          <!-- Taux moyen -->
          <div class="form-group">
            <label>
              Taux moyen (%) <span class="required">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              formControlName="average_rate"
              [class.error]="isFieldInvalid('average_rate')"
              placeholder="6.50">
            <div *ngIf="isFieldInvalid('average_rate')" class="error-message">
              {{ getErrorMessage('average_rate') }}
            </div>
          </div>

          <!-- Temps de traitement -->
          <div class="form-group">
            <label>
              Temps de traitement (heures) <span class="required">*</span>
            </label>
            <input
              type="number"
              formControlName="processing_time_hours"
              [class.error]="isFieldInvalid('processing_time_hours')"
              placeholder="72">
            <div *ngIf="isFieldInvalid('processing_time_hours')" class="error-message">
              {{ getErrorMessage('processing_time_hours') }}
            </div>
          </div>

          <!-- Taux minimum -->
          <div class="form-group">
            <label>Taux minimum (%)</label>
            <input
              type="number"
              step="0.01"
              formControlName="min_rate"
              placeholder="5.50">
          </div>

          <!-- Taux maximum -->
          <div class="form-group">
            <label>Taux maximum (%)</label>
            <input
              type="number"
              step="0.01"
              formControlName="max_rate"
              placeholder="8.50">
          </div>

          <!-- Durée minimum -->
          <div class="form-group">
            <label>
              Durée minimum (mois) <span class="required">*</span>
            </label>
            <input
              type="number"
              formControlName="min_duration_months"
              [class.error]="isFieldInvalid('min_duration_months')"
              placeholder="6">
            <div *ngIf="isFieldInvalid('min_duration_months')" class="error-message">
              {{ getErrorMessage('min_duration_months') }}
            </div>
          </div>

          <!-- Durée maximum -->
          <div class="form-group">
            <label>
              Durée maximum (mois) <span class="required">*</span>
            </label>
            <input
              type="number"
              formControlName="max_duration_months"
              [class.error]="isFieldInvalid('max_duration_months')"
              placeholder="300">
            <div *ngIf="isFieldInvalid('max_duration_months')" class="error-message">
              {{ getErrorMessage('max_duration_months') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Caractéristiques du produit -->
      <div class="form-section">
        <h2>Caractéristiques du produit</h2>
        
        <div class="form-grid">
          <!-- Avantages -->
          <div class="form-group">
            <label>Avantages</label>
            <textarea
              formControlName="advantages"
              rows="4"
              placeholder="Taux préférentiel&#10;Assurance groupe incluse&#10;Report d'échéances"></textarea>
            <p class="help-text">Saisissez chaque avantage sur une nouvelle ligne</p>
          </div>

          <!-- Fonctionnalités -->
          <div class="form-group">
            <label>Fonctionnalités</label>
            <textarea
              formControlName="features"
              rows="4"
              placeholder="Expertise gratuite&#10;Accompagnement personnalisé&#10;Déblocage progressif"></textarea>
            <p class="help-text">Saisissez chaque fonctionnalité sur une nouvelle ligne</p>
          </div>

          <!-- Conditions spéciales -->
          <div class="form-group full-width">
            <label>Conditions spéciales</label>
            <textarea
              formControlName="special_conditions"
              rows="2"
              placeholder="Conditions spéciales pour les primo-accédants et fonctionnaires"></textarea>
          </div>
        </div>
      </div>

      <!-- Options -->
      <div class="form-section">
        <h2>Options</h2>
        
        <div class="checkbox-group">
          <!-- Produit actif -->
          <div class="checkbox-item">
            <input
              type="checkbox"
              id="is_active"
              formControlName="is_active">
            <label for="is_active">
              Produit actif
            </label>
          </div>

          <!-- Produit vedette -->
          <div class="checkbox-item">
            <input
              type="checkbox"
              id="is_featured"
              formControlName="is_featured">
            <label for="is_featured">
              Produit vedette (affiché en priorité)
            </label>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button
          type="button"
          (click)="onCancel()"
          class="btn btn-secondary">
          Annuler
        </button>
        <button
          type="submit"
          [disabled]="productForm.invalid || isSubmitting"
          class="btn btn-primary">
          <div *ngIf="isSubmitting" class="spinner"></div>
          <span>
            {{isEditMode ? 'Mettre à jour' : 'Créer le produit'}}
          </span>
        </button>
      </div>
    </form>
  </div>
</div>
  `,
  styles: [`
    .page-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 20px;
    }

    .container {
      max-width: 64rem;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 2rem;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 16px;

      a {
        color: #6b7280;
        text-decoration: none;
        transition: color 0.2s;

        &:hover {
          color: #2563eb;
        }
      }

      span {
        color: #9ca3af;
      }
    }

    .title {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
      background: linear-gradient(135deg, #1f2937 0%, #4b5563 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: #6b7280;
      margin-top: 8px;
      font-size: 16px;
    }

    .error-banner {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;

      p {
        color: #dc2626;
        margin: 0;
        font-weight: 500;
      }
    }

    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 48px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      span {
        margin-left: 12px;
        color: #6b7280;
        font-weight: 500;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .form-section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
      padding: 24px;
      margin-bottom: 24px;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
      }

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 24px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #e5e7eb;
      }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;

      &.full-width {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;

      label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 6px;

        .required {
          color: #dc2626;
        }
      }

      input, select, textarea {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.2s ease-in-out;
        background: #f9fafb;

        &:focus {
          outline: none;
          border-color: #2563eb;
          background: white;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        &::placeholder {
          color: #9ca3af;
        }

        &.error {
          border-color: #dc2626;
          background: #fef2f2;

          &:focus {
            border-color: #dc2626;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
          }
        }
      }

      textarea {
        resize: vertical;
        min-height: 80px;
      }

      .error-message {
        margin-top: 6px;
        font-size: 12px;
        color: #dc2626;
        font-weight: 500;
      }

      .help-text {
        margin-top: 4px;
        font-size: 12px;
        color: #6b7280;
      }
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 12px;

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #2563eb;
          cursor: pointer;
        }

        label {
          margin: 0;
          cursor: pointer;
          font-weight: 500;
        }
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      margin-top: 32px;

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s ease-in-out;
        cursor: pointer;
        text-decoration: none;
        min-width: 120px;

        &:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        &.btn-secondary {
          background: white;
          color: #6b7280;
          border: 2px solid #d1d5db;

          &:hover {
            background: #f9fafb;
            border-color: #9ca3af;
            color: #374151;
          }
        }

        &.btn-primary {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border: 2px solid transparent;

          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
          }
        }
      }
    }

    .loading-form {
      .form-section {
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
        background-size: 400% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
      }
    }

    @keyframes shimmer {
      0% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }

      .form-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .form-actions {
        flex-direction: column;

        .btn {
          width: 100%;
        }
      }

      .title {
        font-size: 1.5rem;
      }
    }

    .debug-panel {
      background: #f0f0f0; 
      padding: 10px; 
      margin-bottom: 20px; 
      font-size: 12px;
      border-radius: 4px;
      border: 1px solid #ccc;
    }

    .required {
      color: #dc2626;
    }

    .full-width {
      grid-column: 1 / -1;
    }
  `]
})
export class CreditProductFormComponent implements OnInit {
  productForm: FormGroup;
  banks: Bank[] = [];
  isEditMode = false;
  isSubmitting = false;
  loading = true;
  error: string | null = null;
  productId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private creditProductService: CreditProductService
  ) {
    this.productForm = this.createForm();
  }

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.productId;

    this.initializeForm();
  }

  private async initializeForm() {
    try {
      this.loading = true;
      this.error = null;

      // Charger les banques
      await this.loadBanks();

      // Si mode édition, charger le produit
      if (this.isEditMode && this.productId) {
        await this.loadProduct(this.productId);
      }

    } catch (error) {
      this.error = 'Erreur lors du chargement des données';
      console.error('Erreur initialisation formulaire:', error);
    } finally {
      this.loading = false;
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      bank_id: ['', Validators.required],
      type: ['', Validators.required],
      description: [''],
      min_amount: [null, [Validators.required, Validators.min(1)]],
      max_amount: [null, [Validators.required, Validators.min(1)]],
      average_rate: [null, [Validators.required, Validators.min(0.01)]],
      min_rate: [null, Validators.min(0)],
      max_rate: [null, Validators.min(0)],
      min_duration_months: [null, [Validators.required, Validators.min(1)]],
      max_duration_months: [null, [Validators.required, Validators.min(1)]],
      processing_time_hours: [72, [Validators.required, Validators.min(1)]],
      features: [''],
      advantages: [''],
      special_conditions: [''],
      is_featured: [false],
      is_active: [true]
    });
  }

  crossFieldValidators(form: FormGroup) {
    const minAmount = form.get('min_amount')?.value;
    const maxAmount = form.get('max_amount')?.value;
    const minDuration = form.get('min_duration_months')?.value;
    const maxDuration = form.get('max_duration_months')?.value;
    const minRate = form.get('min_rate')?.value;
    const maxRate = form.get('max_rate')?.value;

    const errors: any = {};

    if (minAmount && maxAmount && minAmount >= maxAmount) {
      errors['maxAmountInvalid'] = true;
    }

    if (minDuration && maxDuration && minDuration >= maxDuration) {
      errors['maxDurationInvalid'] = true;
    }

    if (minRate && maxRate && minRate >= maxRate) {
      errors['maxRateInvalid'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

  private async loadBanks(): Promise<void> {
    try {
      this.creditProductService.getBanks().subscribe({
        next: (banks: Bank[]) => {
          this.banks = banks;
        },
        error: (error) => {
          console.error('Erreur chargement banques:', error);
          this.error = 'Impossible de charger les banques';
        }
      });
    } catch (error) {
      console.error('Erreur loadBanks:', error);
      throw error;
    }
  }

  private loadProduct(id: string): void {
    this.creditProductService.getCreditProduct(id).subscribe({
      next: (product) => {
        const formData = this.creditProductService.transformApiData(product);
        this.productForm.patchValue(formData);
      },
      error: (error) => {
        console.error('Erreur chargement produit:', error);
        this.error = 'Impossible de charger le produit';
        this.router.navigate(['/admin/credit-products']);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(controlName: string): string {
    const control = this.productForm.get(controlName);
    if (!control?.errors) return '';

    const errors = control.errors;
    
    if (errors['required']) return 'Ce champ est requis';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} caractères`;
    if (errors['min']) return `Valeur minimum: ${errors['min'].min}`;
    if (errors['max']) return `Valeur maximum: ${errors['max'].max}`;
    
    return 'Valeur invalide';
  }

  onSubmit() {
    console.log('Form submitted'); // Debug
    console.log('Form valid:', this.productForm.valid); // Debug
    console.log('Form errors:', this.productForm.errors); // Debug
    
    if (this.productForm.valid) {
      this.isSubmitting = true;
      this.error = null;
      
      const formData = this.productForm.value;
      console.log('Form data:', formData); // Debug
      
      const productData: CreditProductCreate = this.creditProductService.transformFormData(formData);
      console.log('Transformed data:', productData); // Debug

      if (this.isEditMode && this.productId) {
        this.creditProductService.updateCreditProduct(this.productId, productData).subscribe({
          next: () => {
            this.showSuccess('Produit mis à jour avec succès');
            this.router.navigate(['/admin/credit-products']);
          },
          error: (error) => {
            console.error('Update error:', error);
            this.error = error.message || 'Erreur lors de la mise à jour';
            this.isSubmitting = false;
          }
        });
      } else {
        this.creditProductService.createCreditProduct(productData).subscribe({
          next: (response) => {
            console.log('Creation success:', response);
            this.showSuccess('Produit créé avec succès');
            this.router.navigate(['/admin/credit-products']);
          },
          error: (error) => {
            console.error('Creation error:', error);
            this.error = error.message || 'Erreur lors de la création';
            this.isSubmitting = false;
          }
        });
      }
    } else {
      // Debug pour voir quels champs sont invalides
      console.log('Form is invalid');
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        if (control?.invalid) {
          console.log(`${key} is invalid:`, control.errors);
        }
      });
      
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsTouched();
      });
      this.error = 'Veuillez corriger les erreurs dans le formulaire';
    }
  }

  onCancel() {
    this.router.navigate(['/admin/credit-products']);
  }

  private showSuccess(message: string): void {
    console.log('SUCCESS:', message);
    // En production, remplacer par un service de notification
    alert(message);
  }
}