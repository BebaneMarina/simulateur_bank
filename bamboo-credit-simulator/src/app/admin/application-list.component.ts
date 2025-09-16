import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

import { AdminApiService } from '../services/admin-api.service';
import { InsuranceApplication, CreditApplication, PaginatedResponse } from '../models/interfaces';
import { AdminAuthService } from '../services/admin-auth.services';
import { NotificationService } from '../services/notification.service';

interface UnifiedApplication {
  id: string;
  type: 'credit' | 'insurance';
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  amount?: number;
  status: string;
  submitted_at: string;
  updated_at?: string;
  processing_notes?: string;
  
  // Spécifique crédit
  duration_months?: number;
  credit_product?: {
    name: string;
    bank?: { name: string; };
  };
  
  // Spécifique assurance
  insurance_type?: string;
  coverage_amount?: number;
  insurance_product?: {
    name: string;
    type: string;
    insurance_company?: { name: string; };
  };
  
  // Données originales
  originalData: CreditApplication | InsuranceApplication;
}

@Component({
  selector: 'app-applications-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div class="header-content">
          <h1>Gestion des Demandes</h1>
          <p>Gérez toutes les demandes de crédit et d'assurance</p>
        </div>
        <div class="header-actions">
          <button (click)="exportApplications()" class="btn btn-outline">
            <i class="fas fa-download"></i>
            Exporter
          </button>
          <button (click)="loadApplications()" class="btn btn-primary">
            <i class="fas fa-refresh"></i>
            Actualiser
          </button>
        </div>
      </div>

      <!-- Statistiques rapides -->
      <div class="stats-section">
        <div class="stat-card total">
          <div class="stat-value">{{ getTotalCount() }}</div>
          <div class="stat-label">Total demandes</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-value">{{ getPendingCount() }}</div>
          <div class="stat-label">En attente</div>
        </div>
        <div class="stat-card approved">
          <div class="stat-value">{{ getApprovedCount() }}</div>
          <div class="stat-label">Approuvées</div>
        </div>
        <div class="stat-card rejected">
          <div class="stat-value">{{ getRejectedCount() }}</div>
          <div class="stat-label">Refusées</div>
        </div>
        <div class="stat-card credit">
          <div class="stat-value">{{ getCreditCount() }}</div>
          <div class="stat-label">Crédits</div>
        </div>
        <div class="stat-card insurance">
          <div class="stat-value">{{ getInsuranceCount() }}</div>
          <div class="stat-label">Assurances</div>
        </div>
      </div>

      <!-- Filtres -->
      <div class="filters-section">
        <form [formGroup]="filtersForm" class="filters-form">
          <div class="filter-group">
            <label for="search">Rechercher</label>
            <input 
              type="text" 
              id="search"
              formControlName="search" 
              placeholder="Nom, email, téléphone..."
              class="form-input">
          </div>

          <div class="filter-group">
            <label for="applicationTypeFilter">Type de demande</label>
            <select formControlName="applicationTypeFilter" id="applicationTypeFilter" class="form-select">
              <option value="">Toutes les demandes</option>
              <option value="credit">Demandes de crédit</option>
              <option value="insurance">Demandes d'assurance</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="status">Statut</label>
            <select formControlName="status" id="status" class="form-select">
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="under_review">En cours d'examen</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Refusé</option>
              <option value="completed">Finalisé</option>
            </select>
          </div>

          <div class="filter-group" *ngIf="filtersForm.get('applicationTypeFilter')?.value === 'insurance'">
            <label for="insurance_type">Type d'assurance</label>
            <select formControlName="insurance_type" id="insurance_type" class="form-select">
              <option value="">Tous types</option>
              <option value="auto">Automobile</option>
              <option value="habitation">Habitation</option>
              <option value="vie">Vie</option>
              <option value="sante">Santé</option>
              <option value="voyage">Voyage</option>
              <option value="responsabilite">Responsabilité Civile</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="priority">Priorité</label>
            <select formControlName="priority" id="priority" class="form-select">
              <option value="">Toutes</option>
              <option value="low">Faible</option>
              <option value="normal">Normale</option>
              <option value="high">Élevée</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <button type="button" (click)="resetFilters()" class="btn btn-outline">
            Réinitialiser
          </button>
        </form>
      </div>

      <!-- Liste des demandes -->
      <div class="content-section">
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des demandes...</p>
        </div>

        <div *ngIf="!loading && unifiedApplications.length === 0" class="empty-state">
          <div class="empty-icon">
            <i class="fas fa-file-alt"></i>
          </div>
          <h3>Aucune demande trouvée</h3>
          <p>Aucune demande ne correspond aux critères sélectionnés</p>
        </div>

        <div *ngIf="!loading && unifiedApplications.length > 0" class="applications-table">
          <table class="data-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" (change)="toggleSelectAll($event)" [checked]="allSelected">
                </th>
                <th>Type</th>
                <th>Client</th>
                <th>Montant/Couverture</th>
                <th>Produit/Service</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Date</th>
                <th>Délai</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let application of unifiedApplications" 
                  class="application-row"
                  [class.selected]="selectedApplications.has(application.id)"
                  [class.credit-row]="application.type === 'credit'"
                  [class.insurance-row]="application.type === 'insurance'">
                <td>
                  <input 
                    type="checkbox" 
                    [checked]="selectedApplications.has(application.id)"
                    (change)="toggleSelect(application.id, $event)">
                </td>
                <td>
                  <div class="type-badge" [class]="application.type">
                    <i class="fas" [class.fa-money-bill-wave]="application.type === 'credit'" 
                       [class.fa-shield-alt]="application.type === 'insurance'"></i>
                    <span>{{ getTypeLabel(application.type) }}</span>
                    <small *ngIf="application.type === 'insurance' && application.insurance_type">
                      {{ getInsuranceTypeLabel(application.insurance_type) }}
                    </small>
                  </div>
                </td>
                <td>
                  <div class="client-info">
                    <div class="client-name">{{ application.applicant_name }}</div>
                    <div class="client-contact">
                      <span class="email">{{ application.applicant_email || 'N/A' }}</span>
                      <span class="phone">{{ application.applicant_phone || 'N/A' }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="amount-info">
                    <div class="amount">
                      {{ formatCurrency(getDisplayAmount(application)) }}
                    </div>
                    <div class="duration" *ngIf="application.type === 'credit' && application.duration_months">
                      {{ application.duration_months }} mois
                    </div>
                    <div class="insurance-type" *ngIf="application.type === 'insurance' && application.insurance_type">
                      {{ getInsuranceTypeLabel(application.insurance_type) }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="product-info">
                    <div class="product-name">{{ getProductName(application) }}</div>
                    <div class="provider-name">{{ getProviderName(application) }}</div>
                  </div>
                </td>
                <td>
                  <span class="status-badge" [class]="application.status">
                    {{ getStatusLabel(application.status) }}
                  </span>
                </td>
                <td>
                  <span class="priority-badge" [class]="getPriority(application)">
                    {{ getPriorityLabel(getPriority(application)) }}
                  </span>
                </td>
                <td>
                  <div class="date-info">
                    <div class="date">{{ formatDate(application.submitted_at) }}</div>
                    <div class="time">{{ formatTime(application.submitted_at) }}</div>         
                  </div>
                </td>
                <td>
                  <div class="deadline" [class]="getDeadlineClass(application)">
                    {{ getProcessingTimeText(application) }}
                  </div>
                </td>
                <td>
                  <div class="actions-menu">
                    <button 
                      [routerLink]="getDetailRoute(application)"
                      class="btn btn-outline btn-sm"
                      title="Voir détails">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button 
                      *ngIf="canUpdate && application.status === 'pending'"
                      (click)="quickApprove(application)"
                      class="btn btn-success btn-sm"
                      title="Approuver">
                      <i class="fas fa-check"></i>
                    </button>
                    <button 
                      *ngIf="canUpdate && application.status === 'pending'"
                      (click)="quickReject(application)"
                      class="btn btn-danger btn-sm"
                      title="Refuser">
                      <i class="fas fa-times"></i>
                    </button>
                    <div class="dropdown">
                      <button class="btn btn-outline btn-sm dropdown-toggle" (click)="toggleDropdown(application.id)">
                        <i class="fas fa-ellipsis-v"></i>
                      </button>
                      <div class="dropdown-menu" *ngIf="openDropdown === application.id">
                        <button (click)="assignApplication(application)">
                          <i class="fas fa-user"></i> Assigner
                        </button>
                        <button (click)="addComment(application)">
                          <i class="fas fa-comment"></i> Commenter
                        </button>
                        <button (click)="changeStatus(application)">
                          <i class="fas fa-edit"></i> Changer statut
                        </button>
                        <button (click)="exportApplication(application)">
                          <i class="fas fa-download"></i> Exporter
                        </button>
                        <button *ngIf="application.type === 'insurance'" (click)="toggleMedicalExam(application)">
                          <i class="fas fa-user-md"></i> Examen médical
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Actions groupées -->
        <div *ngIf="selectedApplications.size > 0" class="bulk-actions">
          <div class="bulk-info">
            {{ selectedApplications.size }} demande(s) sélectionnée(s)
          </div>
          <div class="bulk-buttons">
            <button (click)="bulkApprove()" class="btn btn-success btn-sm">
              <i class="fas fa-check"></i>
              Approuver la sélection
            </button>
            <button (click)="bulkReject()" class="btn btn-danger btn-sm">
              <i class="fas fa-times"></i>
              Refuser la sélection
            </button>
            <button (click)="bulkAssign()" class="btn btn-primary btn-sm">
              <i class="fas fa-user"></i>
              Assigner
            </button>
            <button (click)="bulkExport()" class="btn btn-outline btn-sm">
              <i class="fas fa-download"></i>
              Exporter
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalApplications > 0" class="pagination-section">
          <div class="pagination-info">
            Affichage de {{ getPaginationStart() }} à {{ getPaginationEnd() }} 
            sur {{ totalApplications }} demandes
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

    <!-- Modal pour changement de statut -->
    <div *ngIf="showStatusModal" class="modal-overlay" (click)="closeStatusModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Changer le statut</h3>
          <button (click)="closeStatusModal()" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="newStatus">Nouveau statut</label>
            <select [(ngModel)]="newStatus" id="newStatus" class="form-select">
              <option value="pending">En attente</option>
              <option value="under_review">En cours d'examen</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Refusé</option>
              <option value="completed">Finalisé</option>
            </select>
          </div>
          <div class="form-group">
            <label for="comment">Commentaire</label>
            <textarea [(ngModel)]="statusComment" id="comment" class="form-textarea" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button (click)="closeStatusModal()" class="btn btn-outline">
            Annuler
          </button>
          <button (click)="confirmStatusChange()" class="btn btn-primary">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./applications-list.component.scss']
})
export class ApplicationsListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Applications unifiées
  unifiedApplications: UnifiedApplication[] = [];
  creditApplications: CreditApplication[] = [];
  insuranceApplications: InsuranceApplication[] = [];
  
  loading = false;
  filtersForm: FormGroup;
  
  // Pagination
  currentPage = 1;
  pageSize = 15;
  totalApplications = 0;

  // Sélection multiple
  selectedApplications = new Set<string>();
  allSelected = false;

  // Dropdown et modals
  openDropdown: string | null = null;
  showStatusModal = false;
  currentApplication: UnifiedApplication | null = null;
  newStatus = '';
  statusComment = '';

  constructor(
    private adminApi: AdminApiService,
    private adminAuth: AdminAuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      applicationTypeFilter: [''],
      status: [''],
      insurance_type: [''],
      priority: [''],
      date_range: ['']
    });
  }

  ngOnInit(): void {
    // Mock login pour les tests
    if (!this.adminAuth.isAuthenticated) {
      this.adminAuth.mockLogin();
    }
    
    this.loadApplications();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    this.filtersForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadApplications();
      });
  }

  loadApplications(): void {
    this.loading = true;
    const filters = this.filtersForm.value;
    
    const params = {
      skip: (this.currentPage - 1) * this.pageSize,
      limit: this.pageSize,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
      )
    };

    // Charger en parallèle selon le filtre de type
    const applicationTypeFilter = filters.applicationTypeFilter;
    
    if (applicationTypeFilter === 'credit') {
      // Charger seulement les demandes de crédit
      this.loadCreditApplications(params);
    } else if (applicationTypeFilter === 'insurance') {
      // Charger seulement les demandes d'assurance
      this.loadInsuranceApplications(params);
    } else {
      // Charger les deux types
      this.loadBothApplicationTypes(params);
    }
  }

  private loadCreditApplications(params: any): void {
    this.adminApi.getCreditApplications(params).subscribe({
      next: (response: PaginatedResponse<CreditApplication>) => {
        this.creditApplications = response.items || [];
        this.insuranceApplications = [];
        this.unifyApplications();
        this.totalApplications = response.total || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement demandes crédit:', error);
        this.notificationService.showError('Erreur lors du chargement des demandes de crédit');
        this.loading = false;
      }
    });
  }

  private loadInsuranceApplications(params: any): void {
    this.adminApi.getInsuranceApplications(params).subscribe({
      next: (response) => {
        this.creditApplications = [];
        this.insuranceApplications = response.items || [];
        this.unifyApplications();
        this.totalApplications = response.total || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement demandes assurance:', error);
        this.notificationService.showError('Erreur lors du chargement des demandes d\'assurance');
        this.loading = false;
      }
    });
  }

  private loadBothApplicationTypes(params: any): void {
    // Diviser la limite par 2 pour chaque type
    const halfLimit = Math.ceil(params.limit / 2);
    const creditParams = { ...params, limit: halfLimit };
    const insuranceParams = { ...params, limit: halfLimit };

    forkJoin({
      credit: this.adminApi.getCreditApplications(creditParams),
      insurance: this.adminApi.getInsuranceApplications(insuranceParams)
    }).subscribe({
      next: (responses) => {
        this.creditApplications = responses.credit.items || [];
        this.insuranceApplications = responses.insurance.items || [];
        this.unifyApplications();
        this.totalApplications = (responses.credit.total || 0) + (responses.insurance.total || 0);
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement demandes:', error);
        this.notificationService.showError('Erreur lors du chargement des demandes');
        this.loading = false;
      }
    });
  }

  private unifyApplications(): void {
    const unified: UnifiedApplication[] = [];
    
    // Ajouter les demandes de crédit
    this.creditApplications.forEach(credit => {
      unified.push({
        id: credit.id,
        type: 'credit',
        applicant_name: credit.applicant_name,
        applicant_email: credit.applicant_email,
        applicant_phone: credit.applicant_phone,
        amount: credit.requested_amount,
        status: credit.status,
        submitted_at: credit.submitted_at,
        updated_at: credit.updated_at,
        processing_notes: credit.processing_notes,
        duration_months: credit.duration_months,
        credit_product: credit.credit_product,
        originalData: credit
      });
    });
    
    // Ajouter les demandes d'assurance
    this.insuranceApplications.forEach(insurance => {
      unified.push({
        id: insurance.id,
        type: 'insurance',
        applicant_name: insurance.applicant_name,
        applicant_email: insurance.applicant_email,
        applicant_phone: insurance.applicant_phone,
        amount: insurance.coverage_amount,
        status: insurance.status,
        submitted_at: insurance.submitted_at,
        updated_at: insurance.updated_at,
        processing_notes: insurance.processing_notes,
        insurance_type: insurance.insurance_product?.type,
        coverage_amount: insurance.coverage_amount,
        insurance_product: insurance.insurance_product,
        originalData: insurance
      });
    });
    
    // Trier par date de soumission (plus récent en premier)
    unified.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    
    // Appliquer les filtres locaux
    this.unifiedApplications = this.applyLocalFilters(unified);
  }

  private applyLocalFilters(applications: UnifiedApplication[]): UnifiedApplication[] {
    const filters = this.filtersForm.value;
    let filtered = [...applications];
    
    // Filtre de recherche
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(app => 
        app.applicant_name.toLowerCase().includes(searchTerm) ||
        app.applicant_email?.toLowerCase().includes(searchTerm) ||
        app.applicant_phone?.includes(searchTerm)
      );
    }
    
    // Filtre de statut
    if (filters.status) {
      filtered = filtered.filter(app => app.status === filters.status);
    }
    
    // Filtre de type d'assurance
    if (filters.insurance_type) {
      filtered = filtered.filter(app => 
        app.type === 'insurance' && app.insurance_type === filters.insurance_type
      );
    }
    
    return filtered;
  }

  resetFilters(): void {
    this.filtersForm.reset();
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadApplications();
    }
  }

  // Gestion de la sélection multiple
  toggleSelectAll(event: any): void {
    this.allSelected = event.target.checked;
    this.selectedApplications.clear();
    
    if (this.allSelected) {
      this.unifiedApplications.forEach(app => this.selectedApplications.add(app.id));
    }
  }

  toggleSelect(applicationId: string, event: any): void {
    if (event.target.checked) {
      this.selectedApplications.add(applicationId);
    } else {
      this.selectedApplications.delete(applicationId);
    }
    
    this.allSelected = this.selectedApplications.size === this.unifiedApplications.length;
  }

  // Actions rapides
  quickApprove(application: UnifiedApplication): void {
    this.updateApplicationStatus(application, 'approved', 'Approuvé automatiquement');
  }

  quickReject(application: UnifiedApplication): void {
    this.updateApplicationStatus(application, 'rejected', 'Refusé automatiquement');
  }

  private updateApplicationStatus(application: UnifiedApplication, status: string, comment: string): void {
    const updateService = application.type === 'credit' ? 
      this.adminApi.updateCreditApplication(application.id, { status, processing_notes: comment }) :
      this.adminApi.updateInsuranceApplicationStatus(application.id, status, comment);

    (updateService as Observable<any>).subscribe({
      next: () => {
        this.notificationService.showSuccess(
          `Demande ${status === 'approved' ? 'approuvée' : 'refusée'}`
        );
        this.loadApplications();
      },
      error: (error) => {
        console.error('Erreur mise à jour:', error);
        this.notificationService.showError('Erreur lors de la mise à jour');
      }
    });
  }

  // Gestion des dropdowns et modals
  toggleDropdown(applicationId: string): void {
    this.openDropdown = this.openDropdown === applicationId ? null : applicationId;
  }

  changeStatus(application: UnifiedApplication): void {
    this.currentApplication = application;
    this.newStatus = application.status;
    this.statusComment = '';
    this.showStatusModal = true;
    this.openDropdown = null;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.currentApplication = null;
  }

  confirmStatusChange(): void {
    if (this.currentApplication) {
      this.updateApplicationStatus(
        this.currentApplication, 
        this.newStatus, 
        this.statusComment
      );
      this.closeStatusModal();
    }
  }

  // Actions spécifiques
  toggleMedicalExam(application: UnifiedApplication): void {
    if (application.type === 'insurance') {
      const insuranceApp = application.originalData as InsuranceApplication;
      const required = !insuranceApp.medical_exam_required;
      
      this.adminApi.setMedicalExamRequired(application.id, required).subscribe({
        next: () => {
          this.notificationService.showSuccess(
            `Examen médical ${required ? 'requis' : 'non requis'}`
          );
          this.loadApplications();
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.notificationService.showError('Erreur lors de la mise à jour');
        }
      });
    }
    this.openDropdown = null;
  }

  // Actions groupées
  bulkApprove(): void {
    this.bulkUpdateStatus('approved', 'Approuvé en lot');
  }

  bulkReject(): void {
    this.bulkUpdateStatus('rejected', 'Refusé en lot');
  }

  private bulkUpdateStatus(status: string, comment: string): void {
    const promises = Array.from(this.selectedApplications).map(id => {
      const application = this.unifiedApplications.find(app => app.id === id);
      if (!application) return Promise.resolve();
      
      const updateService = application.type === 'credit' ? 
        this.adminApi.updateCreditApplication(id, { status, processing_notes: comment }) :
        this.adminApi.updateInsuranceApplicationStatus(id, status, comment);
      
      return updateService.toPromise();
    });

    Promise.all(promises).then(() => {
      this.notificationService.showSuccess(
        `${this.selectedApplications.size} demandes mises à jour`
      );
      this.selectedApplications.clear();
      this.allSelected = false;
      this.loadApplications();
    }).catch(error => {
      console.error('Erreur mise à jour groupée:', error);
      this.notificationService.showError('Erreur lors de la mise à jour groupée');
    });
  }

  bulkAssign(): void {
    this.notificationService.showInfo('Fonction d\'assignation en développement');
  }

  bulkExport(): void {
    this.notificationService.showSuccess('Export des demandes sélectionnées en cours...');
  }

  // Autres actions
  assignApplication(application: UnifiedApplication): void {
    this.notificationService.showInfo('Fonction d\'assignation en développement');
    this.openDropdown = null;
  }

  addComment(application: UnifiedApplication): void {
    this.notificationService.showInfo('Fonction de commentaire en développement');
    this.openDropdown = null;
  }

  exportApplication(application: UnifiedApplication): void {
    this.notificationService.showSuccess('Export de la demande en cours...');
    this.openDropdown = null;
  }

  exportApplications(): void {
    this.notificationService.showSuccess('Export de toutes les demandes en cours...');
  }

  // Getters pour les permissions
  get canUpdate(): boolean {
    return this.adminAuth.canUpdateApplications();
  }

  // Méthodes utilitaires pour les statistiques
  getTotalCount(): number {
    return this.unifiedApplications.length;
  }

  getPendingCount(): number {
    return this.unifiedApplications.filter(app => app.status === 'pending').length;
  }

  getApprovedCount(): number {
    return this.unifiedApplications.filter(app => app.status === 'approved').length;
  }

  getRejectedCount(): number {
    return this.unifiedApplications.filter(app => app.status === 'rejected').length;
  }

  getCreditCount(): number {
    return this.unifiedApplications.filter(app => app.type === 'credit').length;
  }

  getInsuranceCount(): number {
    return this.unifiedApplications.filter(app => app.type === 'insurance').length;
  }

  // Méthodes utilitaires pour l'affichage
  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'credit': 'Crédit',
      'insurance': 'Assurance'
    };
    return labels[type] || type;
  }

  getInsuranceTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'auto': 'Auto',
      'habitation': 'Habitation',
      'vie': 'Vie',
      'sante': 'Santé',
      'voyage': 'Voyage',
      'responsabilite': 'RC Pro'
    };
    return labels[type] || type;
  }

  getDisplayAmount(application: UnifiedApplication): number {
    return application.type === 'credit' ? 
      (application.amount || 0) : 
      (application.coverage_amount || 0);
  }

  getProductName(application: UnifiedApplication): string {
    if (application.type === 'credit') {
      return application.credit_product?.name || 'Produit inconnu';
    } else {
      return application.insurance_product?.name || 'Produit inconnu';
    }
  }

  getProviderName(application: UnifiedApplication): string {
    if (application.type === 'credit') {
      return application.credit_product?.bank?.name || 'N/A';
    } else {
      return application.insurance_product?.insurance_company?.name || 'N/A';
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'under_review': 'En examen',
      'approved': 'Approuvé',
      'rejected': 'Refusé',
      'completed': 'Finalisé'
    };
    return labels[status] || status;
  }

  getPriority(application: UnifiedApplication): string {
    const amount = this.getDisplayAmount(application);
    if (amount > 50000000) return 'urgent';
    if (amount > 20000000) return 'high';
    if (amount > 5000000) return 'normal';
    return 'low';
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'low': 'Faible',
      'normal': 'Normale',
      'high': 'Élevée',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  }

  getDeadlineClass(application: UnifiedApplication): string {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(application.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreation > 7) return 'overdue';
    if (daysSinceCreation > 3) return 'warning';
    return 'normal';
  }

  getProcessingTimeText(application: UnifiedApplication): string {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(application.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreation === 0) return 'Aujourd\'hui';
    if (daysSinceCreation === 1) return '1 jour';
    return `${daysSinceCreation} jours`;
  }

  getDetailRoute(application: UnifiedApplication): string[] {
    return application.type === 'credit' ? 
      ['/admin/applications/credit', application.id] :
      ['/admin/applications/insurance', application.id];
  }

  formatCurrency(amount: number): string {
    if (!amount) return '0 FCFA';
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
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
    if (this.totalApplications === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getPaginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalApplications);
  }

  getTotalPages(): number {
    return Math.ceil(this.totalApplications / this.pageSize);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    
    // Afficher 5 pages max autour de la page courante
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}