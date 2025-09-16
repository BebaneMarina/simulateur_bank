// admin/src/app/components/bank/bank-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminAuthService } from '../../services/admin-auth.services';
import { PaginatedResponse, Bank } from '../../services/admin-api.service';

@Component({
  selector: 'admin-bank-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>Gestion des Banques</h1>
        <button 
          *ngIf="canCreate"
          (click)="openCreateDialog()" 
          class="btn btn-primary">
          <i class="fas fa-plus"></i>
          Nouvelle Banque
        </button>
      </div>

      <div class="filters-section">
        <div class="search-box">
          <input 
            [(ngModel)]="searchTerm" 
            (ngModelChange)="onSearch()"
            placeholder="Rechercher une banque..."
            class="form-control">
        </div>
        <div class="filter-controls">
          <select [(ngModel)]="statusFilter" (ngModelChange)="loadBanks()" class="form-control">
            <option value="">Tous les statuts</option>
            <option value="true">Actives</option>
            <option value="false">Inactives</option>
          </select>
        </div>
      </div>

      <div class="data-table-container" *ngIf="!loading">
        <table class="data-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Nom</th>
              <th>Nom complet</th>
              <th>Contact</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let bank of banks">
              <td>
                <img 
                  [src]="bank.logo_url || '/assets/default-bank-logo.png'" 
                  [alt]="bank.name" 
                  class="bank-logo"
                  style="width: 40px; height: 40px; object-fit: contain;">
              </td>
              <td>
                <strong>{{ bank.name }}</strong>
                <div class="bank-id text-muted">{{ bank.id }}</div>
              </td>
              <td>{{ bank.full_name || '-' }}</td>
              <td>
                <div *ngIf="bank.contact_phone">{{ bank.contact_phone }}</div>
                <div *ngIf="bank.contact_email" class="text-muted">{{ bank.contact_email }}</div>
              </td>
              <td>
                <span 
                  class="status-badge" 
                  [class.active]="bank.is_active"
                  [class.inactive]="!bank.is_active">
                  {{ bank.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    *ngIf="canRead"
                    (click)="viewBank(bank)" 
                    class="btn btn-sm btn-info"
                    title="Voir les détails">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button 
                    *ngIf="canUpdate"
                    (click)="editBank(bank)" 
                    class="btn btn-sm btn-warning"
                    title="Modifier">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button 
                    *ngIf="canDelete"
                    (click)="deleteBank(bank)" 
                    class="btn btn-sm btn-danger"
                    title="Supprimer">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" *ngIf="totalPages > 1">
          <button 
            (click)="goToPage(currentPage - 1)"
            [disabled]="currentPage === 1"
            class="btn btn-sm">
            Précédent
          </button>
          
          <span class="page-info">
            Page {{ currentPage }} sur {{ totalPages }} ({{ totalItems }} élément(s))
          </span>
          
          <button 
            (click)="goToPage(currentPage + 1)"
            [disabled]="currentPage === totalPages"
            class="btn btn-sm">
            Suivant
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Chargement des banques...</p>
      </div>

      <div *ngIf="!loading && banks.length === 0" class="no-data">
        <p>Aucune banque trouvée.</p>
      </div>
    </div>
  `,
  styleUrls: ['./bank-list.component.scss']
})
export class BankListComponent implements OnInit {
  banks: Bank[] = [];
  searchTerm = '';
  statusFilter = '';
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  totalItems = 0;
  loading = false;

  constructor(
    private adminApi: AdminApiService,
    private adminAuth: AdminAuthService
  ) {}

  ngOnInit(): void {
    this.loadBanks();
  }

  get canCreate(): boolean {
    return this.adminAuth.hasPermission('banks', 'create');
  }

  get canRead(): boolean {
    return this.adminAuth.hasPermission('banks', 'read');
  }

  get canUpdate(): boolean {
    return this.adminAuth.hasPermission('banks', 'update');
  }

  get canDelete(): boolean {
    return this.adminAuth.hasPermission('banks', 'delete');
  }

  loadBanks(): void {
    this.loading = true;
    
    const params = {
      skip: (this.currentPage - 1) * this.pageSize,
      limit: this.pageSize,
      search: this.searchTerm || undefined,
      is_active: this.statusFilter || undefined
    };

    this.adminApi.getBanks(params).subscribe({
      next: (response: PaginatedResponse<Bank>) => {
        this.banks = response.items;
        this.totalPages = response.pages ?? 0;
        this.totalItems = response.total;
        this.loading = false;
      },
      error: (error: Error) => {
        console.error('Erreur chargement banques:', error);
        this.loading = false;
        // Ici vous pourriez ajouter une notification d'erreur
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadBanks();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadBanks();
    }
  }

  openCreateDialog(): void {
    // Navigation vers le formulaire de création
    console.log('Ouvrir formulaire de création');
  }

  viewBank(bank: Bank): void {
    // Navigation vers les détails de la banque
    console.log('Voir banque:', bank);
  }

  editBank(bank: Bank): void {
    // Navigation vers le formulaire d'édition
    console.log('Modifier banque:', bank);
  }

  deleteBank(bank: Bank): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la banque ${bank.name} ?`)) {
      this.adminApi.deleteBank(bank.id).subscribe({
        next: () => {
          this.loadBanks();
        },
        error: (error: Error) => {
          console.error('Erreur suppression:', error);
        }
      });
    }
  }
}