import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { CreditProductService, CreditProduct, PaginatedResponse, CreditProductsFilters, CreditProductsStats } from '../services/credits-products.service';

@Component({
  selector: 'app-credit-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
  <div class="page-container">
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="flex-header">
        <div>
          <h1 class="title">Produits de Crédit</h1>
          <p class="subtitle">Gérez les offres de crédit des banques partenaires</p>
        </div>
        <button 
          *ngIf="canCreate"
          routerLink="/admin/credit-products/create" 
          class="btn-primary">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Nouveau produit
        </button>
      </div>
    </div>

    <!-- Filtres -->
    <div class="filters">
      <form [formGroup]="filtersForm">
        <div>
          <label for="search">Rechercher</label>
          <input type="text" id="search" formControlName="search" placeholder="Nom du produit...">
        </div>
        
        <div>
          <label for="bank">Banque</label>
          <select formControlName="bank_id" id="bank">
            <option value="">Toutes les banques</option>
            <option *ngFor="let bank of banks" [value]="bank.id">
              {{ bank.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="type">Type de crédit</label>
          <select formControlName="type" id="type">
            <option value="">Tous types</option>
            <option value="immobilier">Crédit Immobilier</option>
            <option value="consommation">Crédit Consommation</option>
            <option value="auto">Crédit Auto</option>
            <option value="professionnel">Crédit Professionnel</option>
            <option value="equipement">Crédit Équipement</option>
            <option value="travaux">Crédit Travaux</option>
          </select>
        </div>

        <div>
          <label for="status">Statut</label>
          <select formControlName="is_active" id="status">
            <option value="">Tous</option>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>

        <div>
          <button type="button" (click)="resetFilters()" class="btn-reset">
            Réinitialiser
          </button>
        </div>
      </form>
    </div>

    <!-- Statistiques rapides -->
    <div class="stats">
      <div class="card">
        <div class="icon bg-blue"></div>
        <div class="content">
          <div class="value">{{ totalProducts }}</div>
          <div class="label">Total produits</div>
        </div>
      </div>
      
      <div class="card">
        <div class="icon bg-green"></div>
        <div class="content">
          <div class="value">{{ activeProducts }}</div>
          <div class="label">Produits actifs</div>
        </div>
      </div>
      
      <div class="card">
        <div class="icon bg-purple"></div>
        <div class="content">
          <div class="value">{{ averageRate }}%</div>
          <div class="label">Taux moyen</div>
        </div>
      </div>
    </div>

    <!-- Contenu principal -->
    <div class="products">
      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <span>Chargement des produits...</span>
      </div>

      <!-- Aucun produit -->
      <div *ngIf="!loading && products.length === 0" class="empty">
        <h3>Aucun produit trouvé</h3>
        <p>Commencez par créer votre premier produit de crédit</p>
        <button 
          *ngIf="canCreate"
          routerLink="/admin/credit-products/create" 
          class="btn-primary">
          Créer un produit
        </button>
      </div>

      <!-- Tableau -->
      <div *ngIf="!loading && products.length > 0">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Banque</th>
              <th>Type</th>
              <th>Taux</th>
              <th>Montant</th>
              <th>Durée</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products">
              <td>
                <div class="product-name">
                  <div class="text-sm">{{ product.name }}</div>
                  <div *ngIf="product.is_featured" class="featured-badge">
                    Vedette
                  </div>
                </div>
              </td>
              <td>
                <div class="bank-info" *ngIf="product.bank; else noBank">
                  <img *ngIf="product.bank.logo_url" [src]="product.bank.logo_url" [alt]="product.bank.name" class="bank-logo">
                  <span>{{ product.bank.name }}</span>
                </div>
                <ng-template #noBank>
                  <span>Non assigné</span>
                </ng-template>
              </td>
              <td>
                <span class="badge">{{ creditProductService.getTypeLabel(product.type) }}</span>
              </td>
              <td>
                <div class="rate">
                  {{ creditProductService.formatPercent(product.average_rate) }}
                </div>
              </td>
              <td>
                <div class="amount-range">
                  {{ creditProductService.formatCurrency(product.min_amount) }} - 
                  {{ creditProductService.formatCurrency(product.max_amount) }}
                </div>
              </td>
              <td>
                <div class="duration">
                  {{ product.min_duration_months }} - {{ product.max_duration_months }} mois
                </div>
              </td>
              <td>
                <span [class]="'status ' + (product.is_active ? 'active' : 'inactive')">
                  {{ product.is_active ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button 
                    *ngIf="canEdit"
                    [routerLink]="['/admin/credit-products/edit', product.id]" 
                    class="btn-edit">
                    Modifier
                  </button>
                  <button 
                    *ngIf="canDelete"
                    (click)="confirmDelete(product)" 
                    class="btn-delete">
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="pagination" *ngIf="totalPages > 1">
          <button 
            (click)="changePage(currentPage - 1)"
            [disabled]="currentPage === 1"
            class="btn-pagination">
            Précédent
          </button>
          
          <span class="page-info">
            Page {{ currentPage }} sur {{ totalPages }}
          </span>
          
          <button 
            (click)="changePage(currentPage + 1)"
            [disabled]="currentPage === totalPages"
            class="btn-pagination">
            Suivant
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .page-container {
      min-height: 100vh;
      background-color: #f8fafc;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 24px;
    }

    .flex-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }

    .subtitle {
      font-size: 14px;
      color: #6b7280;
      margin: 4px 0 0 0;
    }

    .btn-primary {
      background-color: #2563eb;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-primary:hover {
      background-color: #1d4ed8;
    }

    .icon-sm {
      width: 16px;
      height: 16px;
    }

    .filters {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
    }

    .filters form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      align-items: end;
    }

    .filters label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 4px;
    }

    .filters input,
    .filters select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    .btn-reset {
      background-color: #6b7280;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-reset:hover {
      background-color: #4b5563;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .card {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bg-blue { background-color: #dbeafe; }
    .bg-green { background-color: #dcfce7; }
    .bg-purple { background-color: #f3e8ff; }

    .content {
      flex: 1;
    }

    .value {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
    }

    .label {
      font-size: 14px;
      color: #6b7280;
    }

    .products {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .loading, .empty {
      padding: 40px;
      text-align: center;
    }

    .empty h3 {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8px 0;
    }

    .empty p {
      color: #6b7280;
      margin: 0 0 16px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background-color: #f9fafb;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    td {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
    }

    .product-name {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .featured-badge {
      background-color: #fef3c7;
      color: #92400e;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    .bank-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bank-logo {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      object-fit: contain;
    }

    .badge {
      background-color: #e5e7eb;
      color: #374151;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .rate {
      font-weight: 600;
      color: #059669;
    }

    .amount-range {
      font-size: 13px;
      color: #6b7280;
    }

    .duration {
      font-size: 13px;
      color: #6b7280;
    }

    .status {
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .status.active {
      background-color: #dcfce7;
      color: #166534;
    }

    .status.inactive {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-edit {
      background-color: #2563eb;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      border: none;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-edit:hover {
      background-color: #1d4ed8;
    }

    .btn-delete {
      background-color: #dc2626;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      border: none;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-delete:hover {
      background-color: #b91c1c;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      padding: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .btn-pagination {
      background-color: #f3f4f6;
      color: #374151;
      padding: 8px 16px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-pagination:hover:not(:disabled) {
      background-color: #e5e7eb;
    }

    .btn-pagination:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 14px;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .filters form {
        grid-template-columns: 1fr;
      }
      
      .stats {
        grid-template-columns: 1fr;
      }
      
      table {
        display: block;
        overflow-x: auto;
      }
      
      .actions {
        flex-direction: column;
      }
    }
  `]
})
export class CreditProductsListComponent implements OnInit {
  products: CreditProduct[] = [];
  loading = true;
  currentPage = 1;
  totalPages = 1;
  totalProducts = 0;
  activeProducts = 0;
  averageRate = 0;
  banks: any[] = [];
  filtersForm: FormGroup;

  // Permissions (à adapter selon votre système d'authentification)
  canCreate = true;
  canEdit = true;
  canDelete = true;

  constructor(
    private fb: FormBuilder,
    public creditProductService: CreditProductService
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      bank_id: [''],
      type: [''],
      is_active: ['']
    });
  }

  ngOnInit() {
    this.loadStats();
    this.loadBanks();
    this.loadProducts();
    
    // Écouter les changements de filtres
    this.filtersForm.valueChanges.subscribe(() => {
      this.currentPage = 1;
      this.loadProducts();
    });
  }

  loadProducts() {
    this.loading = true;
    const filters: CreditProductsFilters = {
      ...this.filtersForm.value,
      page: this.currentPage,
      limit: 10
    };

    // Nettoyer les valeurs vides
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof CreditProductsFilters] === '') {
        delete filters[key as keyof CreditProductsFilters];
      }
    });

    this.creditProductService.getCreditProducts(filters).subscribe({
      next: (response: PaginatedResponse<CreditProduct>) => {
        this.products = response.items;
        this.totalPages = response.pages;
        this.totalProducts = response.total;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement produits:', error);
        this.loading = false;
      }
    });
  }

  loadStats() {
    this.creditProductService.getCreditProductsStats().subscribe({
      next: (stats: CreditProductsStats) => {
        this.activeProducts = stats.active_products;
        this.averageRate = stats.average_rate;
      },
      error: (error) => {
        console.error('Erreur chargement stats:', error);
      }
    });
  }

  async loadBanks() {
    try {
      const response = await fetch('http://localhost:8000/api/banks');
      if (response.ok) {
        this.banks = await response.json();
      }
    } catch (error) {
      console.error('Erreur chargement banques:', error);
    }
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  resetFilters() {
    this.filtersForm.reset({
      search: '',
      bank_id: '',
      type: '',
      is_active: ''
    });
  }

  confirmDelete(product: CreditProduct) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?`)) {
      this.deleteProduct(product.id);
    }
  }

  deleteProduct(id: string) {
    this.creditProductService.deleteCreditProduct(id).subscribe({
      next: () => {
        this.loadProducts();
        this.loadStats();
      },
      error: (error) => {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
      }
    });
  }
}