import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { 
  SavingsProductsService, 
  SavingsProductCreate, 
  SavingsProductUpdate, 
  Bank 
} from '../services/savings-products.service';

@Component({
  selector: 'app-savings-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="product-form">
      <div class="header">
        <h2>{{ isEditMode ? 'Modifier' : 'Créer' }} un Produit d'Épargne</h2>
      </div>

      <!-- Affichage des erreurs -->
      <div class="alert alert-danger" *ngIf="errorMessage">
        {{ errorMessage }}
      </div>

      <form [formGroup]="productForm" (ngSubmit)="onSubmit()" class="form">
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
                [class.invalid]="isFieldInvalid('name')">
              <div class="error-message" *ngIf="isFieldInvalid('name')">
                <span *ngIf="productForm.get('name')?.errors?.['required']">Le nom du produit est requis</span>
                <span *ngIf="productForm.get('name')?.errors?.['minlength']">Le nom doit contenir au moins 3 caractères</span>
              </div>
            </div>

            <div class="form-group">
              <label for="bank_id">Banque *</label>
              <select 
                id="bank_id" 
                formControlName="bank_id"
                class="form-control"
                [class.invalid]="isFieldInvalid('bank_id')">
                <option value="">Sélectionner une banque</option>
                <option *ngFor="let bank of banks" [value]="bank.id">
                  {{ bank.name }}
                </option>
              </select>
              <div class="error-message" *ngIf="isFieldInvalid('bank_id')">
                La banque est requise
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="type">Type de produit *</label>
              <select 
                id="type" 
                formControlName="type"
                class="form-control"
                [class.invalid]="isFieldInvalid('type')">
                <option value="">Sélectionner un type</option>
                <option value="livret">Livret d'épargne</option>
                <option value="terme">Dépôt à terme</option>
                <option value="plan_epargne">Plan d'épargne</option>
                <option value="professionnel">Épargne professionnelle</option>
              </select>
              <div class="error-message" *ngIf="isFieldInvalid('type')">
                Le type de produit est requis
              </div>
            </div>

            <div class="form-group">
              <label for="liquidity">Type de liquidité *</label>
              <select 
                id="liquidity" 
                formControlName="liquidity"
                class="form-control"
                [class.invalid]="isFieldInvalid('liquidity')">
                <option value="">Sélectionner la liquidité</option>
                <option value="immediate">Immédiate</option>
                <option value="notice">Avec préavis</option>
                <option value="term">À terme</option>
              </select>
              <div class="error-message" *ngIf="isFieldInvalid('liquidity')">
                Le type de liquidité est requis
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
              placeholder="Description détaillée du produit d'épargne..."></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>Paramètres financiers</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="interest_rate">Taux d'intérêt (%) *</label>
              <input 
                type="number" 
                id="interest_rate" 
                formControlName="interest_rate"
                class="form-control"
                step="0.01"
                min="0"
                max="100"
                [class.invalid]="isFieldInvalid('interest_rate')">
              <div class="error-message" *ngIf="isFieldInvalid('interest_rate')">
                <span *ngIf="productForm.get('interest_rate')?.errors?.['required']">Le taux d'intérêt est requis</span>
                <span *ngIf="productForm.get('interest_rate')?.errors?.['min'] || productForm.get('interest_rate')?.errors?.['max']">
                  Le taux doit être entre 0 et 100%
                </span>
              </div>
            </div>

            <div class="form-group">
              <label for="compounding_frequency">Fréquence de capitalisation *</label>
              <select 
                id="compounding_frequency" 
                formControlName="compounding_frequency"
                class="form-control"
                [class.invalid]="isFieldInvalid('compounding_frequency')">
                <option value="">Sélectionner la fréquence</option>
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
                <option value="quarterly">Trimestrielle</option>
                <option value="annually">Annuelle</option>
              </select>
              <div class="error-message" *ngIf="isFieldInvalid('compounding_frequency')">
                La fréquence de capitalisation est requise
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="minimum_deposit">Dépôt minimum (XAF) *</label>
              <input 
                type="number" 
                id="minimum_deposit" 
                formControlName="minimum_deposit"
                class="form-control"
                min="0"
                [class.invalid]="isFieldInvalid('minimum_deposit')">
              <div class="error-message" *ngIf="isFieldInvalid('minimum_deposit')">
                Le dépôt minimum est requis et doit être positif
              </div>
            </div>

            <div class="form-group">
              <label for="maximum_deposit">Dépôt maximum (XAF)</label>
              <input 
                type="number" 
                id="maximum_deposit" 
                formControlName="maximum_deposit"
                class="form-control"
                min="0"
                [class.invalid]="isFieldInvalid('maximum_deposit')">
              <div class="error-message" *ngIf="isFieldInvalid('maximum_deposit')">
                Le dépôt maximum doit être positif
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="minimum_balance">Solde minimum (XAF) *</label>
              <input 
                type="number" 
                id="minimum_balance" 
                formControlName="minimum_balance"
                class="form-control"
                min="0"
                [class.invalid]="isFieldInvalid('minimum_balance')">
              <div class="error-message" *ngIf="isFieldInvalid('minimum_balance')">
                Le solde minimum est requis
              </div>
            </div>

            <div class="form-group">
              <label for="term_months">Durée (mois)</label>
              <input 
                type="number" 
                id="term_months" 
                formControlName="term_months"
                class="form-control"
                min="1"
                max="600"
                [class.invalid]="isFieldInvalid('term_months')">
              <div class="error-message" *ngIf="isFieldInvalid('term_months')">
                La durée doit être entre 1 et 600 mois
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="notice_period_days">Période de préavis (jours) *</label>
              <input 
                type="number" 
                id="notice_period_days" 
                formControlName="notice_period_days"
                class="form-control"
                min="0"
                max="365"
                [class.invalid]="isFieldInvalid('notice_period_days')">
              <div class="error-message" *ngIf="isFieldInvalid('notice_period_days')">
                La période de préavis est requise (0-365 jours)
              </div>
            </div>

            <div class="form-group">
              <label for="early_withdrawal_penalty">Pénalité retrait anticipé (%)</label>
              <input 
                type="number" 
                id="early_withdrawal_penalty" 
                formControlName="early_withdrawal_penalty"
                class="form-control"
                step="0.01"
                min="0"
                max="100"
                [class.invalid]="isFieldInvalid('early_withdrawal_penalty')">
              <div class="error-message" *ngIf="isFieldInvalid('early_withdrawal_penalty')">
                La pénalité doit être entre 0 et 100%
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="risk_level">Niveau de risque *</label>
            <select 
              id="risk_level" 
              formControlName="risk_level"
              class="form-control"
              [class.invalid]="isFieldInvalid('risk_level')">
              <option value="">Sélectionner le niveau</option>
              <option value="1">1 - Très faible</option>
              <option value="2">2 - Faible</option>
              <option value="3">3 - Modéré</option>
              <option value="4">4 - Élevé</option>
              <option value="5">5 - Très élevé</option>
            </select>
            <div class="error-message" *ngIf="isFieldInvalid('risk_level')">
              Le niveau de risque est requis
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Options et conditions</h3>
          
          <div class="form-group">
            <label>
              <input 
                type="checkbox" 
                formControlName="is_islamic_compliant"
                class="checkbox">
              Conforme à la finance islamique
            </label>
          </div>

          <div class="form-group">
            <label>
              <input 
                type="checkbox" 
                formControlName="is_featured"
                class="checkbox">
              Produit en vedette
            </label>
          </div>

          <div class="form-group">
            <label>
              <input 
                type="checkbox" 
                formControlName="is_active"
                class="checkbox">
              Produit actif
            </label>
          </div>

          <div class="form-group">
            <label for="features">Caractéristiques (une par ligne)</label>
            <textarea 
              id="features" 
              formControlName="featuresText"
              class="form-control"
              rows="4"
              placeholder="Saisissez les caractéristiques, une par ligne..."></textarea>
          </div>

          <div class="form-group">
            <label for="advantages">Avantages (une par ligne)</label>
            <textarea 
              id="advantages" 
              formControlName="advantagesText"
              class="form-control"
              rows="4"
              placeholder="Saisissez les avantages, une par ligne..."></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" (click)="goBack()" class="btn btn-outline" [disabled]="isLoading">
            Annuler
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="productForm.invalid || isLoading">
            <span *ngIf="isLoading">
              {{ isEditMode ? 'Mise à jour...' : 'Création...' }}
            </span>
            <span *ngIf="!isLoading">
              {{ isEditMode ? 'Mettre à jour' : 'Créer' }}
            </span>
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
      margin-bottom: 30px;
    }

    .header h2 {
      color: #333;
      font-size: 28px;
      font-weight: 600;
    }

    .alert {
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 20px;
    }

    .alert-danger {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }

    .form {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }

    .form-section {
      margin-bottom: 40px;
    }

    .form-section h3 {
      margin-bottom: 25px;
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
      font-size: 20px;
      font-weight: 600;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
        gap: 20px;
      }
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

    .form-control {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    .form-control.invalid {
      border-color: #dc3545;
      box-shadow: 0 0 0 3px rgba(220,53,69,0.1);
    }

    .checkbox {
      margin-right: 10px;
      transform: scale(1.1);
    }

    .error-message {
      color: #dc3545;
      font-size: 12px;
      margin-top: 6px;
      display: block;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #eee;
    }

    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      font-size: 14px;
      min-width: 120px;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .btn-outline {
      border: 1px solid #ddd;
      background: white;
      color: #333;
    }

    .btn-outline:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #adb5bd;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    textarea.form-control {
      resize: vertical;
      font-family: inherit;
    }

    input[type="number"].form-control {
      -moz-appearance: textfield;
    }

    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `]
})
export class SavingsProductFormComponent implements OnInit, OnDestroy {
  productForm: FormGroup;
  isEditMode = false;
  productId?: string;
  isLoading = false;
  errorMessage: string | null = null;
  banks: Bank[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private savingsProductsService: SavingsProductsService
  ) {
    this.productForm = this.createForm();
  }

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEditMode = !!this.productId;

    // Charger les banques
    this.loadBanks();

    // S'abonner aux changements de statut de chargement et d'erreur
    this.savingsProductsService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.isLoading = loading);

    this.savingsProductsService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.errorMessage = error);

    if (this.isEditMode && this.productId) {
      this.loadProduct();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createForm(): FormGroup {
    return this.fb.group({
      // Informations de base
      bank_id: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: ['', Validators.required],
      description: [''],
      
      // Paramètres financiers
      interest_rate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      minimum_deposit: [0, [Validators.required, Validators.min(0)]],
      maximum_deposit: [null],
      minimum_balance: [0, [Validators.required, Validators.min(0)]],
      liquidity: ['', Validators.required],
      notice_period_days: [0, [Validators.required, Validators.min(0), Validators.max(365)]],
      term_months: [null, [Validators.min(1), Validators.max(600)]],
      compounding_frequency: ['', Validators.required],
      
      // Gestion des risques
      risk_level: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      early_withdrawal_penalty: [0, [Validators.min(0), Validators.max(100)]],
      
      // Options
      is_islamic_compliant: [false],
      is_featured: [false],
      is_active: [true],
      
      // Champs textuels pour les listes
      featuresText: [''],
      advantagesText: ['']
    });
  }

  loadBanks() {
    this.savingsProductsService.getBanks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.banks = response.banks;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des banques:', error);
          this.errorMessage = 'Impossible de charger la liste des banques';
        }
      });
  }

  loadProduct() {
    if (!this.productId) return;

    this.savingsProductsService.getProduct(this.productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          // Remplir le formulaire avec les données du produit
          this.productForm.patchValue({
            bank_id: product.bank_id,
            name: product.name,
            type: product.type,
            description: product.description || '',
            interest_rate: product.interest_rate,
            minimum_deposit: product.minimum_deposit,
            maximum_deposit: product.maximum_deposit,
            minimum_balance: product.minimum_balance,
            liquidity: product.liquidity,
            notice_period_days: product.notice_period_days,
            term_months: product.term_months,
            compounding_frequency: product.compounding_frequency,
            risk_level: product.risk_level,
            early_withdrawal_penalty: product.early_withdrawal_penalty || 0,
            is_islamic_compliant: product.is_islamic_compliant,
            is_featured: product.is_featured,
            is_active: product.is_active,
            featuresText: product.features?.join('\n') || '',
            advantagesText: product.advantages?.join('\n') || ''
          });
        },
        error: (error) => {
          console.error('Erreur lors du chargement du produit:', error);
          this.errorMessage = 'Impossible de charger les données du produit';
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit() {
    if (this.productForm.valid) {
      this.errorMessage = null;
      
      const formValue = this.productForm.value;
      
      // Préparer les données pour l'API
      const productData: SavingsProductCreate | SavingsProductUpdate = {
        bank_id: formValue.bank_id,
        name: formValue.name.trim(),
        type: formValue.type,
        description: formValue.description?.trim() || undefined,
        interest_rate: formValue.interest_rate,
        minimum_deposit: formValue.minimum_deposit,
        maximum_deposit: formValue.maximum_deposit || undefined,
        minimum_balance: formValue.minimum_balance,
        liquidity: formValue.liquidity,
        notice_period_days: formValue.notice_period_days,
        term_months: formValue.term_months || undefined,
        compounding_frequency: formValue.compounding_frequency,
        risk_level: parseInt(formValue.risk_level, 10),
        early_withdrawal_penalty: formValue.early_withdrawal_penalty || undefined,
        is_islamic_compliant: formValue.is_islamic_compliant,
        is_featured: formValue.is_featured,
        is_active: formValue.is_active,
        
        // Convertir les textes en tableaux
        features: formValue.featuresText ? 
          formValue.featuresText.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0) : [],
        advantages: formValue.advantagesText ? 
          formValue.advantagesText.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0) : []
      };

      // Validation côté client
      const validationErrors = this.savingsProductsService.validateProduct(productData);
      if (validationErrors.length > 0) {
        this.errorMessage = validationErrors.join(', ');
        return;
      }

      // Appel API
      const apiCall = this.isEditMode && this.productId ? 
        this.savingsProductsService.updateProduct(this.productId, productData as SavingsProductUpdate) :
        this.savingsProductsService.createProduct(productData as SavingsProductCreate);

      apiCall.pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Produit sauvegardé avec succès:', response);
            this.router.navigate(['/admin/savings-products']);
          },
          error: (error) => {
            console.error('Erreur lors de la sauvegarde:', error);
            // L'erreur est déjà gérée par le service
          }
        });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsTouched();
      });
    }
  }

  goBack() {
    this.router.navigate(['/admin/savings-products']);
  }
}