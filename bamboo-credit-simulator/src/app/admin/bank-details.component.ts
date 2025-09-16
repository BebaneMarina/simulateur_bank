import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  BankAdminService, 
  BankAdmin 
} from '../services/bank-admin.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-bank-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bank-details">
      <!-- Header -->
      <div class="header">
        <div class="breadcrumb">
          <a routerLink="/admin/banks" class="breadcrumb-link">
            Banques
          </a>
          <span class="breadcrumb-separator">></span>
          <span class="breadcrumb-current">{{ bank?.name || 'Détails' }}</span>
        </div>
        
        <div class="header-actions">
          <button routerLink="/admin/banks" class="btn btn-outline">
            ← Retour à la liste
          </button>
          <button 
            [routerLink]="['../edit', bankId]" 
            class="btn btn-primary"
            *ngIf="bank">
            Modifier
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Chargement de la banque...</p>
      </div>

      <!-- Bank Details -->
      <div class="content" *ngIf="bank && !isLoading">
        <!-- Main Info Card -->
        <div class="main-card">
          <div class="card-header">
            <div class="bank-title">
              <div class="bank-logo">
                <img *ngIf="bank.logo_url" [src]="bank.logo_url" [alt]="bank.name">
                <div *ngIf="!bank.logo_url" class="logo-placeholder">
                  <i class="icon-bank"></i>
                </div>
              </div>
              <div class="title-info">
                <h1>{{ bank.name }}</h1>
                <p *ngIf="bank.full_name" class="full-name">{{ bank.full_name }}</p>
                <div class="bank-meta">
                  <span class="bank-code">Code: {{ bank.id }}</span>
                  <span class="status" [class.active]="bank.is_active" [class.inactive]="!bank.is_active">
                    {{ bank.is_active ? 'Actif' : 'Inactif' }}
                  </span>
                  <span *ngIf="bank.rating" class="rating" [style.background-color]="getRatingColor(bank.rating)">
                    {{ bank.rating }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="bank-actions">
              <button 
                (click)="toggleBankStatus()" 
                class="btn btn-sm" 
                [class]="bank.is_active ? 'btn-warning' : 'btn-success'"
                [disabled]="isUpdating">
                {{ bank.is_active ? 'Désactiver' : 'Activer' }}
              </button>
              <button 
                (click)="deleteBank()" 
                class="btn btn-sm btn-danger"
                [disabled]="isUpdating">
                Supprimer
              </button>
            </div>
          </div>

          <div class="card-content">
            <p *ngIf="bank.description" class="description">
              {{ bank.description }}
            </p>
            
            <!-- Quick Stats -->
            <div class="quick-stats">
              <div class="stat">
                <div class="stat-label">Produits de crédit</div>
                <div class="stat-value">{{ bank.credit_products_count || 0 }}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Produits d'épargne</div>
                <div class="stat-value">{{ bank.savings_products_count || 0 }}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Total simulations</div>
                <div class="stat-value">{{ bank.total_simulations || 0 }}</div>
              </div>
              <div class="stat" *ngIf="bank.established_year">
                <div class="stat-label">Fondée en</div>
                <div class="stat-value">{{ bank.established_year }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="details-grid">
          <!-- Contact Info -->
          <div class="detail-card">
            <h3>Informations de contact</h3>
            <div class="contact-details">
              <div class="contact-item" *ngIf="bank.contact_phone">
                <div class="contact-icon">📞</div>
                <div class="contact-info">
                  <strong>Téléphone</strong>
                  <span>{{ bank.contact_phone }}</span>
                </div>
              </div>
              
              <div class="contact-item" *ngIf="bank.contact_email">
                <div class="contact-icon">📧</div>
                <div class="contact-info">
                  <strong>Email</strong>
                  <a [href]="'mailto:' + bank.contact_email">{{ bank.contact_email }}</a>
                </div>
              </div>
              
              <div class="contact-item" *ngIf="bank.website">
                <div class="contact-icon">🌐</div>
                <div class="contact-info">
                  <strong>Site web</strong>
                  <a [href]="bank.website" target="_blank">{{ bank.website }}</a>
                </div>
              </div>
              
              <div class="contact-item" *ngIf="bank.address">
                <div class="contact-icon">📍</div>
                <div class="contact-info">
                  <strong>Adresse</strong>
                  <span>{{ bank.address }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Technical Info -->
          <div class="detail-card" *ngIf="bank.swift_code || bank.license_number">
            <h3>Informations techniques</h3>
            <div class="tech-details">
              <div class="tech-item" *ngIf="bank.swift_code">
                <strong>Code SWIFT:</strong>
                <span class="tech-value">{{ bank.swift_code }}</span>
              </div>
              <div class="tech-item" *ngIf="bank.license_number">
                <strong>Numéro de licence:</strong>
                <span class="tech-value">{{ bank.license_number }}</span>
              </div>
            </div>
          </div>

          <!-- Financial Info -->
          <div class="detail-card" *ngIf="bank.total_assets || bank.established_year || bank.rating">
            <h3>Informations financières</h3>
            <div class="financial-details">
              <div class="financial-item" *ngIf="bank.total_assets">
                <strong>Total des actifs:</strong>
                <span class="financial-value">{{ formatAssets(bank.total_assets) }}</span>
              </div>
              <div class="financial-item" *ngIf="bank.established_year">
                <strong>Année de création:</strong>
                <span class="financial-value">{{ bank.established_year }}</span>
              </div>
              <div class="financial-item" *ngIf="bank.rating">
                <strong>Notation:</strong>
                <span class="rating-badge" [style.background-color]="getRatingColor(bank.rating)">
                  {{ bank.rating }}
                </span>
              </div>
            </div>
          </div>

          <!-- Products -->
          <div class="detail-card" *ngIf="bankProducts">
            <h3>Produits bancaires</h3>
            
            <div class="products-section" *ngIf="bankProducts.credit?.length > 0">
              <h4>Produits de crédit ({{ bankProducts.credit.length }})</h4>
              <div class="products-list">
                <div *ngFor="let product of bankProducts.credit" class="product-item">
                  <div class="product-info">
                    <strong>{{ product.name }}</strong>
                    <span class="product-type">{{ product.type }}</span>
                  </div>
                  <div class="product-rate">{{ product.average_rate }}%</div>
                  <div class="product-status" [class.active]="product.is_active" [class.inactive]="!product.is_active">
                    {{ product.is_active ? 'Actif' : 'Inactif' }}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="products-section" *ngIf="bankProducts.savings?.length > 0">
              <h4>Produits d'épargne ({{ bankProducts.savings.length }})</h4>
              <div class="products-list">
                <div *ngFor="let product of bankProducts.savings" class="product-item">
                  <div class="product-info">
                    <strong>{{ product.name }}</strong>
                    <span class="product-type">{{ product.type }}</span>
                  </div>
                  <div class="product-rate">{{ product.interest_rate }}%</div>
                  <div class="product-status" [class.active]="product.is_active" [class.inactive]="!product.is_active">
                    {{ product.is_active ? 'Actif' : 'Inactif' }}
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="(!bankProducts.credit?.length && !bankProducts.savings?.length)" class="no-products">
              <p>Aucun produit configuré pour cette banque</p>
            </div>
          </div>

          <!-- Performance Chart -->
          <div class="detail-card" *ngIf="performance">
            <h3>Performance</h3>
            <div class="performance-section">
              <div class="period-selector">
                <button 
                  *ngFor="let period of periods" 
                  (click)="loadPerformance(period.value)"
                  [class.active]="selectedPeriod === period.value"
                  class="period-btn">
                  {{ period.label }}
                </button>
              </div>
              
              <div class="performance-stats">
                <div class="perf-stat">
                  <div class="perf-label">Volume crédit simulé</div>
                  <div class="perf-value">{{ formatCurrency(performance.volumes?.total_credit_volume || 0) }}</div>
                </div>
                <div class="perf-stat">
                  <div class="perf-label">Volume épargne simulé</div>
                  <div class="perf-value">{{ formatCurrency(performance.volumes?.total_savings_volume || 0) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- System Info -->
          <div class="detail-card system-info">
            <h3>Informations système</h3>
            <div class="system-details">
              <div class="system-item">
                <strong>ID:</strong> {{ bank.id }}
              </div>
              <div class="system-item">
                <strong>Créée le:</strong> {{ bank.created_at | date:'dd/MM/yyyy à HH:mm' }}
              </div>
              <div class="system-item">
                <strong>Modifiée le:</strong> {{ bank.updated_at | date:'dd/MM/yyyy à HH:mm' }}
              </div>
              <div class="system-item" *ngIf="bank.last_simulation_date">
                <strong>Dernière simulation:</strong> {{ bank.last_simulation_date | date:'dd/MM/yyyy à HH:mm' }}
              </div>
              <div class="system-item">
                <strong>Statut:</strong>
                <span [class]="'status-text-' + (bank.is_active ? 'active' : 'inactive')">
                  {{ bank.is_active ? 'Actif' : 'Inactif' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="!bank && !isLoading">
        <div class="error-icon">⚠️</div>
        <h3>Banque non trouvée</h3>
        <p>La banque demandée n'existe pas ou a été supprimée.</p>
        <button routerLink="/admin/banks" class="btn btn-primary">
          Retour à la liste
        </button>
      </div>
    </div>
  `,
  styles: [`
    .bank-details {
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

    .bank-title {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .bank-logo {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255,255,255,0.1);
      flex-shrink: 0;
    }

    .bank-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .logo-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.7);
      font-size: 32px;
    }

    .title-info h1 {
      margin: 0 0 8px 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .full-name {
      margin: 0 0 15px 0;
      color: rgba(255,255,255,0.9);
      font-size: 16px;
    }

    .bank-meta {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }

    .bank-code {
      padding: 4px 8px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status.active {
      background: #d4edda;
      color: #155724;
    }

    .status.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .rating {
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .bank-actions {
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
      font-size: 24px;
      font-weight: 700;
      color: #007bff;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
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

    .detail-card h4 {
      margin: 20px 0 15px 0;
      color: #555;
      font-size: 16px;
      font-weight: 600;
    }

    .contact-details, .tech-details, .financial-details {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .contact-icon {
      font-size: 20px;
      width: 24px;
      text-align: center;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .contact-info strong {
      color: #333;
      font-size: 14px;
    }

    .contact-info span,
    .contact-info a {
      color: #666;
      font-size: 13px;
      text-decoration: none;
    }

    .contact-info a:hover {
      color: #007bff;
      text-decoration: underline;
    }

    .tech-item, .financial-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .tech-item:last-child, .financial-item:last-child {
      border-bottom: none;
    }

    .tech-value, .financial-value {
      font-weight: 600;
      color: #333;
    }

    .rating-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .products-section {
      margin-bottom: 25px;
    }

    .products-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .product-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .product-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .product-info strong {
      color: #333;
      font-size: 14px;
    }

    .product-type {
      color: #666;
      font-size: 12px;
      text-transform: capitalize;
    }

    .product-rate {
      font-weight: 600;
      color: #007bff;
    }

    .product-status {
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
    }

    .product-status.active {
      background: #d4edda;
      color: #155724;
    }

    .product-status.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .no-products {
      text-align: center;
      color: #666;
      font-style: italic;
      padding: 20px;
    }

    .period-selector {
      display: flex;
      gap: 5px;
      margin-bottom: 20px;
    }

    .period-btn {
      padding: 6px 12px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.3s;
    }

    .period-btn:hover {
      background: #f8f9fa;
    }

    .period-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .performance-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .perf-stat {
      text-align: center;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .perf-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }

    .perf-value {
      font-size: 16px;
      font-weight: 600;
      color: #007bff;
    }

    .system-info {
      background: #f8f9fa;
      border-left: 4px solid #007bff;
    }

    .system-details {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .system-item {
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }

    .system-item:last-child {
      border-bottom: none;
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

    .icon-bank::before { content: "🏦"; }

    @media (max-width: 768px) {
      .bank-details {
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

      .bank-title {
        flex-direction: column;
        text-align: center;
        gap: 15px;
      }

      .bank-actions {
        width: 100%;
        justify-content: center;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      .quick-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .performance-stats {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BankDetailsComponent implements OnInit, OnDestroy {
  bank: BankAdmin | null = null;
  bankProducts: any = null;
  performance: any = null;
  bankId: string;
  isLoading = false;
  isUpdating = false;
  
  selectedPeriod = '6m';
  periods = [
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1A' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bankAdminService: BankAdminService,
    private notificationService: NotificationService
  ) {
    this.bankId = this.route.snapshot.paramMap.get('id') || '';
  }

  ngOnInit() {
    if (this.bankId) {
      this.loadBank();
    } else {
      this.router.navigate(['/admin/banks']);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBank() {
    this.isLoading = true;
    
    this.bankAdminService.getBank(this.bankId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bank) => {
          this.bank = bank;
          this.loadBankProducts();
          this.loadPerformance();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement banque:', error);
          this.notificationService.showError('Impossible de charger la banque');
          this.isLoading = false;
        }
      });
  }

  private loadBankProducts() {
    this.bankAdminService.getBankProducts(this.bankId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.bankProducts = products;
        },
        error: (error) => {
          console.error('Erreur chargement produits:', error);
        }
      });
  }

  loadPerformance(period: string = this.selectedPeriod) {
    this.selectedPeriod = period;
    
    this.bankAdminService.getBankPerformance(this.bankId, period)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (performance) => {
          this.performance = performance;
        },
        error: (error) => {
          console.error('Erreur chargement performance:', error);
        }
      });
  }

  toggleBankStatus() {
    if (!this.bank) return;
    
    const newStatus = !this.bank.is_active;
    const action = newStatus ? 'activer' : 'désactiver';
    
    if (confirm(`Êtes-vous sûr de vouloir ${action} cette banque ?`)) {
      this.isUpdating = true;
      
      this.bankAdminService.updateBank(this.bankId, { is_active: newStatus })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.bank!.is_active = newStatus;
            this.notificationService.showSuccess(`Banque ${newStatus ? 'activée' : 'désactivée'} avec succès`);
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

  deleteBank() {
    if (!this.bank) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la banque "${this.bank.name}" ?\n\nCette action est irréversible.`)) {
      this.isUpdating = true;
      
      this.bankAdminService.deleteBank(this.bankId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Banque supprimée avec succès');
            this.router.navigate(['/admin/banks']);
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

  formatAssets(amount: number): string {
    return this.bankAdminService.formatAssets(amount);
  }

  formatCurrency(amount: number): string {
    return this.bankAdminService.formatCurrency(amount);
  }

  getRatingColor(rating: string): string {
    return this.bankAdminService.getRatingColor(rating);
  }
}