import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

interface SimulationDetail {
  id: string;
  type: 'credit' | 'savings';
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    profession: string;
    monthlyIncome: number;
  };
  simulationData: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  notes: string[];
}

@Component({
  selector: 'app-simulation-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container-fluid" *ngIf="simulation">
      <div class="row">
        <div class="col-12">
          <!-- En-tête -->
          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <div>
                <h4 class="mb-1">Simulation {{ simulation.type === 'credit' ? 'de Crédit' : 'd\'Épargne' }}</h4>
                <p class="text-muted mb-0">ID: {{ simulation.id }}</p>
              </div>
              <div class="btn-group">
                <button class="btn btn-outline-primary" (click)="printSimulation()">
                  <i class="fas fa-print me-2"></i>Imprimer
                </button>
                <button class="btn btn-outline-success" (click)="exportToPDF()">
                  <i class="fas fa-file-pdf me-2"></i>PDF
                </button>
                <button class="btn btn-outline-secondary" (click)="goBack()">
                  <i class="fas fa-arrow-left me-2"></i>Retour
                </button>
              </div>
            </div>
          </div>

          <div class="row">
            <!-- Informations client -->
            <div class="col-md-6">
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="fas fa-user me-2"></i>Informations Client
                  </h5>
                </div>
                <div class="card-body">
                  <dl class="row">
                    <dt class="col-sm-4">Nom:</dt>
                    <dd class="col-sm-8">{{ simulation.customerInfo.name }}</dd>

                    <dt class="col-sm-4">Téléphone:</dt>
                    <dd class="col-sm-8">
                      <a [href]="'tel:' + simulation.customerInfo.phone">{{ simulation.customerInfo.phone }}</a>
                    </dd>

                    <dt class="col-sm-4">Email:</dt>
                    <dd class="col-sm-8">
                      <a [href]="'mailto:' + simulation.customerInfo.email">{{ simulation.customerInfo.email }}</a>
                    </dd>

                    <dt class="col-sm-4">Adresse:</dt>
                    <dd class="col-sm-8">{{ simulation.customerInfo.address }}</dd>

                    <dt class="col-sm-4">Profession:</dt>
                    <dd class="col-sm-8">{{ simulation.customerInfo.profession }}</dd>

                    <dt class="col-sm-4">Revenus:</dt>
                    <dd class="col-sm-8">
                      <span class="badge bg-success">{{ simulation.customerInfo.monthlyIncome | number:'1.0-0' }} FCFA/mois</span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Statut et dates -->
            <div class="col-md-6">
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="fas fa-info-circle me-2"></i>Informations Simulation
                  </h5>
                </div>
                <div class="card-body">
                  <dl class="row">
                    <dt class="col-sm-4">Type:</dt>
                    <dd class="col-sm-8">
                      <span class="badge" [class]="simulation.type === 'credit' ? 'bg-primary' : 'bg-success'">
                        {{ simulation.type === 'credit' ? 'Crédit' : 'Épargne' }}
                      </span>
                    </dd>

                    <dt class="col-sm-4">Statut:</dt>
                    <dd class="col-sm-8">
                      <span class="badge" [class]="getStatusClass(simulation.status)">
                        {{ getStatusLabel(simulation.status) }}
                      </span>
                    </dd>

                    <dt class="col-sm-4">Créée le:</dt>
                    <dd class="col-sm-8">{{ simulation.createdAt | date:'dd/MM/yyyy à HH:mm' }}</dd>

                    <dt class="col-sm-4">Modifiée le:</dt>
                    <dd class="col-sm-8">{{ simulation.updatedAt | date:'dd/MM/yyyy à HH:mm' }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Détails spécifiques au type de simulation -->
          <div class="row">
            <div class="col-12">
              <div class="card mb-4" *ngIf="simulation.type === 'credit'">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="fas fa-money-bill-wave me-2"></i>Détails du Crédit
                  </h5>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6">
                      <h6 class="text-primary">Paramètres du Crédit</h6>
                      <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Montant demandé:</span>
                          <strong>{{ simulation.simulationData.amount | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Durée:</span>
                          <strong>{{ simulation.simulationData.duration }} mois</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Taux d'intérêt:</span>
                          <strong>{{ simulation.simulationData.interestRate }}%</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Type de crédit:</span>
                          <strong>{{ getProductLabel(simulation.simulationData.productType) }}</strong>
                        </li>
                      </ul>
                    </div>
                    <div class="col-md-6">
                      <h6 class="text-success">Résultats</h6>
                      <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Mensualité:</span>
                          <strong class="text-primary">{{ simulation.simulationData.monthlyPayment | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Montant total:</span>
                          <strong>{{ simulation.simulationData.totalAmount | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Coût du crédit:</span>
                          <strong class="text-warning">{{ (simulation.simulationData.totalAmount - simulation.simulationData.amount) | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Taux d'endettement:</span>
                          <strong [class]="getDebtRatioClass()">{{ getDebtRatio() }}%</strong>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card mb-4" *ngIf="simulation.type === 'savings'">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="fas fa-piggy-bank me-2"></i>Détails de l'Épargne
                  </h5>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6">
                      <h6 class="text-primary">Paramètres de l'Épargne</h6>
                      <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Apport initial:</span>
                          <strong>{{ simulation.simulationData.initialAmount | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Épargne mensuelle:</span>
                          <strong>{{ simulation.simulationData.monthlyAmount | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Durée:</span>
                          <strong>{{ simulation.simulationData.duration }} mois</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Taux d'intérêt:</span>
                          <strong>{{ simulation.simulationData.interestRate }}%</strong>
                        </li>
                      </ul>
                    </div>
                    <div class="col-md-6">
                      <h6 class="text-success">Projection</h6>
                      <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Total contributions:</span>
                          <strong>{{ simulation.simulationData.totalContributions | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Gains projetés:</span>
                          <strong class="text-success">{{ simulation.simulationData.projectedGains | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Montant final:</span>
                          <strong class="text-primary">{{ simulation.simulationData.finalAmount | number:'1.0-0' }} FCFA</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span>Rendement:</span>
                          <strong class="text-info">{{ getReturn() }}%</strong>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes et commentaires -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="fas fa-sticky-note me-2"></i>Notes et Commentaires
                  </h5>
                </div>
                <div class="card-body">
                  <div class="mb-3" *ngIf="simulation.notes.length === 0">
                    <p class="text-muted">Aucune note disponible pour cette simulation.</p>
                  </div>
                  <div class="mb-3" *ngFor="let note of simulation.notes; let i = index">
                    <div class="alert alert-info">
                      <strong>Note {{ i + 1 }}:</strong> {{ note }}
                    </div>
                  </div>
                  
                  <!-- Ajouter une note -->
                  <div class="mt-3">
                    <label class="form-label">Ajouter une note:</label>
                    <div class="input-group">
                      <textarea class="form-control" rows="2" [(ngModel)]="newNote" placeholder="Entrez votre note..."></textarea>
                      <button class="btn btn-primary" (click)="addNote()" [disabled]="!newNote?.trim()">
                        <i class="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div class="container-fluid" *ngIf="!simulation">
      <div class="row">
        <div class="col-12 text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Chargement...</span>
          </div>
          <p class="mt-3">Chargement des détails de la simulation...</p>
        </div>
      </div>
    </div>
  `
})
export class SimulationDetailComponent implements OnInit {
  simulation?: SimulationDetail;
  newNote: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const simulationId = this.route.snapshot.paramMap.get('id');
    if (simulationId) {
      this.loadSimulation(simulationId);
    }
  }

  loadSimulation(id: string) {
    // Simulation de chargement des données
    setTimeout(() => {
      // Exemple avec un crédit
      if (id === '1' || id === '3') {
        this.simulation = {
          id: id,
          type: 'credit',
          customerInfo: {
            name: 'Jean Mbou',
            phone: '+241 06 12 34 56',
            email: 'jean.mbou@email.com',
            address: 'Quartier Nombakélé, Libreville',
            profession: 'Ingénieur Informatique',
            monthlyIncome: 850000
          },
          simulationData: {
            amount: 5000000,
            duration: 36,
            interestRate: 12,
            monthlyPayment: 166134,
            totalAmount: 5980824,
            productType: 'personnel'
          },
          status: 'pending',
          createdAt: new Date('2024-08-20T10:30:00'),
          updatedAt: new Date('2024-08-20T15:45:00'),
          notes: [
            'Client avec un bon historique de crédit',
            'Revenus stables depuis 3 ans'
          ]
        };
      } else {
        // Exemple avec épargne
        this.simulation = {
          id: id,
          type: 'savings',
          customerInfo: {
            name: 'Amélie Obame',
            phone: '+241 06 11 22 33',
            email: 'amelie.obame@email.com',
            address: 'Quartier Glass, Libreville',
            profession: 'Médecin',
            monthlyIncome: 1200000
          },
          simulationData: {
            initialAmount: 500000,
            monthlyAmount: 100000,
            duration: 24,
            interestRate: 6.5,
            totalContributions: 2900000,
            projectedGains: 235000,
            finalAmount: 3135000,
            productType: 'compte_epargne'
          },
          status: 'active',
          createdAt: new Date('2024-08-20T09:15:00'),
          updatedAt: new Date('2024-08-20T09:15:00'),
          notes: [
            'Objectif : épargne pour l\'achat d\'un véhicule'
          ]
        };
      }
    }, 1000);
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'approved': 'Approuvée',
      'rejected': 'Rejetée',
      'active': 'Active',
      'completed': 'Terminée',
      'cancelled': 'Annulée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'pending': 'bg-warning',
      'approved': 'bg-success',
      'rejected': 'bg-danger',
      'active': 'bg-primary',
      'completed': 'bg-info',
      'cancelled': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
  }

  getProductLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'personnel': 'Personnel',
      'immobilier': 'Immobilier',
      'auto': 'Automobile',
      'professionnel': 'Professionnel',
      'compte_epargne': 'Compte Épargne',
      'depot_terme': 'Dépôt à Terme',
      'epargne_logement': 'Épargne Logement',
      'plan_retraite': 'Plan Retraite'
    };
    return labels[type] || type;
  }

  getDebtRatio(): number {
    if (this.simulation && this.simulation.type === 'credit') {
      return Math.round((this.simulation.simulationData.monthlyPayment / this.simulation.customerInfo.monthlyIncome) * 100);
    }
    return 0;
  }

  getDebtRatioClass(): string {
    const ratio = this.getDebtRatio();
    if (ratio <= 33) return 'text-success';
    if (ratio <= 40) return 'text-warning';
    return 'text-danger';
  }

  getReturn(): number {
    if (this.simulation && this.simulation.type === 'savings') {
      const totalContributions = this.simulation.simulationData.totalContributions;
      const gains = this.simulation.simulationData.projectedGains;
      return Math.round((gains / totalContributions) * 100);
    }
    return 0;
  }

  addNote() {
    if (this.newNote.trim() && this.simulation) {
      this.simulation.notes.push(this.newNote.trim());
      this.newNote = '';
      // Dans un vrai projet, vous feriez un appel API ici
      console.log('Note ajoutée:', this.simulation.notes[this.simulation.notes.length - 1]);
    }
  }

  printSimulation() {
    window.print();
  }

  exportToPDF() {
    console.log('Export PDF de la simulation');
    // Implémentation de l'export PDF
  }

  goBack() {
    this.router.navigate(['/admin/simulations']);
  }
}