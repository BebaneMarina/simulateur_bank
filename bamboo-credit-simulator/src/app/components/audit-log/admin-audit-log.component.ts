import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminManagementService } from '../../services/admin-management.service';

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  created_at: string;
  ip_address: string;
}

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="audit-log-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Journal d'audit - {{ adminName }}</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <div class="filters">
            <mat-form-field>
              <mat-label>Action</mat-label>
              <mat-select [(value)]="selectedAction" (selectionChange)="loadAuditLog()">
                <mat-option value="">Toutes</mat-option>
                <mat-option value="CREATE">Création</mat-option>
                <mat-option value="UPDATE">Modification</mat-option>
                <mat-option value="DELETE">Suppression</mat-option>
                <mat-option value="LOGIN">Connexion</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Type d'entité</mat-label>
              <mat-select [(value)]="selectedEntityType" (selectionChange)="loadAuditLog()">
                <mat-option value="">Tous</mat-option>
                <mat-option value="credit_products">Produits de crédit</mat-option>
                <mat-option value="savings_products">Produits d'épargne</mat-option>
                <mat-option value="insurance_products">Produits d'assurance</mat-option>
                <mat-option value="admin_user">Utilisateurs admin</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="audit-entries" *ngIf="!loading">
            <mat-expansion-panel *ngFor="let entry of auditEntries" class="audit-entry">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon [class]="getActionClass(entry.action)">
                    {{ getActionIcon(entry.action) }}
                  </mat-icon>
                  {{ entry.action }} - {{ entry.entity_type }}
                </mat-panel-title>
                <mat-panel-description>
                  {{ entry.created_at | date:'medium' }}
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="entry-details">
                <div *ngIf="entry.old_values" class="values-section">
                  <h4>Anciennes valeurs:</h4>
                  <pre>{{ entry.old_values | json }}</pre>
                </div>
                <div *ngIf="entry.new_values" class="values-section">
                  <h4>Nouvelles valeurs:</h4>
                  <pre>{{ entry.new_values | json }}</pre>
                </div>
              </div>
            </mat-expansion-panel>
          </div>

          <div *ngIf="loading" class="loading">
            <mat-spinner></mat-spinner>
            <p>Chargement du journal d'audit...</p>
          </div>

          <mat-paginator 
            [length]="totalEntries"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPageChange($event)">
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .audit-log-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .filters {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .loading {
      text-align: center;
      padding: 48px;
    }
    .audit-entry {
      margin-bottom: 8px;
    }
    .entry-details {
      padding: 16px 0;
    }
    .values-section {
      margin-bottom: 16px;
    }
    .values-section h4 {
      margin: 0 0 8px 0;
      color: #666;
    }
    .values-section pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      font-size: 0.9rem;
      overflow-x: auto;
    }
    .action-create { color: #4caf50; }
    .action-update { color: #2196f3; }
    .action-delete { color: #f44336; }
    .action-login { color: #9c27b0; }
  `]
})
export class AdminAuditLogComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminService = inject(AdminManagementService);

  adminId: string = '';
  adminName: string = '';
  auditEntries: AuditEntry[] = [];
  totalEntries = 0;
  pageSize = 25;
  currentPage = 0;
  selectedAction = '';
  selectedEntityType = '';
  loading = false;

  ngOnInit(): void {
    this.adminId = this.route.snapshot.paramMap.get('id') || '';
    this.loadAdminInfo();
    this.loadAuditLog();
  }

  loadAdminInfo(): void {
    this.adminService.getAdmin(this.adminId).subscribe({
      next: (admin) => {
        this.adminName = `${admin.first_name} ${admin.last_name} (${admin.username})`;
      },
      error: (error) => {
        console.error('Erreur chargement admin:', error);
      }
    });
  }

  loadAuditLog(): void {
    this.loading = true;
    const params = {
      skip: this.currentPage * this.pageSize,
      limit: this.pageSize,
      action: this.selectedAction || undefined,
      entity_type: this.selectedEntityType || undefined
    };

    // Simulation de données d'audit
    setTimeout(() => {
      this.auditEntries = [
        {
          id: '1',
          action: 'CREATE',
          entity_type: 'credit_products',
          entity_id: 'prod_123',
          old_values: null,
          new_values: { name: 'Nouveau produit', rate: 8.5 },
          created_at: new Date().toISOString(),
          ip_address: '192.168.1.1'
        }
      ];
      this.totalEntries = 1;
      this.loading = false;
    }, 1000);
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAuditLog();
  }

  getActionIcon(action: string): string {
    const icons = {
      'CREATE': 'add_circle',
      'UPDATE': 'edit',
      'DELETE': 'delete',
      'LOGIN': 'login',
      'LOGOUT': 'logout'
    };
    return icons[action as keyof typeof icons] || 'info';
  }

  getActionClass(action: string): string {
    const classes = {
      'CREATE': 'action-create',
      'UPDATE': 'action-update',
      'DELETE': 'action-delete',
      'LOGIN': 'action-login',
      'LOGOUT': 'action-logout'
    };
    return classes[action as keyof typeof classes] || 'action-default';
  }

  goBack(): void {
    this.router.navigate(['/admin/management']);
  }
}