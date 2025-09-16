import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  InsuranceAdminService, 
  InsuranceProductAdmin 
} from '../services/insurance-admin.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-insurance-product-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="product-details">
      <!-- Header -->
      <div class="header">
        <div class="breadcrumb">
          <a routerLink="/admin/insurance-products" class="breadcrumb-link">
            Produits d'assurance
          </a>
          <span class="breadcrumb-separator">></span>
          <span class="breadcrumb-current">{{ product?.name || 'Détails' }}</span>
        </div>
        
        <div class="header-actions">
          <button routerLink="/admin/insurance-products" class="btn btn-outline">
            ← Retour à la liste
          </button>
          <button 
            [routerLink]="['../edit', productId]" 
            class="btn btn-primary"
            *ngIf="product">
            Modifier
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Chargement du produit...</p>
      </div>

      <!-- Product Details -->
      <div class="content" *ngIf="product && !isLoading">
        <!-- Main Info Card -->
        <div class="main-card">
          <div class="card-header">
            <div class="product-title">
              <h1>{{ product.name }}</h1>
              <div class="product-meta">
                <span class="type-badge" [class]="'type-' + product.type">
                  {{ getTypeLabel(product.type) }}
                </span>
                <span class="status" [class]="'status-' + (product.is_active ? 'active' : 'inactive')">
                  {{ product.is_active ? 'Actif' : 'Inactif' }}
                </span>
              </div>
            </div>
            
            <div class="product-actions">
              <button 
                (click)="toggleProductStatus()" 
                class="btn btn-sm" 
                [class]="product.is_active ? 'btn-warning' : 'btn-success'"
                [disabled]="isUpdating">
                {{ product.is_active ? 'Désactiver' : 'Activer' }}
              </button>
              <button 
                (click)="duplicateProduct()" 
                class="btn btn-sm btn-outline"
                [disabled]="isUpdating">
                Dupliquer
              </button>
              <button 
                (click)="deleteProduct()" 
                class="btn btn-sm btn-danger"
                [disabled]="isUpdating">
                Supprimer
              </button>
            </div>
          </div>

          <div class="card-content">
            <p class="description" *ngIf="product.description">
              {{ product.description }}
            </p>
            
            <!-- Quick Stats -->
            <div class="quick-stats">
              <div class="stat">
                <div class="stat-label">Prime annuelle</div>
                <div class="stat-value">{{ formatCurrency(product.base_premium) }}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Devis générés</div>
                <div class="stat-value">{{ product.quotes_count || 0 }}</div>
              </div>
              <div class="stat" *ngIf="product.last_quote_date">
                <div class="stat-label">Dernier devis</div>
                <div class="stat-value">{{ product.last_quote_date | date:'dd/MM/yyyy' }}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Créé le</div>
                <div class="stat-value">{{ product.created_at | date:'dd/MM/yyyy' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="details-grid">
          <!-- Company Info -->
          <div class="detail-card" *ngIf="product.insurance_company">
            <h3>Compagnie d'assurance</h3>
            <div class="company-details">
              <div class="company-header">
                <img 
                  *ngIf="product.insurance_company.logo_url" 
                  [src]="product.insurance_company.logo_url" 
                  [alt]="product.insurance_company.name"
                  class="company-logo">
                <div>
                  <h4>{{ product.insurance_company.name }}</h4>
                  <p *ngIf="product.insurance_company.full_name">
                    {{ product.insurance_company.full_name }}
                  </p>
                </div>
              </div>
              
              <div class="company-info" *ngIf="product.insurance_company.contact_phone || product.insurance_company.contact_email">
                <div class="info-item" *ngIf="product.insurance_company.contact_phone">
                  <strong>Téléphone:</strong> {{ product.insurance_company.contact_phone }}
                </div>
                <div class="info-item" *ngIf="product.insurance_company.contact_email">
                  <strong>Email:</strong> {{ product.insurance_company.contact_email }}
                </div>
                <div class="info-item" *ngIf="product.insurance_company.website">
                  <strong>Site web:</strong> 
                  <a [href]="product.insurance_company.website" target="_blank">
                    {{ product.insurance_company.website }}
                  </a>
                </div>
                <div class="info-item" *ngIf="product.insurance_company.rating">
                  <strong>Note:</strong> {{ product.insurance_company.rating }}
                </div>
              </div>
            </div>
          </div>

          <!-- Coverage Details -->
          <div class="detail-card">
            <h3>Détails de couverture</h3>
            <div class="coverage-grid">
              <div class="coverage-item" *ngFor="let item of getCoverageItems()">
                <div class="coverage-name">{{ item.name }}</div>
                <div class="coverage-value">{{ item.value }}</div>
              </div>
            </div>
          </div>

          <!-- Age Limits -->
          <div class="detail-card" *ngIf="product.age_limits">
            <h3>Limites d'âge</h3>
            <div class="age-limits">
              <div class="age-item">
                <strong>Âge minimum:</strong> {{ product.age_limits.min_age || 'Non spécifié' }} ans
              </div>
              <div class="age-item">
                <strong>Âge maximum:</strong> {{ product.age_limits.max_age || 'Non spécifié' }} ans
              </div>
            </div>
          </div>

          <!-- Deductibles -->
          <div class="detail-card" *ngIf="product.deductibles && hasDeductibles()">
            <h3>Franchises</h3>
            <div class="deductibles-list">
              <div *ngFor="let deductible of getDeductiblesList()" class="deductible-item">
                <strong>{{ deductible.name }}:</strong> {{ formatCurrency(deductible.amount) }}
              </div>
            </div>
          </div>

          <!-- Features -->
          <div class="detail-card" *ngIf="product.features && product.features.length > 0">
            <h3>Caractéristiques</h3>
            <ul class="features-list">
              <li *ngFor="let feature of product.features">{{ feature }}</li>
            </ul>
          </div>

          <!-- Exclusions -->
          <div class="detail-card" *ngIf="product.exclusions && product.exclusions.length > 0">
            <h3>Exclusions</h3>
            <ul class="exclusions-list">
              <li *ngFor="let exclusion of product.exclusions">{{ exclusion }}</li>
            </ul>
          </div>

          <!-- Guarantees from Coverage Details -->
          <div class="detail-card" *ngIf="getGuaranteesList().length > 0">
            <h3>Garanties</h3>
            <div class="guarantees-list">
              <div *ngFor="let guarantee of getGuaranteesList()" class="guarantee-item">
                <div class="guarantee-header">
                  <strong>{{ guarantee.name }}</strong>
                  <span class="guarantee-amount">{{ formatCurrency(guarantee.amount) }}</span>
                </div>
                <p *ngIf="guarantee.description" class="guarantee-description">
                  {{ guarantee.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- System Info -->
          <div class="detail-card system-info">
            <h3>Informations système</h3>
            <div class="system-details">
              <div class="system-item">
                <strong>ID:</strong> {{ product.id }}
              </div>
              <div class="system-item">
                <strong>Créé le:</strong> {{ product.created_at | date:'dd/MM/yyyy à HH:mm' }}
              </div>
              <div class="system-item">
                <strong>Modifié le:</strong> {{ product.updated_at | date:'dd/MM/yyyy à HH:mm' }}
              </div>
              <div class="system-item">
                <strong>Statut:</strong> 
                <span [class]="'status-text-' + (product.is_active ? 'active' : 'inactive')">
                  {{ product.is_active ? 'Actif' : 'Inactif' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="!product && !isLoading">
        <div class="error-icon">⚠️</div>
        <h3>Produit non trouvé</h3>
        <p>Le produit demandé n'existe pas ou a été supprimé.</p>
        <button routerLink="/admin/insurance-products" class="btn btn-primary">
          Retour à la liste
        </button>
      </div>
    </div>
  `,
  styles: [`
    .product-details {
      padding: 20px;
      max-width: 1200px;
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

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
    }

    .breadcrumb-link {
      color: #007bff;
      text-decoration: none;
    }

    .breadcrumb-link:hover {
      text-decoration: underline;
    }

    .breadcrumb-separator {
      color: #ccc;
    }

    .breadcrumb-current {
      font-weight: 500;
      color: #333;
    }

    .header-actions {
      display: flex;
      gap: 10px;
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

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .main-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      overflow: hidden;
    }

    .card-header {
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
      padding: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .product-title h1 {
      margin: 0 0 15px 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .product-meta {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .type-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-active {
      background: #d4edda;
      color: #155724;
    }

    .status-inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .product-actions {
      display: flex;
      gap: 10px;
    }

    .card-content {
      padding: 30px;
    }

    .description {
      font-size: 16px;
      line-height: 1.6;
      color: #555;
      margin-bottom: 30px;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
    }

    .stat {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #333;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .detail-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 25px;
    }

    .detail-card h3 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 18px;
      font-weight: 600;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }

    .company-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }

    .company-logo {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      object-fit: cover;
    }

    .company-header h4 {
      margin: 0;
      color: #333;
    }

    .company-header p {
      margin: 5px 0 0 0;
      color: #666;
      font-size: 14px;
    }

    .company-info, .system-details {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .info-item, .system-item {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .info-item:last-child, .system-item:last-child {
      border-bottom: none;
    }

    .coverage-grid {
      display: grid;
      gap: 15px;
    }

    .coverage-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .coverage-name {
      font-weight: 500;
      color: #333;
    }

    .coverage-value {
      font-weight: 600;
      color: #007bff;
    }

    .age-limits {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .age-item {
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .deductibles-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .deductible-item {
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .features-list, .exclusions-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .features-list li, .exclusions-list li {
      padding: 8px 0 8px 20px;
      border-bottom: 1px solid #f0f0f0;
      position: relative;
    }

    .features-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #28a745;
      font-weight: bold;
    }

    .exclusions-list li:before {
      content: "✗";
      position: absolute;
      left: 0;
      color: #dc3545;
      font-weight: bold;
    }

    .features-list li:last-child, .exclusions-list li:last-child {
      border-bottom: none;
    }

    .guarantees-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .guarantee-item {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      background: #f8f9fa;
    }

    .guarantee-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .guarantee-amount {
      font-weight: 700;
      color: #007bff;
    }

    .guarantee-description {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .system-info {
      background: #f8f9fa;
      border-left: 4px solid #007bff;
    }

    .status-text-active {
      color: #28a745;
      font-weight: 600;
    }

    .status-text-inactive {
      color: #dc3545;
      font-weight: 600;
    }

    .error-state {
      text-align: center;
      padding: 80px 20px;
      color: #666;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .error-state h3 {
      margin-bottom: 15px;
      color: #333;
    }

    .error-state p {
      margin-bottom: 30px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s;
    }

    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover:not(:disabled) { background: #0056b3; }

    .btn-outline { 
      border: 1px solid #ddd; 
      background: white; 
      color: #333; 
    }
    .btn-outline:hover:not(:disabled) { 
      background: #f8f9fa; 
      border-color: #007bff; 
    }

    .btn-success { background: #28a745; color: white; }
    .btn-success:hover:not(:disabled) { background: #1e7e34; }

    .btn-warning { background: #ffc107; color: #212529; }
    .btn-warning:hover:not(:disabled) { background: #e0a800; }

    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover:not(:disabled) { background: #c82333; }

    .btn-sm { padding: 6px 12px; font-size: 12px; }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .product-details {
        padding: 15px;
      }

      .header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }

      .card-header {
        flex-direction: column;
        gap: 20px;
        align-items: flex-start;
      }

      .product-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      .quick-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .coverage-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }

      .guarantee-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }
    }
  `]
})
export class InsuranceProductDetailsComponent implements OnInit, OnDestroy {
  product: InsuranceProductAdmin | null = null;
  productId: string;
  isLoading = false;
  isUpdating = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private insuranceAdminService: InsuranceAdminService,
    private notificationService: NotificationService
  ) {
    this.productId = this.route.snapshot.paramMap.get('id') || '';
  }

  ngOnInit() {
    if (this.productId) {
      this.loadProduct();
    } else {
      this.router.navigate(['/admin/insurance-products']);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProduct() {
    this.isLoading = true;
    
    this.insuranceAdminService.getInsuranceProduct(this.productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.product = product;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement produit:', error);
          this.notificationService.showError('Impossible de charger le produit');
          this.isLoading = false;
        }
      });
  }

  toggleProductStatus() {
    if (!this.product) return;
    
    const newStatus = !this.product.is_active;
    const action = newStatus ? 'activer' : 'désactiver';
    
    if (confirm(`Êtes-vous sûr de vouloir ${action} ce produit ?`)) {
      this.isUpdating = true;
      
      this.insuranceAdminService.updateInsuranceProduct(this.productId, { 
        is_active: newStatus 
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.product!.is_active = newStatus;
            this.notificationService.showSuccess(`Produit ${newStatus ? 'activé' : 'désactivé'} avec succès`);
            this.isUpdating = false;
          },
          error: (error) => {
            console.error('Erreur changement statut:', error);
            this.notificationService.showError('Erreur lors du changement de statut');
            this.isUpdating = false;
          }
        });
    }
  }

  duplicateProduct() {
    if (!this.product) return;
    
    if (confirm(`Dupliquer le produit "${this.product.name}" ?`)) {
      this.isUpdating = true;
      
      const duplicatedProduct = {
        name: `${this.product.name} (Copie)`,
        type: this.product.type,
        description: this.product.description,
        insurance_company_id: this.product.insurance_company_id,
        base_premium: this.product.base_premium,
        coverage_details: { ...this.product.coverage_details },
        deductibles: { ...this.product.deductibles },
        age_limits: { ...this.product.age_limits },
        exclusions: [...(this.product.exclusions || [])],
        features: [...(this.product.features || [])],
        status: 'inactive'
      };

      this.insuranceAdminService.createInsuranceProduct(duplicatedProduct)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Produit dupliqué avec succès');
            this.router.navigate(['/admin/insurance-products']);
          },
          error: (error) => {
            console.error('Erreur duplication:', error);
            this.notificationService.showError('Erreur lors de la duplication');
            this.isUpdating = false;
          }
        });
    }
  }

  deleteProduct() {
    if (!this.product) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le produit "${this.product.name}" ?\n\nCette action est irréversible.`)) {
      this.isUpdating = true;
      
      this.insuranceAdminService.deleteInsuranceProduct(this.productId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Produit supprimé avec succès');
            this.router.navigate(['/admin/insurance-products']);
          },
          error: (error) => {
            console.error('Erreur suppression:', error);
            const message = error.error?.detail || 'Erreur lors de la suppression';
            this.notificationService.showError(message);
            this.isUpdating = false;
          }
        });
    }
  }

  getCoverageItems(): Array<{name: string, value: string}> {
    if (!this.product?.coverage_details) return [];
    
    const items = [];
    const details = this.product.coverage_details;
    
    if (details.max_coverage) {
      items.push({
        name: 'Couverture maximale',
        value: this.formatCurrency(details.max_coverage)
      });
    }
    
    if (details.duration_years) {
      items.push({
        name: 'Durée du contrat',
        value: `${details.duration_years} an${details.duration_years > 1 ? 's' : ''}`
      });
    }
    
    if (details.requires_medical_exam !== undefined) {
      items.push({
        name: 'Examen médical',
        value: details.requires_medical_exam ? 'Requis' : 'Non requis'
      });
    }
    
    if (details.accepts_preexisting_conditions !== undefined) {
      items.push({
        name: 'Conditions préexistantes',
        value: details.accepts_preexisting_conditions ? 'Acceptées' : 'Non acceptées'
      });
    }
    
    if (details.is_renewable !== undefined) {
      items.push({
        name: 'Renouvellement',
        value: details.is_renewable ? 'Automatique' : 'Non renouvelable'
      });
    }
    
    if (details.has_waiting_period) {
      items.push({
        name: 'Période de carence',
        value: `${details.waiting_period_days || 0} jour${details.waiting_period_days > 1 ? 's' : ''}`
      });
    }
    
    return items;
  }

  hasDeductibles(): boolean {
    return !!(this.product?.deductibles && Object.keys(this.product.deductibles).length > 0);
  }

  getDeductiblesList(): Array<{name: string, amount: number}> {
    if (!this.product?.deductibles) return [];
    
    return Object.entries(this.product.deductibles).map(([key, value]) => ({
      name: this.getDeductibleName(key),
      amount: value as number
    }));
  }

  private getDeductibleName(key: string): string {
    const names: {[key: string]: string} = {
      'standard': 'Standard',
      'minimum': 'Minimum',
      'maximum': 'Maximum',
      'reduced': 'Réduite',
      'premium': 'Premium'
    };
    return names[key] || key;
  }

  getGuaranteesList(): Array<{name: string, amount: number, description?: string}> {
    if (!this.product?.coverage_details) return [];
    
    const guarantees = [];
    const details = this.product.coverage_details;
    
    // Extraire les garanties du coverage_details
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'object' && value !== null && 
          'amount' in value && typeof (value as any).amount === 'number') {
        guarantees.push({
          name: key,
          amount: (value as any).amount,
          description: (value as any).description || undefined
        });
      }
    }
    
    return guarantees;
  }

  formatCurrency(amount: number): string {
    return this.insuranceAdminService.formatCurrency(amount);
  }

  getTypeLabel(type: string): string {
    return this.insuranceAdminService.getTypeLabel(type);
  }
}