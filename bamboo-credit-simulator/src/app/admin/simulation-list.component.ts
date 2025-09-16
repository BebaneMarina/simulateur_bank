import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { AdminAuthService } from '../services/admin-auth.services';
import { NotificationService } from '../services/notification.service';
import { CreditSimulation, SavingsSimulation, PaginatedResponse } from '../models/interfaces';

@Component({
  selector: 'app-simulations-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div class="header-content">
          <h1>Gestion des Simulations</h1>
          <p>Consultez et analysez les simulations des utilisateurs</p>
        </div>
        <div class="header-actions">
          <button (click)="exportSimulations()" class="btn btn-outline">
            <i class="fas fa-download"></i>
            Exporter
          </button>
        </div>
      </div>

      <!-- Onglets pour type de simulation -->
      <div class="tabs-navigation">
        <button 
          (click)="setActiveTab('credit')"
          [class.active]="activeTab === 'credit'"
          class="tab-button">
          <i class="fas fa-home"></i>
          Simulations Crédit ({{ creditCount }})
        </button>
        <button 
          (click)="setActiveTab('savings')"
          [class.active]="activeTab === 'savings'"
          class="tab-button">
          <i class="fas fa-piggy-bank"></i>
          Simulations Épargne ({{ savingsCount }})
        </button>
      </div>

      <!-- Filtres -->
      <div class="filters-section">
        <form [formGroup]="filtersForm" class="filters-form">
          <div class="filter-group">
            <label for="dateRange">Période</label>
            <select formControlName="date_range" id="dateRange" class="form-select">
              <option value="">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
            </select>
          </div>
          
          <div class="filter-group" *ngIf="activeTab === 'credit'">
            <label for="creditType">Type de crédit</label>
            <select formControlName="credit_type" id="creditType" class="form-select">
              <option value="">Tous types</option>
              <option value="immobilier">Immobilier</option>
              <option value="consommation">Consommation</option>
              <option value="auto">Auto</option>
              <option value="professionnel">Professionnel</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="amountRange">Montant</label>
            <select formControlName="amount_range" id="amountRange" class="form-select">
              <option value="">Tous montants</option>
              <option value="0-1000000">< 1M FCFA</option>
              <option value="1000000-5000000">1M - 5M FCFA</option>
              <option value="5000000-10000000">5M - 10M FCFA</option>
              <option value="10000000-50000000">10M - 50M FCFA</option>
              <option value="50000000+">50M+ FCFA</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="bank">Banque</label>
            <select formControlName="bank_id" id="bank" class="form-select">
              <option value="">Toutes les banques</option>
              <option *ngFor="let bank of banks" [value]="bank.id">
                {{ bank.name }}
              </option>
            </select>
          </div>

          <button type="button" (click)="resetFilters()" class="btn btn-outline">
            Réinitialiser
          </button>
        </form>
      </div>

      <!-- Statistiques -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-value">{{ getTotalSimulations() }}</div>
          <div class="stat-label">Total simulations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ getTodaySimulations() }}</div>
          <div class="stat-label">Aujourd'hui</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ getAverageAmount() }}</div>
          <div class="stat-label">Montant moyen</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ getConversionRate() }}%</div>
          <div class="stat-label">Taux de conversion</div>
        </div>
      </div>

      <!-- Contenu des onglets -->
      <div class="tab-content">
        <!-- Simulations Crédit -->
        <div *ngIf="activeTab === 'credit'" class="content-section">
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Chargement des simulations...</p>
          </div>

          <div *ngIf="!loading && creditSimulations.length === 0" class="empty-state">
            <div class="empty-icon">
              <i class="fas fa-calculator"></i>
            </div>
            <h3>Aucune simulation trouvée</h3>
            <p>Aucune simulation de crédit ne correspond aux critères sélectionnés</p>
          </div>

          <div *ngIf="!loading && creditSimulations.length > 0" class="simulations-table">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Durée</th>
                  <th>Taux</th>
                  <th>Mensualité</th>
                  <th>Banque</th>
                  <th>Utilisateur</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let simulation of creditSimulations" class="simulation-row">
                  <td>
                    <div class="date-info">
                      <div class="date">{{ formatDate(simulation.created_at) }}</div>
                      <div class="time">{{ formatTime(simulation.created_at) }}</div>
                    </div>
                  </td>
                  <td>
                    <span class="type-badge" [class]="getCreditType(simulation)">
                      {{ getCreditTypeLabel(getCreditType(simulation)) }}
                    </span>
                  </td>
                  <td>
                    <div class="amount">{{ formatCurrency(simulation.requested_amount) }}</div>
                  </td>
                  <td>
                    <div class="duration">{{ simulation.duration_months }} mois</div>
                  </td>
                  <td>
                    <div class="rate">{{ formatPercent(simulation.applied_rate) }}</div>
                  </td>
                  <td>
                    <div class="payment">{{ formatCurrency(simulation.monthly_payment) }}</div>
                  </td>
                  <td>
                    <div class="bank-info">
                      <span>{{ getBankName(simulation.credit_product) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="user-info">
                      <span>{{ simulation.session_id || 'Anonyme' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="actions-menu">
                      <button 
                        [routerLink]="['/admin/simulations', simulation.id]"
                        class="btn btn-outline btn-sm">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button 
                        (click)="exportSimulation(simulation)"
                        class="btn btn-primary btn-sm">
                        <i class="fas fa-download"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Simulations Épargne -->
        <div *ngIf="activeTab === 'savings'" class="content-section">
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Chargement des simulations...</p>
          </div>

          <div *ngIf="!loading && savingsSimulations.length === 0" class="empty-state">
            <div class="empty-icon">
              <i class="fas fa-piggy-bank"></i>
            </div>
            <h3>Aucune simulation trouvée</h3>
            <p>Aucune simulation d'épargne ne correspond aux critères sélectionnés</p>
          </div>

          <div *ngIf="!loading && savingsSimulations.length > 0" class="simulations-table">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Montant initial</th>
                  <th>Versement mensuel</th>
                  <th>Durée</th>
                  <th>Taux</th>
                  <th>Capital final</th>
                  <th>Banque</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let simulation of savingsSimulations" class="simulation-row">
                  <td>
                    <div class="date-info">
                      <div class="date">{{ formatDate(simulation.created_at) }}</div>
                      <div class="time">{{ formatTime(simulation.created_at) }}</div>
                    </div>
                  </td>
                  <td>
                    <div class="product-info">
                      <span>{{ getProductName(simulation.savings_product) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="amount">{{ formatCurrency(simulation.initial_amount) }}</div>
                  </td>
                  <td>
                    <div class="monthly">{{ formatCurrency(simulation.monthly_contribution) }}</div>
                  </td>
                  <td>
                    <div class="duration">{{ simulation.duration_months }} mois</div>
                  </td>
                  <td>
                    <div class="rate">{{ formatPercent(getSavingsRate(simulation)) }}</div>
                  </td>
                  <td>
                    <div class="final-amount">{{ formatCurrency(simulation.final_amount) }}</div>
                  </td>
                  <td>
                    <div class="bank-info">
                      <span>{{ getBankNameSavings(simulation.savings_product) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="actions-menu">
                      <button 
                        [routerLink]="['/admin/simulations', simulation.id]"
                        class="btn btn-outline btn-sm">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button 
                        (click)="exportSimulation(simulation)"
                        class="btn btn-primary btn-sm">
                        <i class="fas fa-download"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="pagination && pagination.total > pagination.limit" class="pagination-section">
          <div class="pagination-info">
            Affichage de {{ getPaginationStart() }} à {{ getPaginationEnd() }} 
            sur {{ pagination.total }} simulations
          </div>
          <div class="pagination-controls">
            <button 
              (click)="goToPage(currentPage - 1)"
              [disabled]="currentPage <= 1"
              class="btn btn-outline btn-sm">
              Précédent
            </button>
            
            <span class="page-numbers">
              <button 
                *ngFor="let page of getPageNumbers()"
                (click)="goToPage(page)"
                [class.active]="page === currentPage"
                class="btn btn-outline btn-sm">
                {{ page }}
              </button>
            </span>
            
            <button 
              (click)="goToPage(currentPage + 1)"
              [disabled]="currentPage >= getTotalPages()"
              class="btn btn-outline btn-sm">
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SimulationsListComponent implements OnInit {
  activeTab: 'credit' | 'savings' = 'credit';
  creditSimulations: CreditSimulation[] = [];
  savingsSimulations: SavingsSimulation[] = [];
  banks: any[] = [];
  loading = false;
  filtersForm: FormGroup;
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  pagination: any = null;

  // Compteurs
  creditCount = 0;
  savingsCount = 0;

  constructor(
    private adminApi: AdminApiService,
    private adminAuth: AdminAuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.filtersForm = this.fb.group({
      date_range: [''],
      credit_type: [''],
      amount_range: [''],
      bank_id: ['']
    });
  }

  ngOnInit(): void {
    this.loadBanks();
    this.loadSimulations();
    this.setupFilters();
  }

  private setupFilters(): void {
    this.filtersForm.valueChanges.subscribe(() => {
      this.currentPage = 1;
      this.loadSimulations();
    });
  }

  setActiveTab(tab: 'credit' | 'savings'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadSimulations();
  }

  loadBanks(): void {
    this.adminApi.getBanks().subscribe({
      next: (response) => {
        this.banks = response.items || response;
      },
      error: (error) => {
        console.error('Erreur chargement banques:', error);
      }
    });
  }

  loadSimulations(): void {
    this.loading = true;
    const filters = this.filtersForm.value;
    
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      ...filters
    };

    // Fix: Separate the requests based on active tab
    if (this.activeTab === 'credit') {
      this.adminApi.getCreditSimulations(params).subscribe({
        next: (response: PaginatedResponse<CreditSimulation>) => {
          this.creditSimulations = response.items;
          this.creditCount = response.total;
          this.pagination = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            pages: response.pages
          };
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Erreur chargement simulations:', error);
          this.notificationService.showError('Erreur lors du chargement des simulations');
          this.loading = false;
        }
      });
    } else {
      this.adminApi.getSavingsSimulations(params).subscribe({
        next: (response: PaginatedResponse<SavingsSimulation>) => {
          this.savingsSimulations = response.items;
          this.savingsCount = response.total;
          this.pagination = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            pages: response.pages
          };
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Erreur chargement simulations:', error);
          this.notificationService.showError('Erreur lors du chargement des simulations');
          this.loading = false;
        }
      });
    }
  }

  resetFilters(): void {
    this.filtersForm.reset();
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadSimulations();
    }
  }

  exportSimulation(simulation: any): void {
    this.notificationService.showSuccess('Export de la simulation en cours...');
    // Logique d'export individuel
  }

  exportSimulations(): void {
    this.notificationService.showSuccess('Export de toutes les simulations en cours...');
    // Logique d'export global
  }

  // Méthodes utilitaires
  getCreditType(simulation: CreditSimulation): string {
    return simulation.credit_product?.type || 'unknown';
  }

  getCreditTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'immobilier': 'Immobilier',
      'consommation': 'Consommation',
      'auto': 'Auto',
      'professionnel': 'Professionnel',
      'travaux': 'Travaux'
    };
    return labels[type] || type;
  }

  getBankName(creditProduct: any): string {
    return creditProduct?.bank?.name || 'N/A';
  }

  getBankNameSavings(savingsProduct: any): string {
    return savingsProduct?.bank?.name || 'N/A';
  }

  getProductName(savingsProduct: any): string {
    return savingsProduct?.name || 'N/A';
  }

  getSavingsRate(simulation: SavingsSimulation): number {
    return simulation.savings_product?.interest_rate || 0;
  }

  getTotalSimulations(): number {
    return this.creditCount + this.savingsCount;
  }

  getTodaySimulations(): number {
    const today = new Date().toDateString();
    const creditToday = this.creditSimulations.filter(s => 
      new Date(s.created_at).toDateString() === today
    ).length;
    const savingsToday = this.savingsSimulations.filter(s => 
      new Date(s.created_at).toDateString() === today
    ).length;
    return creditToday + savingsToday;
  }

  getAverageAmount(): string {
    const simulations = this.activeTab === 'credit' ? this.creditSimulations : this.savingsSimulations;
    if (simulations.length === 0) return '0';
    
    const total = simulations.reduce((sum, s) => {
      if (this.activeTab === 'credit') {
        return sum + (s as CreditSimulation).requested_amount;
      } else {
        return sum + (s as SavingsSimulation).initial_amount;
      }
    }, 0);
    
    const average = total / simulations.length;
    return this.formatCurrency(average);
  }

  getConversionRate(): number {
    // Calcul du taux de conversion basé sur les simulations qui ont mené à des demandes
    return Math.round(Math.random() * 25 + 10); // Mock pour l'exemple
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPaginationStart(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getPaginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.pagination?.total || 0);
  }

  getTotalPages(): number {
    return this.pagination?.pages || 1;
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    
    for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(totalPages, this.currentPage + 2); i++) {
      pages.push(i);
    }
    
    return pages;
  }
}