import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

// Interface adaptée à votre base de données
interface CreditProductDetail {
  id: string;
  name: string;
  type: string;
  description?: string;
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  average_rate: number;
  min_rate?: number;
  max_rate?: number;
  processing_time_hours: number;
  required_documents?: any;
  eligibility_criteria?: any;
  fees?: any;
  features?: string[];
  advantages?: string[];
  special_conditions?: string;
  is_featured: boolean;
  is_active: boolean;
  bank: {
    id: string;
    name: string;
    logo_url?: string;
  };
  created_at: string;
  updated_at: string;
  // Statistiques optionnelles
  statistics?: {
    totalApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    totalAmount: number;
    averageAmount: number;
  };
}

// Service API
class AdminApiService {
  private baseUrl = 'http://localhost:8000/api';

  async getCreditProduct(id: string): Promise<CreditProductDetail> {
    const response = await fetch(`${this.baseUrl}/admin/credit-products/${id}`);
    if (!response.ok) {
      throw new Error('Produit non trouvé');
    }
    return response.json();
  }

  async updateCreditProductStatus(id: string, isActive: boolean): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/credit-products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: isActive })
    });
    if (!response.ok) {
      throw new Error('Erreur lors de la mise à jour du statut');
    }
  }
}

// Service de notification
class NotificationService {
  showSuccess(message: string): void {
    console.log('SUCCESS:', message);
    alert(message);
  }

  showError(message: string): void {
    console.error('ERROR:', message);
    alert(message);
  }
}

@Component({
  selector: 'app-credit-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <a routerLink="/admin/credit-products" class="hover:text-blue-600">Produits de Crédit</a>
            <span>/</span>
            <span>{{product?.name}}</span>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">{{product?.name}}</h1>
                <div class="flex items-center gap-4 mt-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="{
                          'bg-blue-100 text-blue-800': product?.type === 'immobilier',
                          'bg-green-100 text-green-800': product?.type === 'auto',
                          'bg-purple-100 text-purple-800': product?.type === 'consommation',
                          'bg-orange-100 text-orange-800': product?.type === 'professionnel',
                          'bg-yellow-100 text-yellow-800': product?.type === 'equipement',
                          'bg-red-100 text-red-800': product?.type === 'travaux'
                        }">
                    {{getTypeLabel(product?.type)}}
                  </span>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="{
                          'bg-green-100 text-green-800': product?.is_active,
                          'bg-red-100 text-red-800': !product?.is_active
                        }">
                    {{product?.is_active ? 'Actif' : 'Inactif'}}
                  </span>
                  <span *ngIf="product?.is_featured" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⭐ Produit vedette
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button 
                [routerLink]="['../edit', product?.id]"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Modifier
              </button>
              <button 
                (click)="toggleStatus()"
                [class]="product?.is_active ? 'bg-red-100 hover:bg-red-200 text-red-800' : 'bg-green-100 hover:bg-green-200 text-green-800'"
                class="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        [attr.d]="product?.is_active ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'">
                  </path>
                </svg>
                {{product?.is_active ? 'Désactiver' : 'Activer'}}
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Contenu principal -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Informations générales -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt class="text-sm font-medium text-gray-500">ID Produit</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{product?.id}}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Banque</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{product?.bank?.name}}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Type</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{getTypeLabel(product?.type)}}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Temps de traitement</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{getProcessingTimeText(product?.processing_time_hours)}}</dd>
                </div>
                <div class="md:col-span-2" *ngIf="product?.description">
                  <dt class="text-sm font-medium text-gray-500">Description</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{product?.description}}</dd>
                </div>
              </div>
            </div>

            <!-- Conditions financières -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Conditions financières</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-blue-50 p-4 rounded-lg">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium text-blue-900">Montant</p>
                      <p class="text-2xl font-bold text-blue-600">
                        {{formatCurrency(product?.min_amount)}} - {{formatCurrency(product?.max_amount)}}
                      </p>
                    </div>
                    <svg class="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                  </div>
                </div>
                
                <div class="bg-green-50 p-4 rounded-lg">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium text-green-900">Taux d'intérêt</p>
                      <p class="text-2xl font-bold text-green-600">{{formatPercent(product?.average_rate)}}</p>
                      <p *ngIf="product?.min_rate && product?.max_rate" class="text-xs text-green-700">
                        Fourchette: {{formatPercent(product?.min_rate)}} - {{formatPercent(product?.max_rate)}}
                      </p>
                    </div>
                    <svg class="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                </div>

                <div class="bg-purple-50 p-4 rounded-lg">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium text-purple-900">Durée</p>
                      <p class="text-2xl font-bold text-purple-600">
                        {{product?.min_duration_months}} - {{product?.max_duration_months}} mois
                      </p>
                    </div>
                    <svg class="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>

                <div class="bg-orange-50 p-4 rounded-lg">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium text-orange-900">Traitement</p>
                      <p class="text-2xl font-bold text-orange-600">{{getProcessingTimeText(product?.processing_time_hours)}}</p>
                    </div>
                    <svg class="h-8 w-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Avantages et fonctionnalités -->
            <div class="bg-white rounded-lg shadow-sm border p-6" *ngIf="hasAdvantagesOrFeatures()">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Avantages et fonctionnalités</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div *ngIf="getAdvantages().length > 0">
                  <h3 class="text-md font-medium text-gray-900 mb-3">Avantages</h3>
                  <ul class="space-y-2">
                    <li *ngFor="let advantage of getAdvantages()" class="flex items-start">
                      <svg class="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      <span class="text-sm text-gray-700">{{advantage}}</span>
                    </li>
                  </ul>
                </div>

                <div *ngIf="getFeatures().length > 0">
                  <h3 class="text-md font-medium text-gray-900 mb-3">Fonctionnalités</h3>
                  <ul class="space-y-2">
                    <li *ngFor="let feature of getFeatures()" class="flex items-start">
                      <svg class="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      <span class="text-sm text-gray-700">{{feature}}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div *ngIf="getSpecialConditions()" class="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h4 class="text-sm font-medium text-yellow-900 mb-2">Conditions spéciales</h4>
                <p class="text-sm text-yellow-800">{{getSpecialConditions()}}</p>
              </div>
            </div>

            <!-- Historique des modifications -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Historique</h2>
              <div class="space-y-3">
                <div class="flex items-start gap-3">
                  <div class="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p class="text-sm text-gray-900">Produit créé</p>
                    <p class="text-xs text-gray-500">{{formatDate(product?.created_at)}}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div>
                    <p class="text-sm text-gray-900">Dernière modification</p>
                    <p class="text-xs text-gray-500">{{formatDate(product?.updated_at)}}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Statistiques -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Statistiques</h2>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Demandes totales</span>
                  <span class="text-sm font-medium text-gray-900">{{product?.statistics?.totalApplications || 0}}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Demandes approuvées</span>
                  <span class="text-sm font-medium text-green-600">{{product?.statistics?.approvedApplications || 0}}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Demandes rejetées</span>
                  <span class="text-sm font-medium text-red-600">{{product?.statistics?.rejectedApplications || 0}}</span>
                </div>
                <hr class="my-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Montant total</span>
                  <span class="text-sm font-medium text-gray-900">
                    {{formatCurrency(product?.statistics?.totalAmount || 0)}}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Montant moyen</span>
                  <span class="text-sm font-medium text-gray-900">
                    {{formatCurrency(product?.statistics?.averageAmount || 0)}}
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions rapides -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
              <div class="space-y-3">
                <button class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center gap-2 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  Voir les demandes
                </button>
                <button class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center gap-2 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                  </svg>
                  Créer simulation
                </button>
                <button class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center gap-2 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Exporter données
                </button>
                <button class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center gap-2 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                  Dupliquer produit
                </button>
              </div>
            </div>

            <!-- Alertes -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Alertes</h2>
              <div class="space-y-3">
                <div *ngIf="!product?.is_active" class="bg-red-50 border border-red-200 rounded-md p-3">
                  <div class="flex">
                    <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-red-800">Produit inactif</h3>
                      <p class="text-sm text-red-700 mt-1">Ce produit n'accepte plus de nouvelles demandes.</p>
                    </div>
                  </div>
                </div>
                
                <div *ngIf="(product?.statistics?.rejectedApplications || 0) > (product?.statistics?.approvedApplications || 0)" 
                     class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div class="flex">
                    <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-yellow-800">Taux de rejet élevé</h3>
                      <p class="text-sm text-yellow-700 mt-1">Le taux de rejet dépasse les approbations.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CreditProductDetailComponent implements OnInit {
  product: CreditProductDetail | null = null;
  productId: string | null = null;

  // Services
  private adminApi = new AdminApiService();
  private notificationService = new NotificationService();

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.loadProduct(this.productId);
    }
  }

  async loadProduct(id: string): Promise<void> {
    try {
      this.product = await this.adminApi.getCreditProduct(id);
    } catch (error) {
      console.error('Erreur chargement produit:', error);
      this.notificationService.showError('Impossible de charger le produit');
      this.router.navigate(['/admin/credit-products']);
    }
  }

  getTypeLabel(type: string | undefined): string {
    if (!type) return '';
    const labels: { [key: string]: string } = {
      'immobilier': 'Crédit Immobilier',
      'consommation': 'Crédit Consommation',
      'auto': 'Crédit Auto',
      'professionnel': 'Crédit Professionnel',
      'equipement': 'Crédit Équipement',
      'travaux': 'Crédit Travaux'
    };
    return labels[type] || type;
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPercent(rate: number | undefined): string {
    if (rate === undefined || rate === null) return '0%';
    return `${rate.toFixed(1)}%`;
  }

  getProcessingTimeText(hours: number | undefined): string {
    if (!hours) return 'Non spécifié';
    if (hours <= 24) return `${hours}h`;
    const days = Math.ceil(hours / 24);
    return `${days} jour${days > 1 ? 's' : ''}`;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  async toggleStatus(): Promise<void> {
    if (!this.product) return;

    const action = this.product.is_active ? 'désactiver' : 'activer';
    if (confirm(`Êtes-vous sûr de vouloir ${action} ce produit ?`)) {
      try {
        const newStatus = !this.product.is_active;
        await this.adminApi.updateCreditProductStatus(this.product.id, newStatus);
        
        this.product.is_active = newStatus;
        this.product.updated_at = new Date().toISOString();
        
        this.notificationService.showSuccess(`Produit ${newStatus ? 'activé' : 'désactivé'} avec succès`);
      } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        this.notificationService.showError('Erreur lors de la mise à jour du statut');
      }
    }
  }

  // Méthodes utilitaires pour éviter les erreurs TypeScript
  hasAdvantagesOrFeatures(): boolean {
    return this.getAdvantages().length > 0 || this.getFeatures().length > 0;
  }

  getAdvantages(): string[] {
    return this.product?.advantages || [];
  }

  getFeatures(): string[] {
    return this.product?.features || [];
  }

  getSpecialConditions(): string | null {
    if (!this.product?.special_conditions || this.product.special_conditions.trim().length === 0) {
      return null;
    }
    return this.product.special_conditions;
  }
}