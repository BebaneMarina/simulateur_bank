// src/app/admin/dashboard/dashboard.component.ts
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../services/admin-api.service';
import { AdminAuthService } from '../services/admin-auth.services';
import { DashboardStats, AuditLog, AdminRole } from '../models/interfaces';

// Import Chart.js
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <h1>Tableau de Bord Administrateur</h1>
        <p class="subtitle">Bienvenue dans votre espace d'administration</p>
        <div class="user-info">
          <span class="user-welcome">Connecté en tant que: <strong>{{ adminAuth.getUserDisplayName() }}</strong></span>
          <span class="role-badge" [ngClass]="currentUser?.role">{{ adminAuth.getRoleLabel() }}</span>
        </div>
      </div>

      <!-- Loader -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Chargement des données...</p>
      </div>

      <!-- Error Message -->
      <div *ngIf="error && !loading" class="error-container">
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Erreur de chargement</h3>
          <p>{{ error }}</p>
          <button class="retry-button" (click)="loadDashboardData()">
            <i class="fas fa-redo"></i> Réessayer
          </button>
        </div>
      </div>

      <!-- Stats grid -->
      <div class="stats-grid" *ngIf="stats && !loading && !error">
        <!-- Banques -->
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon banks">
              <i class="fas fa-university"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                {{ stats.active_banks }}/{{ stats.total_banks }}
                <span class="stat-trend up" *ngIf="getBanksTrend() > 0">+{{ getBanksTrend() }}%</span>
              </div>
              <div class="stat-label">Banques actives</div>
            </div>
          </div>
          <div class="stat-chart">
            <canvas #banksChart></canvas>
          </div>
          <div class="stat-details">
            <div class="detail-item">
              <span class="detail-value">{{ stats.active_banks }}</span>
              <span class="detail-label">Actives</span>
            </div>
            <div class="detail-item">
              <span class="detail-value">{{ stats.total_banks - stats.active_banks }}</span>
              <span class="detail-label">Inactives</span>
            </div>
          </div>
        </div>

        <!-- Compagnies d'assurance -->
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon insurance">
              <i class="fas fa-shield-alt"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                {{ stats.active_insurance_companies }}/{{ stats.total_insurance_companies }}
                <span class="stat-trend up">+12%</span>
              </div>
              <div class="stat-label">Assurances actives</div>
            </div>
          </div>
          <div class="stat-chart">
            <canvas #insuranceChart></canvas>
          </div>
        </div>

        <!-- Produits -->
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon products">
              <i class="fas fa-coins"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                {{ getTotalActiveProducts() }}
                <span class="stat-trend up">+8%</span>
              </div>
              <div class="stat-label">Produits actifs</div>
            </div>
          </div>
          <div class="stat-chart">
            <canvas #productsChart></canvas>
          </div>
        </div>

        <!-- Simulations -->
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon simulations">
              <i class="fas fa-calculator"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                {{ stats.total_simulations_today }}
                <span class="stat-trend down" *ngIf="getSimulationsTrend() < 0">{{ getSimulationsTrend() }}%</span>
              </div>
              <div class="stat-label">Simulations aujourd'hui</div>
            </div>
          </div>
          <div class="stat-chart">
            <canvas #simulationsChart></canvas>
          </div>
        </div>

        <!-- Applications -->
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon applications">
              <i class="fas fa-file-alt"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">
                {{ stats.total_applications_pending }}
                <span class="stat-trend up">+15%</span>
              </div>
              <div class="stat-label">Demandes en attente</div>
            </div>
          </div>
          <div class="stat-chart">
            <canvas #applicationsChart></canvas>
          </div>
        </div>
      </div>

      <!-- Dashboard content -->
      <div class="dashboard-content" *ngIf="stats && !loading && !error">
        <!-- Section graphiques -->
        <div class="charts-section">  
          <!-- Graphique répartition -->
          <div class="chart-container chart-doughnut">
            <div class="chart-header">
              <h3>Répartition des Produits</h3>
            </div>
            <div class="chart-content">
              <canvas #productsDistributionChart></canvas>
            </div>
            <div class="chart-legend">
              <div class="legend-item">
                <div class="legend-color credit"></div>
                <span class="legend-label">Crédit:</span>
                <span class="legend-value">{{ stats.active_credit_products || 0 }}</span>
              </div>
              <div class="legend-item">
                <div class="legend-color savings"></div>
                <span class="legend-label">Épargne:</span>
                <span class="legend-value">{{ stats.active_savings_products || 0 }}</span>
              </div>
              <div class="legend-item">
                <div class="legend-color insurance"></div>
                <span class="legend-label">Assurance:</span>
                <span class="legend-value">{{ stats.active_insurance_products || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel latéral -->
        <div class="side-panel">
          <!-- Statistiques rapides -->
          <div class="quick-stats">
            <h3>Actions Rapides</h3>
            
            <!-- Navigation vers les sections -->
            <div class="quick-action" *ngIf="canManageAdmins" routerLink="/admin/management">
              <div class="action-icon admins">
                <i class="fas fa-users-cog"></i>
              </div>
              <div class="action-content">
                <span class="action-label">Gérer Administrateurs</span>
                <span class="action-description">Créer, modifier, supprimer</span>
              </div>
              <i class="fas fa-chevron-right"></i>
            </div>

            <div class="quick-action" *ngIf="canManageBanks" routerLink="/admin/banks">
              <div class="action-icon banks">
                <i class="fas fa-university"></i>
              </div>
              <div class="action-content">
                <span class="action-label">Gérer Banques</span>
                <span class="action-description">{{ stats.total_banks }} banques</span>
              </div>
              <i class="fas fa-chevron-right"></i>
            </div>

            <div class="quick-action" *ngIf="canManageProducts" routerLink="/admin/credit-products">
              <div class="action-icon products">
                <i class="fas fa-credit-card"></i>
              </div>
              <div class="action-content">
                <span class="action-label">Produits Crédit</span>
                <span class="action-description">{{ stats.active_credit_products }} actifs</span>
              </div>
              <i class="fas fa-chevron-right"></i>
            </div>

            <div class="quick-action" *ngIf="canViewApplications" routerLink="/admin/applications">
              <div class="action-icon applications">
                <i class="fas fa-file-alt"></i>
              </div>
              <div class="action-content">
                <span class="action-label">Demandes</span>
                <span class="action-description">{{ stats.total_applications_pending }} en attente</span>
              </div>
              <i class="fas fa-chevron-right"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('banksChart') banksChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('insuranceChart') insuranceChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsChart') productsChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('simulationsChart') simulationsChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('applicationsChart') applicationsChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('simulationsMainChart') simulationsMainChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsDistributionChart') productsDistributionChart!: ElementRef<HTMLCanvasElement>;

  stats: DashboardStats | null = null;
  recentActivity: AuditLog[] = [];
  loading = false;
  error: string | null = null;
  selectedFilter = '7d';

  // Graphiques Chart.js
  private charts: Chart[] = [];

  constructor(
    private adminApi: AdminApiService,
    public adminAuth: AdminAuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.stats) {
        this.initializeCharts();
      }
    }, 100);
  }

  get currentUser() {
    return this.adminAuth.currentUser;
  }

  get canManageAdmins(): boolean {
    return this.adminAuth.hasPermission('users', 'read') || 
           this.adminAuth.currentUser?.role === AdminRole.SUPER_ADMIN;
  }

  get canManageBanks(): boolean {
    return this.adminAuth.hasPermission('banks', 'read') ||
           this.adminAuth.currentUser?.role === AdminRole.SUPER_ADMIN;
  }

  get canManageProducts(): boolean {
    return this.adminAuth.hasPermission('products', 'read') ||
           this.adminAuth.currentUser?.role === AdminRole.SUPER_ADMIN;
  }

  get canViewApplications(): boolean {
    return this.adminAuth.hasPermission('applications', 'read') ||
           this.adminAuth.currentUser?.role === AdminRole.SUPER_ADMIN;
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    Promise.all([
      this.adminApi.getDashboardStats().toPromise().catch(err => {
        console.error('Erreur stats:', err);
        return null;
      }),
      this.adminApi.getRecentActivity(20).toPromise().catch(err => {
        console.error('Erreur activité:', err);
        return [];
      })
    ]).then(([stats, activity]) => {
      this.stats = stats ?? null;
      this.recentActivity = activity || [];
      this.loading = false;
      
      if (this.stats) {
        setTimeout(() => this.initializeCharts(), 200);
      } else {
        this.useDefaultData();
      }
    }).catch(error => {
      console.error('Erreur chargement dashboard:', error);
      this.loading = false;
      this.error = 'Impossible de charger les données du dashboard. Utilisation de données de test.';
      this.useDefaultData();
    });
  }

  private useDefaultData(): void {
    this.stats = {
      total_banks: 12,
      active_banks: 10,
      total_insurance_companies: 8,
      active_insurance_companies: 6,
      total_credit_products: 25,
      active_credit_products: 22,
      total_savings_products: 18,
      active_savings_products: 15,
      total_insurance_products: 14,
      active_insurance_products: 12,
      total_simulations_today: 45,
      total_applications_pending: 8
    };

    this.recentActivity = [
      {
        id: '1',
        admin_user_id: 'admin1',
        action: 'CREATE',
        entity_type: 'bank',
        entity_id: 'bank_123',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        user: {
          id: 'admin1',
          username: 'admin1',
          email: 'jean.dupont@example.com',
          first_name: 'Jean',
          last_name: 'Dupont',
          role: AdminRole.ADMIN,
          permissions: {
            banks: ['read', 'write'],
            products: ['read']
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        metadata: {}
      }
    ];

    setTimeout(() => this.initializeCharts(), 200);
  }

  private initializeCharts(): void {
    if (!this.stats) return;

    // Détruire les graphiques existants
    this.charts.forEach(chart => {
      try {
        chart.destroy();
      } catch (e) {
        console.warn('Erreur destruction graphique:', e);
      }
    });
    this.charts = [];

    // Créer les graphiques
    this.createMiniChart(this.banksChart, [65, 70, 75, 80, 85, 82, 88]);
    this.createMiniChart(this.insuranceChart, [45, 52, 48, 61, 55, 67, 58]);
    this.createMiniChart(this.productsChart, [120, 135, 142, 158, 167, 175, 182]);
    this.createMiniChart(this.simulationsChart, [25, 30, 28, 35, 32, 29, 31]);
    this.createMiniChart(this.applicationsChart, [8, 12, 15, 18, 16, 14, 12]);
    this.createSimulationsMainChart();
    this.createProductsDistributionChart();
  }

  private createMiniChart(chartRef: ElementRef<HTMLCanvasElement>, data: number[]): void {
    if (!chartRef?.nativeElement) return;
    
    const ctx = chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['', '', '', '', '', '', ''],
        datasets: [{
          data: data,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
        interaction: { intersect: false, mode: 'index' }
      }
    });

    this.charts.push(chart);
  }

  private createSimulationsMainChart(): void {
    if (!this.simulationsMainChart?.nativeElement) return;
    
    const ctx = this.simulationsMainChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
        datasets: [
          {
            label: 'Simulations Crédit',
            data: [120, 135, 155, 180, 165, 190, 210, 195, 220, 240, 225, 250],
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Simulations Épargne',
            data: [80, 85, 90, 95, 88, 100, 105, 98, 110, 115, 108, 120],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Simulations Assurance',
            data: [45, 50, 55, 60, 52, 65, 70, 62, 75, 80, 72, 85],
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 20 }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });

    this.charts.push(chart);
  }

  private createProductsDistributionChart(): void {
    if (!this.productsDistributionChart?.nativeElement || !this.stats) return;
    
    const ctx = this.productsDistributionChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Produits de Crédit', 'Produits d\'Épargne', 'Produits d\'Assurance'],
        datasets: [{
          data: [
            this.stats.active_credit_products || 0,
            this.stats.active_savings_products || 0,
            this.stats.active_insurance_products || 0
          ],
          backgroundColor: ['#4f46e5', '#10b981', '#8b5cf6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    });

    this.charts.push(chart);
  }

  getTotalActiveProducts(): number {
    if (!this.stats) return 0;
    return (this.stats.active_credit_products || 0) + 
           (this.stats.active_savings_products || 0) + 
           (this.stats.active_insurance_products || 0);
  }

  getBanksTrend(): number { return 5; }
  getSimulationsTrend(): number { return -3; }

  changeSimulationsFilter(filter: string): void {
    this.selectedFilter = filter;
    console.log('Changing filter to:', filter);
  }

  getActionLabel(action: string): string {
    const labels: { [key: string]: string } = {
      'CREATE': 'a créé',
      'UPDATE': 'a modifié',
      'DELETE': 'a supprimé',
      'LOGIN': 's\'est connecté',
      'LOGOUT': 's\'est déconnecté'
    };
    return labels[action] || action;
  }

  getEntityLabel(entity: string): string {
    const labels: { [key: string]: string } = {
      'bank': 'une banque',
      'insurance_company': 'une compagnie d\'assurance',
      'credit_product': 'un produit de crédit',
      'savings_product': 'un produit d\'épargne',
      'insurance_product': 'un produit d\'assurance',
      'admin_user': 'un administrateur',
      'application': 'une demande',
      'session': 'une session'
    };
    return labels[entity] || entity;
  }

  getActivityUserName(activity: AuditLog): string {
    if (activity.user?.first_name && activity.user?.last_name) {
      return `${activity.user.first_name} ${activity.user.last_name}`;
    }
    return activity.user?.username || 'Utilisateur inconnu';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)} jour(s)`;
  }

  ngOnDestroy(): void {
    this.charts.forEach(chart => {
      try {
        chart.destroy();
      } catch (error) {
        console.warn('Erreur lors de la destruction du graphique:', error);
      }
    });
    this.charts = [];
  }
}