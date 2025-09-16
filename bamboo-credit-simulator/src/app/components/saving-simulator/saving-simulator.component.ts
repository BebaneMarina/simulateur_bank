import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ApiService, SavingsProduct, SavingsSimulationRequest, SavingsSimulationResponse } from '../../services/api.service';

// Interfaces locales pour les résultats
interface SavingsResult {
  simulation_id?: string;
  finalAmount: number;
  totalContributions: number;
  totalInterest: number;
  monthlyBreakdown: MonthlyBreakdown[];
  yearlyBreakdown: YearlyBreakdown[];
  projections: SavingsProjection[];
  bankComparison: BankSavingsOffer[];
  recommendations: string[];
  riskProfile: 'conservateur' | 'modéré' | 'dynamique';
  diversificationSuggestions: InvestmentSuggestion[];
}

interface MonthlyBreakdown {
  month: number;
  contribution: number;
  interest: number;
  cumulativeAmount: number;
  interestRate?: number;
}

interface YearlyBreakdown {
  year: number;
  startAmount: number;
  contributions: number;
  interest: number;
  endAmount: number;
  yieldRate: number;
}

interface SavingsProjection {
  duration: number;
  finalAmount: number;
  totalInterest: number;
  averageYield: number;
}

interface BankSavingsOffer {
  bankId: string;
  bankName: string;
  productName: string;
  interestRate: number;
  minimumDeposit: number;
  maximumDeposit?: number;
  terms: string[];
  features: string[];
  fees: ProductFees;
  liquidity: 'immediate' | 'notice' | 'term';
  riskLevel: number;
  projectedReturn: number;
}

interface ProductFees {
  openingFees: number;
  managementFees: number;
  withdrawalFees: number;
  penaltyFees?: number;
}

interface InvestmentSuggestion {
  type: 'épargne' | 'placement' | 'assurance-vie' | 'immobilier';
  title: string;
  description: string;
  allocation: number;
  expectedReturn: number;
  riskLevel: number;
  minAmount: number;
}

interface SavingsGoalOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  suggestedHorizon: number;
  suggestedAmount: number;
}

@Component({
  selector: 'savings-simulator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
<div class="savings-simulator-container">
  <!-- Hero Section -->
  <div class="hero-section">
    <div class="container">
      <div class="hero-content">
        <h1>Simulateur d'Épargne</h1>
        <p class="hero-subtitle">
          Découvrez le potentiel de votre épargne et trouvez les meilleurs produits pour atteindre vos objectifs
        </p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">{{ filteredProducts.length }}+</span>
            <span class="stat-label">Produits d'épargne</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ getUniqueBanksCount() }}</span>
            <span class="stat-label">Banques partenaires</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ getMaxInterestRate() }}%</span>
            <span class="stat-label">Taux jusqu'à </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 1: Savings Goal Selection -->
<div class="step-section" [class.completed]="currentStep > 1">
  <div class="container">
    <div class="step-header">
      <div class="step-number">1</div>
      <div class="step-content">
        <h2>Définissez votre objectif d'épargne</h2>
        <p>Choisissez le type d'objectif qui correspond à vos projets</p>
      </div>
    </div>

    <div class="savings-goals-grid" *ngIf="currentStep === 1">
      <div 
        *ngFor="let goal of savingsGoals"
        (click)="selectSavingsGoal(goal)"
        [class.selected]="selectedGoal === goal.id"
        [attr.data-goal]="goal.id"
        class="savings-goal-card">
        <div class="goal-icon">{{ goal.icon }}</div>
        <h3>{{ goal.name }}</h3>
        <p>{{ goal.description }}</p>
        <div class="goal-suggestions">
          <span class="suggestion-item">{{ goal.suggestedHorizon }} ans</span>
          <span class="suggestion-item">{{ formatCurrency(goal.suggestedAmount) }}</span>
        </div>
      </div>
    </div>

    <div *ngIf="currentStep > 1 && selectedGoal" class="step-summary">
      <div class="summary-item">
        <strong>Objectif sélectionné:</strong> {{ getSavingsGoalLabel(selectedGoal) }}
        <button (click)="changeStep(1)" class="btn-change">Modifier</button>
      </div>
    </div>
  </div>
</div>

  <!-- Step 2: Product Selection -->
  <div class="step-section" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
    <div class="container">
      <div class="step-header">
        <div class="step-number">2</div>
        <div class="step-content">
          <h2>Choisissez un produit d'épargne</h2>
          <p>Découvrez les {{ filteredProducts.length }} produits d'épargne disponibles</p>
        </div>
      </div>

      <div *ngIf="currentStep === 2" class="products-section">
        <!-- Filtres -->
        <div class="filters-bar">
          <select (change)="filterProducts($event)" class="filter-select">
            <option value="">Tous les types</option>
            <option value="livret">Livret d'Épargne</option>
            <option value="terme">Dépôt à Terme</option>
            <option value="plan_epargne">Plan d'Épargne</option>
          </select>
          
          <select (change)="sortProducts($event)" class="filter-select">
            <option value="rate">Trier par taux</option>
            <option value="bank">Trier par banque</option>
            <option value="deposit">Trier par dépôt minimum</option>
          </select>
        </div>

        <div *ngIf="isLoadingProducts" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des produits d'épargne...</p>
        </div>

        <div *ngIf="!isLoadingProducts && filteredProducts.length > 0" class="products-grid">
          <div *ngFor="let product of filteredProducts" 
               class="product-card"
               [class.selected]="selectedProduct?.id === product.id"
               [class.featured]="product.is_featured"
               (click)="selectProduct(product)">
            
            <div class="product-header">
              <div class="bank-info">
                <img [src]="product.bank?.logo_url || '/assets/banks/default-bank.png'" 
                     [alt]="product.bank?.name || 'Banque'" 
                     class="bank-logo"
                     (error)="onImageError($event)" />
                <div class="bank-details">
                  <h4>{{ product.name }}</h4>
                  <p class="bank-name">{{ product.bank?.name || 'Banque inconnue' }}</p>
                </div>
              </div>
              
              <div class="product-badges">
                <span *ngIf="product.is_featured" class="badge featured">Recommandé</span>
                <span class="badge type">{{ getProductTypeLabel(product.type) }}</span>
              </div>
            </div>

            <p class="product-description">{{ product.description || 'Produit d\'épargne avantageux' }}</p>

            <div class="product-highlights">
              <div class="highlight-main">
                <span class="label">Taux d'intérêt</span>
                <span class="value interest-rate">{{ formatPercent(product.interest_rate) }}</span>
              </div>
              
              <div class="highlight-grid">
                <div class="highlight-item">
                  <span class="label">Dépôt min.</span>
                  <span class="value">{{ formatCurrency(product.minimum_deposit) }}</span>
                </div>
                <div class="highlight-item" *ngIf="product.maximum_deposit">
                  <span class="label">Dépôt max.</span>
                  <span class="value">{{ formatCurrency(product.maximum_deposit) }}</span>
                </div>
                <div class="highlight-item">
                  <span class="label">Liquidité</span>
                  <span class="value">{{ getLiquidityLabel(product.liquidity) }}</span>
                </div>
                <div class="highlight-item">
                  <span class="label">Risque</span>
                  <span class="value risk-{{ product.risk_level }}">{{ getRiskLevelLabel(product.risk_level) }}</span>
                </div>
              </div>
            </div>

            <div class="product-features" *ngIf="product.features && product.features.length > 0">
              <h5>Avantages</h5>
              <ul>
                <li *ngFor="let feature of product.features.slice(0, 3)">{{ feature }}</li>
              </ul>
              <p *ngIf="product.features.length > 3" class="more-features">
                +{{ product.features.length - 3 }} autres avantages
              </p>
            </div>

            <div class="product-footer">
              <div class="fees-info" *ngIf="product.fees">
                <span class="fees-label">
                  Frais: {{ product.fees.opening ? formatCurrency(product.fees.opening) : 'Gratuit' }}
                </span>
              </div>
              
              <button class="btn-select"
                      [class.selected]="selectedProduct?.id === product.id">
                {{ selectedProduct?.id === product.id ? 'Produit sélectionné' : 'Choisir ce produit' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Error state -->
        <div *ngIf="loadingError" class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Erreur de chargement</h3>
          <p>{{ loadingError }}</p>
          <button (click)="loadSavingsProducts()" class="btn-retry">Réessayer</button>
        </div>

        <!-- Empty state -->
        <div *ngIf="!isLoadingProducts && !loadingError && filteredProducts.length === 0" class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>Aucun produit disponible</h3>
          <p>Aucun produit d'épargne trouvé avec ces critères.</p>
          <button (click)="clearFilters()" class="btn-secondary">Voir tous les produits</button>
        </div>
      </div>

      <div *ngIf="currentStep > 2 && selectedProduct" class="step-summary">
        <div class="summary-item">
          <strong>Produit sélectionné:</strong> {{ selectedProduct.name }} ({{ selectedProduct.bank?.name }})
          <span class="summary-rate">{{ formatPercent(selectedProduct.interest_rate) }}</span>
          <button (click)="changeStep(2)" class="btn-change">Modifier</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 3: Simulation Parameters -->
  <div class="step-section" [class.active]="currentStep === 3" [class.completed]="currentStep > 3">
    <div class="container">
      <div class="step-header">
        <div class="step-number">3</div>
        <div class="step-content">
          <h2>Configurez votre simulation</h2>
          <p>Renseignez vos paramètres d'épargne pour calculer votre projection</p>
        </div>
      </div>

      <div *ngIf="currentStep === 3" class="simulation-form-container">
        <form [formGroup]="savingsForm" class="savings-form">
          <div class="form-sections">
            <!-- Paramètres de simulation -->
            <div class="form-section">
              <h3>Paramètres de votre épargne</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label for="initialAmount">Montant à épargner (FCFA)</label>
                  <input 
                    type="number" 
                    formControlName="initialAmount" 
                    id="initialAmount"
                    class="form-input"
                    [min]="selectedProduct?.minimum_deposit || 0"
                    [max]="selectedProduct?.maximum_deposit || 999999999"
                    placeholder="1 000 000"
                  />
                  <div class="form-hint" *ngIf="selectedProduct">
                    Minimum: {{ formatCurrency(selectedProduct.minimum_deposit) }}
                    <span *ngIf="selectedProduct.maximum_deposit">
                      - Maximum: {{ formatCurrency(selectedProduct.maximum_deposit) }}
                    </span>
                  </div>
                  <div class="validation-error" *ngIf="savingsForm.get('initialAmount')?.invalid && savingsForm.get('initialAmount')?.touched">
                    <span *ngIf="savingsForm.get('initialAmount')?.errors?.['min']">
                      Le montant minimum est {{ formatCurrency(selectedProduct?.minimum_deposit || 0) }}
                    </span>
                    <span *ngIf="savingsForm.get('initialAmount')?.errors?.['max']">
                      Le montant maximum est {{ formatCurrency(selectedProduct?.maximum_deposit || 0) }}
                    </span>
                    <span *ngIf="savingsForm.get('initialAmount')?.errors?.['required']">
                      Le montant est requis
                    </span>
                  </div>
                </div>

                <div class="form-group">
                  <label for="timeHorizon">Durée d'épargne (années)</label>
                  <select 
                    formControlName="timeHorizon" 
                    id="timeHorizon"
                    class="form-input">
                    <option value="1">1 an</option>
                    <option value="2">2 ans</option>
                    <option value="3">3 ans</option>
                    <option value="4">4 ans</option>
                    <option value="5">5 ans</option>
                    <option value="10">10 ans</option>
                  </select>
                  <div class="form-hint">
                    Choisissez la durée pendant laquelle vous souhaitez épargner
                  </div>
                </div>
              </div>

              <!-- Aperçu du calcul -->
              <div class="calculation-preview" *ngIf="savingsForm.get('initialAmount')?.value && savingsForm.get('timeHorizon')?.value && selectedProduct">
                <h4>Aperçu de votre épargne</h4>
                <div class="preview-grid">
                  <div class="preview-item">
                    <span class="label">Montant placé</span>
                    <span class="value">{{ formatCurrency(savingsForm.get('initialAmount')?.value) }}</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">Taux d'intérêt</span>
                    <span class="value">{{ formatPercent(selectedProduct.interest_rate) }}</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">Durée</span>
                    <span class="value">{{ savingsForm.get('timeHorizon')?.value }} an(s)</span>
                  </div>
                  <div class="preview-item highlight">
                    <span class="label">Intérêts estimés</span>
                    <span class="value">{{ formatCurrency(calculatePreviewInterest()) }}</span>
                  </div>
                  <div class="preview-item highlight-main">
                    <span class="label">Capital final estimé</span>
                    <span class="value">{{ formatCurrency(savingsForm.get('initialAmount')?.value + calculatePreviewInterest()) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div *ngIf="currentStep > 3" class="step-summary">
        <div class="summary-item">
          <strong>Simulation:</strong> 
          {{ formatCurrency(savingsForm.get('initialAmount')?.value) }} sur 
          {{ savingsForm.get('timeHorizon')?.value }} an(s)
          <button (click)="changeStep(3)" class="btn-change">Modifier</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 4: Results -->
  <div class="step-section" [class.active]="currentStep === 4">
    <div class="container">
      <div class="step-header">
        <div class="step-number">4</div>
        <div class="step-content">
          <h2>Vos résultats de simulation</h2>
          <p>Découvrez le potentiel de votre épargne</p>
        </div>
      </div>

      <div *ngIf="currentStep === 4">
        <div *ngIf="isCalculating" class="loading-state">
          <div class="spinner"></div>
          <p>Calcul de votre simulation en cours...</p>
        </div>

        <div *ngIf="!isCalculating && results" class="results-container">
          <!-- Product Summary Card -->
          <div class="selected-product-summary">
            <div class="product-info">
              <img [src]="selectedProduct?.bank?.logo_url || '/assets/banks/default-bank.png'" 
                   [alt]="selectedProduct?.bank?.name || 'Banque'" 
                   class="bank-logo-small"
                   (error)="onImageError($event)" />
              <div class="product-details">
                <h4>{{ selectedProduct?.name }}</h4>
                <p class="bank-name">{{ selectedProduct?.bank?.name }}</p>
                <span class="product-rate">{{ formatPercent(selectedProduct?.interest_rate || 0) }}</span>
              </div>
            </div>
            <div class="simulation-params">
              <div class="param-item">
                <span class="param-label">Montant placé:</span>
                <span class="param-value">{{ formatCurrency(savingsForm.get('initialAmount')?.value) }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">Durée:</span>
                <span class="param-value">{{ savingsForm.get('timeHorizon')?.value }} an(s)</span>
              </div>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="summary-cards">
            <div class="summary-card primary">
              <div class="card-header">
                <h3>Capital final</h3>
                <div class="card-icon">💰</div>
              </div>
              <div class="amount primary">{{ formatCurrency(results.finalAmount) }}</div>
              <div class="subtitle">
                Capital initial + intérêts générés
              </div>
              <div class="growth-indicator positive">
                <span class="growth-icon">📈</span>
                <span>+{{ formatPercent(getTotalYield()) }} de croissance</span>
              </div>
            </div>

            <div class="summary-card success">
              <div class="card-header">
                <h3>Intérêts gagnés</h3>
                <div class="card-icon">🎯</div>
              </div>
              <div class="amount success">{{ formatCurrency(results.totalInterest) }}</div>
              <div class="subtitle">
                Gains sur {{ savingsForm.get('timeHorizon')?.value }} an(s)
              </div>
              <div class="annual-interest">
                <span>Soit {{ formatCurrency(results.totalInterest / (savingsForm.get('timeHorizon')?.value || 1)) }} par an</span>
              </div>
            </div>

            <div class="summary-card info">
              <div class="card-header">
                <h3>Rendement total</h3>
                <div class="card-icon">📊</div>
              </div>
              <div class="amount info">{{ formatPercent(getTotalYield()) }}</div>
              <div class="subtitle">
                Performance sur {{ savingsForm.get('timeHorizon')?.value }} an(s)
              </div>
              <div class="annual-yield">
                <span>Rendement annuel: {{ formatPercent(selectedProduct?.interest_rate || 0) }}</span>
              </div>
            </div>

            <div class="summary-card warning">
              <div class="card-header">
                <h3>Capital investi</h3>
                <div class="card-icon">💵</div>
              </div>
              <div class="amount">{{ formatCurrency(results.totalContributions) }}</div>
              <div class="subtitle">
                Montant initial placé
              </div>
              <div class="investment-ratio">
                <span>Ratio gain/investissement: {{ formatPercent((results.totalInterest / results.totalContributions) * 100) }}</span>
              </div>
            </div>
          </div>

          <!-- Visual Comparison Chart -->
          <div class="comparison-chart">
            <h3>Comparaison capital vs intérêts</h3>
            <div class="chart-container">
              <div class="chart-bar">
                <div class="bar-segment initial" 
                     [style.width.%]="(results.totalContributions / results.finalAmount) * 100">
                  <span class="segment-label">Capital initial</span>
                  <span class="segment-value">{{ formatCurrency(results.totalContributions) }}</span>
                </div>
                <div class="bar-segment interest" 
                     [style.width.%]="(results.totalInterest / results.finalAmount) * 100">
                  <span class="segment-label">Intérêts</span>
                  <span class="segment-value">{{ formatCurrency(results.totalInterest) }}</span>
                </div>
              </div>
              <div class="chart-labels">
                <div class="label-item initial">
                  <span class="color-dot"></span>
                  <span>Capital initial ({{ formatPercent((results.totalContributions / results.finalAmount) * 100) }})</span>
                </div>
                <div class="label-item interest">
                  <span class="color-dot"></span>
                  <span>Intérêts générés ({{ formatPercent((results.totalInterest / results.finalAmount) * 100) }})</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Détail par année -->
          <div class="yearly-breakdown-section">
            <h3>Évolution de votre épargne année par année</h3>
            <div class="breakdown-table">
              <div class="table-header">
                <div class="col">Année</div>
                <div class="col">Capital début</div>
                <div class="col">Intérêts année</div>
                <div class="col">Capital fin</div>
                <div class="col">Croissance</div>
              </div>
              <div *ngFor="let year of getYearlyBreakdown(); let i = index" class="table-row" [class.highlight]="i === getYearlyBreakdown().length - 1">
                <div class="col year">{{ year.year }}</div>
                <div class="col">{{ formatCurrency(year.startAmount) }}</div>
                <div class="col interest">+{{ formatCurrency(year.interest) }}</div>
                <div class="col total">{{ formatCurrency(year.endAmount) }}</div>
                <div class="col growth">
                  <span class="growth-badge positive">
                    +{{ formatPercent((year.interest / year.startAmount) * 100) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Scenarios Projection -->
          <div class="scenarios-section">
            <h3>Projections selon différentes durées</h3>
            <div class="scenarios-grid">
              <div class="scenario-card">
                <div class="scenario-header">
                  <h4>1 an</h4>
                  <span class="scenario-type short">Court terme</span>
                </div>
                <div class="scenario-amount">{{ formatCurrency(calculateScenarioAmount(1)) }}</div>
                <div class="scenario-details">
                  <div class="detail-item">
                    <span class="detail-label">Intérêts:</span>
                    <span class="detail-value">{{ formatCurrency(calculateScenarioInterest(1)) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Rendement:</span>
                    <span class="detail-value">{{ formatPercent(selectedProduct?.interest_rate || 0) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="scenario-card current" *ngIf="savingsForm.get('timeHorizon')?.value !== 1">
                <div class="scenario-header">
                  <h4>{{ savingsForm.get('timeHorizon')?.value }} an(s)</h4>
                  <span class="scenario-type current">Sélectionné</span>
                </div>
                <div class="scenario-amount">{{ formatCurrency(results.finalAmount) }}</div>
                <div class="scenario-details">
                  <div class="detail-item">
                    <span class="detail-label">Intérêts:</span>
                    <span class="detail-value">{{ formatCurrency(results.totalInterest) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Rendement:</span>
                    <span class="detail-value">{{ formatPercent(getTotalYield()) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="scenario-card">
                <div class="scenario-header">
                  <h4>10 ans</h4>
                  <span class="scenario-type long">Long terme</span>
                </div>
                <div class="scenario-amount">{{ formatCurrency(calculateScenarioAmount(10)) }}</div>
                <div class="scenario-details">
                  <div class="detail-item">
                    <span class="detail-label">Intérêts:</span>
                    <span class="detail-value">{{ formatCurrency(calculateScenarioInterest(10)) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Rendement:</span>
                    <span class="detail-value">{{ formatPercent(((calculateScenarioInterest(10) / savingsForm.get('initialAmount')?.value) * 100) || 0) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recommandations -->
          <div class="recommendations-section" *ngIf="results.recommendations && results.recommendations.length > 0">
            <h3>Nos recommandations pour optimiser votre épargne</h3>
            <div class="recommendations-grid">
              <div *ngFor="let recommendation of results.recommendations; let i = index" class="recommendation-card">
                <div class="recommendation-icon">
                  <span *ngIf="i === 0">💡</span>
                  <span *ngIf="i === 1">📈</span>
                  <span *ngIf="i === 2">🔒</span>
                  <span *ngIf="i === 3">🎯</span>
                  <span *ngIf="i >= 4">✨</span>
                </div>
                <div class="recommendation-content">
                  <p>{{ recommendation }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Product Features Highlight -->
          <div class="product-features-highlight" 
            *ngIf="selectedProduct && selectedProduct.features && selectedProduct.features.length > 0">
            <h3>Avantages de votre produit sélectionné</h3>
            <div class="features-grid">
              <div *ngFor="let feature of selectedProduct?.features" class="feature-item">
                <div class="feature-icon">✅</div>
                <span class="feature-text">{{ feature }}</span>
              </div>
            </div>
          </div>

          <!-- Action Cards -->
          <div class="action-cards">
            <div class="action-card primary">
              <h4>Souscrire à ce produit</h4>
              <p>Commencez votre épargne dès maintenant avec {{ selectedProduct?.bank?.name }}</p>
              <button (click)="goToProducts()" class="btn-action primary">
                Voir les conditions
              </button>
            </div>
            
            <div class="action-card secondary">
              <h4>Comparer d'autres produits</h4>
              <p>Explorez d'autres options d'épargne disponibles</p>
              <button (click)="changeStep(2)" class="btn-action secondary">
                Voir tous les produits
              </button>
            </div>
          </div>

          <!-- Risk Warning -->
          <div class="risk-warning" *ngIf="selectedProduct && selectedProduct.risk_level > 2">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <h4>Information importante</h4>
              <p>Ce produit présente un niveau de risque {{ getRiskLevelLabel(selectedProduct.risk_level).toLowerCase() }}. 
                 Les performances passées ne préjugent pas des performances futures. 
                 Il est recommandé de diversifier vos placements.</p>
            </div>
          </div>
        </div>

        <div *ngIf="!isCalculating && !results && currentStep === 4" class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Aucun résultat disponible</h3>
          <p>Veuillez configurer votre simulation pour voir les résultats.</p>
          <button (click)="changeStep(3)" class="btn-primary">Configurer la simulation</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="action-section" *ngIf="currentStep > 1">
    <div class="container">
      <div class="action-buttons">
        <button *ngIf="currentStep > 1 && currentStep < 4" 
                (click)="previousStep()" 
                class="btn-secondary">
          Étape précédente
        </button>
        
        <button *ngIf="currentStep === 2 && selectedProduct"
                (click)="nextStep()" 
                class="btn-primary">
          Continuer avec ce produit
        </button>
        
        <button *ngIf="currentStep === 3 && savingsForm.valid" 
                (click)="calculateSavings()" 
                [disabled]="isCalculating"
                class="btn-primary">
          {{ isCalculating ? 'Calcul en cours...' : 'Calculer ma simulation' }}
        </button>

        <!-- Bouton de debug temporaire -->
        <button *ngIf="currentStep === 3" 
                (click)="debugSimulation()" 
                class="btn-outline">
          Debug Simulation
        </button>

        <button *ngIf="currentStep === 4 && results" 
                (click)="goToProducts()" 
                class="btn-primary">
          Voir les produits
        </button>
        
        <button *ngIf="currentStep === 4 && results" 
                (click)="saveSimulation()" 
                class="btn-secondary">
          Sauvegarder
        </button>

        <button *ngIf="currentStep === 4 && results" 
                (click)="exportResults()" 
                class="btn-outline">
          Exporter PDF
        </button>
      </div>
    </div>
  </div>

  <!-- Progress Indicator -->
  <div class="progress-indicator">
    <div class="container">
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="getProgressPercentage()"></div>
      </div>
      <div class="progress-steps">
        <div class="progress-step" 
             [class.active]="currentStep >= 1"
             [class.completed]="currentStep > 1">
          <span class="step-number">1</span>
          <span class="step-label">Objectif</span>
        </div>
        <div class="progress-step" 
             [class.active]="currentStep >= 2"
             [class.completed]="currentStep > 2">
          <span class="step-number">2</span>
          <span class="step-label">Produit</span>
        </div>
        <div class="progress-step" 
             [class.active]="currentStep >= 3"
             [class.completed]="currentStep > 3">
          <span class="step-number">3</span>
          <span class="step-label">Paramètres</span>
        </div>
        <div class="progress-step" 
             [class.active]="currentStep >= 4">
          <span class="step-number">4</span>
          <span class="step-label">Résultats</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading Overlay -->
  <div *ngIf="isLoadingProducts || isCalculating" class="loading-overlay">
    <div class="loading-content">
      <div class="spinner"></div>
      <p>{{ isLoadingProducts ? 'Chargement des produits...' : 'Calcul de votre simulation...' }}</p>
    </div>
  </div>
</div>
  `,
  styleUrls: ['./saving-simulator.component.scss']
})
export class SavingsSimulatorComponent implements OnInit, OnDestroy {
  savingsForm!: FormGroup;
  results: SavingsResult | null = null;
  isCalculating = false;
  isLoadingProducts = false;
  loadingError: string | null = null;
  currentStep = 1;

  // Propriétés pour le backend
  savingsProducts: SavingsProduct[] = [];
  filteredProducts: SavingsProduct[] = [];
  selectedProduct: SavingsProduct | null = null;
  selectedGoal: string | null = null;
  sessionId!: string;

  // Produits de démonstration pour éviter l'erreur
  mockProducts: SavingsProduct[] = [
    {
      id: 'bgd-livret-1',
      name: 'Livret Épargne Plus',
      type: 'livret',
      description: 'Un livret d\'épargne rémunéré avec une grande flexibilité',
      interest_rate: 4.5,
      minimum_deposit: 100000,
      maximum_deposit: 50000000,
      liquidity: 'immediate',
      risk_level: 1,
      is_featured: true,
      features: [
        'Disponibilité immédiate des fonds',
        'Pas de frais de gestion',
        'Taux préférentiel la première année'
      ],
      fees: {
        opening: 0,
        management: 0,
        withdrawal: 0
      },
      bank: {
        id: 'bgd',
        name: 'BGD',
        full_name: 'Banque Gabonaise de Développement',
        logo_url: '/assets/banks/bgd-logo.png',
        rating: '4.2',
        website: 'https://bgd.ga',
        is_active: false
      },
      bank_id: '',
      is_active: false
    },
    {
      id: 'ogar-terme-1',
      name: 'Dépôt à Terme Croissance',
      type: 'terme',
      description: 'Un placement sécurisé avec un rendement garanti',
      interest_rate: 6.0,
      minimum_deposit: 500000,
      maximum_deposit: 100000000,
      liquidity: 'term',
      risk_level: 2,
      is_featured: false,
      features: [
        'Taux garanti sur toute la durée',
        'Capitalisation des intérêts',
        'Renouvelable automatiquement'
      ],
      fees: {
        opening: 5000,
        management: 0,
        withdrawal: 25000
      },
      bank: {
        id: 'ogar',
        name: 'OGAR',
        full_name: 'OGAR Assurances',
        logo_url: '/assets/banks/ogar-logo.png',
        rating: '4.0',
        is_active: false
      },
      bank_id: '',
      is_active: false
    },
    {
      id: 'ecobank-plan-1',
      name: 'Plan Épargne Avenir',
      type: 'plan_epargne',
      description: 'Un plan d\'épargne pour vos projets d\'avenir',
      interest_rate: 5.2,
      minimum_deposit: 250000,
      maximum_deposit: 75000000,
      liquidity: 'notice',
      risk_level: 2,
      is_featured: true,
      features: [
        'Versements programmables',
        'Conseil personnalisé',
        'Assurance décès incluse'
      ],
      fees: {
        opening: 10000,
        management: 2000,
        withdrawal: 0
      },
      bank: {
        id: 'ecobank',
        name: 'Ecobank',
        full_name: 'Ecobank Gabon',
        logo_url: '/assets/banks/ecobank-logo.png',
        rating: '4.1',
        is_active: false
      },
      bank_id: '',
      is_active: false
    }
  ];

  savingsGoals: SavingsGoalOption[] = [
    {
      id: 'retirement',
      name: 'Retraite',
      description: 'Préparer votre retraite et assurer votre avenir financier',
      icon: '',
      suggestedHorizon: 25,
      suggestedAmount: 100000000
    },
    {
      id: 'house',
      name: 'Achat immobilier',
      description: 'Constituer un apport pour l\'achat de votre résidence',
      icon: '',
      suggestedHorizon: 7,
      suggestedAmount: 30000000
    },
    {
      id: 'education',
      name: 'Éducation enfants',
      description: 'Financer les études supérieures de vos enfants',
      icon: '',
      suggestedHorizon: 15,
      suggestedAmount: 20000000
    },
    {
      id: 'emergency',
      name: 'Fonds d\'urgence',
      description: 'Constituer une réserve de sécurité financière',
      icon: '',
      suggestedHorizon: 2,
      suggestedAmount: 5000000
    },
    {
      id: 'project',
      name: 'Projet personnel',
      description: 'Financer un projet qui vous tient à coeur',
      icon: '',
      suggestedHorizon: 5,
      suggestedAmount: 15000000
    },
    {
      id: 'general',
      name: 'Épargne générale',
      description: 'Faire fructifier votre argent sans objectif spécifique',
      icon: '',
      suggestedHorizon: 10,
      suggestedAmount: 25000000
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.sessionId = this.generateSessionId();
    this.initializeForm();
    this.loadSavingsProducts();
    this.trackPageView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.savingsForm = this.fb.group({
      initialAmount: [1000000, [Validators.required, Validators.min(0)]],
      timeHorizon: [3, [Validators.required, Validators.min(1), Validators.max(50)]]
    });

    // Écouter les changements pour recalculer l'aperçu
    this.savingsForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        // Reset results when form changes
        this.results = null;
      });
  }

  // Navigation Methods
  selectSavingsGoal(goal: SavingsGoalOption): void {
    this.selectedGoal = goal.id;
    
    // Mettre à jour le formulaire avec les suggestions
    this.savingsForm.patchValue({
      initialAmount: goal.suggestedAmount,
      timeHorizon: Math.min(goal.suggestedHorizon, 5) // Limiter à 5 ans pour le select
    });
    
    this.nextStep();
    this.analyticsService.trackEvent('savings_goal_selected', {
      goal_id: goal.id,
      goal_name: goal.name
    });
  }

  nextStep(): void {
    if (this.currentStep < 4) {
      this.currentStep++;
      this.scrollToTop();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
    }
  }

  changeStep(step: number): void {
    if (step >= 1 && step <= 4) {
      this.currentStep = step;
      this.scrollToTop();
    }
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Product Methods
  loadSavingsProducts(): void {
    this.isLoadingProducts = true;
    this.loadingError = null;

    // Essayer d'abord de charger depuis l'API
    this.apiService.getSavingsProducts()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.warn('API non disponible, utilisation des données de démonstration:', error);
          // Retourner les données mock en cas d'erreur API
          return of(this.mockProducts);
        })
      )
      .subscribe({
        next: (products) => {
          this.savingsProducts = products.length > 0 ? products : this.mockProducts;
          this.filteredProducts = [...this.savingsProducts];
          this.isLoadingProducts = false;
          
          if (products.length === 0) {
            console.log('Utilisation des produits de démonstration');
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des produits:', error);
          // Fallback vers les produits mock
          this.savingsProducts = this.mockProducts;
          this.filteredProducts = [...this.mockProducts];
          this.isLoadingProducts = false;
          this.notificationService.showError('Produits de démonstration chargés');
        }
      });
  }

  selectProduct(product: SavingsProduct): void {
    this.selectedProduct = product;
    
    // Mettre à jour les validateurs selon le produit
    const initialAmountControl = this.savingsForm.get('initialAmount');
    if (initialAmountControl) {
      const validators = [
        Validators.required,
        Validators.min(product.minimum_deposit)
      ];
      
      if (product.maximum_deposit) {
        validators.push(Validators.max(product.maximum_deposit));
      }
      
      initialAmountControl.setValidators(validators);
      initialAmountControl.updateValueAndValidity();
    }

    // Réinitialiser les résultats précédents
    this.results = null;
    this.notificationService.showSuccess(`Produit ${product.name} sélectionné`);
    
    this.analyticsService.trackEvent('savings_product_selected', {
      product_id: product.id,
      product_name: product.name,
      bank_name: product.bank?.name,
      interest_rate: product.interest_rate
    });
  }

  // Filtres et tri
  filterProducts(event: any): void {
    const type = event.target.value;
    if (type) {
      this.filteredProducts = this.savingsProducts.filter(p => p.type === type);
    } else {
      this.filteredProducts = [...this.savingsProducts];
    }
  }

  sortProducts(event: any): void {
    const sortBy = event.target.value;
    
    switch (sortBy) {
      case 'rate':
        this.filteredProducts.sort((a, b) => b.interest_rate - a.interest_rate);
        break;
      case 'bank':
        this.filteredProducts.sort((a, b) => (a.bank?.name || '').localeCompare(b.bank?.name || ''));
        break;
      case 'deposit':
        this.filteredProducts.sort((a, b) => a.minimum_deposit - b.minimum_deposit);
        break;
    }
  }

  clearFilters(): void {
    this.filteredProducts = [...this.savingsProducts];
  }

  // Calculation Methods
  calculateSavings(): void {
    console.log('=== DÉBUT CALCUL SIMULATION ===');
    console.log('isCalculating:', this.isCalculating);
    console.log('selectedProduct:', this.selectedProduct);
    console.log('savingsForm.valid:', this.savingsForm.valid);
    console.log('formData:', this.savingsForm.value);

    if (this.isCalculating) {
      console.log('Calcul déjà en cours, abandon');
      return;
    }

    if (!this.selectedProduct) {
      console.error('Aucun produit sélectionné');
      this.notificationService.showError('Veuillez sélectionner un produit d\'épargne');
      this.changeStep(2);
      return;
    }

    if (this.savingsForm.invalid) {
      console.error('Formulaire invalide:', this.getFormErrors());
      this.notificationService.showError('Veuillez corriger les erreurs dans le formulaire');
      this.changeStep(3);
      return;
    }

    const formData = this.savingsForm.value;
    console.log('Données du formulaire:', formData);
    
    // Validation des montants selon le produit sélectionné
    if (formData.initialAmount < this.selectedProduct.minimum_deposit) {
      this.notificationService.showError(
        `Dépôt minimum requis: ${this.formatCurrency(this.selectedProduct.minimum_deposit)}`
      );
      return;
    }

    if (this.selectedProduct.maximum_deposit && formData.initialAmount > this.selectedProduct.maximum_deposit) {
      this.notificationService.showError(
        `Dépôt maximum autorisé: ${this.formatCurrency(this.selectedProduct.maximum_deposit)}`
      );
      return;
    }

    console.log('Validation passée, début du calcul');
    this.isCalculating = true;

    // Calcul des intérêts composés
    const principal = Number(formData.initialAmount);
    const rate = this.selectedProduct.interest_rate / 100; // Convertir en décimal
    const years = Number(formData.timeHorizon);
    
    console.log('Paramètres de calcul:', { principal, rate, years });
    
    // Formule des intérêts composés : A = P(1 + r)^t
    const finalAmount = principal * Math.pow(1 + rate, years);
    const totalInterest = finalAmount - principal;

    console.log('Résultats calculés:', { finalAmount, totalInterest });

    // Créer les résultats immédiatement au lieu d'utiliser setTimeout
    this.results = {
      simulation_id: 'simulation_' + Date.now(),
      finalAmount: Math.round(finalAmount),
      totalContributions: principal,
      totalInterest: Math.round(totalInterest),
      monthlyBreakdown: this.generateMonthlyBreakdown(principal, rate, years),
      yearlyBreakdown: this.generateYearlyBreakdown(principal, rate, years),
      projections: this.generateProjections(principal, rate),
      bankComparison: [],
      recommendations: this.generateRecommendations(),
      riskProfile: this.determineRiskProfile(),
      diversificationSuggestions: []
    };

    console.log('Résultats créés:', this.results);

    // Utiliser setTimeout plus court pour simuler le chargement
    setTimeout(() => {
      this.trackCalculationCompleted();
      this.isCalculating = false;
      console.log('Calcul terminé, passage à l\'étape 4');
      this.nextStep(); // Passer automatiquement à l'étape 4
      this.notificationService.showSuccess('Simulation calculée avec succès');
    }, 800); // Réduit à 800ms
  }

  private generateMonthlyBreakdown(principal: number, annualRate: number, years: number): MonthlyBreakdown[] {
    const monthlyRate = annualRate / 12;
    const totalMonths = years * 12;
    const breakdown: MonthlyBreakdown[] = [];
    let currentAmount = principal;

    for (let month = 1; month <= totalMonths; month++) {
      const interest = currentAmount * monthlyRate;
      currentAmount += interest;
      
      breakdown.push({
        month,
        contribution: month === 1 ? principal : 0, // Seule contribution au début
        interest: Math.round(interest),
        cumulativeAmount: Math.round(currentAmount),
        interestRate: monthlyRate * 100
      });
    }

    return breakdown;
  }

  private generateYearlyBreakdown(principal: number, annualRate: number, years: number): YearlyBreakdown[] {
    const breakdown: YearlyBreakdown[] = [];
    let currentAmount = principal;

    for (let year = 1; year <= years; year++) {
      const startAmount = currentAmount;
      const interest = currentAmount * annualRate;
      const endAmount = currentAmount + interest;
      
      breakdown.push({
        year,
        startAmount: Math.round(startAmount),
        contributions: year === 1 ? principal : 0,
        interest: Math.round(interest),
        endAmount: Math.round(endAmount),
        yieldRate: annualRate * 100
      });
      
      currentAmount = endAmount;
    }

    return breakdown;
  }

  private generateProjections(principal: number, rate: number): SavingsProjection[] {
    const durations = [1, 3, 5, 10, 15, 20];
    return durations.map(duration => {
      const finalAmount = principal * Math.pow(1 + rate, duration);
      const totalInterest = finalAmount - principal;
      
      return {
        duration,
        finalAmount: Math.round(finalAmount),
        totalInterest: Math.round(totalInterest),
        averageYield: rate * 100
      };
    });
  }

  private generateRecommendations(): string[] {
    if (!this.selectedProduct || !this.savingsForm.value.timeHorizon) return [];

    const recommendations: string[] = [];
    const timeHorizon = this.savingsForm.value.timeHorizon;
    const riskLevel = this.selectedProduct.risk_level;

    if (timeHorizon <= 2) {
      recommendations.push("Pour un horizon court, privilégiez la sécurité et la liquidité");
    } else if (timeHorizon >= 4) {
      recommendations.push("Avec un horizon long, vous pouvez optimiser le rendement");
    }

    if (riskLevel <= 2) {
      recommendations.push("Produit sécurisé, idéal pour préserver votre capital");
    } else {
      recommendations.push("Surveillez régulièrement l'évolution de votre placement");
    }

    if (this.selectedProduct.liquidity === 'term') {
      recommendations.push("Assurez-vous de ne pas avoir besoin de ces fonds avant l'échéance");
    }

    recommendations.push("Diversifiez vos placements pour optimiser votre portefeuille");
    recommendations.push("Revoyez votre stratégie d'épargne annuellement");
    
    return recommendations;
  }

  private determineRiskProfile(): 'conservateur' | 'modéré' | 'dynamique' {
    if (!this.selectedProduct) return 'modéré';
    
    if (this.selectedProduct.risk_level <= 2) return 'conservateur';
    if (this.selectedProduct.risk_level <= 3) return 'modéré';
    return 'dynamique';
  }

  // Nouvelle méthode pour l'aperçu
  calculatePreviewInterest(): number {
    if (!this.selectedProduct || !this.savingsForm.get('initialAmount')?.value || !this.savingsForm.get('timeHorizon')?.value) {
      return 0;
    }

    const principal = this.savingsForm.get('initialAmount')?.value || 0;
    const rate = this.selectedProduct.interest_rate / 100;
    const years = this.savingsForm.get('timeHorizon')?.value || 0;
    
    const finalAmount = principal * Math.pow(1 + rate, years);
    return Math.round(finalAmount - principal);
  }

  // Nouvelle méthode pour le détail par année
  getYearlyBreakdown(): any[] {
    if (!this.results || !this.selectedProduct) return [];

    return this.results.yearlyBreakdown || [];
  }

  calculateScenarioAmount(years: number): number {
    if (!this.selectedProduct || !this.savingsForm.get('initialAmount')?.value) {
      return 0;
    }
    
    const principal = this.savingsForm.get('initialAmount')?.value || 0;
    const rate = this.selectedProduct.interest_rate / 100;
    
    return Math.round(principal * Math.pow(1 + rate, years));
  }

  calculateScenarioInterest(years: number): number {
    if (!this.selectedProduct || !this.savingsForm.get('initialAmount')?.value) {
      return 0;
    }
    
    const principal = this.savingsForm.get('initialAmount')?.value || 0;
    const finalAmount = this.calculateScenarioAmount(years);
    
    return finalAmount - principal;
  }

  // Helper Methods
  getProgressPercentage(): number {
    return (this.currentStep / 4) * 100;
  }

  getUniqueBanksCount(): number {
    const banks = new Set(this.filteredProducts.map(p => p.bank?.name).filter(Boolean));
    return banks.size;
  }

  getMaxInterestRate(): string {
    const maxRate = Math.max(...this.filteredProducts.map(p => p.interest_rate), 0);
    return maxRate.toFixed(1);
  }

  getSavingsGoalLabel(goalId: string): string {
    const goal = this.savingsGoals.find(g => g.id === goalId);
    return goal?.name || goalId;
  }

  formatCurrency(amount: number): string {
    if (!amount) return '0 FCFA';
    
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA';
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getProductTypeLabel(type: string): string {
    const labels: {[key: string]: string} = {
      'livret': 'Livret',
      'terme': 'Terme',
      'plan_epargne': 'Plan Épargne'
    };
    return labels[type] || type;
  }

  getLiquidityLabel(liquidity: string): string {
    const labels: {[key: string]: string} = {
      'immediate': 'Immédiate',
      'notice': 'Avec préavis',
      'term': 'À terme fixe'
    };
    return labels[liquidity] || liquidity;
  }

  getRiskLevelLabel(level: number): string {
    const labels = ['Très faible', 'Faible', 'Modéré', 'Élevé', 'Très élevé'];
    return labels[level - 1] || `Niveau ${level}`;
  }

  onImageError(event: any): void {
    event.target.src = '/assets/banks/default-bank.png';
  }

  // Calculation Helper Methods
  getTotalYield(): number {
    if (!this.results || this.results.totalContributions === 0) return 0;
    return (this.results.totalInterest / this.results.totalContributions) * 100;
  }

  // Action Methods
  saveSimulation(): void {
    if (!this.results) return;
    
    const simulationData = {
      id: Date.now().toString(),
      selectedProduct: this.selectedProduct,
      parameters: this.savingsForm.value,
      results: this.results,
      created_at: new Date()
    };
    
    try {
      localStorage.setItem(`bamboo_savings_${simulationData.id}`, JSON.stringify(simulationData));
      this.notificationService.showSuccess('Simulation sauvegardée');
      
      this.analyticsService.trackEvent('simulation_saved', {
        simulation_id: this.results.simulation_id,
        final_amount: this.results.finalAmount
      });
    } catch (error) {
      this.notificationService.showError('Erreur lors de la sauvegarde');
    }
  }

  goToProducts(): void {
    if (this.selectedProduct?.bank?.website) {
      window.open(this.selectedProduct.bank.website, '_blank');
      this.analyticsService.trackEvent('external_bank_visit', {
        bank_name: this.selectedProduct.bank.name,
        product_name: this.selectedProduct.name
      });
    } else {
      this.notificationService.showSuccess('Contactez votre conseiller bancaire');
    }
  }

  exportResults(): void {
    if (!this.results) return;
    
    // Simuler l'export PDF
    const exportData = {
      simulation: this.results,
      product: this.selectedProduct,
      parameters: this.savingsForm.value,
      generated_at: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation_epargne_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    this.notificationService.showSuccess('Simulation exportée avec succès');
    this.analyticsService.trackEvent('simulation_exported', {
      simulation_id: this.results.simulation_id
    });
  }

  shareResults(): void {
    if (!this.results) return;
    
    if (navigator.share) {
      navigator.share({
        title: 'Ma simulation d\'épargne Bamboo',
        text: `J'ai simulé mon épargne et je peux gagner ${this.formatCurrency(this.results.totalInterest)} !`,
        url: window.location.href
      });
    } else {
      // Fallback pour les navigateurs qui ne supportent pas Web Share API
      const text = `Ma simulation d'épargne Bamboo : ${this.formatCurrency(this.results.finalAmount)} après ${this.savingsForm.get('timeHorizon')?.value} ans !`;
      navigator.clipboard.writeText(text).then(() => {
        this.notificationService.showSuccess('Lien copié dans le presse-papier');
      });
    }
  }

  // Utility Methods
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private trackPageView(): void {
    this.analyticsService.trackPageView('savings_simulator', {
      page_title: 'Simulateur d\'Épargne',
      products_available: this.savingsProducts.length
    });
  }

  private trackCalculationCompleted(): void {
    if (!this.results || !this.selectedProduct) return;

    this.analyticsService.trackEvent('savings_calculation_completed', {
      simulation_id: this.results.simulation_id,
      product_id: this.selectedProduct.id,
      bank_name: this.selectedProduct.bank?.name,
      product_name: this.selectedProduct.name,
      final_amount: this.results.finalAmount,
      total_contributions: this.results.totalContributions,
      total_interest: this.results.totalInterest,
      time_horizon: this.savingsForm.get('timeHorizon')?.value,
      interest_rate: this.selectedProduct.interest_rate,
      initial_amount: this.savingsForm.get('initialAmount')?.value,
      risk_level: this.selectedProduct.risk_level,
      product_type: this.selectedProduct.type
    });
  }

  // Debug et utilitaires pour le développement
  debugSimulation(): void {
    console.log('=== DEBUG SIMULATEUR ÉPARGNE ===');
    console.log('Étape actuelle:', this.currentStep);
    console.log('Produits disponibles:', this.savingsProducts.length);
    console.log('Produits filtrés:', this.filteredProducts.length);
    console.log('Produit sélectionné:', this.selectedProduct);
    console.log('Objectif sélectionné:', this.selectedGoal);
    console.log('Formulaire valide:', this.savingsForm.valid);
    console.log('Valeurs formulaire:', this.savingsForm.value);
    console.log('Erreurs formulaire:', this.getFormErrors());
    console.log('En calcul:', this.isCalculating);
    console.log('Résultats disponibles:', !!this.results);
    console.log('Session ID:', this.sessionId);
    console.log('canProceedToNextStep:', this.canProceedToNextStep());
    
    // Test de calcul direct
    if (this.selectedProduct && this.savingsForm.valid) {
      console.log('Test de calcul direct...');
      const principal = this.savingsForm.get('initialAmount')?.value || 0;
      const rate = this.selectedProduct.interest_rate / 100;
      const years = this.savingsForm.get('timeHorizon')?.value || 0;
      const finalAmount = principal * Math.pow(1 + rate, years);
      console.log('Calcul test:', { principal, rate, years, finalAmount });
    }
    
    console.log('===============================');
    
    // Forcer le calcul si tout semble OK
    if (this.selectedProduct && this.savingsForm.valid && !this.isCalculating) {
      console.log('Forçage du calcul...');
      this.calculateSavings();
    }
  }

  debugComponent(): void {
    this.debugSimulation();
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.savingsForm.controls).forEach(key => {
      const control = this.savingsForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // Méthodes pour gérer les cas d'erreur
  resetSimulation(): void {
    this.currentStep = 1;
    this.selectedGoal = null;
    this.selectedProduct = null;
    this.results = null;
    this.savingsForm.reset({
      initialAmount: 1000000,
      timeHorizon: 3
    });
    this.notificationService.showSuccess('Simulation réinitialisée');
  }

  retryCalculation(): void {
    if (this.selectedProduct && this.savingsForm.valid) {
      this.calculateSavings();
    } else {
      this.notificationService.showError('Veuillez vérifier vos paramètres de simulation');
    }
  }

  // Méthodes pour l'accessibilité et UX
  announceStepChange(step: number): void {
    const stepNames = ['', 'Objectif', 'Produit', 'Paramètres', 'Résultats'];
    const message = `Étape ${step}: ${stepNames[step]}`;
    
    // Annoncer le changement pour les lecteurs d'écran
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.volume = 0.1;
      speechSynthesis.speak(utterance);
    }
  }

  validateStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedGoal;
      case 2:
        return !!this.selectedProduct;
      case 3:
        return this.savingsForm.valid && !!this.selectedProduct;
      case 4:
        return !!this.results;
      default:
        return false;
    }
  }

  canProceedToNextStep(): boolean {
    return this.validateStep();
  }

  // Méthodes pour les performances et optimisation
  trackInteraction(action: string, data?: any): void {
    this.analyticsService.trackEvent(`savings_simulator_${action}`, {
      step: this.currentStep,
      timestamp: Date.now(),
      session_id: this.sessionId,
      ...data
    });
  }

  // Gestion des erreurs réseau et fallbacks
  private handleApiError(error: any, fallbackAction?: () => void): void {
    console.error('Erreur API:', error);
    
    if (fallbackAction) {
      fallbackAction();
    }
    
    const errorMessage = this.getErrorMessage(error);
    this.notificationService.showError(errorMessage);
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.error?.detail) {
      return error.error.detail;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.status === 0) {
      return 'Problème de connexion réseau';
    }
    
    if (error?.status >= 500) {
      return 'Erreur serveur temporaire, veuillez réessayer';
    }
    
    return 'Une erreur inattendue s\'est produite';
  }

  // Méthodes pour l'export et le partage avancés
  async exportToPDF(): Promise<void> {
    if (!this.results) return;
    
    try {
      // Simuler la génération d'un PDF
      const pdfContent = this.generatePDFContent();
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulation_epargne_${this.selectedProduct?.name?.replace(/\s+/g, '_')}_${Date.now()}.html`;
      link.click();
      
      URL.revokeObjectURL(url);
      this.notificationService.showSuccess('Rapport PDF généré avec succès');
    } catch (error) {
      this.notificationService.showError('Erreur lors de la génération du PDF');
    }
  }

  private generatePDFContent(): string {
    if (!this.results || !this.selectedProduct) return '';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Simulation d'Épargne - ${this.selectedProduct.name}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; color: #2c5aa0; }
            .section { margin: 20px 0; }
            .highlight { background: #f0f8ff; padding: 10px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Simulation d'Épargne Bamboo</h1>
            <h2>${this.selectedProduct.name} - ${this.selectedProduct.bank?.name}</h2>
        </div>
        
        <div class="section">
            <h3>Paramètres de simulation</h3>
            <p><strong>Montant initial:</strong> ${this.formatCurrency(this.savingsForm.get('initialAmount')?.value)}</p>
            <p><strong>Durée:</strong> ${this.savingsForm.get('timeHorizon')?.value} an(s)</p>
            <p><strong>Taux d'intérêt:</strong> ${this.formatPercent(this.selectedProduct.interest_rate)}</p>
        </div>
        
        <div class="section highlight">
            <h3>Résultats</h3>
            <p><strong>Capital final:</strong> ${this.formatCurrency(this.results.finalAmount)}</p>
            <p><strong>Intérêts gagnés:</strong> ${this.formatCurrency(this.results.totalInterest)}</p>
            <p><strong>Rendement total:</strong> ${this.formatPercent(this.getTotalYield())}</p>
        </div>
        
        <div class="section">
            <h3>Recommandations</h3>
            ${this.results.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
        
        <div class="section">
            <small>Simulation générée le ${new Date().toLocaleDateString('fr-FR')} par Bamboo</small>
        </div>
    </body>
    </html>
    `;
  }
}