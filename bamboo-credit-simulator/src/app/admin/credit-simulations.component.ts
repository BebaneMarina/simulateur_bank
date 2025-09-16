import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface CreditSimulation {
  id: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  duration: number;
  interestRate: number;
  monthlyPayment: number;
  totalAmount: number;
  productType: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  simulationDate: Date;
}

@Component({
  selector: 'app-credit-simulations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h4 class="mb-0">Simulations de Crédit</h4>
              <p class="text-muted mb-0">Gestion des simulations de crédit des clients</p>
            </div>
            
            <div class="card-body">
              <!-- Statistiques rapides -->
              <div class="row mb-4">
                <div class="col-md-3">
                  <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                      <h3>{{ getTotalSimulations() }}</h3>
                      <p class="mb-0">Total Simulations</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-warning text-white">
                    <div class="card-body text-center">
                      <h3>{{ getPendingCount() }}</h3>
                      <p class="mb-0">En Attente</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-success text-white">
                    <div class="card-body text-center">
                      <h3>{{ getApprovedCount() }}</h3>
                      <p class="mb-0">Approuvées</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-info text-white">
                    <div class="card-body text-center">
                      <h3>{{ getTotalAmount() | number:'1.0-0' }}</h3>
                      <p class="mb-0">Total Montant (FCFA)</p>
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
                    <option value="pending">En attente</option>
                    <option value="approved">Approuvée</option>
                    <option value="rejected">Rejetée</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <select class="form-select" [(ngModel)]="productFilter" (change)="filterSimulations()">
                    <option value="">Tous les produits</option>
                    <option value="personnel">Crédit Personnel</option>
                    <option value="immobilier">Crédit Immobilier</option>
                    <option value="auto">Crédit Auto</option>
                    <option value="professionnel">Crédit Professionnel</option>
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
                  <button class="btn btn-outline-secondary me-2" (click)="exportToExcel()">
                    <i class="fas fa-file-excel me-2"></i>Excel
                  </button>
                  <button class="btn btn-outline-danger" (click)="exportToPDF()">
                    <i class="fas fa-file-pdf me-2"></i>PDF
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
                      <th>Montant (FCFA)</th>
                      <th>Durée</th>
                      <th>Taux</th>
                      <th>Mensualité (FCFA)</th>
                      <th>Statut</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let simulation of filteredSimulations">
                      <td>
                        <strong>{{ simulation.customerName }}</strong>
                      </td>
                      <td>{{ simulation.customerPhone }}</td>
                      <td>
                        <span class="badge bg-secondary">{{ getProductLabel(simulation.productType) }}</span>
                      </td>
                      <td>{{ simulation.amount | number:'1.0-0' }}</td>
                      <td>{{ simulation.duration }} mois</td>
                      <td>{{ simulation.interestRate }}%</td>
                      <td>{{ simulation.monthlyPayment | number:'1.0-0' }}</td>
                      <td>
                        <span class="badge" [class]="getStatusClass(simulation.status)">
                          {{ getStatusLabel(simulation.status) }}
                        </span>
                      </td>
                      <td>{{ simulation.simulationDate | date:'dd/MM/yyyy' }}</td>
                      <td>
                        <div class="btn-group" role="group">
                          <button class="btn btn-sm btn-outline-primary" 
                                  [routerLink]="['/admin/simulations', simulation.id]">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-success" 
                                  *ngIf="simulation.status === 'pending'"
                                  (click)="approveSimulation(simulation.id)">
                            <i class="fas fa-check"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-danger" 
                                  *ngIf="simulation.status === 'pending'"
                                  (click)="rejectSimulation(simulation.id)">
                            <i class="fas fa-times"></i>
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
    </div>
  `
})
export class CreditSimulationsComponent implements OnInit {
  simulations: CreditSimulation[] = [];
  filteredSimulations: CreditSimulation[] = [];
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
    // Simulation de données
    this.simulations = [
      {
        id: '1',
        customerName: 'Jean Mbou',
        customerPhone: '+241 06 12 34 56',
        amount: 5000000,
        duration: 36,
        interestRate: 12,
        monthlyPayment: 166134,
        totalAmount: 5980824,
        productType: 'personnel',
        status: 'pending',
        createdAt: new Date('2024-08-20'),
        simulationDate: new Date('2024-08-20')
      },
      {
        id: '2',
        customerName: 'Marie Ngoua',
        customerPhone: '+241 07 23 45 67',
        amount: 25000000,
        duration: 180,
        interestRate: 8.5,
        monthlyPayment: 247794,
        totalAmount: 44603320,
        productType: 'immobilier',
        status: 'approved',
        createdAt: new Date('2024-08-19'),
        simulationDate: new Date('2024-08-19')
      },
      {
        id: '3',
        customerName: 'Paul Ondo',
        customerPhone: '+241 05 34 56 78',
        amount: 8000000,
        duration: 60,
        interestRate: 10,
        monthlyPayment: 170124,
        totalAmount: 10207440,
        productType: 'auto',
        status: 'rejected',
        createdAt: new Date('2024-08-18'),
        simulationDate: new Date('2024-08-18')
      },
      {
        id: '4',
        customerName: 'Sophie Nguema',
        customerPhone: '+241 06 45 67 89',
        amount: 15000000,
        duration: 84,
        interestRate: 14,
        monthlyPayment: 244567,
        totalAmount: 20543628,
        productType: 'professionnel',
        status: 'pending',
        createdAt: new Date('2024-08-17'),
        simulationDate: new Date('2024-08-17')
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
  }

  getTotalSimulations(): number {
    return this.simulations.length;
  }

  getPendingCount(): number {
    return this.simulations.filter(s => s.status === 'pending').length;
  }

  getApprovedCount(): number {
    return this.simulations.filter(s => s.status === 'approved').length;
  }

  getTotalAmount(): number {
    return this.simulations.reduce((sum, s) => sum + s.amount, 0);
  }

  getProductLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'personnel': 'Personnel',
      'immobilier': 'Immobilier',
      'auto': 'Automobile',
      'professionnel': 'Professionnel'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'approved': 'Approuvée',
      'rejected': 'Rejetée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'pending': 'bg-warning',
      'approved': 'bg-success',
      'rejected': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  approveSimulation(id: string) {
    if (confirm('Êtes-vous sûr de vouloir approuver cette simulation ?')) {
      const simulation = this.simulations.find(s => s.id === id);
      if (simulation) {
        simulation.status = 'approved';
        this.filterSimulations();
      }
    }
  }

  rejectSimulation(id: string) {
    if (confirm('Êtes-vous sûr de vouloir rejeter cette simulation ?')) {
      const simulation = this.simulations.find(s => s.id === id);
      if (simulation) {
        simulation.status = 'rejected';
        this.filterSimulations();
      }
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  exportToExcel() {
    console.log('Export vers Excel');
    // Implémentation de l'export Excel
  }

  exportToPDF() {
    console.log('Export vers PDF');
    // Implémentation de l'export PDF
  }
}