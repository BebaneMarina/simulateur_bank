// insurance-products-form.component.ts - Version corrigée avec validation des données
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  InsuranceAdminService, 
  InsuranceProductCreate, 
  InsuranceProductAdmin,
  InsuranceCompany,
  Guarantee 
} from '../services/insurance-admin.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-insurance-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="product-form">
      <div class="header">
        <h2>{{ isEditMode ? 'Modifier' : 'Créer' }} un Produit d'Assurance</h2>
        <div class="header-actions">
          <button type="button" (click)="goBack()" class="btn btn-outline">
            ← Retour à la liste
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="isLoading && !productForm">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>

      <!-- Messages d'erreur -->
      <div class="alert alert-error" *ngIf="formErrors.length > 0">
        <h4>Erreurs de validation :</h4>
        <ul>
          <li *ngFor="let error of formErrors">{{ error }}</li>
        </ul>
      </div>

      <form [formGroup]="productForm" (ngSubmit)="onSubmit()" class="form" *ngIf="productForm">
        <!-- Informations générales -->
        <div class="form-section">
          <h3>Informations générales</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="name">Nom du produit *</label>
              <input 
                type="text" 
                id="name" 
                formControlName="name"
                class="form-control"
                [class.invalid]="isFieldInvalid('name')"
                placeholder="Ex: Assurance Vie Sérénité"
                maxlength="200">
              <div class="error-message" *ngIf="isFieldInvalid('name')">
                Le nom du produit est requis (min. 3 caractères, max. 200)
              </div>
            </div>

            <div class="form-group">
              <label for="type">Type d'assurance *</label>
              <select 
                id="type" 
                formControlName="type"
                class="form-control"
                [class.invalid]="isFieldInvalid('type')"
                (change)="onTypeChange()">
                <option value="">Sélectionner un type</option>
                <option *ngFor="let type of insuranceTypes" [value]="type.code">
                  {{ type.icon }} {{ type.name }}
                </option>
              </select>
              <div class="error-message" *ngIf="isFieldInvalid('type')">
                Le type d'assurance est requis
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group full-width">
              <label for="insurance_company_id">Compagnie d'assurance *</label>
              <select 
                id="insurance_company_id" 
                formControlName="insurance_company_id"
                class="form-control"
                [class.invalid]="isFieldInvalid('insurance_company_id')">
                <option value="">Sélectionner une compagnie</option>
                <option *ngFor="let company of companies" [value]="company.id">
                  {{ company.name }} {{ company.full_name ? '(' + company.full_name + ')' : '' }}
                </option>
              </select>
              <div class="error-message" *ngIf="isFieldInvalid('insurance_company_id')">
                La compagnie d'assurance est requise
              </div>
              <div class="info-message" *ngIf="companies.length === 0">
                Aucune compagnie d'assurance disponible. Créez d'abord une compagnie.
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              id="description" 
              formControlName="description"
              class="form-control"
              rows="4"
              maxlength="1000"
              placeholder="Description détaillée du produit d'assurance..."></textarea>
            <small class="char-counter">
              {{ (productForm.get('description')?.value || '').length }}/1000 caractères
            </small>
          </div>
        </div>

        <!-- Paramètres financiers -->
        <div class="form-section">
          <h3>Paramètres financiers</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="base_premium">Prime annuelle (XAF) *</label>
              <input 
                type="number" 
                id="base_premium" 
                formControlName="base_premium"
                class="form-control"
                min="1000"
                max="10000000"
                step="1000"
                [class.invalid]="isFieldInvalid('base_premium')"
                placeholder="50000">
              <div class="error-message" *ngIf="isFieldInvalid('base_premium')">
                La prime est requise et doit être entre 1,000 et 10,000,000 XAF
              </div>
            </div>

            <div class="form-group">
              <label for="max_coverage">Couverture maximale (XAF)</label>
              <input 
                type="number" 
                id="max_coverage" 
                formControlName="max_coverage"
                class="form-control"
                min="0"
                max="5000000000"
                step="100000"
                placeholder="5000000">
              <small class="help-text">Montant maximum couvert par l'assurance</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="duration_years">Durée du contrat (années) *</label>
              <input 
                type="number" 
                id="duration_years" 
                formControlName="duration_years"
                class="form-control"
                min="1"
                max="50"
                [class.invalid]="isFieldInvalid('duration_years')"
                placeholder="20">
              <div class="error-message" *ngIf="isFieldInvalid('duration_years')">
                La durée est requise et doit être entre 1 et 50 ans
              </div>
            </div>

            <div class="form-group">
              <label for="deductible">Franchise standard (XAF)</label>
              <input 
                type="number" 
                id="deductible" 
                formControlName="deductible"
                class="form-control"
                min="0"
                max="1000000"
                step="1000"
                placeholder="10000">
              <small class="help-text">Montant restant à votre charge</small>
            </div>
          </div>
        </div>

        <!-- Critères d'éligibilité -->
        <div class="form-section">
          <h3>Critères d'éligibilité</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="age_min">Âge minimum *</label>
              <input 
                type="number" 
                id="age_min" 
                formControlName="age_min"
                class="form-control"
                min="0"
                max="100"
                [class.invalid]="isFieldInvalid('age_min') || hasAgeRangeError()"
                placeholder="18">
              <div class="error-message" *ngIf="isFieldInvalid('age_min')">
                L'âge minimum est requis
              </div>
            </div>

            <div class="form-group">
              <label for="age_max">Âge maximum *</label>
              <input 
                type="number" 
                id="age_max" 
                formControlName="age_max"
                class="form-control"
                min="0"
                max="100"
                [class.invalid]="isFieldInvalid('age_max') || hasAgeRangeError()"
                placeholder="65">
              <div class="error-message" *ngIf="isFieldInvalid('age_max')">
                L'âge maximum est requis
              </div>
            </div>
          </div>

          <div class="error-message" *ngIf="hasAgeRangeError()">
            L'âge maximum doit être supérieur à l'âge minimum
          </div>

          <div class="form-group">
            <label>Conditions médicales</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="requires_medical_exam">
                <span class="checkmark"></span>
                Examen médical requis
              </label>
              <label class="checkbox-label">
                <input type="checkbox" formControlName="accepts_preexisting_conditions">
                <span class="checkmark"></span>
                Accepte les conditions préexistantes
              </label>
            </div>
          </div>
        </div>

        <!-- Garanties -->
        <div class="form-section">
          <h3>Garanties incluses</h3>
          
          <div formArrayName="guarantees" class="guarantees-list">
            <div *ngFor="let guarantee of guaranteesArray.controls; let i = index" 
                 [formGroupName]="i" 
                 class="guarantee-item">
                            <div class="guarantee-header">
                <h4>Garantie {{ i + 1 }}</h4>
                <button 
                  type="button" 
                  (click)="removeGuarantee(i)"
                  class="btn btn-danger btn-sm"
                  [disabled]="guaranteesArray.length <= 1">
                  Supprimer
                </button>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Nom de la garantie *</label>
                  <input 
                    type="text" 
                    formControlName="name"
                    class="form-control"
                    [class.invalid]="isGuaranteeFieldInvalid(i, 'name')"
                    maxlength="100"
                    placeholder="Ex: Décès accidentel">
                  <div class="error-message" *ngIf="isGuaranteeFieldInvalid(i, 'name')">
                    Le nom de la garantie est requis (max. 100 caractères)
                  </div>
                </div>
                
                <div class="form-group">
                  <label>Montant (XAF) *</label>
                  <input 
                    type="number" 
                    formControlName="amount"
                    class="form-control"
                    min="1"
                    max="5000000000"
                    step="100000"
                    [class.invalid]="isGuaranteeFieldInvalid(i, 'amount')"
                    placeholder="1000000">
                  <div class="error-message" *ngIf="isGuaranteeFieldInvalid(i, 'amount')">
                    Le montant est requis et doit être positif (max. 5 milliards)
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label>Description</label>
                <textarea 
                  formControlName="description"
                  class="form-control"
                  rows="2"
                  maxlength="300"
                  placeholder="Description de la garantie..."></textarea>
                <small class="char-counter">
                  {{ (guarantee.get('description')?.value || '').length }}/300 caractères
                </small>
              </div>
            </div>
          </div>

          <button type="button" (click)="addGuarantee()" class="btn btn-outline">
            + Ajouter une garantie
          </button>
        </div>

        <!-- Caractéristiques et exclusions -->
        <div class="form-section">
          <h3>Caractéristiques et exclusions</h3>
          
          <div class="form-group">
            <label for="features">Caractéristiques</label>
            <textarea 
              id="features" 
              [(ngModel)]="featuresText"
              [ngModelOptions]="{standalone: true}"
              class="form-control"
              rows="3"
              maxlength="2000"
              placeholder="Saisissez les caractéristiques séparées par des retours à la ligne..."></textarea>
            <small class="help-text">Une caractéristique par ligne ({{ featuresCount }} caractéristiques)</small>
          </div>

          <div class="form-group">
            <label for="exclusions">Exclusions</label>
            <textarea 
              id="exclusions" 
              [(ngModel)]="exclusionsText"
              [ngModelOptions]="{standalone: true}"
              class="form-control"
              rows="3"
              maxlength="2000"
              placeholder="Saisissez les exclusions séparées par des retours à la ligne..."></textarea>
            <small class="help-text">Une exclusion par ligne ({{ exclusionsCount }} exclusions)</small>
          </div>
        </div>

        <!-- Options et conditions -->
        <div class="form-section">
          <h3>Options et conditions</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="is_renewable">
                <span class="checkmark"></span>
                Contrat renouvelable
              </label>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="has_waiting_period" (change)="onWaitingPeriodChange()">
                <span class="checkmark"></span>
                Période de carence
              </label>
            </div>
          </div>

          <div class="form-group" *ngIf="productForm.get('has_waiting_period')?.value">
            <label for="waiting_period_days">Durée de la période de carence (jours)</label>
            <input 
              type="number" 
              id="waiting_period_days" 
              formControlName="waiting_period_days"
              class="form-control"
              min="0"
              max="365"
              placeholder="30">
            <small class="help-text">Période pendant laquelle les garanties ne s'appliquent pas</small>
          </div>

          <div class="form-group">
            <label for="status">Statut</label>
            <select id="status" formControlName="status" class="form-control">
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>
        </div>

        <!-- Prévisualisation des données -->
        <div class="form-section" *ngIf="showPreview">
          <h3>Prévisualisation des données</h3>
          <div class="preview-data">
            <pre>{{ getPreviewData() | json }}</pre>
          </div>
          <button type="button" (click)="togglePreview()" class="btn btn-outline btn-sm">
            Masquer la prévisualisation
          </button>
        </div>

        <div class="form-actions">
          <button type="button" (click)="goBack()" class="btn btn-outline">
            Annuler
          </button>
          <button type="button" (click)="togglePreview()" class="btn btn-secondary" *ngIf="!showPreview">
            Prévisualiser les données
          </button>
          <button type="button" (click)="saveDraft()" class="btn btn-secondary" *ngIf="!isEditMode">
            Sauvegarder en brouillon
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="productForm.invalid || isSubmitting">
            <span *ngIf="isSubmitting" class="spinner-small"></span>
            {{ isSubmitting ? 'Enregistrement...' : (isEditMode ? 'Mettre à jour' : 'Créer le produit') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .product-form {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }

    .header h2 {
      color: #333;
      margin: 0;
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

    .alert {
      padding: 15px;
      margin-bottom: 20px;
      border: 1px solid transparent;
      border-radius: 6px;
    }

    .alert-error {
      color: #721c24;
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }

    .alert h4 {
      margin: 0 0 10px 0;
      font-size: 16px;
    }

    .alert ul {
      margin: 0;
      padding-left: 20px;
    }

    .form {
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

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #555;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.3s;
      background: #fafafa;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      background: white;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    .form-control.invalid {
      border-color: #dc3545;
      background: #fff5f5;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
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

    .error-message {
      color: #dc3545;
      font-size: 12px;
      margin-top: 5px;
      font-weight: 500;
    }

    .info-message {
      color: #0c5460;
      font-size: 12px;
      margin-top: 5px;
      padding: 8px 12px;
      background-color: #d1ecf1;
      border: 1px solid #bee5eb;
      border-radius: 4px;
    }

    .help-text {
      color: #666;
      font-size: 12px;
      margin-top: 5px;
      display: block;
    }

    .char-counter {
      color: #999;
      font-size: 11px;
      display: block;
      text-align: right;
      margin-top: 3px;
    }

    .guarantees-list {
      margin-bottom: 20px;
    }

    .guarantee-item {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .guarantee-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e9ecef;
    }

    .guarantee-header h4 {
      margin: 0;
      color: #333;
      font-size: 16px;
    }

    .preview-data {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 12px;
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

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #545b62;
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

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #c82333;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    @media (max-width: 768px) {
      .product-form {
        padding: 15px;
      }

      .header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column-reverse;
      }

      .guarantee-header {
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }
    }
  `]
})
export class InsuranceProductFormComponent implements OnInit, OnDestroy {
  productForm!: FormGroup;
  companies: InsuranceCompany[] = [];
  insuranceTypes: any[] = [];
  formErrors: string[] = [];
  
  isEditMode = false;
  productId?: string;
  isLoading = false;
  isSubmitting = false;
  showPreview = false;
  
  featuresText = '';
  exclusionsText = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private insuranceAdminService: InsuranceAdminService,
    private notificationService: NotificationService
  ) {
    this.insuranceTypes = this.insuranceAdminService.getInsuranceTypes();
  }

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEditMode = !!this.productId;
    
    this.createForm();
    this.loadCompanies();
    
    if (this.isEditMode) {
      this.loadProduct();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get featuresCount(): number {
    return this.featuresText.split('\n').filter(f => f.trim().length > 0).length;
  }

  get exclusionsCount(): number {
    return this.exclusionsText.split('\n').filter(e => e.trim().length > 0).length;
  }

  private createForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      type: ['', Validators.required],
      description: ['', [Validators.maxLength(1000)]],
      insurance_company_id: ['', Validators.required],
      base_premium: [0, [Validators.required, Validators.min(1000), Validators.max(10000000)]],
      max_coverage: [0, [Validators.min(0), Validators.max(5000000000)]],
      duration_years: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
      deductible: [0, [Validators.min(0), Validators.max(1000000)]],
      age_min: [18, [Validators.required, Validators.min(0), Validators.max(100)]],
      age_max: [65, [Validators.required, Validators.min(0), Validators.max(100)]],
      requires_medical_exam: [false],
      accepts_preexisting_conditions: [false],
      guarantees: this.fb.array([]),
      is_renewable: [true],
      has_waiting_period: [false],
      waiting_period_days: [0, [Validators.min(0), Validators.max(365)]],
      status: ['active']
    }, { validators: this.ageRangeValidator });

    // Ajouter une garantie par défaut
    this.addGuarantee();
  }

  get guaranteesArray() {
    return this.productForm.get('guarantees') as FormArray;
  }

  private ageRangeValidator(form: FormGroup) {
    const ageMin = form.get('age_min')?.value;
    const ageMax = form.get('age_max')?.value;
    
    if (ageMin && ageMax && ageMin >= ageMax) {
      return { ageRangeInvalid: true };
    }
    return null;
  }

  private loadCompanies() {
    this.insuranceAdminService.getInsuranceCompanies({ is_active: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.companies = response.companies;
          if (this.companies.length === 0) {
            this.formErrors.push('Aucune compagnie d\'assurance active trouvée. Créez d\'abord une compagnie.');
          }
        },
        error: (error) => {
          console.error('Erreur chargement compagnies:', error);
          this.notificationService.showError('Impossible de charger les compagnies d\'assurance');
          this.formErrors.push('Erreur de chargement des compagnies d\'assurance');
        }
      });
  }

  private loadProduct() {
    if (!this.productId) return;
    
    this.isLoading = true;
    
    this.insuranceAdminService.getInsuranceProduct(this.productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.populateForm(product);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement produit:', error);
          this.notificationService.showError('Impossible de charger le produit');
          this.router.navigate(['/admin/insurance-products']);
        }
      });
  }

  private populateForm(product: InsuranceProductAdmin) {
    // Vider les garanties existantes
    while (this.guaranteesArray.length !== 0) {
      this.guaranteesArray.removeAt(0);
    }

    // Extraire les garanties du coverage_details
    const guarantees: Guarantee[] = [];
    if (product.coverage_details && typeof product.coverage_details === 'object') {
      Object.entries(product.coverage_details).forEach(([name, details]: [string, any]) => {
        if (typeof details === 'object' && details.amount) {
          guarantees.push({
            name,
            amount: details.amount || 0,
            description: details.description || ''
          });
        }
      });
    }

    // Ajouter les garanties au FormArray
    guarantees.forEach(guarantee => {
      this.guaranteesArray.push(this.createGuaranteeGroup(guarantee));
    });

    // Si aucune garantie, ajouter une garantie vide
    if (guarantees.length === 0) {
      this.addGuarantee();
    }

    // Remplir le formulaire avec validation des valeurs
    const formValues = {
      name: product.name || '',
      type: product.type || '',
      description: product.description || '',
      insurance_company_id: product.insurance_company_id || '',
      base_premium: product.base_premium || 0,
      max_coverage: product.coverage_details?.max_coverage || 0,
      duration_years: product.coverage_details?.duration_years || 1,
      deductible: product.deductible_options?.standard || 0,
      age_min: product.age_limits?.min_age || 18,
      age_max: product.age_limits?.max_age || 65,
      requires_medical_exam: product.coverage_details?.requires_medical_exam || false,
      accepts_preexisting_conditions: product.coverage_details?.accepts_preexisting_conditions || false,
      is_renewable: product.coverage_details?.is_renewable !== false,
      has_waiting_period: product.coverage_details?.has_waiting_period || false,
      waiting_period_days: product.coverage_details?.waiting_period_days || 0,
      status: product.is_active ? 'active' : 'inactive'
    };

    this.productForm.patchValue(formValues);

    // Remplir les textes des caractéristiques et exclusions
    this.featuresText = Array.isArray(product.features) ? product.features.join('\n') : '';
    this.exclusionsText = Array.isArray(product.exclusions) ? product.exclusions.join('\n') : '';
  }

  onTypeChange() {
    const type = this.productForm.get('type')?.value;
    
    // Ajuster les valeurs par défaut selon le type
    const defaults: { [key: string]: any } = {
      vie: {
        duration_years: 20,
        age_min: 18,
        age_max: 65,
        requires_medical_exam: true,
        base_premium: 50000
      },
      sante: {
        duration_years: 1,
        age_min: 0,
        age_max: 80,
        requires_medical_exam: false,
        base_premium: 30000
      },
      auto: {
        duration_years: 1,
        age_min: 18,
        age_max: 75,
        requires_medical_exam: false,
        base_premium: 75000
      },
      habitation: {
        duration_years: 1,
        age_min: 18,
        age_max: 99,
        requires_medical_exam: false,
        base_premium: 40000
      },
      voyage: {
        duration_years: 1,
        age_min: 0,
        age_max: 99,
        requires_medical_exam: false,
        base_premium: 15000
      }
    };

    const typeDefaults = defaults[type];
    if (typeDefaults && !this.isEditMode) {
      this.productForm.patchValue(typeDefaults);
    }
  }

  onWaitingPeriodChange() {
    const hasWaitingPeriod = this.productForm.get('has_waiting_period')?.value;
    if (!hasWaitingPeriod) {
      this.productForm.patchValue({ waiting_period_days: 0 });
    } else if (this.productForm.get('waiting_period_days')?.value === 0) {
      this.productForm.patchValue({ waiting_period_days: 30 });
    }
  }

  addGuarantee() {
    this.guaranteesArray.push(this.createGuaranteeGroup());
  }

  private createGuaranteeGroup(guarantee?: Guarantee) {
    return this.fb.group({
      name: [guarantee?.name || '', [Validators.required, Validators.maxLength(100)]],
      amount: [guarantee?.amount || 0, [Validators.required, Validators.min(1), Validators.max(5000000000)]],
      description: [guarantee?.description || '', [Validators.maxLength(300)]]
    });
  }

  removeGuarantee(index: number) {
    if (this.guaranteesArray.length > 1) {
      this.guaranteesArray.removeAt(index);
    } else {
      this.notificationService.showWarning('Au moins une garantie est requise');
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isGuaranteeFieldInvalid(guaranteeIndex: number, fieldName: string): boolean {
    const guarantee = this.guaranteesArray.at(guaranteeIndex);
    const field = guarantee?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  hasAgeRangeError(): boolean {
    const form = this.productForm;
    return !!(form.errors?.['ageRangeInvalid'] && 
             (form.get('age_min')?.touched || form.get('age_max')?.touched));
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  getPreviewData() {
    const formData = this.productForm.value;
    return this.buildProductData(formData);
  }

  saveDraft() {
    this.productForm.patchValue({ status: 'draft' });
    this.onSubmit();
  }

  onSubmit() {
    // Valider le formulaire
    this.formErrors = [];
    
    if (this.productForm.invalid) {
      this.validateForm();
      this.productForm.markAllAsTouched();
      this.notificationService.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (this.companies.length === 0) {
      this.formErrors.push('Aucune compagnie d\'assurance disponible');
      return;
    }

    if (!this.isSubmitting) {
      this.isSubmitting = true;
      
      const formData = this.productForm.value;
      const productData = this.buildProductData(formData);
      
      console.log('Données envoyées:', productData);
      
      const request = this.isEditMode 
        ? this.insuranceAdminService.updateInsuranceProduct(this.productId!, productData)
        : this.insuranceAdminService.createInsuranceProduct(productData);
      
      request.pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            const action = this.isEditMode ? 'mis à jour' : 'créé';
            this.notificationService.showSuccess(`Produit ${action} avec succès`);
            this.router.navigate(['/admin/insurance-products']);
          },
          error: (error) => {
            console.error('Erreur sauvegarde:', error);
            let message = 'Erreur lors de la sauvegarde';
            
            if (error.error?.detail) {
              if (typeof error.error.detail === 'string') {
                message = error.error.detail;
              } else if (error.error.detail.error) {
                message = error.error.detail.error;
              }
            }
            
            this.notificationService.showError(message);
            this.isSubmitting = false;
          }
        });
    }
  }

  private validateForm() {
    const form = this.productForm;
    
    // Vérifications de base
    if (!form.get('name')?.value?.trim()) {
      this.formErrors.push('Le nom du produit est requis');
    }
    
    if (!form.get('type')?.value) {
      this.formErrors.push('Le type d\'assurance est requis');
    }
    
    if (!form.get('insurance_company_id')?.value) {
      this.formErrors.push('La compagnie d\'assurance est requise');
    }
    
    if (!form.get('base_premium')?.value || form.get('base_premium')?.value <= 0) {
      this.formErrors.push('La prime de base doit être supérieure à 0');
    }
    
    // Vérification des garanties
    const guarantees = this.guaranteesArray;
    let hasValidGuarantee = false;
    
    for (let i = 0; i < guarantees.length; i++) {
      const guarantee = guarantees.at(i);
      if (guarantee.get('name')?.value?.trim() && guarantee.get('amount')?.value > 0) {
        hasValidGuarantee = true;
        break;
      }
    }
    
    if (!hasValidGuarantee) {
      this.formErrors.push('Au moins une garantie valide est requise');
    }
  }

  private buildProductData(formData: any): InsuranceProductCreate {
    // Construire les garanties avec validation stricte
    const guarantees: Guarantee[] = [];
    
    formData.guarantees?.forEach((g: any) => {
      if (g.name?.trim() && g.amount > 0) {
        guarantees.push({
          name: g.name.trim(),
          amount: Number(g.amount),
          description: g.description ? g.description.trim() : ''
        });
      }
    });

    // Construire les caractéristiques et exclusions comme arrays
    const features = this.featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const exclusions = this.exclusionsText
      .split('\n')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    // Construire les détails de couverture avec validation des types
    const coverage_details = {
      max_coverage: Number(formData.max_coverage) || 0,
      duration_years: Number(formData.duration_years) || 1,
      requires_medical_exam: Boolean(formData.requires_medical_exam),
      accepts_preexisting_conditions: Boolean(formData.accepts_preexisting_conditions),
      is_renewable: Boolean(formData.is_renewable),
      has_waiting_period: Boolean(formData.has_waiting_period),
      waiting_period_days: Number(formData.waiting_period_days) || 0
    };

    // Construire les franchises comme objet
    const deductibles = {
      standard: Number(formData.deductible) || 0
    };

    // Construire les limites d'âge comme objet
    const age_limits = {
      min_age: Number(formData.age_min) || 18,
      max_age: Number(formData.age_max) || 65
    };

    // Validation finale des données avant envoi
    const productData: InsuranceProductCreate = {
      name: String(formData.name || '').trim(),
      type: String(formData.type || '').trim(),
      description: formData.description ? String(formData.description).trim() : '',
      insurance_company_id: String(formData.insurance_company_id || '').trim(),
      base_premium: Number(formData.base_premium) || 0,
      coverage_details,
      deductibles,
      age_limits,
      exclusions,
      features,
      guarantees,
      max_coverage: Number(formData.max_coverage) || 0,
      duration_years: Number(formData.duration_years) || 1,
      age_min: Number(formData.age_min) || 18,
      age_max: Number(formData.age_max) || 65,
      requires_medical_exam: Boolean(formData.requires_medical_exam),
      accepts_preexisting_conditions: Boolean(formData.accepts_preexisting_conditions),
      is_renewable: Boolean(formData.is_renewable),
      has_waiting_period: Boolean(formData.has_waiting_period),
      waiting_period_days: Number(formData.waiting_period_days) || 0,
      status: String(formData.status || 'active'),
      is_active: formData.status !== 'inactive'
    };

    // Validation finale
    if (!productData.name) throw new Error('Le nom du produit est requis');
    if (!productData.type) throw new Error('Le type est requis');
    if (!productData.insurance_company_id) throw new Error('La compagnie est requise');
    if (productData.base_premium <= 0) throw new Error('La prime doit être positive');
    if (guarantees.length === 0) throw new Error('Au moins une garantie est requise');

    console.log('Données produit construites et validées:', productData);
    return productData;
  }

  goBack() {
    if (this.productForm.dirty && !confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?')) {
      return;
    }
    this.router.navigate(['/admin/insurance-products']);
  }
}