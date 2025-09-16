import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { 
  InsuranceAdminService, 
  InsuranceProductAdmin, 
  AdminStats,
  InsuranceCompany 
} from '../services/insurance-admin.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-insurance-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="insurance-products-list">
      <div class="header">
        <h2>Produits d'Assurance</h2>
        <div class="actions">
          <input 
            type="text" 
            placeholder="Rechercher un produit..." 
            [(ngModel)]="searchTerm"
            (input)="onSearchChange()"
            class="search-input">
          <button routerLink="create" class="btn btn-primary">
            <i class="icon-plus"></i>
            Nouveau Produit
          </button>
        </div>
      </div>

      <div class="filters">
        <select [(ngModel)]="selectedType" (change)="loadProducts()" class="filter-select">
          <option value="">Tous les types</option>
          <option *ngFor="let type of insuranceTypes" [value]="type.code">
            {{ type.name }}
          </option>
        </select>
        
        <select [(ngModel)]="selectedCompany" (change)="loadProducts()" class="filter-select">
          <option value="">Toutes les compagnies</option>
          <option *ngFor="let company of companies" [value]="company.id">
            {{ company.name }}
          </option>
        </select>
        
        <select [(ngModel)]="selectedStatus" (change)="loadProducts()" class="filter-select">
          <option value="">Tous les statuts</option>
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </select>
        
        <button (click)="refreshData()" class="btn btn-outline" [disabled]="isLoading">
          <i class="icon-refresh" [class.spinning]="isLoading"></i>
          Actualiser
        </button>
      </div>

      <!-- Statistiques -->
      <div class="stats-cards" *ngIf="stats">
        <div class="stat-card">
          <div class="stat-number">{{ stats.products.total }}</div>
          <div class="stat-label">Produits totaux</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.products.active }}</div>
          <div class="stat-label">Produits actifs</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.quotes.total }}</div>
          <div class="stat-label">Devis générés</div>
        </div>
      </div>

      <!-- Répartition par type -->
      <div class="chart-section" *ngIf="stats && stats.products_by_type.length > 0">
        <h3>Répartition par type</h3>
        <div class="type-distribution">
          <div *ngFor="let item of stats.products_by_type" class="type-item">
            <div class="type-name">{{ getTypeLabel(item.type) }}</div>
            <div class="type-count">{{ item.count }} produit(s)</div>
            <div class="type-bar">
              <div 
                class="type-fill" 
                [style.width.%]="(item.count / getMaxTypeCount()) * 100">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="isLoading && products.length === 0">
        <div class="spinner"></div>
        <p>Chargement des produits...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="errorMessage && !isLoading">
        <div class="error-icon">⚠️</div>
        <h3>Erreur de chargement</h3>
        <p>{{ errorMessage }}</p>
        <button (click)="refreshData()" class="btn btn-primary">
          Réessayer
        </button>
      </div>

      <!-- Table -->
      <div class="table-container" *ngIf="!isLoading && !errorMessage && (products.length > 0 || hasFilters())">
        <table class="products-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Compagnie</th>
              <th>Prime (XAF)</th>
              <th>Devis</th>
              <th>Statut</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products; trackBy: trackByProduct">
              <td>
                <div class="product-name">
                  <strong>{{ product.name }}</strong>
                  <div class="product-description" *ngIf="product.description">
                    {{ product.description | slice:0:80 }}{{ product.description.length > 80 ? '...' : '' }}
                  </div>
                </div>
              </td>
              <td>
                <span class="type-badge" [class]="'type-' + product.type">
                  {{ getTypeLabel(product.type) }}
                </span>
              </td>
              <td>
                <div class="company-info" *ngIf="product.insurance_company">
                  <img 
                    *ngIf="product.insurance_company.logo_url" 
                    [src]="product.insurance_company.logo_url" 
                    [alt]="product.insurance_company.name"
                    class="company-logo">
                  <span>{{ product.insurance_company.name }}</span>
                </div>
              </td>
              <td>{{ formatCurrency(product.base_premium) }}</td>
              <td>
                <span class="quotes-count">{{ product.quotes_count || 0 }}</span>
                <div class="last-quote" *ngIf="product.last_quote_date">
                  Dernier: {{ product.last_quote_date | date:'dd/MM/yyyy' }}
                </div>
              </td>
              <td>
                <span class="status" [class]="'status-' + (product.is_active ? 'active' : 'inactive')">
                  {{ product.is_active ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>{{ product.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <div class="action-buttons">
                  <button 
                    [routerLink]="[product.id]" 
                    class="btn btn-sm btn-outline" 
                    title="Voir les détails">
                    <i class="icon-eye"></i>
                  </button>
                  <button 
                    [routerLink]="['edit', product.id]" 
                    class="btn btn-sm btn-outline" 
                    title="Modifier">
                    <i class="icon-edit"></i>
                  </button>
                  <button 
                    (click)="duplicateProduct(product)" 
                    class="btn btn-sm btn-outline" 
                    title="Dupliquer"
                    [disabled]="isLoading">
                    <i class="icon-copy"></i>
                  </button>
                  <button 
                    (click)="toggleProductStatus(product)" 
                    class="btn btn-sm" 
                    [class]="product.is_active ? 'btn-warning' : 'btn-success'"
                    [title]="product.is_active ? 'Désactiver' : 'Activer'"
                    [disabled]="isLoading">
                    <i [class]="product.is_active ? 'icon-pause' : 'icon-play'"></i>
                  </button>
                  <button 
                    (click)="deleteProduct(product)" 
                    class="btn btn-sm btn-danger" 
                    title="Supprimer"
                    [disabled]="isLoading">
                    <i class="icon-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="products.length === 0 && !isLoading">
          <div class="empty-icon">📋</div>
          <h3>Aucun produit trouvé</h3>
          <p>{{ getEmptyStateMessage() }}</p>
          <button routerLink="create" class="btn btn-primary" *ngIf="!hasFilters()">
            Créer un produit
          </button>
          <button (click)="clearFilters()" class="btn btn-outline" *ngIf="hasFilters()">
            Effacer les filtres
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="totalPages > 1">
        <button 
          (click)="goToPage(currentPage - 1)" 
          [disabled]="currentPage === 1 || isLoading"
          class="btn btn-sm">
          Précédent
        </button>
        
        <div class="page-info">
          Page {{ currentPage }} sur {{ totalPages }} 
          ({{ totalItems }} produit{{ totalItems > 1 ? 's' : '' }})
        </div>
        
        <div class="page-numbers">
          <button 
            *ngFor="let page of getPageNumbers()"
            (click)="goToPage(page)"
            class="btn btn-sm"
            [class.active]="page === currentPage"
            [disabled]="isLoading">
            {{ page }}
          </button>
        </div>
        
        <button 
          (click)="goToPage(currentPage + 1)" 
          [disabled]="currentPage === totalPages || isLoading"
          class="btn btn-sm">
          Suivant
        </button>
      </div>
    </div>
  `,
  styles: [`
    .insurance-products-list {
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .header h2 {
      margin: 0;
      color: #333;
    }

    .actions {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .search-input {
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      width: 280px;
      font-size: 14px;
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

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: #007bff;
      margin-bottom: 5px;
    }

    .stat-label {
      color: #666;
      font-size: 14px;
    }

    .chart-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .chart-section h3 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .type-distribution {
      display: grid;
      gap: 15px;
    }

    .type-item {
      display: grid;
      grid-template-columns: 150px 100px 1fr;
      align-items: center;
      gap: 15px;
    }

    .type-name {
      font-weight: 500;
    }

    .type-count {
      color: #666;
      font-size: 14px;
    }

    .type-bar {
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .type-fill {
      height: 100%;
      background: #007bff;
      transition: width 0.3s;
    }

    .loading, .error-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .error-state {
      background: #fff3cd;
      border-radius: 8px;
      color: #856404;
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 20px;
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

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    .table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .products-table {
      width: 100%;
      border-collapse: collapse;
    }

    .products-table th,
    .products-table td {
      padding: 15px 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    .products-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #555;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .product-name strong {
      color: #333;
      font-size: 14px;
      display: block;
      margin-bottom: 4px;
    }

    .product-description {
      color: #666;
      font-size: 12px;
      line-height: 1.4;
    }

    .company-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .company-logo {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      object-fit: cover;
    }

    .type-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .type-vie { background: #e3f2fd; color: #1976d2; }
    .type-sante { background: #f3e5f5; color: #7b1fa2; }
    .type-auto { background: #fff3e0; color: #f57c00; }
    .type-habitation { background: #e8f5e8; color: #388e3c; }
    .type-voyage { background: #fce4ec; color: #c2185b; }
    .type-responsabilite { background: #f3e5f5; color: #7b1fa2; }

    .quotes-count {
      font-weight: 600;
      color: #007bff;
    }

    .last-quote {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }

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

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      margin-bottom: 10px;
      color: #333;
    }

    .empty-state p {
      margin-bottom: 20px;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 30px;
    }

    .page-info {
      color: #666;
      font-size: 14px;
    }

    .page-numbers {
      display: flex;
      gap: 5px;
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
      font-size: 14px;
      transition: all 0.3s;
    }

    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover:not(:disabled) { background: #0056b3; }

    .btn-outline { border: 1px solid #ddd; background: white; color: #333; }
    .btn-outline:hover:not(:disabled) { background: #f8f9fa; }

    .btn-success { background: #28a745; color: white; }
    .btn-success:hover:not(:disabled) { background: #1e7e34; }

    .btn-warning { background: #ffc107; color: #212529; }
    .btn-warning:hover:not(:disabled) { background: #e0a800; }

    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover:not(:disabled) { background: #c82333; }

    .btn-sm { padding: 6px 12px; font-size: 12px; }

    .btn.active { background: #007bff; color: white; }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .icon-plus::before { content: "+"; }
    .icon-eye::before { content: "👁"; }
    .icon-edit::before { content: "✏️"; }
    .icon-copy::before { content: "📋"; }
    .icon-trash::before { content: "🗑"; }
    .icon-refresh::before { content: "🔄"; }
    .icon-pause::before { content: "⏸"; }
    .icon-play::before { content: "▶️"; }

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }

      .actions {
        width: 100%;
        flex-direction: column;
      }

      .search-input {
        width: 100%;
      }

      .filters {
        flex-wrap: wrap;
      }

      .stats-cards {
        grid-template-columns: 1fr;
      }

      .table-container {
        overflow-x: auto;
      }

      .products-table {
        min-width: 900px;
      }

      .type-item {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }
  `]
})
export class InsuranceProductsListComponent implements OnInit, OnDestroy {
  products: InsuranceProductAdmin[] = [];
  companies: InsuranceCompany[] = [];
  stats: AdminStats | null = null;
  insuranceTypes: any[] = [];
  
  // Filtres et recherche
  searchTerm = '';
  selectedType = '';
  selectedCompany = '';
  selectedStatus = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 1;
  
  // États
  isLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private insuranceAdminService: InsuranceAdminService,
    private notificationService: NotificationService
  ) {
    this.insuranceTypes = this.insuranceAdminService.getInsuranceTypes();
  }

  ngOnInit() {
    this.setupSearch();
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadProducts();
    });
  }

  private loadInitialData() {
    this.loadStats();
    this.loadCompanies();
    this.loadProducts();
  }

  private loadStats() {
    this.insuranceAdminService.getAdminStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error('Erreur chargement stats:', error);
        }
      });
  }

  private loadCompanies() {
    this.insuranceAdminService.getInsuranceCompanies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.companies = response.companies;
        },
        error: (error) => {
          console.error('Erreur chargement compagnies:', error);
        }
      });
  }

  public loadProducts() {
    this.isLoading = true;
    this.errorMessage = '';
    
    const params = {
      skip: (this.currentPage - 1) * this.pageSize,
      limit: this.pageSize,
      search: this.searchTerm || undefined,
      type: this.selectedType || undefined,
      company_id: this.selectedCompany || undefined,
      is_active: this.selectedStatus ? this.selectedStatus === 'true' : undefined
    };

    // Supprimer les propriétés undefined
    Object.keys(params).forEach(key => {
      if (params[key as keyof typeof params] === undefined) {
        delete params[key as keyof typeof params];
      }
    });

    console.log('Chargement des produits avec params:', params);

    this.insuranceAdminService.getInsuranceProducts(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Réponse reçue:', response);
          this.products = response.products || [];
          this.totalItems = response.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.isLoading = false;
          this.errorMessage = '';
        },
        error: (error) => {
          console.error('Erreur chargement produits:', error);
          this.errorMessage = 'Impossible de charger les produits d\'assurance. Vérifiez votre connexion.';
          this.products = [];
          this.totalItems = 0;
          this.totalPages = 1;
          this.isLoading = false;
          this.notificationService.showError(this.errorMessage);
        }
      });
  }

  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
  }

  refreshData() {
    this.loadStats();
    this.loadProducts();
  }

  duplicateProduct(product: InsuranceProductAdmin) {
    if (confirm(`Dupliquer le produit "${product.name}" ?`)) {
      this.isLoading = true;
      
      // Créer une copie du produit
      const duplicatedProduct = {
        name: `${product.name} (Copie)`,
        type: product.type,
        description: product.description,
        insurance_company_id: product.insurance_company_id,
        base_premium: product.base_premium,
        coverage_details: { ...product.coverage_details },
        deductibles: { ...product.deductibles },
        age_limits: { ...product.age_limits },
        exclusions: [...(product.exclusions || [])],
        features: [...(product.features || [])],
        is_active: false
      };

      this.insuranceAdminService.createInsuranceProduct(duplicatedProduct)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Produit dupliqué avec succès');
            this.loadProducts();
            this.loadStats();
          },
          error: (error) => {
            console.error('Erreur duplication:', error);
            this.notificationService.showError('Erreur lors de la duplication');
            this.isLoading = false;
          }
        });
    }
  }

  toggleProductStatus(product: InsuranceProductAdmin) {
    const newStatus = !product.is_active;
    const action = newStatus ? 'activer' : 'désactiver';
    
    if (confirm(`Êtes-vous sûr de vouloir ${action} le produit "${product.name}" ?`)) {
      this.isLoading = true;
      
      this.insuranceAdminService.updateInsuranceProduct(product.id, { 
        is_active: newStatus 
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess(`Produit ${newStatus ? 'activé' : 'désactivé'} avec succès`);
            this.loadProducts();
            this.loadStats();
          },
          error: (error) => {
            console.error('Erreur changement statut:', error);
            this.notificationService.showError(`Erreur lors du changement de statut`);
            this.isLoading = false;
          }
        });
    }
  }

  deleteProduct(product: InsuranceProductAdmin) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le produit "${product.name}" ?\n\nCette action est irréversible.`)) {
      this.isLoading = true;
      
      this.insuranceAdminService.deleteInsuranceProduct(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Produit supprimé avec succès');
            this.loadProducts();
            this.loadStats();
          },
          error: (error) => {
            console.error('Erreur suppression:', error);
            const message = error.error?.detail || 'Erreur lors de la suppression';
            this.notificationService.showError(message);
            this.isLoading = false;
          }
        });
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedCompany = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadProducts();
  }

  hasFilters(): boolean {
    return !!(this.searchTerm || this.selectedType || this.selectedCompany || this.selectedStatus);
  }

  getEmptyStateMessage(): string {
    if (this.searchTerm) {
      return `Aucun produit ne correspond à votre recherche "${this.searchTerm}".`;
    }
    if (this.selectedType || this.selectedCompany || this.selectedStatus) {
      return 'Aucun produit ne correspond aux filtres sélectionnés.';
    }
    return 'Commencez par créer votre premier produit d\'assurance.';
  }

  getMaxTypeCount(): number {
    if (!this.stats?.products_by_type.length) return 1;
    return Math.max(...this.stats.products_by_type.map(item => item.count));
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxPages = Math.min(5, this.totalPages);
    let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);
    
    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  trackByProduct(index: number, product: InsuranceProductAdmin): string {
    return product.id;
  }

  formatCurrency(amount: number): string {
    return this.insuranceAdminService.formatCurrency(amount);
  }

  getTypeLabel(type: string): string {
    return this.insuranceAdminService.getTypeLabel(type);
  }
}