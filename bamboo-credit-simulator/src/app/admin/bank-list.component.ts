import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { 
  BankAdminService, 
  BankAdmin, 
  BankStats 
} from '../services/bank-admin.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-banks-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="banks-list">
      <div class="page-header">
        <div class="header-content">
          <h1>Gestion des Banques</h1>
          <p>Administrez les établissements bancaires partenaires</p>
        </div>
        <div class="header-actions">
          <button routerLink="create" class="btn btn-primary">
            <i class="icon-plus"></i>
            Ajouter une banque
          </button>
        </div>
      </div>

      <!-- Statistiques -->
      <div class="stats-cards" *ngIf="stats">
        <div class="stat-card">
          <div class="stat-number">{{ stats.banks.total }}</div>
          <div class="stat-label">Banques totales</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.banks.active }}</div>
          <div class="stat-label">Banques actives</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.products.total }}</div>
          <div class="stat-label">Produits totaux</div>
        </div>
      </div>

      <!-- Filtres et recherche -->
      <div class="filters-section">
        <form [formGroup]="filtersForm" class="filters-form">
          <div class="filter-group">
            <label for="search">Rechercher</label>
            <input 
              type="text" 
              id="search"
              formControlName="search" 
              placeholder="Nom, code, description..."
              class="form-input">
          </div>
          
          <div class="filter-group">
            <label for="status">Statut</label>
            <select formControlName="status" id="status" class="form-select">
              <option value="">Tous</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="rating">Notation</label>
            <select formControlName="rating" id="rating" class="form-select">
              <option value="">Toutes</option>
              <option *ngFor="let rating of ratings" [value]="rating">{{ rating }}</option>
            </select>
          </div>

          <button type="button" (click)="resetFilters()" class="btn btn-outline">
            Réinitialiser
          </button>
          
          <button type="button" (click)="refreshData()" class="btn btn-outline" [disabled]="isLoading">
            <i class="icon-refresh" [class.spinning]="isLoading"></i>
            Actualiser
          </button>
        </form>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="isLoading && banks.length === 0">
        <div class="spinner"></div>
        <p>Chargement des banques...</p>
      </div>

      <!-- Liste des banques -->
      <div class="content-section" *ngIf="!isLoading || banks.length > 0">
        <div *ngIf="banks.length === 0 && !isLoading" class="empty-state">
          <div class="empty-icon">🏦</div>
          <h3>Aucune banque trouvée</h3>
          <p>{{ getEmptyStateMessage() }}</p>
          <button routerLink="create" class="btn btn-primary" *ngIf="!hasFilters()">
            Ajouter une banque
          </button>
          <button (click)="clearFilters()" class="btn btn-outline" *ngIf="hasFilters()">
            Effacer les filtres
          </button>
        </div>

        <div *ngIf="banks.length > 0" class="banks-grid">
          <div *ngFor="let bank of banks; trackBy: trackByBank" class="bank-card">
            <div class="card-header">
              <div class="bank-logo">
                <img *ngIf="bank.logo_url" [src]="bank.logo_url" [alt]="bank.name">
                <div *ngIf="!bank.logo_url" class="logo-placeholder">
                  <i class="icon-bank"></i>
                </div>
              </div>
              <div class="bank-info">
                <h3>{{ bank.name }}</h3>
                <p class="bank-code">Code: {{ bank.id }}</p>
                <p *ngIf="bank.full_name" class="bank-full-name">{{ bank.full_name }}</p>
              </div>
              <div class="status-badges">
                <div class="status-badge" [class.active]="bank.is_active" [class.inactive]="!bank.is_active">
                  {{ bank.is_active ? 'Actif' : 'Inactif' }}
                </div>
                <div *ngIf="bank.rating" class="rating-badge" [style.background-color]="getRatingColor(bank.rating)">
                  {{ bank.rating }}
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="bank-details">
                <div class="detail-row" *ngIf="bank.description">
                  <span class="label">Description:</span>
                  <span class="value">{{ bank.description | slice:0:120 }}{{ bank.description.length > 120 ? '...' : '' }}</span>
                </div>
                
                <!-- Coordonnées -->
                <div class="detail-section" *ngIf="bank.contact_phone || bank.contact_email || bank.website || bank.address">
                  <h4 class="section-title">Coordonnées</h4>
                  
                  <div class="detail-row" *ngIf="bank.contact_phone">
                    <span class="label">📞 Téléphone:</span>
                    <span class="value">{{ bank.contact_phone }}</span>
                  </div>
                  
                  <div class="detail-row" *ngIf="bank.contact_email">
                    <span class="label">📧 Email:</span>
                    <a [href]="'mailto:' + bank.contact_email" class="link">{{ bank.contact_email }}</a>
                  </div>
                  
                  <div class="detail-row" *ngIf="bank.website">
                    <span class="label">🌐 Site web:</span>
                    <a [href]="bank.website" target="_blank" class="link">
                      {{ getDisplayUrl(bank.website) }}
                    </a>
                  </div>
                  
                  <div class="detail-row" *ngIf="bank.address">
                    <span class="label">📍 Adresse:</span>
                    <span class="value">{{ bank.address | slice:0:80 }}{{ bank.address.length > 80 ? '...' : '' }}</span>
                  </div>
                </div>

                <!-- Informations techniques -->
                <div class="detail-section" *ngIf="bank.swift_code || bank.license_number">
                  <h4 class="section-title">Informations techniques</h4>
                  
                  <div class="detail-row" *ngIf="bank.swift_code">
                    <span class="label">Code SWIFT:</span>
                    <span class="value tech-value">{{ bank.swift_code }}</span>
                  </div>
                  
                  <div class="detail-row" *ngIf="bank.license_number">
                    <span class="label">Licence:</span>
                    <span class="value tech-value">{{ bank.license_number }}</span>
                  </div>
                </div>

                <!-- Données financières -->
                <div class="detail-section" *ngIf="bank.established_year || bank.total_assets">
                  <h4 class="section-title">Données financières</h4>
                  
                  <div class="detail-row" *ngIf="bank.established_year">
                    <span class="label">Fondée en:</span>
                    <span class="value">{{ bank.established_year }}</span>
                  </div>
                  
                  <div class="detail-row" *ngIf="bank.total_assets">
                    <span class="label">Total actifs:</span>
                    <span class="value financial-value">{{ formatAssets(bank.total_assets) }}</span>
                  </div>
                </div>
              </div>

              <!-- Statistiques des produits -->
              <div class="bank-stats">
                <div class="stat">
                  <span class="stat-value">{{ bank.credit_products_count || 0 }}</span>
                  <span class="stat-label">Crédits</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ bank.savings_products_count || 0 }}</span>
                  <span class="stat-label">Épargne</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ bank.total_simulations || 0 }}</span>
                  <span class="stat-label">Simulations</span>
                </div>
              </div>
              
              <!-- Dernière activité -->
              <div class="last-activity" *ngIf="bank.last_simulation_date">
                <small>Dernière simulation: {{ bank.last_simulation_date | date:'dd/MM/yyyy' }}</small>
              </div>

              <!-- Dates système -->
              <div class="system-dates">
                <small class="system-date">Créée le {{ bank.created_at | date:'dd/MM/yyyy' }}</small>
                <small class="system-date" *ngIf="bank.updated_at && bank.updated_at > bank.created_at">
                  Modifiée le {{ bank.updated_at | date:'dd/MM/yyyy' }}
                </small>
              </div>
            </div>

            <div class="card-actions">
              <button 
                [routerLink]="[bank.id]"
                class="btn btn-outline btn-sm">
                <i class="icon-eye"></i>
                Voir
              </button>
              <button 
                [routerLink]="['edit', bank.id]"
                class="btn btn-primary btn-sm">
                <i class="icon-edit"></i>
                Modifier
              </button>
              <button 
                (click)="toggleBankStatus(bank)"
                class="btn btn-sm" 
                [class]="bank.is_active ? 'btn-warning' : 'btn-success'"
                [disabled]="isLoading">
                <i [class]="bank.is_active ? 'icon-pause' : 'icon-play'"></i>
                {{ bank.is_active ? 'Désactiver' : 'Activer' }}
              </button>
              <button 
                (click)="deleteBank(bank)"
                class="btn btn-danger btn-sm"
                [disabled]="isLoading">
                <i class="icon-trash"></i>
                Supprimer
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="totalPages > 1">
          <button 
            (click)="goToPage(currentPage - 1)"
            [disabled]="currentPage <= 1 || isLoading"
            class="btn btn-sm">
            Précédent
          </button>
          
          <div class="page-info">
            Page {{ currentPage }} sur {{ totalPages }} 
            ({{ totalItems }} banque{{ totalItems > 1 ? 's' : '' }})
          </div>
          
          <div class="page-numbers">
            <button 
              *ngFor="let page of getPageNumbers()"
              (click)="goToPage(page)"
              [class.active]="page === currentPage"
              [disabled]="isLoading"
              class="btn btn-sm">
              {{ page }}
            </button>
          </div>
          
          <button 
            (click)="goToPage(currentPage + 1)"
            [disabled]="currentPage >= totalPages || isLoading"
            class="btn btn-sm">
            Suivant
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .banks-list {
      padding: 20px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }

    .header-content h1 {
      margin: 0 0 5px 0;
      color: #333;
    }

    .header-content p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      gap: 10px;
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

    .filters-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .filters-form {
      display: flex;
      gap: 20px;
      align-items: end;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 150px;
    }

    .filter-group label {
      font-size: 12px;
      font-weight: 500;
      color: #555;
    }

    .form-input, .form-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #007bff;
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

    .icon-refresh.spinning {
      animation: spin 1s linear infinite;
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #666;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      margin-bottom: 15px;
      color: #333;
    }

    .empty-state p {
      margin-bottom: 30px;
    }

    .banks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .bank-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .bank-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }

    .card-header {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      border-bottom: 1px solid #e9ecef;
    }

// === OPTIMISATION DES LOGOS UNIQUEMENT ===
.bank-logo {
  width: 70px;
  height: 70px;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 2px solid #f1f3f4;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: all 0.3s ease;
    padding: 5px; // Padding pour éviter que l'image touche les bords
    
    &:hover {
      transform: scale(1.1);
    }
  }

  .logo-placeholder {
    color: #cbd5e0;
    font-size: 28px;
    transition: all 0.3s ease;
    
    &:hover {
      color: #a0aec0;
      transform: scale(1.1);
    }
  }

  // Effet de brillance au survol
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    transition: left 0.5s ease;
  }

  &:hover::before {
    left: 100%;
  }
}

@media (max-width: 768px) {
  .bank-logo {
    width: 60px;
    height: 60px;
  }
}

@media (max-width: 480px) {
  .bank-logo {
    width: 50px;
    height: 50px;
  }
}

    .bank-info {
      flex: 1;
      min-width: 0;
    }

    .bank-info h3 {
      margin: 0 0 5px 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .bank-code {
      margin: 0 0 5px 0;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      font-weight: 500;
    }

    .bank-full-name {
      margin: 0;
      font-size: 13px;
      color: #777;
      font-style: italic;
    }

    .status-badges {
      display: flex;
      flex-direction: column;
      gap: 5px;
      align-items: flex-end;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .rating-badge {
      padding: 3px 6px;
      border-radius: 4px;
      color: white;
      font-size: 10px;
      font-weight: 600;
    }

    .card-body {
      padding: 20px;
    }

    .bank-details {
      margin-bottom: 20px;
    }

    .detail-section {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-section:last-of-type {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .section-title {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: 600;
      color: #007bff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      gap: 10px;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
      white-space: nowrap;
      min-width: 80px;
    }

    .value {
      font-size: 12px;
      color: #333;
      text-align: right;
      word-break: break-word;
    }

    .tech-value {
      font-family: monospace;
      background: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
    }

    .financial-value {
      font-weight: 600;
      color: #007bff;
    }

    .link {
      color: #007bff;
      text-decoration: none;
      font-size: 12px;
    }

    .link:hover {
      text-decoration: underline;
    }

    .bank-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 20px;
      font-weight: 700;
      color: #007bff;
      margin-bottom: 3px;
    }

    .stat .stat-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
    }

    .last-activity {
      text-align: center;
      margin-bottom: 10px;
    }

    .last-activity small {
      color: #666;
      font-size: 11px;
    }

    .system-dates {
      display: flex;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid #f0f0f0;
    }

    .system-date {
      color: #999;
      font-size: 10px;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      padding: 15px 20px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }

    .btn {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.3s;
      text-align: center;
      justify-content: center;
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

    .btn-sm { 
      padding: 6px 10px; 
      font-size: 11px;
      flex: 1;
    }

    .btn.active { background: #007bff; color: white; }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 30px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .page-info {
      font-size: 14px;
      color: #666;
    }

    .page-numbers {
      display: flex;
      gap: 5px;
    }

    .icon-plus::before { content: "+"; }
    .icon-eye::before { content: "👁"; }
    .icon-edit::before { content: "✏️"; }
    .icon-trash::before { content: "🗑"; }
    .icon-refresh::before { content: "🔄"; }
    .icon-pause::before { content: "⏸"; }
    .icon-play::before { content: "▶️"; }
    .icon-bank::before { content: "🏦"; }

    @media (max-width: 768px) {
      .banks-list {
        padding: 15px;
      }

      .page-header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }

      .stats-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .filters-form {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-group {
        min-width: auto;
      }

      .banks-grid {
        grid-template-columns: 1fr;
      }

      .card-header {
        flex-direction: column;
        text-align: center;
        gap: 10px;
      }

      .status-badges {
        flex-direction: row;
        align-items: center;
      }

      .card-actions {
        flex-wrap: wrap;
      }

      .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }

      .value {
        text-align: left;
      }

      .system-dates {
        flex-direction: column;
        gap: 5px;
      }
    }
  `]
})
export class BanksListComponent implements OnInit, OnDestroy {
  banks: BankAdmin[] = [];
  stats: BankStats | null = null;
  filtersForm: FormGroup;
  ratings: string[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 1;
  
  // États
  isLoading = false;
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private bankAdminService: BankAdminService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      status: [''],
      rating: ['']
    });
    
    this.ratings = this.bankAdminService.getBankRatings();
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadBanks();
    });

    this.filtersForm.get('search')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.searchSubject.next(value);
    });

    this.filtersForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.filtersForm.get('status')?.dirty || this.filtersForm.get('rating')?.dirty) {
        this.currentPage = 1;
        this.loadBanks();
      }
    });
  }

  private loadInitialData(): void {
    this.loadStats();
    this.loadBanks();
  }

  private loadStats(): void {
  this.bankAdminService.getAdminStats()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (stats) => {
        console.log('Stats globales reçues:', stats); // Debug
        this.stats = stats;
      },
      error: (error) => {
        console.error('Erreur chargement statistiques:', error);
      }
    });
}

  loadBanks(): void {
  this.isLoading = true;
  
  const filters = this.filtersForm.value;
  const params = {
    skip: (this.currentPage - 1) * this.pageSize,
    limit: this.pageSize,
    search: filters.search || undefined,
    is_active: filters.status ? filters.status === 'true' : undefined,
    rating: filters.rating || undefined
  };

  console.log('Paramètres de requête:', params); // Debug

  this.bankAdminService.getBanks(params)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('Réponse reçue:', response); // Debug
        console.log('Première banque:', response.banks[0]); // Debug
        
        this.banks = response.banks;
        this.totalItems = response.total;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.isLoading = false;
        
        // Vérifier les statistiques
        this.banks.forEach((bank, index) => {
          console.log(`Banque ${index} (${bank.name}):`, {
            credit_products_count: bank.credit_products_count,
            savings_products_count: bank.savings_products_count,
            total_simulations: bank.total_simulations
          });
        });
      },
      error: (error) => {
        console.error('Erreur chargement banques:', error);
        this.notificationService.showError('Impossible de charger les banques');
        this.isLoading = false;
      }
    });
}


  refreshData(): void {
    this.loadStats();
    this.loadBanks();
  }

  resetFilters(): void {
    this.filtersForm.reset();
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.resetFilters();
  }

  toggleBankStatus(bank: BankAdmin): void {
    const newStatus = !bank.is_active;
    const action = newStatus ? 'activer' : 'désactiver';
    
    if (confirm(`Êtes-vous sûr de vouloir ${action} la banque "${bank.name}" ?`)) {
      this.isLoading = true;
      
      this.bankAdminService.updateBank(bank.id, { is_active: newStatus })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            bank.is_active = newStatus;
            this.notificationService.showSuccess(`Banque ${newStatus ? 'activée' : 'désactivée'} avec succès`);
            this.loadStats();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Erreur changement statut:', error);
            this.notificationService.showError('Erreur lors du changement de statut');
            this.isLoading = false;
          }
        });
    }
  }

  deleteBank(bank: BankAdmin): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la banque "${bank.name}" ?\n\nCette action est irréversible et supprimera également tous les produits associés.`)) {
      this.isLoading = true;
      
      this.bankAdminService.deleteBank(bank.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Banque supprimée avec succès');
            this.loadBanks();
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

  hasFilters(): boolean {
    const filters = this.filtersForm.value;
    return !!(filters.search || filters.status || filters.rating);
  }

  getEmptyStateMessage(): string {
    if (this.hasFilters()) {
      return 'Aucune banque ne correspond aux filtres sélectionnés.';
    }
    return 'Commencez par ajouter votre première banque partenaire.';
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadBanks();
    }
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

  trackByBank(index: number, bank: BankAdmin): string {
    return bank.id;
  }

  formatAssets(amount: number): string {
    return this.bankAdminService.formatAssets(amount);
  }

  getRatingColor(rating: string): string {
    return this.bankAdminService.getRatingColor(rating);
  }

  getDisplayUrl(url: string): string {
    return url.replace(/^https?:\/\//, '');
  }

}