import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { 
  SavingsProductsService, 
  SavingsProduct, 
  PaginatedSavingsProducts,
  SavingsProductFilters,
  Bank 
} from '../services/savings-products.service';

@Component({
  selector: 'app-savings-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="savings-products-list">
      <div class="header">
        <h2>Produits d'Épargne</h2>
        <div class="actions">
          <input 
            type="text" 
            placeholder="Rechercher un produit..." 
            [(ngModel)]="searchTerm"
            (input)="onSearchChange($event)"
            class="search-input">
          <button routerLink="create" class="btn btn-primary">
            <i class="icon-plus"></i>
            Nouveau Produit
          </button>
          <button (click)="exportProducts()" class="btn btn-outline" [disabled]="products.length === 0">
            <i class="icon-download"></i>
            Exporter CSV
          </button>
        </div>
      </div>

      <!-- Indicateur de chargement -->
      <div *ngIf="loading" class="loading-indicator">
        Chargement des produits...
      </div>

      <!-- Message d'erreur -->
      <div *ngIf="error" class="error-message">
        {{ error }}
        <button (click)="loadProducts()" class="btn btn-sm btn-outline">Réessayer</button>
      </div>

      <div class="filters">
        <select [(ngModel)]="filters.bank_id" (change)="onFilterChange()" class="filter-select">
          <option value="">Toutes les banques</option>
          <option *ngFor="let bank of banks" [value]="bank.id">{{ bank.name }}</option>
        </select>
        
        <select [(ngModel)]="filters.type" (change)="onFilterChange()" class="filter-select">
          <option value="">Tous les types</option>
          <option value="livret">{{ savingsProductsService.getTypeLabel('livret') }}</option>
          <option value="terme">{{ savingsProductsService.getTypeLabel('terme') }}</option>
          <option value="plan_epargne">{{ savingsProductsService.getTypeLabel('plan_epargne') }}</option>
          <option value="professionnel">{{ savingsProductsService.getTypeLabel('professionnel') }}</option>
        </select>
        
        <select [(ngModel)]="filters.status" (change)="onFilterChange()" class="filter-select">
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>

        <select [(ngModel)]="filters.sort_by" (change)="onSortChange()" class="filter-select">
          <option value="">Trier par...</option>
          <option value="name">Nom</option>
          <option value="interest_rate">Taux d'intérêt</option>
          <option value="minimum_deposit">Dépôt minimum</option>
          <option value="created_at">Date de création</option>
          <option value="bank_name">Banque</option>
        </select>

        <select [(ngModel)]="filters.sort_order" (change)="onSortChange()" class="filter-select" 
                [disabled]="!filters.sort_by">
          <option value="asc">Croissant</option>
          <option value="desc">Décroissant</option>
        </select>
      </div>

      <div class="table-container" *ngIf="!loading">
        <table class="products-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Banque</th>
              <th>Type</th>
              <th>Taux d'intérêt</th>
              <th>Dépôt Min/Max</th>
              <th>Liquidité</th>
              <th>Risque</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products" [class.featured]="product.is_featured">
              <td>
                <div class="product-name">
                  {{ product.name }}
                  <span *ngIf="product.is_featured" class="featured-badge">★ Vedette</span>
                </div>
              </td>
              <td>{{ product.bank?.name || 'N/A' }}</td>
              <td>{{ savingsProductsService.getTypeLabel(product.type) }}</td>
              <td class="rate">{{ product.interest_rate }}%</td>
              <td class="amounts">
                <div>{{ savingsProductsService.formatAmount(product.minimum_deposit) }}</div>
                <div class="max-amount" *ngIf="product.maximum_deposit">
                  {{ savingsProductsService.formatAmount(product.maximum_deposit) }}
                </div>
              </td>
              <td>{{ savingsProductsService.getLiquidityLabel(product.liquidity) }}</td>
              <td>
                <div class="risk-level risk-{{ product.risk_level }}">
                  {{ getRiskLabel(product.risk_level) }}
                </div>
              </td>
              <td>
                <span class="status" [class]="'status-' + (product.is_active ? 'active' : 'inactive')">
                  {{ product.is_active ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button [routerLink]="[product.id]" class="btn btn-sm btn-outline" title="Voir">
                    <i class="icon-eye"></i>
                  </button>
                  <button [routerLink]="['edit', product.id]" class="btn btn-sm btn-outline" title="Modifier">
                    <i class="icon-edit"></i>
                  </button>
                  <button (click)="toggleFeatured(product)" class="btn btn-sm" 
                          [class]="product.is_featured ? 'btn-warning' : 'btn-outline'" 
                          [title]="product.is_featured ? 'Retirer de la vedette' : 'Mettre en vedette'">
                    <i class="icon-star"></i>
                  </button>
                  <button (click)="toggleStatus(product)" class="btn btn-sm" 
                          [class]="product.is_active ? 'btn-secondary' : 'btn-success'"
                          [title]="product.is_active ? 'Désactiver' : 'Activer'">
                    <i [class]="product.is_active ? 'icon-pause' : 'icon-play'"></i>
                  </button>
                  <button (click)="deleteProduct(product)" class="btn btn-sm btn-danger" title="Supprimer">
                    <i class="icon-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="products.length === 0" class="no-data">
          Aucun produit trouvé avec les critères sélectionnés.
        </div>
      </div>

      <div class="pagination" *ngIf="pagination && pagination.pages > 1">
        <button 
          (click)="goToPage(pagination.current_page - 1)" 
          [disabled]="!pagination.has_prev"
          class="btn btn-sm">
          Précédent
        </button>
        <span>Page {{ pagination.current_page }} sur {{ pagination.pages }} ({{ pagination.total }} produits)</span>
        <button 
          (click)="goToPage(pagination.current_page + 1)" 
          [disabled]="!pagination.has_next"
          class="btn btn-sm">
          Suivant
        </button>
      </div>
    </div>
  `,
  styles: [`
    .savings-products-list {
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .actions {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .search-input {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      width: 250px;
    }

    .filters {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .filter-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      min-width: 150px;
    }

    .loading-indicator {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow-x: auto;
    }

    .products-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 800px;
    }

    .products-table th,
    .products-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    .products-table th {
      background: #f8f9fa;
      font-weight: 600;
      white-space: nowrap;
    }

    .featured {
      background: #fff3cd;
    }

    .product-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .featured-badge {
      background: #ffc107;
      color: #212529;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }

    .rate {
      font-weight: 600;
      color: #28a745;
    }

    .amounts {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .max-amount {
      font-size: 12px;
      color: #666;
    }

    .risk-level {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
    }

    .risk-1 { background: #d4edda; color: #155724; }
    .risk-2 { background: #d1ecf1; color: #0c5460; }
    .risk-3 { background: #fff3cd; color: #856404; }
    .risk-4 { background: #f8d7da; color: #721c24; }
    .risk-5 { background: #f5c6cb; color: #491217; }

    .status {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-active {
      background: #d4edda;
      color: #155724;
    }

    .status-inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .action-buttons {
      display: flex;
      gap: 5px;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-outline {
      border: 1px solid #ddd;
      background: white;
      color: #333;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-warning {
      background: #ffc107;
      color: #212529;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn:hover:not(:disabled) {
      opacity: 0.8;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 20px;
    }

    @media (max-width: 768px) {
      .filters {
        flex-direction: column;
      }
      
      .filter-select {
        width: 100%;
      }
      
      .actions {
        flex-direction: column;
        align-items: stretch;
      }
      
      .search-input {
        width: 100%;
      }
    }
  `]
})
export class SavingsProductsListComponent implements OnInit, OnDestroy {
  products: SavingsProduct[] = [];
  banks: Bank[] = [];
  pagination: any = null;
  
  // État de chargement et d'erreur
  loading = false;
  error: string | null = null;

  // Filtres et recherche
  searchTerm = '';
  private searchSubject = new Subject<string>();
  filters: SavingsProductFilters = {
    sort_by: 'created_at',
    sort_order: 'desc'
  };

  // Pagination
  currentPage = 1;
  pageSize = 20;

  private destroy$ = new Subject<void>();

  constructor(public savingsProductsService: SavingsProductsService) {}

  ngOnInit() {
    this.setupSearchDebounce();
    this.subscribeToServiceState();
    this.loadBanks();
    this.loadProducts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm || undefined;
      this.currentPage = 1;
      this.loadProducts();
    });
  }

  private subscribeToServiceState() {
    this.savingsProductsService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.savingsProductsService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  loadProducts() {
    this.savingsProductsService.getProducts(this.currentPage, this.pageSize, this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedSavingsProducts) => {
          this.products = response.products;
          this.pagination = response.pagination;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des produits:', error);
        }
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
        }
      });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value;
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadProducts();
  }

  onSortChange() {
    if (!this.filters.sort_by) {
      this.filters.sort_order = 'desc';
    }
    this.currentPage = 1;
    this.loadProducts();
  }

  toggleStatus(product: SavingsProduct) {
    const newStatus = !product.is_active;
    const action = newStatus ? 'activer' : 'désactiver';
    
    if (confirm(`Êtes-vous sûr de vouloir ${action} ce produit ?`)) {
      this.savingsProductsService.toggleProductStatus(product.id, newStatus)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            product.is_active = newStatus;
            console.log(`Produit ${action} avec succès`);
          },
          error: (error) => {
            console.error(`Erreur lors de la modification du statut:`, error);
          }
        });
    }
  }

  toggleFeatured(product: SavingsProduct) {
    const newFeatured = !product.is_featured;
    const action = newFeatured ? 'mettre en vedette' : 'retirer de la vedette';
    
    if (confirm(`Êtes-vous sûr de vouloir ${action} ce produit ?`)) {
      this.savingsProductsService.toggleProductFeatured(product.id, newFeatured)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            product.is_featured = newFeatured;
            console.log(`Produit ${action} avec succès`);
          },
          error: (error) => {
            console.error(`Erreur lors de la modification de la vedette:`, error);
          }
        });
    }
  }

  deleteProduct(product: SavingsProduct) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ? Cette action est irréversible.`)) {
      this.savingsProductsService.deleteProduct(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Produit supprimé avec succès');
            // Le service met à jour automatiquement la liste locale
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
          }
        });
    }
  }

  exportProducts() {
    if (this.products.length > 0) {
      this.savingsProductsService.exportToCsv(this.products);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.pagination.pages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  getRiskLabel(riskLevel: number): string {
    const labels = {
      1: 'Très faible',
      2: 'Faible', 
      3: 'Modéré',
      4: 'Élevé',
      5: 'Très élevé'
    };
    return labels[riskLevel as keyof typeof labels] || `Niveau ${riskLevel}`;
  }
}