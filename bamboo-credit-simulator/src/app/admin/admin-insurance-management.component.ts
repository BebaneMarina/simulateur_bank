// insurance-companies-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InsuranceService } from '../services/insurance.service';
import { 
  InsuranceCompany, 
  InsuranceProduct,
  PaginatedResponse,
  InsuranceCompanyFilters,
  InsuranceProductFilters 
} from '../models/insurance.interfaces';

@Component({
  selector: 'app-insurance-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="insurance-management-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Gestion des Assurances</h1>
          <div class="header-actions">
            <button 
              class="btn-primary"
              (click)="openCreateCompanyModal()">
              + Nouvelle Compagnie
            </button>
            <button 
              class="btn-secondary"
              (click)="openCreateProductModal()"
              [disabled]="companies.length === 0">
              + Nouveau Produit
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-container">
        <div class="tabs-nav">
          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'companies'"
            (click)="setActiveTab('companies')">
            Compagnies d'Assurance ({{ companies.length }})
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'products'"
            (click)="setActiveTab('products')">
            Produits d'Assurance ({{ products.length }})
          </button>
        </div>
      </div>

      <!-- Companies Tab -->
      <div *ngIf="activeTab === 'companies'" class="tab-content">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <input 
              type="text" 
              placeholder="Rechercher une compagnie..."
              [(ngModel)]="companyFilters.search"
              (input)="applyCompanyFilters()">
          </div>
          <div class="filter-controls">
            <select 
              [(ngModel)]="companyFilters.status"
              (change)="applyCompanyFilters()">
              <option value="">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
            <select 
              [(ngModel)]="companyFilters.specialty"
              (change)="applyCompanyFilters()">
              <option value="">Toutes spécialités</option>
              <option value="auto">Auto</option>
              <option value="habitation">Habitation</option>
              <option value="vie">Vie</option>
              <option value="sante">Santé</option>
              <option value="voyage">Voyage</option>
            </select>
          </div>
        </div>

        <!-- Companies Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Compagnie</th>
                <th>Contact</th>
                <th>Spécialités</th>
                <th>Solvabilité</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let company of filteredCompanies">
                <td>
                  <div class="company-cell">
                    <img 
                      *ngIf="company.logo_url" 
                      [src]="company.logo_url" 
                      [alt]="company.name"
                      class="company-logo">
                    <div class="company-info">
                      <div class="company-name">{{ company.name }}</div>
                      <div class="company-full-name">{{ company.full_name }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="contact-info">
                    <div *ngIf="company.contact_phone">{{ company.contact_phone }}</div>
                    <div *ngIf="company.contact_email" class="email">{{ company.contact_email }}</div>
                  </div>
                </td>
                <td>
                  <div class="specialties">
                    <span 
                      *ngFor="let specialty of company.specialties" 
                      class="specialty-badge">
                      {{ getSpecialtyLabel(specialty) }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="solvency-info">
                    <span *ngIf="company.solvency_ratio" class="ratio">
                      {{ company.solvency_ratio }}%
                    </span>
                    <div class="rating" *ngIf="company.rating">
                      Note: {{ company.rating }}
                    </div>
                  </div>
                </td>
                <td>
                  <span 
                    class="status-badge"
                    [class.active]="company.is_active"
                    [class.inactive]="!company.is_active">
                    {{ company.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button 
                      class="btn-icon"
                      (click)="editCompany(company)"
                      title="Modifier">
                      ✏️
                    </button>
                    <button 
                      class="btn-icon"
                      (click)="viewCompanyProducts(company.id)"
                      title="Voir les produits">
                      📋
                    </button>
                    <button 
                      class="btn-icon danger"
                      (click)="deleteCompany(company.id)"
                      title="Supprimer">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Products Tab -->
      <div *ngIf="activeTab === 'products'" class="tab-content">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <input 
              type="text" 
              placeholder="Rechercher un produit..."
              [(ngModel)]="productFilters.search"
              (input)="applyProductFilters()">
          </div>
          <div class="filter-controls">
            <select 
              [(ngModel)]="productFilters.company"
              (change)="applyProductFilters()">
              <option value="">Toutes les compagnies</option>
              <option *ngFor="let company of companies" [value]="company.id">
                {{ company.name }}
              </option>
            </select>
            <select 
              [(ngModel)]="productFilters.type"
              (change)="applyProductFilters()">
              <option value="">Tous les types</option>
              <option value="auto">Automobile</option>
              <option value="habitation">Habitation</option>
              <option value="vie">Vie</option>
              <option value="sante">Santé</option>
              <option value="voyage">Voyage</option>
            </select>
            <select 
              [(ngModel)]="productFilters.status"
              (change)="applyProductFilters()">
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
        </div>

        <!-- Products Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Compagnie</th>
                <th>Type</th>
                <th>Prime de base</th>
                <th>Couverture</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let product of filteredProducts">
                <td>
                  <div class="product-cell">
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-description">{{ product.description }}</div>
                  </div>
                </td>
                <td>
                  <div class="company-name">
                    {{ getCompanyName(product.insurance_company_id) }}
                  </div>
                </td>
                <td>
                  <span class="type-badge" [class]="'type-' + product.type">
                    {{ getTypeLabel(product.type) }}
                  </span>
                </td>
                <td>
                  <div class="premium-info">
                    {{ formatCurrency(product.base_premium) }}
                  </div>
                </td>
                <td>
                  <div class="coverage-info">
                    <div *ngIf="product.min_coverage">
                      Min: {{ formatCurrency(product.min_coverage) }}
                    </div>
                    <div *ngIf="product.max_coverage">
                      Max: {{ formatCurrency(product.max_coverage) }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="status-indicators">
                    <span 
                      class="status-badge"
                      [class.active]="product.is_active"
                      [class.inactive]="!product.is_active">
                      {{ product.is_active ? 'Actif' : 'Inactif' }}
                    </span>
                    <span 
                      *ngIf="product.is_featured" 
                      class="featured-badge">
                      Mis en avant
                    </span>
                  </div>
                </td>
                <td>
                  <div class="actions">
                    <button 
                      class="btn-icon"
                      (click)="editProduct(product)"
                      title="Modifier">
                      ✏️
                    </button>
                    <button 
                      class="btn-icon"
                      (click)="duplicateProduct(product)"
                      title="Dupliquer">
                      📋
                    </button>
                    <button 
                      class="btn-icon danger"
                      (click)="deleteProduct(product.id)"
                      title="Supprimer">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Company Modal -->
      <div *ngIf="showCompanyModal" class="modal-overlay" (click)="closeCompanyModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingCompany ? 'Modifier' : 'Créer' }} une Compagnie d'Assurance</h2>
            <button class="close-btn" (click)="closeCompanyModal()">×</button>
          </div>
          
          <form [formGroup]="companyForm" (ngSubmit)="saveCompany()">
            <div class="modal-body">
              <!-- Basic Info -->
              <div class="form-section">
                <h3>Informations générales</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="companyId">ID Compagnie *</label>
                    <input 
                      type="text" 
                      id="companyId"
                      formControlName="id"
                      [readonly]="editingCompany"
                      class="form-control">
                  </div>
                  
                  <div class="form-group">
                    <label for="companyName">Nom commercial *</label>
                    <input 
                      type="text" 
                      id="companyName"
                      formControlName="name"
                      class="form-control">
                  </div>
                  
                  <div class="form-group span-2">
                    <label for="companyFullName">Dénomination complète</label>
                    <input 
                      type="text" 
                      id="companyFullName"
                      formControlName="full_name"
                      class="form-control">
                  </div>
                  
                  <div class="form-group span-2">
                    <label for="companyDescription">Description</label>
                    <textarea 
                      id="companyDescription"
                      formControlName="description"
                      class="form-control"
                      rows="3"></textarea>
                  </div>
                </div>
              </div>

              <!-- Contact Info -->
              <div class="form-section">
                <h3>Informations de contact</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="companyPhone">Téléphone</label>
                    <input 
                      type="tel" 
                      id="companyPhone"
                      formControlName="contact_phone"
                      class="form-control">
                  </div>
                  
                  <div class="form-group">
                    <label for="companyEmail">Email</label>
                    <input 
                      type="email" 
                      id="companyEmail"
                      formControlName="contact_email"
                      class="form-control">
                  </div>
                  
                  <div class="form-group">
                    <label for="companyWebsite">Site web</label>
                    <input 
                      type="url" 
                      id="companyWebsite"
                      formControlName="website"
                      class="form-control">
                  </div>
                  
                  <div class="form-group span-2">
                    <label for="companyAddress">Adresse</label>
                    <textarea 
                      id="companyAddress"
                      formControlName="address"
                      class="form-control"
                      rows="2"></textarea>
                  </div>
                </div>
              </div>

              <!-- Legal Info -->
              <div class="form-section">
                <h3>Informations légales</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="licenseNumber">Numéro d'agrément</label>
                    <input 
                      type="text" 
                      id="licenseNumber"
                      formControlName="license_number"
                      class="form-control">
                  </div>
                  
                  <div class="form-group">
                    <label for="establishedYear">Année de création</label>
                    <input 
                      type="number" 
                      id="establishedYear"
                      formControlName="established_year"
                      class="form-control"
                      min="1900" 
                      max="2024">
                  </div>
                  
                  <div class="form-group">
                    <label for="solvencyRatio">Ratio de solvabilité (%)</label>
                    <input 
                      type="number" 
                      id="solvencyRatio"
                      formControlName="solvency_ratio"
                      class="form-control"
                      min="0" 
                      max="1000"
                      step="0.01">
                  </div>
                  
                  <div class="form-group">
                    <label for="rating">Notation</label>
                    <select 
                      id="rating"
                      formControlName="rating"
                      class="form-control">
                      <option value="">Aucune notation</option>
                      <option value="AAA">AAA</option>
                      <option value="AA+">AA+</option>
                      <option value="AA">AA</option>
                      <option value="AA-">AA-</option>
                      <option value="A+">A+</option>
                      <option value="A">A</option>
                      <option value="A-">A-</option>
                      <option value="BBB+">BBB+</option>
                      <option value="BBB">BBB</option>
                      <option value="BBB-">BBB-</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Specialties -->
              <div class="form-section">
                <h3>Spécialités</h3>
                <div class="checkboxes-grid">
                  <label class="checkbox-item">
                    <input 
                      type="checkbox" 
                      value="auto"
                      (change)="toggleSpecialty('auto', $event)">
                    <span>Automobile</span>
                  </label>
                  <label class="checkbox-item">
                    <input 
                      type="checkbox" 
                      value="habitation"
                      (change)="toggleSpecialty('habitation', $event)">
                    <span>Habitation</span>
                  </label>
                  <label class="checkbox-item">
                    <input 
                      type="checkbox" 
                      value="vie"
                      (change)="toggleSpecialty('vie', $event)">
                    <span>Assurance Vie</span>
                  </label>
                  <label class="checkbox-item">
                    <input 
                      type="checkbox" 
                      value="sante"
                      (change)="toggleSpecialty('sante', $event)">
                    <span>Santé</span>
                  </label>
                  <label class="checkbox-item">
                    <input 
                      type="checkbox" 
                      value="voyage"
                      (change)="toggleSpecialty('voyage', $event)">
                    <span>Voyage</span>
                  </label>
                  <label class="checkbox-item">
                    <input 
                      type="checkbox" 
                      value="transport"
                      (change)="toggleSpecialty('transport', $event)">
                    <span>Transport</span>
                  </label>
                </div>
              </div>

              <!-- Status -->
              <div class="form-section">
                <div class="form-group">
                  <label class="checkbox-item">
                    <input 
                      type="checkbox" 
                      formControlName="is_active">
                    <span>Compagnie active</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeCompanyModal()">
                Annuler
              </button>
              <button 
                type="submit" 
                class="btn-primary"
                [disabled]="companyForm.invalid || isLoading">
                {{ isLoading ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Product Modal -->
      <div *ngIf="showProductModal" class="modal-overlay" (click)="closeProductModal()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingProduct ? 'Modifier' : 'Créer' }} un Produit d'Assurance</h2>
            <button class="close-btn" (click)="closeProductModal()">×</button>
          </div>
          
          <form [formGroup]="productForm" (ngSubmit)="saveProduct()">
            <div class="modal-body">
              <!-- Basic Info -->
              <div class="form-section">
                <h3>Informations générales</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="productId">ID Produit *</label>
                    <input 
                      type="text" 
                      id="productId"
                      formControlName="id"
                      [readonly]="editingProduct"
                      class="form-control">
                  </div>
                  
                  <div class="form-group">
                    <label for="productCompany">Compagnie *</label>
                    <select 
                      id="productCompany"
                      formControlName="insurance_company_id"
                      class="form-control">
                      <option value="">Sélectionner une compagnie</option>
                      <option *ngFor="let company of companies" [value]="company.id">
                        {{ company.name }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="productName">Nom du produit *</label>
                    <input 
                      type="text" 
                      id="productName"
                      formControlName="name"
                      class="form-control">
                  </div>
                  
                  <div class="form-group">
                    <label for="productType">Type d'assurance *</label>
                    <select 
                      id="productType"
                      formControlName="type"
                      class="form-control">
                      <option value="">Sélectionner un type</option>
                      <option value="auto">Automobile</option>
                      <option value="habitation">Habitation</option>
                      <option value="vie">Assurance Vie</option>
                      <option value="sante">Santé</option>
                      <option value="voyage">Voyage</option>
                      <option value="transport">Transport</option>
                    </select>
                  </div>
                  
                  <div class="form-group span-2">
                    <label for="productDescription">Description</label>
                    <textarea 
                      id="productDescription"
                      formControlName="description"
                      class="form-control"
                      rows="3"></textarea>
                  </div>
                </div>
              </div>

              <!-- Pricing -->
              <div class="form-section">
                <h3>Tarification</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="basePremium">Prime de base (FCFA) *</label>
                    <input 
                      type="number" 
                      id="basePremium"
                      formControlName="base_premium"
                      class="form-control"
                      min="0">
                  </div>
                  
                  <div class="form-group">
                    <label for="minCoverage">Couverture minimale (FCFA)</label>
                    <input 
                      type="number" 
                      id="minCoverage"
                      formControlName="min_coverage"
                      class="form-control"
                      min="0">
                  </div>
                  
                  <div class="form-group">
                    <label for="maxCoverage">Couverture maximale (FCFA)</label>
                    <input 
                      type="number" 
                      id="maxCoverage"
                      formControlName="max_coverage"
                      class="form-control"
                      min="0">
                  </div>
                </div>
              </div>

              <!-- Features & Advantages -->
              <div class="form-section">
                <h3>Caractéristiques</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="features">Caractéristiques (une par ligne)</label>
                    <textarea 
                      id="features"
                      formControlName="features_text"
                      class="form-control"
                      rows="4"
                      placeholder="Ex:&#10;Assistance 24h/24&#10;Réparation toutes marques&#10;Véhicule de remplacement"></textarea>
                  </div>
                  
                  <div class="form-group">
                    <label for="advantages">Avantages (une par ligne)</label>
                    <textarea 
                      id="advantages"
                      formControlName="advantages_text"
                      class="form-control"
                      rows="4"
                      placeholder="Ex:&#10;Tarifs préférentiels&#10;Réseau étendu&#10;Service premium"></textarea>
                  </div>
                  
                  <div class="form-group span-2">
                    <label for="exclusions">Exclusions (une par ligne)</label>
                    <textarea 
                      id="exclusions"
                      formControlName="exclusions_text"
                      class="form-control"
                      rows="3"
                      placeholder="Ex:&#10;Conduite en état d'ivresse&#10;Usage professionnel non déclaré&#10;Sports extrêmes"></textarea>
                  </div>
                </div>
              </div>

              <!-- Status -->
              <div class="form-section">
                <div class="form-grid">
                  <div class="form-group">
                    <label class="checkbox-item">
                      <input 
                        type="checkbox" 
                        formControlName="is_active">
                      <span>Produit actif</span>
                    </label>
                  </div>
                  
                  <div class="form-group">
                    <label class="checkbox-item">
                      <input 
                        type="checkbox" 
                        formControlName="is_featured">
                      <span>Produit mis en avant</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeProductModal()">
                Annuler
              </button>
              <button 
                type="submit" 
                class="btn-primary"
                [disabled]="productForm.invalid || isLoading">
                {{ isLoading ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./admin-insurance-management.component.scss']
})
export class InsuranceManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data
  companies: InsuranceCompany[] = [];
  products: InsuranceProduct[] = [];
  filteredCompanies: InsuranceCompany[] = [];
  filteredProducts: InsuranceProduct[] = [];
  
  // UI State
  activeTab: 'companies' | 'products' = 'companies';
  isLoading = false;
  showCompanyModal = false;
  showProductModal = false;
  editingCompany: InsuranceCompany | null = null;
  editingProduct: InsuranceProduct | null = null;
  
  // Forms
  companyForm!: FormGroup;
  productForm!: FormGroup;
  selectedSpecialties: string[] = [];
  
  // Filters
  companyFilters = {
    search: '',
    status: '',
    specialty: ''
  };
  
  productFilters = {
    search: '',
    company: '',
    type: '',
    status: ''
  };

  constructor(
    private fb: FormBuilder,
    private insuranceService: InsuranceService 
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.companyForm = this.fb.group({
      id: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
      name: ['', Validators.required],
      full_name: [''],
      description: [''],
      contact_phone: [''],
      contact_email: ['', Validators.email],
      website: [''],
      address: [''],
      license_number: [''],
      established_year: [''],
      solvency_ratio: [''],
      rating: [''],
      is_active: [true]
    });

    this.productForm = this.fb.group({
      id: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
      insurance_company_id: ['', Validators.required],
      name: ['', Validators.required],
      type: ['', Validators.required],
      description: [''],
      base_premium: [0, [Validators.required, Validators.min(0)]],
      min_coverage: [''],
      max_coverage: [''],
      features_text: [''],
      advantages_text: [''],
      exclusions_text: [''],
      is_active: [true],
      is_featured: [false]
    });
  }

  private loadData(): void {
    this.loadCompanies();
    this.loadProducts();
  }

 private loadCompanies(): void {
  this.insuranceService.getInsuranceCompanies()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: PaginatedResponse<InsuranceCompany>) => {
        this.companies = response.data || [];
        this.filteredCompanies = [...this.companies];
      },
      error: (error) => {
        console.error('Erreur lors du chargement des compagnies:', error);
      }
    });
}
 private loadProducts(): void {
  this.insuranceService.getInsuranceProducts()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: PaginatedResponse<InsuranceProduct>) => {
        this.products = response.data || [];
        this.filteredProducts = [...this.products];
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
      }
    });
}
  // Tab Management
  setActiveTab(tab: 'companies' | 'products'): void {
    this.activeTab = tab;
  }

  // Company Management
  openCreateCompanyModal(): void {
    this.editingCompany = null;
    this.selectedSpecialties = [];
    this.companyForm.reset({
      is_active: true
    });
    this.showCompanyModal = true;
  }

  editCompany(company: InsuranceCompany): void {
    this.editingCompany = company;
    this.selectedSpecialties = [...(company.specialties || [])];
    this.companyForm.patchValue({
      id: company.id,
      name: company.name,
      full_name: company.full_name,
      description: company.description,
      contact_phone: company.contact_phone,
      contact_email: company.contact_email,
      website: company.website,
      address: company.address,
      license_number: company.license_number,
      established_year: company.established_year,
      solvency_ratio: company.solvency_ratio,
      rating: company.rating,
      is_active: company.is_active
    });
    this.showCompanyModal = true;
  }

  closeCompanyModal(): void {
    this.showCompanyModal = false;
    this.editingCompany = null;
    this.selectedSpecialties = [];
    this.companyForm.reset();
  }

  toggleSpecialty(specialty: string, event: any): void {
    if (event.target.checked) {
      if (!this.selectedSpecialties.includes(specialty)) {
        this.selectedSpecialties.push(specialty);
      }
    } else {
      this.selectedSpecialties = this.selectedSpecialties.filter(s => s !== specialty);
    }
  }

  saveCompany(): void {
    if (this.companyForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formData = {
      ...this.companyForm.value,
      specialties: this.selectedSpecialties
    };

    const operation = this.editingCompany
  ? this.insuranceService.updateInsuranceCompany(this.editingCompany.id, formData)
  : this.insuranceService.createInsuranceCompany(formData);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (company) => {
          if (this.editingCompany) {
            const index = this.companies.findIndex(c => c.id === company.id);
            if (index !== -1) {
              this.companies[index] = company;
            }
          } else {
            this.companies.push(company);
          }
          this.applyCompanyFilters();
          this.closeCompanyModal();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde:', error);
          this.isLoading = false;
        }
      });
  }

  deleteCompany(companyId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette compagnie ?')) {
      return;
    }

    this.insuranceService.deleteInsuranceCompany(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.companies = this.companies.filter(c => c.id !== companyId);
          this.applyCompanyFilters();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
        }
      });
  }

  // Product Management
  openCreateProductModal(): void {
    this.editingProduct = null;
    this.productForm.reset({
      is_active: true,
      is_featured: false
    });
    this.showProductModal = true;
  }

  editProduct(product: InsuranceProduct): void {
    this.editingProduct = product;
    this.productForm.patchValue({
      id: product.id,
      insurance_company_id: product.insurance_company_id,
      name: product.name,
      type: product.type,
      description: product.description,
      base_premium: product.base_premium,
      min_coverage: product.min_coverage,
      max_coverage: product.max_coverage,
      features_text: (product.features || []).join('\n'),
      advantages_text: (product.advantages || []).join('\n'),
      exclusions_text: (product.exclusions || []).join('\n'),
      is_active: product.is_active,
      is_featured: product.is_featured
    });
    this.showProductModal = true;
  }

  duplicateProduct(product: InsuranceProduct): void {
    this.editingProduct = null;
    this.productForm.patchValue({
      id: product.id + '_copy',
      insurance_company_id: product.insurance_company_id,
      name: product.name + ' (Copie)',
      type: product.type,
      description: product.description,
      base_premium: product.base_premium,
      min_coverage: product.min_coverage,
      max_coverage: product.max_coverage,
      features_text: (product.features || []).join('\n'),
      advantages_text: (product.advantages || []).join('\n'),
      exclusions_text: (product.exclusions || []).join('\n'),
      is_active: false,
      is_featured: false
    });
    this.showProductModal = true;
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.editingProduct = null;
    this.productForm.reset();
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formData = {
      ...this.productForm.value,
      features: this.textToArray(this.productForm.value.features_text),
      advantages: this.textToArray(this.productForm.value.advantages_text),
      exclusions: this.textToArray(this.productForm.value.exclusions_text)
    };

    // Remove text fields as they're not part of the API model
    delete formData.features_text;
    delete formData.advantages_text;
    delete formData.exclusions_text;

    const operation = this.editingProduct
  ? this.insuranceService.updateInsuranceProduct(this.editingProduct.id, formData)
  : this.insuranceService.createInsuranceProduct(formData);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          if (this.editingProduct) {
            const index = this.products.findIndex(p => p.id === product.id);
            if (index !== -1) {
              this.products[index] = product;
            }
          } else {
            this.products.push(product);
          }
          this.applyProductFilters();
          this.closeProductModal();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde:', error);
          this.isLoading = false;
        }
      });
  }

  deleteProduct(productId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }

   this.insuranceService.deleteInsuranceProduct(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.products = this.products.filter(p => p.id !== productId);
          this.applyProductFilters();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
        }
      });
  }

  // Filters
  applyCompanyFilters(): void {
    let filtered = [...this.companies];

    if (this.companyFilters.search) {
      const search = this.companyFilters.search.toLowerCase();
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(search) ||
        company.full_name?.toLowerCase().includes(search) ||
        company.description?.toLowerCase().includes(search)
      );
    }

    if (this.companyFilters.status) {
      const isActive = this.companyFilters.status === 'active';
      filtered = filtered.filter(company => company.is_active === isActive);
    }

    if (this.companyFilters.specialty) {
      filtered = filtered.filter(company =>
        company.specialties?.includes(this.companyFilters.specialty)
      );
    }

    this.filteredCompanies = filtered;
  }

  applyProductFilters(): void {
    let filtered = [...this.products];

    if (this.productFilters.search) {
      const search = this.productFilters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search)
      );
    }

    if (this.productFilters.company) {
      filtered = filtered.filter(product => 
        product.insurance_company_id === this.productFilters.company
      );
    }

    if (this.productFilters.type) {
      filtered = filtered.filter(product => product.type === this.productFilters.type);
    }

    if (this.productFilters.status) {
      const isActive = this.productFilters.status === 'active';
      filtered = filtered.filter(product => product.is_active === isActive);
    }

    this.filteredProducts = filtered;
  }

  viewCompanyProducts(companyId: string): void {
    this.activeTab = 'products';
    this.productFilters.company = companyId;
    this.applyProductFilters();
  }

  // Utility Methods
  getCompanyName(companyId: string): string {
    const company = this.companies.find(c => c.id === companyId);
    return company ? company.name : 'Inconnue';
  }

  getSpecialtyLabel(specialty: string): string {
    const labels: { [key: string]: string } = {
      auto: 'Auto',
      habitation: 'Habitation',
      vie: 'Vie',
      sante: 'Santé',
      voyage: 'Voyage',
      transport: 'Transport'
    };
    return labels[specialty] || specialty;
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      auto: 'Automobile',
      habitation: 'Habitation',
      vie: 'Assurance Vie',
      sante: 'Santé',
      voyage: 'Voyage',
      transport: 'Transport'
    };
    return labels[type] || type;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
  }

  private textToArray(text: string): string[] {
    if (!text) return [];
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }
}