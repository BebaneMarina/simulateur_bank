import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface SavingsSimulation {
  id: string;
  customerName: string;
  customerPhone: string;
  initialAmount: number;
  monthlyAmount: number;
  duration: number;
  interestRate: number;
  totalContributions: number;
  projectedGains: number;
  finalAmount: number;
  productType: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  simulationDate: Date;
}

@Component({
  selector: 'app-savings-simulations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h4 class="mb-0">Simulations d'Épargne</h4>
              <p class="text-muted mb-0">Gestion des simulations de produits d'épargne des clients</p>
            </div>
            
            <div class="card-body">
              <!-- Statistiques rapides -->
              <div class="row mb-4">
                <div class="col-md-3">
                  <div class="card bg-success text-white">
                    <div class="card-body text-center">
                      <h3>{{ getTotalSimulations() }}</h3>
                      <p class="mb-0">Total Simulations</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                      <h3>{{ getActiveCount() }}</h3>
                      <p class="mb-0">Actives</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-info text-white">
                    <div class="card-body text-center">
                      <h3>{{ getTotalContributions() | number:'1.0-0' }}</h3>
                      <p class="mb-0">Total Épargne (FCFA)</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-warning text-white">
                    <div class="card-body text-center">
                      <h3>{{ getTotalGains() | number:'1.0-0' }}</h3>
                      <p class="mb-0">Gains Projetés (FCFA)</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Filtres -->
              <div class="row mb-3">
                <div class="col-md-3">
                  <input 
                    type="text" 
                    class="form-control" 
                    placeholder="Rechercher par nom ou téléphone..."
                    [(ngModel)]="searchTerm"
                    (input)="filterSimulations()">
                </div>
                <div class="col-md-2">
                  <select class="form-select" [(ngModel)]="statusFilter" (change)="filterSimulations()">
                    <option value="">Tous les statuts</option>
                    <option value="active">Active</option>
                    <option value="completed">Terminée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <select class="form-select" [(ngModel)]="productFilter" (change)="filterSimulations()">
                    <option value="">Tous les produits</option>
                    <option value="compte_epargne">Compte Épargne</option>
                    <option value="depot_terme">Dépôt à Terme</option>
                    <option value="epargne_logement">Épargne Logement</option>
                    <option value="plan_retraite">Plan Retraite</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <input 
                    type="date" 
                    class="form-control"
                    [(ngModel)]="dateFilter"
                    (change)="filterSimulations()">
                </div>
                <div class="col-md-3">
                  <button class="btn btn-success me-2" (click)="generateReports()">
                    <i class="fas fa-chart-line me-2"></i>Rapport
                  </button>
                  <button class="btn btn-outline-secondary" (click)="exportData()">
                    <i class="fas fa-download me-2"></i>Export
                  </button>
                </div>
              </div>

              <!-- Tableau -->
              <div class="table-responsive">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Téléphone</th>
                      <th>Produit</th>
                      <th>Apport Initial</th>
                      <th>Épargne Mensuelle</th>
                      <th>Durée</th>
                      <th>Taux</th>
                      <th>Montant Final</th>
                      <th>Gains</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let simulation of paginatedSimulations">
                      <td>
                        <strong>{{ simulation.customerName }}</strong>
                      </td>
                      <td>{{ simulation.customerPhone }}</td>
                      <td>
                        <span class="badge bg-info">{{ getProductLabel(simulation.productType) }}</span>
                      </td>
                      <td>{{ simulation.initialAmount | number:'1.0-0' }} FCFA</td>
                      <td>{{ simulation.monthlyAmount | number:'1.0-0' }} FCFA</td>
                      <td>{{ simulation.duration }} mois</td>
                      <td>{{ simulation.interestRate }}%</td>
                      <td>
                        <strong class="text-success">{{ simulation.finalAmount | number:'1.0-0' }} FCFA</strong>
                      </td>
                      <td>
                        <span class="text-success">+{{ simulation.projectedGains | number:'1.0-0' }} FCFA</span>
                      </td>
                      <td>
                        <span class="badge" [class]="getStatusClass(simulation.status)">
                          {{ getStatusLabel(simulation.status) }}
                        </span>
                      </td>
                      <td>
                        <div class="btn-group" role="group">
                          <button class="btn btn-sm btn-outline-primary" 
                                  [routerLink]="['/admin/simulations', simulation.id]"
                                  title="Voir détails">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-success" 
                                  (click)="viewChart(simulation)"
                                  title="Voir graphique">
                            <i class="fas fa-chart-area"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-info" 
                                  (click)="generatePDF(simulation)"
                                  title="Télécharger PDF">
                            <i class="fas fa-file-pdf"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <nav *ngIf="totalPages > 1">
                <ul class="pagination justify-content-center">
                  <li class="page-item" [class.disabled]="currentPage === 1">
                    <button class="page-link" (click)="goToPage(currentPage - 1)">Précédent</button>
                  </li>
                  <li class="page-item" 
                      *ngFor="let page of [].constructor(totalPages); let i = index"
                      [class.active]="currentPage === i + 1">
                    <button class="page-link" (click)="goToPage(i + 1)">{{ i + 1 }}</button>
                  </li>
                  <li class="page-item" [class.disabled]="currentPage === totalPages">
                    <button class="page-link" (click)="goToPage(currentPage + 1)">Suivant</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal pour le graphique -->
      <div class="modal fade" id="chartModal" tabindex="-1" *ngIf="selectedSimulation">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Projection d'Épargne - {{ selectedSimulation.customerName }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-6">
                  <canvas id="savingsChart" width="400" height="300"></canvas>
                </div>
                <div class="col-md-6">
                  <h6>Résumé de l'épargne</h6>
                  <ul class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between">
                      <span>Apport initial:</span>
                      <strong>{{ selectedSimulation.initialAmount | number:'1.0-0' }} FCFA</strong>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                      <span>Épargne mensuelle:</span>
                      <strong>{{ selectedSimulation.monthlyAmount | number:'1.0-0' }} FCFA</strong>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                      <span>Total contributions:</span>
                      <strong>{{ selectedSimulation.totalContributions | number:'1.0-0' }} FCFA</strong>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                      <span>Gains projetés:</span>
                      <strong class="text-success">{{ selectedSimulation.projectedGains | number:'1.0-0' }} FCFA</strong>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                      <span>Montant final:</span>
                      <strong class="text-primary">{{ selectedSimulation.finalAmount | number:'1.0-0' }} FCFA</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SavingsSimulationsComponent implements OnInit {
  simulations: SavingsSimulation[] = [];
  filteredSimulations: SavingsSimulation[] = [];
  paginatedSimulations: SavingsSimulation[] = [];
  selectedSimulation?: SavingsSimulation;
  searchTerm: string = '';
  statusFilter: string = '';
  productFilter: string = '';
  dateFilter: string = '';
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  ngOnInit() {
    this.loadSimulations();
  }

  loadSimulations() {
    // Simulation de données d'épargne
    this.simulations = [
      {
        id: '1',
        customerName: 'Amélie Obame',
        customerPhone: '+241 06 11 22 33',
        initialAmount: 500000,
        monthlyAmount: 100000,
        duration: 24,
        interestRate: 6.5,
        totalContributions: 2900000,
        projectedGains: 235000,
        finalAmount: 3135000,
        productType: 'compte_epargne',
        status: 'active',
        createdAt: new Date('2024-08-20'),
        simulationDate: new Date('2024-07-15')
      },
      {
        id: '3',
        customerName: 'Sylvie Mba',
        customerPhone: '+241 05 77 88 99',
        initialAmount: 1000000,
        monthlyAmount: 150000,
        duration: 60,
        interestRate: 5.5,
        totalContributions: 10000000,
        projectedGains: 1650000,
        finalAmount: 11650000,
        productType: 'epargne_logement',
        status: 'active',
        createdAt: new Date('2024-08-18'),
        simulationDate: new Date('2024-08-18')
      },
      {
        id: '4',
        customerName: 'Roger Bikoro',
        customerPhone: '+241 06 33 44 55',
        initialAmount: 300000,
        monthlyAmount: 75000,
        duration: 120,
        interestRate: 7.0,
        totalContributions: 9300000,
        projectedGains: 2850000,
        finalAmount: 12150000,
        productType: 'plan_retraite',
        status: 'active',
        createdAt: new Date('2024-08-16'),
        simulationDate: new Date('2024-08-16')
      }
    ];
    
    this.filterSimulations();
  }

  filterSimulations() {
    this.filteredSimulations = this.simulations.filter(simulation => {
      const matchesSearch = simulation.customerName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           simulation.customerPhone.includes(this.searchTerm);
      const matchesStatus = !this.statusFilter || simulation.status === this.statusFilter;
      const matchesProduct = !this.productFilter || simulation.productType === this.productFilter;
      const matchesDate = !this.dateFilter || 
                         simulation.simulationDate.toISOString().split('T')[0] === this.dateFilter;
      
      return matchesSearch && matchesStatus && matchesProduct && matchesDate;
    });
    
    this.totalPages = Math.ceil(this.filteredSimulations.length / this.pageSize);
    this.updatePaginatedSimulations();
  }

  updatePaginatedSimulations() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedSimulations = this.filteredSimulations.slice(startIndex, endIndex);
  }

  getTotalSimulations(): number {
    return this.simulations.length;
  }

  getActiveCount(): number {
    return this.simulations.filter(s => s.status === 'active').length;
  }

  getTotalContributions(): number {
    return this.simulations.reduce((sum, s) => sum + s.totalContributions, 0);
  }

  getTotalGains(): number {
    return this.simulations.reduce((sum, s) => sum + s.projectedGains, 0);
  }

  getProductLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'compte_epargne': 'Compte Épargne',
      'depot_terme': 'Dépôt à Terme',
      'epargne_logement': 'Épargne Logement',
      'plan_retraite': 'Plan Retraite'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'active': 'Active',
      'completed': 'Terminée',
      'cancelled': 'Annulée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'active': 'bg-success',
      'completed': 'bg-primary',
      'cancelled': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  viewChart(simulation: SavingsSimulation) {
    this.selectedSimulation = simulation;
    // Dans un vrai projet, vous utiliseriez Bootstrap Modal ou Angular Material
    console.log('Afficher graphique pour:', simulation.customerName);
  }

  generatePDF(simulation: SavingsSimulation) {
    console.log('Générer PDF pour:', simulation.customerName);
    // Implémentation de la génération PDF
  }

  generateReports() {
    console.log('Générer rapports d\'épargne');
    // Implémentation de la génération de rapports
  }

  exportData() {
    console.log('Export des données d\'épargne');
    // Implémentation de l'export de données
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedSimulations();
    }
  }
}