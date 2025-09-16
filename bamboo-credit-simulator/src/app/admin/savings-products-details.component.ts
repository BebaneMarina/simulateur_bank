import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

interface SavingsProduct {
  id: string;
  name: string;
  type: string;
  description: string;
  interestRate: number;
  minAmount: number;
  maxAmount: number;
  duration: number;
  allowPartialWithdrawal: boolean;
  autoRenewal: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-savings-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="product-detail" *ngIf="product">
      <div class="header">
        <h2>{{ product.name }}</h2>
        <div class="actions">
          <button [routerLink]="['../', 'edit', product.id]" class="btn btn-primary">
            <i class="icon-edit"></i>
            Modifier
          </button>
          <button (click)="deleteProduct()" class="btn btn-danger">
            <i class="icon-trash"></i>
            Supprimer
          </button>
        </div>
      </div>

      <div class="content">
        <div class="info-card">
          <h3>Informations générales</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Nom du produit</label>
              <span>{{ product.name }}</span>
            </div>
            <div class="info-item">
              <label>Type</label>
              <span>{{ getTypeLabel(product.type) }}</span>
            </div>
            <div class="info-item">
              <label>Statut</label>
              <span class="status" [class]="'status-' + product.status">
                {{ getStatusLabel(product.status) }}
              </span>
            </div>
            <div class="info-item full-width">
              <label>Description</label>
              <span>{{ product.description || 'Aucune description' }}</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <h3>Paramètres financiers</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Taux d'intérêt</label>
              <span class="highlight">{{ product.interestRate }}%</span>
            </div>
            <div class="info-item">
              <label>Durée</label>
              <span>{{ product.duration }} mois</span>
            </div>
            <div class="info-item">
              <label>Montant minimum</label>
              <span>{{ formatAmount(product.minAmount) }}</span>
            </div>
            <div class="info-item">
              <label>Montant maximum</label>
              <span>{{ formatAmount(product.maxAmount) }}</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <h3>Conditions</h3>
          <div class="conditions-list">
            <div class="condition-item">
              <i class="icon" [class]="product.allowPartialWithdrawal ? 'icon-check' : 'icon-x'"></i>
              <span>Retraits partiels {{ product.allowPartialWithdrawal ? 'autorisés' : 'non autorisés' }}</span>
            </div>
            <div class="condition-item">
              <i class="icon" [class]="product.autoRenewal ? 'icon-check' : 'icon-x'"></i>
              <span>Renouvellement {{ product.autoRenewal ? 'automatique' : 'manuel' }}</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <h3>Métadonnées</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Date de création</label>
              <span>{{ formatDate(product.createdAt) }}</span>
            </div>
            <div class="info-item">
              <label>Dernière modification</label>
              <span>{{ formatDate(product.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <div class="simulation-section">
          <h3>Simulation rapide</h3>
          <div class="simulation-form">
            <div class="form-group">
              <label for="amount">Montant à épargner (XAF)</label>
              <input 
                type="number" 
                id="amount" 
                [(ngModel)]="simulationAmount"
                [min]="product.minAmount"
                [max]="product.maxAmount"
                class="form-control">
            </div>
            <button (click)="calculateSimulation()" class="btn btn-outline">
              Calculer
            </button>
          </div>
          <div class="simulation-result" *ngIf="simulationResult">
            <h4>Résultat de la simulation</h4>
            <div class="result-grid">
              <div class="result-item">
                <label>Montant initial</label>
                <span>{{ formatAmount(simulationResult.initialAmount) }}</span>
              </div>
              <div class="result-item">
                <label>Intérêts générés</label>
                <span class="highlight">{{ formatAmount(simulationResult.interests) }}</span>
              </div>
              <div class="result-item">
                <label>Montant final</label>
                <span class="total">{{ formatAmount(simulationResult.finalAmount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <button (click)="goBack()" class="btn btn-outline">
          <i class="icon-arrow-left"></i>
          Retour à la liste
        </button>
      </div>
    </div>

    <div class="loading" *ngIf="!product">
      Chargement...
    </div>
  `,
  styles: [`
    .product-detail {
      padding: 20px;
      max-width: 1200px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .actions {
      display: flex;
      gap: 15px;
    }

    .content {
      display: grid;
      gap: 20px;
      margin-bottom: 30px;
    }

    .info-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 20px;
    }

    .info-card h3 {
      margin: 0 0 15px 0;
      color: #333;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-item.full-width {
      grid-column: 1 / -1;
    }

    .info-item label {
      font-weight: 500;
      color: #666;
      margin-bottom: 5px;
      font-size: 14px;
    }

    .info-item span {
      font-weight: 600;
      color: #333;
    }

    .status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      width: fit-content;
    }

    .status-active {
      background: #d4edda;
      color: #155724;
    }

    .status-inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .highlight {
      color: #007bff;
      font-size: 16px;
    }

    .total {
      color: #28a745;
      font-size: 16px;
      font-weight: 700;
    }

    .conditions-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .condition-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .icon-check {
      color: #28a745;
    }

    .icon-x {
      color: #dc3545;
    }

    .simulation-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
    }

    .simulation-form {
      display: flex;
      gap: 15px;
      align-items: end;
      margin-bottom: 20px;
    }

    .form-group {
      flex: 1;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: #555;
    }

    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .simulation-result {
      background: white;
      border-radius: 6px;
      padding: 15px;
      border-left: 4px solid #007bff;
    }

    .result-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 10px;
    }

    .result-item {
      display: flex;
      flex-direction: column;
    }

    .result-item label {
      font-size: 12px;
      color: #666;
      margin-bottom: 2px;
    }

    .result-item span {
      font-weight: 600;
      font-size: 16px;
    }

    .footer {
      border-top: 1px solid #eee;
      padding-top: 20px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-outline {
      border: 1px solid #ddd;
      background: white;
      color: #333;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      font-size: 16px;
      color: #666;
    }

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }

      .actions {
        width: 100%;
        justify-content: flex-start;
      }

      .simulation-form {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class SavingsProductDetailComponent implements OnInit {
  product?: SavingsProduct;
  simulationAmount = 0;
  simulationResult?: {
    initialAmount: number;
    interests: number;
    finalAmount: number;
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProduct(id);
    }
  }

  loadProduct(id: string) {
    // Simulation de chargement - remplacer par un appel API
    setTimeout(() => {
      this.product = {
        id: id,
        name: 'Livret Épargne Plus',
        type: 'livret',
        description: 'Un livret d\'épargne avec un taux d\'intérêt attractif pour faire fructifier votre argent en toute sécurité.',
        interestRate: 2.5,
        minAmount: 100,
        maxAmount: 50000,
        duration: 12,
        allowPartialWithdrawal: true,
        autoRenewal: false,
        status: 'active',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-03-10')
      };
      this.simulationAmount = this.product.minAmount;
    }, 500);
  }

  getTypeLabel(type: string): string {
    const labels = {
      'livret': 'Livret d\'épargne',
      'plan': 'Plan d\'épargne',
      'terme': 'Dépôt à terme'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getStatusLabel(status: string): string {
    const labels = {
      'active': 'Actif',
      'inactive': 'Inactif'
    };
    return labels[status as keyof typeof labels] || status;
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  calculateSimulation() {
    if (this.product && this.simulationAmount >= this.product.minAmount && this.simulationAmount <= this.product.maxAmount) {
      const monthlyRate = this.product.interestRate / 100 / 12;
      const finalAmount = this.simulationAmount * Math.pow(1 + monthlyRate, this.product.duration);
      const interests = finalAmount - this.simulationAmount;

      this.simulationResult = {
        initialAmount: this.simulationAmount,
        interests: interests,
        finalAmount: finalAmount
      };
    }
  }

  deleteProduct() {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit d\'épargne ?')) {
      // Simulation de suppression - remplacer par un appel API
      console.log('Produit supprimé:', this.product?.id);
      this.router.navigate(['/admin/savings-products']);
    }
  }

  goBack() {
    this.router.navigate(['/admin/savings-products']);
  }
}