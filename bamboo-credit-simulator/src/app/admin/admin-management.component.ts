// src/app/admin/admin-management/admin-management.component.ts
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminManagementService, AdminUser, AdminStats } from '../services/admin-management.service';
import { AdminAuthService } from '../services/admin-auth.services';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="admin-management-container">
      <!-- Access Denied Message -->
      <div *ngIf="!hasAccess" class="access-denied">
        <mat-card>
          <mat-card-content>
            <div class="access-denied-content">
              <mat-icon class="access-denied-icon">lock</mat-icon>
              <h2>Accès Refusé</h2>
              <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
              <p>Seuls les super administrateurs peuvent gérer les comptes administrateurs.</p>
              <button mat-raised-button color="primary" (click)="goToDashboard()">
                Retourner au tableau de bord
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Content (only if has access) -->
      <div *ngIf="hasAccess">
        <!-- Header avec statistiques -->
        <div class="page-header">
          <div class="header-content">
            <h1>Gestion des Administrateurs</h1>
            <p class="subtitle">Gérer les administrateurs par banque et compagnie d'assurance</p>
          </div>
          
          <div class="stats-cards">
            <mat-card class="stat-card">
              <div class="stat-content">
                <mat-icon class="stat-icon total">people</mat-icon>
                <div class="stat-info">
                  <div class="stat-number">{{ stats.total_admins }}</div>
                  <div class="stat-label">Total Admins</div>
                </div>
              </div>
            </mat-card>
            
            <mat-card class="stat-card">
              <div class="stat-content">
                <mat-icon class="stat-icon active">check_circle</mat-icon>
                <div class="stat-info">
                  <div class="stat-number">{{ stats.active_admins }}</div>
                  <div class="stat-label">Actifs</div>
                </div>
              </div>
            </mat-card>
            
            <mat-card class="stat-card">
              <div class="stat-content">
                <mat-icon class="stat-icon bank">account_balance</mat-icon>
                <div class="stat-info">
                  <div class="stat-number">{{ stats.by_role.bank_admins }}</div>
                  <div class="stat-label">Admins Banques</div>
                </div>
              </div>
            </mat-card>
            
            <mat-card class="stat-card">
              <div class="stat-content">
                <mat-icon class="stat-icon insurance">security</mat-icon>
                <div class="stat-info">
                  <div class="stat-number">{{ stats.by_role.insurance_admins }}</div>
                  <div class="stat-label">Admins Assurances</div>
                </div>
              </div>
            </mat-card>
          </div>
        </div>

        <!-- Filtres et actions -->
        <div class="filters-section">
          <mat-card>
            <mat-card-content>
              <div class="filters-row">
                <!-- Recherche -->
                <mat-form-field appearance="outline" class="search-field">
                  <mat-label>Rechercher</mat-label>
                  <input matInput 
                         [(ngModel)]="searchQuery"
                         (keyup.enter)="onSearch()"
                         placeholder="Nom, email, username...">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>

                <!-- Filtre par rôle -->
                <mat-form-field appearance="outline">
                  <mat-label>Rôle</mat-label>
                  <mat-select [(value)]="selectedRole" (selectionChange)="onFilterChange()">
                    <mat-option value="">Tous les rôles</mat-option>
                    <mat-option value="admin">Admin</mat-option>
                    <mat-option value="bank_admin">Admin Bancaire</mat-option>
                    <mat-option value="insurance_admin">Admin Assurance</mat-option>
                    <mat-option value="moderator">Modérateur</mat-option>
                    <mat-option value="readonly">Lecture seule</mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Filtre par statut -->
                <mat-form-field appearance="outline">
                  <mat-label>Statut</mat-label>
                  <mat-select [(value)]="selectedStatus" (selectionChange)="onFilterChange()">
                    <mat-option [value]="null">Tous</mat-option>
                    <mat-option [value]="true">Actifs</mat-option>
                    <mat-option [value]="false">Inactifs</mat-option>
                  </mat-select>
                </mat-form-field>

                <div class="action-buttons">
                  <button mat-raised-button color="primary" (click)="createAdmin()">
                    <mat-icon>add</mat-icon>
                    Nouvel Admin
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Tableau des administrateurs -->
        <div class="table-section">
          <mat-card>
            <div class="table-header">
              <h3>Administrateurs ({{ totalAdmins }})</h3>
              <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>
            </div>

            <div class="table-container">
              <table mat-table [dataSource]="dataSource" matSort class="admins-table">
                
                <!-- Colonne Username -->
                <ng-container matColumnDef="username">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Utilisateur</th>
                  <td mat-cell *matCellDef="let admin">
                    <div class="user-info">
                      <div class="user-avatar">
                        <mat-icon>person</mat-icon>
                      </div>
                      <div class="user-details">
                        <div class="username">{{ admin.username }}</div>
                        <div class="user-name">{{ admin.first_name }} {{ admin.last_name }}</div>
                      </div>
                    </div>
                  </td>
                </ng-container>

                <!-- Colonne Email -->
                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>Email</th>
                  <td mat-cell *matCellDef="let admin">{{ admin.email }}</td>
                </ng-container>

                <!-- Colonne Rôle -->
                <ng-container matColumnDef="role">
                  <th mat-header-cell *matHeaderCellDef>Rôle</th>
                  <td mat-cell *matCellDef="let admin">
                    <mat-chip class="role-chip" [class]="admin.role">
                      {{ getRoleLabel(admin.role) }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Colonne Permissions -->
                <ng-container matColumnDef="permissions">
                  <th mat-header-cell *matHeaderCellDef>Permissions</th>
                  <td mat-cell *matCellDef="let admin">
                    <div class="permissions-summary">
                      <span *ngFor="let perm of getPermissionsSummary(admin.permissions)" 
                            class="permission-tag">
                        {{ perm }}
                      </span>
                    </div>
                  </td>
                </ng-container>

                <!-- Colonne Institution -->
                <ng-container matColumnDef="institution">
                  <th mat-header-cell *matHeaderCellDef>Institution</th>
                  <td mat-cell *matCellDef="let admin">
                    <div class="institution-info">
                      <div class="institution-name">{{ getInstitutionName(admin) }}</div>
                      <div class="institution-type" *ngIf="admin.assigned_bank">
                        <mat-icon class="type-icon">account_balance</mat-icon>
                        Banque
                      </div>
                      <div class="institution-type" *ngIf="admin.assigned_insurance_company">
                        <mat-icon class="type-icon">security</mat-icon>
                        Assurance
                      </div>
                    </div>
                  </td>
                </ng-container>

                <!-- Colonne Statut -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Statut</th>
                  <td mat-cell *matCellDef="let admin">
                    <mat-slide-toggle 
                      [checked]="admin.is_active"
                      (toggleChange)="toggleAdminStatus(admin)"
                      [disabled]="loading || admin.id === currentUserId">
                    </mat-slide-toggle>
                    <span class="status-text" [class.active]="admin.is_active" [class.inactive]="!admin.is_active">
                      {{ admin.is_active ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                </ng-container>

                <!-- Colonne Actions -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let admin">
                    <div class="action-buttons">
                      <button mat-icon-button 
                              (click)="editAdmin(admin)"
                              matTooltip="Modifier">
                        <mat-icon>edit</mat-icon>
                      </button>
                      
                      <button mat-icon-button 
                              color="warn"
                              (click)="deleteAdmin(admin)"
                              [disabled]="admin.id === currentUserId"
                              matTooltip="Supprimer">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>

              <!-- Message si aucun résultat -->
              <div *ngIf="!loading && dataSource.data.length === 0" class="no-data">
                <mat-icon>person_off</mat-icon>
                <h3>Aucun administrateur trouvé</h3>
                <p>Essayez de modifier vos critères de recherche</p>
              </div>
            </div>

            <!-- Pagination -->
            <mat-paginator 
              [length]="totalAdmins"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 20, 50, 100]"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./admin-management.component.scss']
})
export class AdminManagementComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private adminService = inject(AdminManagementService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private authService = inject(AdminAuthService);

  // Table et données
  displayedColumns: string[] = [
    'username', 'email', 'role', 'permissions', 'institution', 'status', 'actions'
  ];
  dataSource = new MatTableDataSource<AdminUser>();
  totalAdmins = 0;
  loading = false;

  // Filtres et pagination
  searchQuery = '';
  selectedRole = '';
  selectedStatus: boolean | null = null;
  pageSize = 20;
  currentPage = 0;

  // Statistiques
  stats: AdminStats = {
    total_admins: 0,
    active_admins: 0,
    inactive_admins: 0,
    by_role: {
      bank_admins: 0,
      insurance_admins: 0,
      moderators: 0
    },
    recent_admins: 0
  };

  // Access control
  get hasAccess(): boolean {
    return this.authService.canManageAdmins();
  }

  get currentUserId(): string {
    return this.authService.currentUser?.id || '';
  }

  ngOnInit(): void {
    if (!this.hasAccess) {
      return;
    }
    
    this.loadAdmins();
    this.loadStats();
  }

  ngAfterViewInit(): void {
    if (this.hasAccess) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  loadAdmins(): void {
    this.loading = true;
    const params: any = {
      skip: this.currentPage * this.pageSize,
      limit: this.pageSize
    };

    // Ajouter les filtres seulement s'ils ont des valeurs valides
    if (this.searchQuery && this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }
    
    if (this.selectedRole && this.selectedRole.trim()) {
      params.role = this.selectedRole;
    }
    
    if (this.selectedStatus !== null && this.selectedStatus !== undefined) {
      params.is_active = this.selectedStatus;
    }

    this.adminService.getAdmins(params).subscribe({
      next: (response) => {
        this.dataSource.data = response.admins;
        this.totalAdmins = response.total;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des administrateurs:', error);
        this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.adminService.getAdminStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadAdmins();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadAdmins();
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAdmins();
  }

  createAdmin(): void {
    this.router.navigate(['/admin/management/create']);
  }

  editAdmin(admin: AdminUser): void {
    this.router.navigate(['/admin/management/edit', admin.id]);
  }

  toggleAdminStatus(admin: AdminUser): void {
    if (admin.id === this.currentUserId) {
      this.snackBar.open('Vous ne pouvez pas désactiver votre propre compte', 'Fermer', { duration: 3000 });
      return;
    }

    this.adminService.toggleAdminStatus(admin.id).subscribe({
      next: (response) => {
        admin.is_active = response.is_active;
        this.snackBar.open(response.message, 'Fermer', { duration: 3000 });
        this.loadStats();
      },
      error: (error) => {
        console.error('Erreur lors du changement de statut:', error);
        this.snackBar.open('Erreur lors du changement de statut', 'Fermer', { duration: 3000 });
      }
    });
  }

  deleteAdmin(admin: AdminUser): void {
    if (admin.id === this.currentUserId) {
      this.snackBar.open('Vous ne pouvez pas supprimer votre propre compte', 'Fermer', { duration: 3000 });
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer l'administrateur ${admin.username} ?`)) {
      this.adminService.deleteAdmin(admin.id).subscribe({
        next: () => {
          this.snackBar.open('Administrateur supprimé', 'Fermer', { duration: 3000 });
          this.loadAdmins();
          this.loadStats();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  getInstitutionName(admin: AdminUser): string {
    if (admin.assigned_bank) {
      return admin.assigned_bank.name;
    } else if (admin.assigned_insurance_company) {
      return admin.assigned_insurance_company.name;
    }
    return '-';
  }

  getRoleLabel(role: string): string {
    const roleMap: { [key: string]: string } = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'bank_admin': 'Admin Banque',
      'insurance_admin': 'Admin Assurance',
      'moderator': 'Modérateur',
      'readonly': 'Lecture seule'
    };
    return roleMap[role] || role;
  }

  getPermissionsSummary(permissions: any): string[] {
    if (!permissions) return [];
    
    const summary: string[] = [];
    
    Object.keys(permissions).forEach(entity => {
      const entityPerms = permissions[entity];
      if (Array.isArray(entityPerms)) {
        // Format super admin
        if (entityPerms.length > 0) {
          summary.push(this.getEntityLabel(entity));
        }
      } else if (typeof entityPerms === 'object') {
        // Format autres rôles
        const actions = Object.keys(entityPerms).filter(action => entityPerms[action]);
        if (actions.length > 0) {
          summary.push(this.getEntityLabel(entity));
        }
      }
    });
    
    return summary.slice(0, 3); // Limiter à 3 pour l'affichage
  }

  private getEntityLabel(entity: string): string {
    const labels: { [key: string]: string } = {
      'banks': 'Banques',
      'credit_products': 'Crédits',
      'savings_products': 'Épargne',
      'insurance_products': 'Assurance',
      'applications': 'Demandes',
      'simulations': 'Simulations',
      'users': 'Utilisateurs',
      'audit': 'Audit'
    };
    return labels[entity] || entity;
  }

  goToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}