import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { AdminAuthService } from '../services/admin-auth.services';
import { NotificationService } from '../services/notification.service';
import { AuditLog, PaginatedResponse } from '../models/interfaces';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div class="header-content">
          <h1>Audit et Journalisation</h1>
          <p>Consultez l'historique des actions administratives</p>
        </div>
        <div class="header-actions">
          <button (click)="exportLogs()" class="btn btn-outline">
            <i class="fas fa-download"></i>
            Exporter les logs
          </button>
        </div>
      </div>

      <!-- Statistiques de sécurité -->
      <div class="security-stats">
        <div class="stat-card security">
          <div class="stat-icon">
            <i class="fas fa-shield-alt"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ getFailedLogins() }}</div>
            <div class="stat-label">Tentatives échouées</div>
          </div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ getActiveUsers() }}</div>
            <div class="stat-label">Utilisateurs actifs</div>
          </div>
        </div>
        <div class="stat-card danger">
          <div class="stat-icon">
            <i class="fas fa-ban"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ getSuspiciousActivities() }}</div>
            <div class="stat-label">Activités suspectes</div>
          </div>
        </div>
      </div>

      <!-- Filtres -->
      <div class="filters-section">
        <form [formGroup]="filtersForm" class="filters-form">
          <div class="filter-group">
            <label for="action">Action</label>
            <select formControlName="action" id="action" class="form-select">
              <option value="">Toutes les actions</option>
              <option value="LOGIN">Connexion</option>
              <option value="LOGOUT">Déconnexion</option>
              <option value="CREATE">Création</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
              <option value="VIEW">Consultation</option>
              <option value="EXPORT">Export</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="entity">Entité</label>
            <select formControlName="entity_type" id="entity" class="form-select">
              <option value="">Toutes les entités</option>
              <option value="bank">Banques</option>
              <option value="credit_product">Produits de crédit</option>
              <option value="savings_product">Produits d'épargne</option>
              <option value="insurance_product">Produits d'assurance</option>
              <option value="application">Demandes</option>
              <option value="simulation">Simulations</option>
              <option value="user">Utilisateurs</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="user">Utilisateur</label>
            <select formControlName="user_id" id="user" class="form-select">
              <option value="">Tous les utilisateurs</option>
              <option *ngFor="let user of adminUsers" [value]="user.id">
                {{ user.first_name }} {{ user.last_name }} ({{ user.username }})
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label for="dateRange">Période</label>
            <select formControlName="date_range" id="dateRange" class="form-select">
              <option value="">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="yesterday">Hier</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="ipAddress">Adresse IP</label>
            <input 
              type="text" 
              id="ipAddress"
              formControlName="ip_address" 
              placeholder="192.168.1.1"
              class="form-input">
          </div>

          <button type="button" (click)="resetFilters()" class="btn btn-outline">
            Réinitialiser
          </button>
        </form>
      </div>

      <!-- Liste des logs -->
      <div class="content-section">
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des logs d'audit...</p>
        </div>

        <div *ngIf="!loading && auditLogs.length === 0" class="empty-state">
          <div class="empty-icon">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <h3>Aucun log trouvé</h3>
          <p>Aucune activité ne correspond aux critères sélectionnés</p>
        </div>

        <div *ngIf="!loading && auditLogs.length > 0" class="audit-table">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date/Heure</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Entité</th>
                <th>Détails</th>
                <th>IP</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of auditLogs" class="audit-row" [class]="getLogSeverity(log)">
                <td>
                  <div class="datetime-info">
                    <div class="date">{{ formatDate(log.created_at) }}</div>
                    <div class="time">{{ formatTime(log.created_at) }}</div>
                  </div>
                </td>
                <td>
                  <div class="user-info">
                    <div class="user-name">{{ getUserDisplayName(log) }}</div>
                    <div class="user-role">{{ log.user?.role || 'N/A' }}</div>
                  </div>
                </td>
                <td>
                  <span class="action-badge" [class]="log.action.toLowerCase()">
                    {{ getActionLabel(log.action) }}
                  </span>
                </td>
                <td>
                  <div class="entity-info">
                    <div class="entity-type">{{ getEntityLabel(log.entity_type) }}</div>
                    <div class="entity-id" *ngIf="log.entity_id">ID: {{ log.entity_id }}</div>
                  </div>
                </td>
                <td>
                  <div class="details-info">
                    <div class="details-text">{{ log.metadata?.details || 'Aucun détail' }}</div>
                    <button 
                      *ngIf="log.metadata"
                      (click)="toggleMetadata(log.id)"
                      class="btn-link">
                      {{ showMetadata.has(log.id) ? 'Masquer' : 'Voir' }} métadonnées
                    </button>
                  </div>
                  <div *ngIf="showMetadata.has(log.id) && log.metadata" class="metadata-details">
                    <pre>{{ formatMetadata(log.metadata) }}</pre>
                  </div>
                </td>
                <td>
                  <div class="ip-info">
                    <span class="ip-address">{{ log.ip_address || 'N/A' }}</span>
                    <span class="location" *ngIf="log.metadata?.location">{{ log.metadata.location }}</span>
                  </div>
                </td>
                <td>
                  <span class="status-indicator" [class]="getStatusClass(log)">
                    {{ getStatusText(log) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div *ngIf="pagination && pagination.total > pagination.limit" class="pagination-section">
          <div class="pagination-info">
            Affichage de {{ getPaginationStart() }} à {{ getPaginationEnd() }} 
            sur {{ pagination.total }} logs
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
  `,
  //styleUrls: ['./audit-logs.component.scss']
})
export class AuditLogsComponent implements OnInit {
  auditLogs: AuditLog[] = [];
  adminUsers: any[] = [];
  loading = false;
  filtersForm: FormGroup;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  pagination: any = null;

  // Interface
  showMetadata = new Set<string>();

  constructor(
    private adminApi: AdminApiService,
    private adminAuth: AdminAuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.filtersForm = this.fb.group({
      action: [''],
      entity_type: [''],
      user_id: [''],
      date_range: [''],
      ip_address: ['']
    });
  }

  ngOnInit(): void {
    this.loadAuditLogs();
    this.loadAdminUsers();
    this.setupFilters();
  }

  private setupFilters(): void {
    this.filtersForm.valueChanges.subscribe(() => {
      this.currentPage = 1;
      this.loadAuditLogs();
    });
  }

  loadAdminUsers(): void {
    // Charger la liste des utilisateurs administrateurs
    // Implémentation dépendante de votre API
  }

  loadAuditLogs(): void {
    this.loading = true;
    const filters = this.filtersForm.value;
    
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      ...filters
    };

    this.adminApi.getAuditLogs(params).subscribe({
      next: (response: PaginatedResponse<AuditLog>) => {
        this.auditLogs = response.items;
        this.pagination = {
          total: response.total,
          page: response.page,
          limit: response.limit,
          pages: response.pages
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement logs:', error);
        this.notificationService.showError('Erreur lors du chargement des logs');
        this.loading = false;
      }
    });
  }

  resetFilters(): void {
    this.filtersForm.reset();
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadAuditLogs();
    }
  }

  toggleMetadata(logId: string): void {
    if (this.showMetadata.has(logId)) {
      this.showMetadata.delete(logId);
    } else {
      this.showMetadata.add(logId);
    }
  }

  exportLogs(): void {
    this.notificationService.showSuccess('Export des logs en cours...');
    // Implémentation de l'export
  }

  // Méthodes de statistiques
  getLoginAttemptsToday(): number {
    const today = new Date().toDateString();
    return this.auditLogs.filter(log => 
      log.action === 'LOGIN' && 
      new Date(log.created_at).toDateString() === today
    ).length;
  }

  getFailedLogins(): number {
    return this.auditLogs.filter(log => 
      log.action === 'LOGIN' && 
      this.getStatusClass(log) === 'error'
    ).length;
  }

  getActiveUsers(): number {
    const uniqueUsers = new Set(this.auditLogs.map(log => log.user?.id).filter(Boolean));
    return uniqueUsers.size;
  }

  getSuspiciousActivities(): number {
    // Logique pour détecter les activités suspectes
    return this.auditLogs.filter(log => 
      this.getLogSeverity(log) === 'critical' || 
      (log.action === 'LOGIN' && this.getStatusClass(log) === 'error')
    ).length;
  }

  // Méthodes utilitaires
  getUserDisplayName(log: AuditLog): string {
    if (log.user?.first_name && log.user?.last_name) {
      return `${log.user.first_name} ${log.user.last_name}`;
    }
    return log.user?.username || 'Système';
  }

  getActionLabel(action: string): string {
    const labels: { [key: string]: string } = {
      'LOGIN': 'Connexion',
      'LOGOUT': 'Déconnexion',
      'CREATE': 'Création',
      'UPDATE': 'Modification',
      'DELETE': 'Suppression',
      'VIEW': 'Consultation',
      'EXPORT': 'Export'
    };
    return labels[action] || action;
  }

  getEntityLabel(entity: string): string {
    const labels: { [key: string]: string } = {
      'bank': 'Banque',
      'credit_product': 'Produit de crédit',
      'savings_product': 'Produit d\'épargne',
      'insurance_product': 'Produit d\'assurance',
      'application': 'Demande',
      'simulation': 'Simulation',
      'user': 'Utilisateur'
    };
    return labels[entity] || entity;
  }

  getLogSeverity(log: AuditLog): string {
    if (log.action === 'DELETE') return 'critical';
    if (log.action === 'LOGIN' && this.getStatusClass(log) === 'error') return 'warning';
    if (log.action === 'UPDATE') return 'info';
    return 'normal';
  }

  getStatusClass(log: AuditLog): string {
    // Logique pour déterminer le statut basé sur les métadonnées
    if (log.metadata?.success === false) return 'error';
    if (log.metadata?.warning) return 'warning';
    return 'success';
  }

  getStatusText(log: AuditLog): string {
    const statusClass = this.getStatusClass(log);
    switch (statusClass) {
      case 'error': return 'Échec';
      case 'warning': return 'Attention';
      case 'success': return 'Succès';
      default: return 'Normal';
    }
  }

  formatMetadata(metadata: any): string {
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return 'Données non valides';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('fr-FR');
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