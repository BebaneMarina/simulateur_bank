import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService, InsuranceQuoteRequest, InsuranceQuoteResponse } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';
import { InsuranceApplicationModalComponent } from '../../components/application-modal/insurance-application-modal.component';

// Interface adaptée à la réponse de votre API Python
interface ApiInsuranceProduct {
  id: string;
  name: string;
  type: string;
  description: string;
  base_premium: number;
  coverage_details: any;
  deductible_options: any;
  age_limits: any;
  exclusions: string[];
  features: string[];
  advantages: string[];
  is_active: boolean;
  company: {
    id: string;
    name: string;
    full_name: string;
    logo_url: string;
    rating: number;
    solvency_ratio: number;
  };
  created_at: string;
  updated_at: string;
}

// Interface pour les devis de votre API
interface ApiInsuranceQuote {
  quote_id: string;
  product_name: string;
  company_name: string;
  insurance_type: string;
  coverage_amount: number;
  monthly_premium: number;
  annual_premium: number;
  deductible: number;
  coverage_details: any;
  exclusions: string[];
  valid_until: string;
  recommendations: string[];
  quotes: ApiQuoteOption[];
}

interface ApiQuoteOption {
  company_name: string;
  product_name: string;
  monthly_premium: number;
  annual_premium: number;
  deductible: number;
  rating?: number;
  advantages: string[];
}

interface InsuranceOffer {
  id: string;
  insurerId: string;
  insurerName: string;
  productName: string;
  type: InsuranceType;
  monthlyPremium: number;
  annualPremium: number;
  coverage: Coverage[];
  deductible: number;
  maxCoverage: number;
  features: string[];
  exclusions: string[];
  advantages: string[];
  customerRating: number;
  claimSettlementTime: string;
  renewalDiscount: number;
  eligibility: EligibilityInfo;
  contact: ContactInfo;
}

interface Coverage {
  type: string;
  description: string;
  amount: number;
  percentage?: number;
  conditions?: string[];
}

interface EligibilityInfo {
  minAge: number;
  maxAge: number;
  healthRequirements: string[];
  professionRestrictions: string[];
  geographicRestrictions?: string[];
}

interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  website?: string;
  emergencyPhone?: string;
}

interface ComparisonResult {
  offers: InsuranceOffer[];
  bestValue: InsuranceOffer;
  mostComprehensive: InsuranceOffer;
  cheapest: InsuranceOffer;
  recommendations: string[];
  marketInsights: MarketInsight[];
}

interface MarketInsight {
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface InsuranceTypeOption {
  id: InsuranceType;
  name: string;
  description: string;
  icon: string;
}

type InsuranceType = 'auto' | 'habitation' | 'vie' | 'sante' | 'voyage' | 'responsabilite';

@Component({
  selector: 'insurance-comparator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InsuranceApplicationModalComponent],
  template: `
   <div class="insurance-comparator-container">
  <!-- Hero Section -->
  <div class="hero-section">
    <div class="container">
      <div class="hero-content">
        <h1>Comparateur d'Assurances</h1>
        <p class="hero-subtitle">
          Trouvez la meilleure assurance adaptée à vos besoins parmi nos partenaires de confiance
        </p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">{{ availableProducts.length }}+</span>
            <span class="stat-label">Produits disponibles</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ getUniqueCompaniesCount() }}</span>
            <span class="stat-label">Compagnies partenaires</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">24h</span>
            <span class="stat-label">Traitement rapide</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 1: Insurance Type Selection -->
  <div class="step-section" [class.completed]="currentStep > 1">
    <div class="container">
      <div class="step-header">
        <div class="step-number">1</div>
        <div class="step-content">
          <h2>Choisissez votre type d'assurance</h2>
          <p>Sélectionnez le type d'assurance qui correspond à vos besoins</p>
        </div>
      </div>

      <div class="insurance-types-grid" *ngIf="currentStep === 1">
        <div 
          *ngFor="let type of insuranceTypes"
          (click)="selectInsuranceType(type.id)"
          [class.selected]="selectedType === type.id"
          class="insurance-type-card">
          <div class="type-icon">{{ type.icon }}</div>
          <h3>{{ type.name }}</h3>
          <p>{{ type.description }}</p>
        </div>
      </div>

      <div *ngIf="currentStep > 1 && selectedType" class="step-summary">
        <div class="summary-item">
          <strong>Type sélectionné:</strong> {{ getInsuranceTypeLabel(selectedType) }}
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
          <h2>Sélectionnez un produit</h2>
          <p>Découvrez les {{ availableProducts.length }} produits {{ getInsuranceTypeLabel(selectedType) }} disponibles</p>
        </div>
      </div>

      <div *ngIf="currentStep === 2" class="products-section">
        <div *ngIf="isLoadingProducts" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des produits d'assurance...</p>
        </div>

        <div *ngIf="!isLoadingProducts && availableProducts.length > 0" class="products-grid">
          <div *ngFor="let product of availableProducts" 
               class="product-card"
               [class.selected]="selectedProduct?.id === product.id"
               (click)="selectProduct(product)">
            
            <div class="product-header">
              <div class="company-info">
                <img *ngIf="product.company?.logo_url" 
                     [src]="product.company.logo_url" 
                     [alt]="product.company.name"
                     class="company-logo" 
                     onerror="this.style.display='none'" />
                <div>
                  <h4>{{ product.name }}</h4>
                  <p class="company-name">{{ product.company?.name }}</p>
                </div>
              </div>
              <div class="product-rating" *ngIf="product.company?.rating">
                <div class="stars">
                  <span *ngFor="let star of getStarsArray(product.company.rating)" class="star">★</span>
                </div>
                <span class="rating-text">{{ product.company.rating }}/5</span>
              </div>
            </div>

            <p class="product-description">{{ product.description }}</p>

            <div class="product-price">
              <span class="price-label">À partir de</span>
              <div class="price-display">
                <span class="price-amount">{{ formatCurrency(product.base_premium) }}</span>
                <span class="price-period">/an</span>
              </div>
            </div>

            <div class="product-highlights">
              <div *ngIf="product.features && product.features.length > 0" class="features">
                <h5>Caractéristiques principales</h5>
                <ul>
                  <li *ngFor="let feature of product.features.slice(0, 3)">{{ feature }}</li>
                </ul>
                <p *ngIf="product.features.length > 3" class="more-items">
                  +{{ product.features.length - 3 }} autres caractéristiques
                </p>
              </div>

              <div *ngIf="product.advantages && product.advantages.length > 0" class="advantages">
                <h5>Avantages</h5>
                <ul>
                  <li *ngFor="let advantage of product.advantages.slice(0, 2)">{{ advantage }}</li>
                </ul>
              </div>
            </div>

            <button class="btn-select" 
                    [class.selected]="selectedProduct?.id === product.id">
              {{ selectedProduct?.id === product.id ? 'Produit sélectionné' : 'Sélectionner ce produit' }}
            </button>
          </div>
        </div>

        <div *ngIf="!isLoadingProducts && availableProducts.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>Aucun produit disponible</h3>
          <p>Aucun produit d'assurance {{ selectedType }} n'est actuellement disponible.</p>
          <button (click)="changeStep(1)" class="btn-secondary">Choisir un autre type</button>
        </div>
      </div>

      <div *ngIf="currentStep > 2 && selectedProduct" class="step-summary">
        <div class="summary-item">
          <strong>Produit sélectionné:</strong> {{ selectedProduct.name }} ({{ selectedProduct.company?.name }})
          <button (click)="changeStep(2)" class="btn-change">Modifier</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 3: Quote Form -->
  <div class="step-section" [class.active]="currentStep === 3" [class.completed]="currentStep > 3">
    <div class="container">
      <div class="step-header">
        <div class="step-number">3</div>
        <div class="step-content">
          <h2>Renseignez vos informations</h2>
          <p>Quelques informations pour personnaliser votre devis</p>
        </div>
      </div>

      <div *ngIf="currentStep === 3" class="quote-form-container">
        <form [formGroup]="quoteForm" class="quote-form">
          <!-- Informations personnelles -->
          <div class="form-section">
            <h3>Vos informations personnelles</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="age">Âge *</label>
                <input 
                  type="number" 
                  formControlName="age" 
                  id="age"
                  class="form-input"
                  [class.error]="quoteForm.get('age')?.errors && quoteForm.get('age')?.touched"
                  min="18" 
                  max="80"
                  placeholder="Votre âge"
                />
                <div *ngIf="quoteForm.get('age')?.errors?.['required'] && quoteForm.get('age')?.touched" 
                     class="error-message">
                  L'âge est requis
                </div>
                <div *ngIf="quoteForm.get('age')?.errors?.['min'] && quoteForm.get('age')?.touched" 
                     class="error-message">
                  L'âge minimum est de 18 ans
                </div>
              </div>

              <div class="form-group">
                <label for="profession">Profession *</label>
                <select formControlName="profession" id="profession" 
                        class="form-select"
                        [class.error]="quoteForm.get('profession')?.errors && quoteForm.get('profession')?.touched">
                  <option value="">Sélectionner votre profession</option>
                  <option value="employee">Salarié</option>
                  <option value="self_employed">Indépendant</option>
                  <option value="public_servant">Fonctionnaire</option>
                  <option value="student">Étudiant</option>
                  <option value="retired">Retraité</option>
                </select>
                <div *ngIf="quoteForm.get('profession')?.errors?.['required'] && quoteForm.get('profession')?.touched" 
                     class="error-message">
                  La profession est requise
                </div>
              </div>

              <div class="form-group">
                <label for="city">Ville de résidence *</label>
                <select formControlName="city" id="city" 
                        class="form-select"
                        [class.error]="quoteForm.get('city')?.errors && quoteForm.get('city')?.touched">
                  <option value="">Sélectionner votre ville</option>
                  <option value="libreville">Libreville</option>
                  <option value="port-gentil">Port-Gentil</option>
                  <option value="franceville">Franceville</option>
                  <option value="oyem">Oyem</option>
                  <option value="lambarene">Lambaréné</option>
                  <option value="other">Autre ville</option>
                </select>
                <div *ngIf="quoteForm.get('city')?.errors?.['required'] && quoteForm.get('city')?.touched" 
                     class="error-message">
                  La ville est requise
                </div>
              </div>
            </div>
          </div>

          <!-- Formulaire spécifique par type d'assurance -->
          <div class="form-section">
            <h3>Détails {{ getInsuranceTypeLabel(selectedType) }}</h3>

            <!-- Assurance Auto -->
            <div *ngIf="selectedType === 'auto'" class="type-specific-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="vehicleValue">Valeur du véhicule (FCFA) *</label>
                  <input type="number" formControlName="vehicleValue" id="vehicleValue" 
                         class="form-input" min="1000000" step="100000"
                         placeholder="Ex: 15 000 000" />
                </div>

                <div class="form-group">
                  <label for="vehicleAge">Âge du véhicule (années) *</label>
                  <input type="number" formControlName="vehicleAge" id="vehicleAge" 
                         class="form-input" min="0" max="20"
                         placeholder="Ex: 3" />
                </div>

                <div class="form-group">
                  <label for="drivingExperience">Expérience de conduite (années) *</label>
                  <input type="number" formControlName="drivingExperience" id="drivingExperience" 
                         class="form-input" min="0" max="50"
                         placeholder="Ex: 10" />
                </div>

                <div class="form-group">
                  <label for="location">Zone de circulation principale *</label>
                  <select formControlName="location" id="location" class="form-select">
                    <option value="libreville">Libreville</option>
                    <option value="port-gentil">Port-Gentil</option>
                    <option value="other">Autres villes</option>
                    <option value="mixed">Mixte (ville/campagne)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Assurance Habitation -->
            <div *ngIf="selectedType === 'habitation'" class="type-specific-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="propertyValue">Valeur du bien (FCFA) *</label>
                  <input type="number" formControlName="propertyValue" id="propertyValue" 
                         class="form-input" min="5000000" step="1000000"
                         placeholder="Ex: 25 000 000" />
                </div>

                <div class="form-group">
                  <label for="propertyType">Type de logement *</label>
                  <select formControlName="propertyType" id="propertyType" class="form-select">
                    <option value="apartment">Appartement</option>
                    <option value="house">Maison individuelle</option>
                    <option value="villa">Villa</option>
                    <option value="duplex">Duplex</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="securityLevel">Niveau de sécurité *</label>
                  <select formControlName="securityLevel" id="securityLevel" class="form-select">
                    <option value="basic">Basique (serrures standard)</option>
                    <option value="standard">Standard (alarme)</option>
                    <option value="high">Renforcée (gardiennage, caméras)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="occupancy">Type d'occupation *</label>
                  <select formControlName="occupancy" id="occupancy" class="form-select">
                    <option value="primary">Résidence principale</option>
                    <option value="secondary">Résidence secondaire</option>
                    <option value="rental">Location</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Assurance Vie -->
            <div *ngIf="selectedType === 'vie'" class="type-specific-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="coverageAmount">Capital assuré souhaité (FCFA) *</label>
                  <input type="number" formControlName="coverageAmount" id="coverageAmount" 
                         class="form-input" min="5000000" step="5000000"
                         placeholder="Ex: 50 000 000" />
                </div>

                <div class="form-group">
                  <label for="healthStatus">État de santé général *</label>
                  <select formControlName="healthStatus" id="healthStatus" class="form-select">
                    <option value="excellent">Excellent</option>
                    <option value="good">Bon</option>
                    <option value="average">Moyen</option>
                    <option value="poor">Préoccupant</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="smokingStatus">Statut fumeur *</label>
                  <select formControlName="smokingStatus" id="smokingStatus" class="form-select">
                    <option value="non_smoker">Non-fumeur</option>
                    <option value="ex_smoker">Ex-fumeur (arrêt +2 ans)</option>
                    <option value="occasional">Fumeur occasionnel</option>
                    <option value="smoker">Fumeur régulier</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="beneficiaries">Nombre de bénéficiaires *</label>
                  <input type="number" formControlName="beneficiaries" id="beneficiaries" 
                         class="form-input" min="1" max="10"
                         placeholder="Ex: 2" />
                </div>
              </div>
            </div>

            <!-- Assurance Santé -->
            <div *ngIf="selectedType === 'sante'" class="type-specific-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="familySize">Nombre de personnes à assurer *</label>
                  <input type="number" formControlName="familySize" id="familySize" 
                         class="form-input" min="1" max="10"
                         placeholder="Ex: 4" />
                </div>

                <div class="form-group">
                  <label for="medicalHistory">Antécédents médicaux *</label>
                  <select formControlName="medicalHistory" id="medicalHistory" class="form-select">
                    <option value="none">Aucun antécédent notable</option>
                    <option value="minor">Antécédents mineurs</option>
                    <option value="moderate">Antécédents modérés</option>
                    <option value="major">Antécédents importants</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="coverageLevel">Niveau de couverture souhaité *</label>
                  <select formControlName="coverageLevel" id="coverageLevel" class="form-select">
                    <option value="basic">Basique (hospitalisation)</option>
                    <option value="standard">Standard (consultation + pharmacie)</option>
                    <option value="premium">Premium (dentaire + optique)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="hospitalization">Couverture hospitalisation souhaitée *</label>
                  <input type="number" formControlName="hospitalization" id="hospitalization" 
                         class="form-input" min="5000000" step="1000000"
                         placeholder="Ex: 15 000 000" />
                </div>
              </div>
            </div>

            <!-- Assurance Voyage -->
            <div *ngIf="selectedType === 'voyage'" class="type-specific-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="destination">Destination principale *</label>
                  <select formControlName="destination" id="destination" class="form-select">
                    <option value="Europe">Europe</option>
                    <option value="Amerique">Amérique</option>
                    <option value="Asie">Asie</option>
                    <option value="Afrique">Afrique</option>
                    <option value="Oceanie">Océanie</option>
                    <option value="Worldwide">Monde entier</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="duration">Durée du voyage (jours) *</label>
                  <input type="number" formControlName="duration" id="duration" 
                         class="form-input" min="1" max="365"
                         placeholder="Ex: 14" />
                </div>

                <div class="form-group">
                  <label for="activities">Type d'activités *</label>
                  <select formControlName="activities" id="activities" class="form-select">
                    <option value="tourism">Tourisme classique</option>
                    <option value="business">Voyage d'affaires</option>
                    <option value="adventure">Tourisme d'aventure</option>
                    <option value="sports_extremes">Sports extrêmes</option>
                    <option value="study">Études/stages</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="travelFrequency">Fréquence de voyage *</label>
                  <select formControlName="travelFrequency" id="travelFrequency" class="form-select">
                    <option value="rare">Rare (1-2 fois/an)</option>
                    <option value="occasional">Occasionnel (3-5 fois/an)</option>
                    <option value="frequent">Fréquent (6+ fois/an)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Responsabilité Civile Professionnelle -->
            <div *ngIf="selectedType === 'responsabilite'" class="type-specific-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="businessType">Type d'activité *</label>
                  <select formControlName="businessType" id="businessType" class="form-select">
                    <option value="services">Services/Conseil</option>
                    <option value="commerce">Commerce</option>
                    <option value="artisan">Artisanat</option>
                    <option value="medical">Professions médicales</option>
                    <option value="legal">Professions juridiques</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="turnover">Chiffre d'affaires annuel (FCFA) *</label>
                  <input type="number" formControlName="turnover" id="turnover" 
                         class="form-input" min="1000000" step="1000000"
                         placeholder="Ex: 50 000 000" />
                </div>

                <div class="form-group">
                  <label for="employees">Nombre d'employés *</label>
                  <input type="number" formControlName="employees" id="employees" 
                         class="form-input" min="0" max="500"
                         placeholder="Ex: 5" />
                </div>

                <div class="form-group">
                  <label for="riskLevel">Niveau de risque de l'activité *</label>
                  <select formControlName="riskLevel" id="riskLevel" class="form-select">
                    <option value="low">Faible</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Élevé</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div *ngIf="currentStep > 3" class="step-summary">
        <div class="summary-item">
          <strong>Informations saisies:</strong> Âge {{ quoteForm.get('age')?.value }} ans, {{ getProfessionLabel(quoteForm.get('profession')?.value) }}
          <button (click)="changeStep(3)" class="btn-change">Modifier</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Step 4: Results avec bouton de demande -->
  <div class="step-section" [class.active]="currentStep === 4">
    <div class="container">
      <div class="step-header">
        <div class="step-number">4</div>
        <div class="step-content">
          <h2>Votre devis personnalisé</h2>
          <p>Découvrez les offres adaptées à votre profil</p>
        </div>
      </div>

      <div *ngIf="currentStep === 4">
        <div *ngIf="isLoadingQuote" class="loading-state">
          <div class="spinner"></div>
          <p>Calcul de votre devis personnalisé...</p>
        </div>

        <div *ngIf="!isLoadingQuote && comparisonResult" class="results-container">
          <!-- Main Quote Display -->
          <ng-container *ngIf="comparisonResult?.offers && comparisonResult.offers.length > 0 && comparisonResult.offers[0] as firstOffer">
            <div class="main-quote-card">
              <div class="quote-header">
                <div class="quote-title">
                  <h3>{{ firstOffer.productName || 'Devis personnalisé' }}</h3>
                  <div class="company-badge">{{ firstOffer.insurerName || 'Simulateur Bamboo' }}</div>
                </div>
                <div class="quote-validity">
                  <span>Devis valable 30 jours</span>
                </div>
              </div>

              <div class="quote-pricing">
                <div class="price-display">
                  <div class="monthly-price">
                    <span class="amount">{{ formatCurrency(firstOffer.monthlyPremium || 0) }}</span>
                    <span class="period">/mois</span>
                  </div>
                  <div class="annual-price">
                    Soit {{ formatCurrency(firstOffer.annualPremium || 0) }}/an
                  </div>
                </div>
                <div class="deductible-info">
                  <strong>Franchise:</strong> {{ formatCurrency(firstOffer.deductible || 50000) }}
                </div>
              </div>

              <div class="coverage-summary">
                <h4>Garanties incluses</h4>
                <div class="coverage-grid">
                  <div *ngFor="let coverage of firstOffer.coverage" class="coverage-item">
                    <span class="coverage-type">{{ coverage.type }}</span>
                    <span class="coverage-amount">{{ formatCurrency(coverage.amount) }}</span>
                  </div>
                </div>
              </div>

              <div *ngIf="firstOffer.advantages && firstOffer.advantages.length > 0" class="advantages-section">
                <h4>Avantages</h4>
                <ul class="advantages-list">
                  <li *ngFor="let advantage of firstOffer.advantages">{{ advantage }}</li>
                </ul>
              </div>

              <div *ngIf="firstOffer.exclusions && firstOffer.exclusions.length > 0" class="exclusions-section">
                <h4>Exclusions principales</h4>
                <ul class="exclusions-list">
                  <li *ngFor="let exclusion of firstOffer.exclusions.slice(0, 3)">{{ exclusion }}</li>
                </ul>
              </div>

              <!-- Boutons d'action pour le devis principal -->
              <div class="quote-actions">
                <button (click)="openApplicationModal(firstOffer)" class="btn-primary btn-large">
                  <i class="fas fa-file-contract"></i>
                  Souscrire à cette assurance
                </button>
                <button (click)="downloadQuote(firstOffer)" class="btn-outline">
                  <i class="fas fa-download"></i>
                  Télécharger le devis
                </button>
              </div>
            </div>
          </ng-container>

          <!-- Alternative Quotes avec boutons -->
          <div *ngIf="comparisonResult?.offers && comparisonResult.offers.length > 1" class="alternative-quotes">
            <h3>Autres offres disponibles</h3>
            <div class="quotes-grid">
              <div *ngFor="let offer of comparisonResult.offers.slice(1)" class="quote-card">
                <div class="quote-header">
                  <h4>{{ offer.productName }}</h4>
                  <div class="company-name">{{ offer.insurerName }}</div>
                </div>

                <div class="quote-price">
                  <div class="monthly">{{ formatCurrency(offer.monthlyPremium) }}/mois</div>
                  <div class="annual">{{ formatCurrency(offer.annualPremium) }}/an</div>
                  <div class="deductible">Franchise: {{ formatCurrency(offer.deductible) }}</div>
                </div>

                <div class="quote-advantages" *ngIf="offer.advantages && offer.advantages.length > 0">
                  <h5>Points forts</h5>
                  <ul>
                    <li *ngFor="let advantage of offer.advantages.slice(0, 3)">{{ advantage }}</li>
                  </ul>
                </div>

                <div class="quote-actions">
                  <button (click)="requestDetailedQuote(offer)" class="btn-outline">
                    Devis détaillé
                  </button>
                  <button (click)="openApplicationModal(offer)" class="btn-primary">
                    Souscrire
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          <div *ngIf="comparisonResult?.recommendations && comparisonResult.recommendations.length > 0" class="recommendations-section">
            <h3>Nos recommandations</h3>
            <div class="recommendations-list">
              <div *ngFor="let recommendation of comparisonResult.recommendations" 
                   class="recommendation-item">
                <div class="recommendation-icon">💡</div>
                <p>{{ recommendation }}</p>
              </div>
            </div>
          </div>

          <!-- Market Insights -->
          <div *ngIf="comparisonResult?.marketInsights && comparisonResult.marketInsights.length > 0" class="market-insights-section">
            <h3>Informations marché</h3>
            <div class="insights-grid">
              <div *ngFor="let insight of comparisonResult.marketInsights" 
                   class="insight-card"
                   [class]="insight.impact">
                <div class="insight-header">
                  <div class="impact-indicator" [class]="insight.impact"></div>
                  <h4>{{ insight.title }}</h4>
                </div>
                <p>{{ insight.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="!isLoadingQuote && !comparisonResult" class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Erreur lors du calcul</h3>
          <p>Une erreur s'est produite lors du calcul de votre devis. Veuillez réessayer.</p>
          <button (click)="calculateQuote()" class="btn-primary">Réessayer</button>
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
        
        <button *ngIf="currentStep === 3 && quoteForm.valid" 
                (click)="calculateQuote()" 
                [disabled]="isLoadingQuote"
                class="btn-primary">
          {{ isLoadingQuote ? 'Calcul en cours...' : 'Obtenir mon devis' }}
        </button>

        <button *ngIf="currentStep === 4 && comparisonResult" 
                (click)="contactBambooAssur()" 
                class="btn-secondary">
          Contacter un conseiller
        </button>
      </div>
    </div>
  </div>

  <!-- Progress Indicator -->
  <div class="progress-indicator">
    <div class="progress-bar">
      <div class="progress-fill" [style.width.%]="getProgressPercentage()"></div>
    </div>
    <div class="progress-steps">
      <div class="progress-step" 
           [class.active]="currentStep >= 1"
           [class.completed]="currentStep > 1">
        <span class="step-number">1</span>
        <span class="step-label">Type</span>
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
        <span class="step-label">Infos</span>
      </div>
      <div class="progress-step" 
           [class.active]="currentStep >= 4">
        <span class="step-number">4</span>
        <span class="step-label">Devis</span>
      </div>
    </div>
  </div>
</div>

<!-- Modal d'application d'assurance -->
<app-insurance-application-modal
  [isVisible]="isApplicationModalVisible"
  [quoteData]="selectedQuoteForApplication"
  [productData]="selectedProductForApplication"
  (closeModal)="closeApplicationModal()"
  (applicationSubmitted)="onApplicationSubmitted($event)">
</app-insurance-application-modal>
  `,
  styleUrls: ['./insurance-comparator.component.scss']
})
export class InsuranceComparatorComponent implements OnInit, OnDestroy {
  quoteForm!: FormGroup;
  comparisonResult: ComparisonResult | null = null;
  isLoadingProducts = false;
  isLoadingQuote = false;
  selectedType: InsuranceType = 'auto';
  availableProducts: ApiInsuranceProduct[] = [];
  selectedProduct: ApiInsuranceProduct | null = null;
  currentStep = 1;
  isApplicationModalVisible = false;
  selectedQuoteForApplication: any = null;
  selectedProductForApplication: any = null;

  insuranceTypes: InsuranceTypeOption[] = [
    { 
      id: 'auto', 
      name: 'Automobile', 
      description: 'Protégez votre véhicule et votre responsabilité civile',
      icon: '🚗' 
    },
    { 
      id: 'habitation', 
      name: 'Habitation', 
      description: 'Assurance multirisque pour votre logement',
      icon: '🏠' 
    },
    { 
      id: 'vie', 
      name: 'Vie', 
      description: 'Protégez vos proches et préparez l\'avenir',
      icon: '👨‍👩‍👧‍👦' 
    },
    { 
      id: 'sante', 
      name: 'Santé', 
      description: 'Complément santé pour vous et votre famille',
      icon: '🏥' 
    },
    { 
      id: 'voyage', 
      name: 'Voyage', 
      description: 'Voyagez l\'esprit tranquille à l\'étranger',
      icon: '✈️' 
    },
    { 
      id: 'responsabilite', 
      name: 'RC Pro', 
      description: 'Responsabilité civile professionnelle',
      icon: '🏢' 
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.trackPageView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.quoteForm = this.fb.group({
      // Informations personnelles
      age: [35, [Validators.required, Validators.min(18), Validators.max(80)]],
      profession: ['', Validators.required],
      city: ['', Validators.required],

      // Assurance Auto
      vehicleValue: [15000000],
      vehicleAge: [3],
      drivingExperience: [10],
      location: ['libreville'],

      // Assurance Habitation
      propertyValue: [25000000],
      propertyType: ['apartment'],
      securityLevel: ['standard'],
      occupancy: ['primary'],

      // Assurance Vie
      coverageAmount: [50000000],
      healthStatus: ['good'],
      smokingStatus: ['non_smoker'],
      beneficiaries: [2],

      // Assurance Santé
      familySize: [1],
      medicalHistory: ['none'],
      coverageLevel: ['standard'],
      hospitalization: [15000000],

      // Assurance Voyage
      destination: ['Europe'],
      duration: [7],
      activities: ['tourism'],
      travelFrequency: ['occasional'],

      // Responsabilité Civile Pro
      businessType: ['services'],
      turnover: [50000000],
      employees: [5],
      riskLevel: ['medium']
    });
  }

  // Navigation Methods
  selectInsuranceType(type: InsuranceType): void {
    this.selectedType = type;
    this.selectedProduct = null;
    this.comparisonResult = null;
    this.nextStep();
    this.loadInsuranceProducts();
  }

  selectProduct(product: ApiInsuranceProduct): void {
    this.selectedProduct = product;
    this.notificationService.showSuccess(`Produit ${product.name} sélectionné`);
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
    this.currentStep = step;
    this.scrollToTop();
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // API Methods
  private loadInsuranceProducts(): void {
    this.isLoadingProducts = true;
    this.apiService.getInsuranceProducts({ insurance_type: this.selectedType })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products: any[]) => {
          this.availableProducts = products;
          this.isLoadingProducts = false;
        },
        error: (error) => {
          console.error('Erreur chargement produits:', error);
          this.availableProducts = [];
          this.isLoadingProducts = false;
          this.notificationService.showError('Impossible de charger les produits d\'assurance');
        }
      });
  }

   openApplicationModal(offer: InsuranceOffer): void {
    // Préparer les données du devis pour la modal
    this.selectedQuoteForApplication = {
      id: offer.id,
      productName: offer.productName,
      companyName: offer.insurerName,
      monthlyPremium: offer.monthlyPremium,
      annualPremium: offer.annualPremium,
      deductible: offer.deductible,
      coverageAmount: offer.maxCoverage,
      insurance_type: offer.type,
      coverage_details: this.transformCoverageForModal(offer.coverage),
      exclusions: offer.exclusions || [],
      advantages: offer.advantages || []
    };

    // Préparer les données du produit
    this.selectedProductForApplication = {
      id: offer.id,
      name: offer.productName,
      type: offer.type,
      description: `Assurance ${this.getInsuranceTypeLabel(offer.type)}`,
      insurance_company: {
        id: offer.insurerId,
        name: offer.insurerName,
        contact_phone: offer.contact?.phone || '+241 01 00 00 00',
        contact_email: offer.contact?.email || 'contact@assurance.ga'
      },
      coverage_details: this.transformCoverageForModal(offer.coverage),
      base_premium: offer.annualPremium,
      features: offer.features || [],
      advantages: offer.advantages || []
    };

    this.isApplicationModalVisible = true;

    // Analytics
    this.analyticsService.trackEvent('insurance_application_modal_opened', {
      insurer: offer.insurerName,
      product: offer.productName,
      type: offer.type,
      monthly_premium: offer.monthlyPremium
    });
  }

  /**
   * Ferme la modal de demande
   */
  closeApplicationModal(): void {
    this.isApplicationModalVisible = false;
    this.selectedQuoteForApplication = null;
    this.selectedProductForApplication = null;
  }

  calculateQuote(): void {
    if (this.quoteForm.invalid) {
      this.markFormGroupTouched(this.quoteForm);
      this.notificationService.showError('Veuillez remplir tous les champs requis');
      return;
    }

    this.isLoadingQuote = true;
    const formData = this.quoteForm.value;

    // Construire la requête selon votre API
    const quoteRequest: any = {
      insurance_type: this.selectedType,
      age: formData.age,
      risk_factors: this.buildRiskFactors(formData)
    };

    // Ajouter l'ID du produit sélectionné si disponible
    if (this.selectedProduct) {
      quoteRequest.insurance_product_id = this.selectedProduct.id;
    }

    // Ajouter les champs spécifiques selon le type
    switch (this.selectedType) {
      case 'auto':
        quoteRequest.vehicle_value = formData.vehicleValue;
        break;
      case 'habitation':
        quoteRequest.property_value = formData.propertyValue;
        break;
      case 'vie':
        quoteRequest.coverage_amount = formData.coverageAmount;
        break;
    }

    // Utiliser l'endpoint de quote de votre API
    this.apiService.getInsuranceQuote(quoteRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.comparisonResult = this.transformApiQuoteResponse(response);
          this.isLoadingQuote = false;
          this.nextStep(); // Passer automatiquement à l'étape 4
          this.notificationService.showSuccess('Devis calculé avec succès!');
          this.trackQuoteGenerated();
        },
        error: (error) => {
          console.error('Erreur obtention devis:', error);
          this.isLoadingQuote = false;
          this.notificationService.showError('Erreur lors du calcul du devis');
        }
      });
  }

  private buildRiskFactors(formData: any): any {
    const riskFactors: any = {
      profession: formData.profession,
      location: formData.city
    };

    switch (this.selectedType) {
      case 'auto':
        riskFactors.vehicle_value = formData.vehicleValue;
        riskFactors.vehicle_age = formData.vehicleAge;
        riskFactors.experience = formData.drivingExperience;
        riskFactors.location = formData.location;
        break;
      case 'habitation':
        riskFactors.property_value = formData.propertyValue;
        riskFactors.property_type = formData.propertyType;
        riskFactors.security = formData.securityLevel;
        riskFactors.occupancy = formData.occupancy;
        break;
      case 'vie':
        riskFactors.health = formData.healthStatus;
        riskFactors.smoking = formData.smokingStatus;
        riskFactors.beneficiaries = formData.beneficiaries;
        break;
      case 'sante':
        riskFactors.family_size = formData.familySize;
        riskFactors.medical_history = formData.medicalHistory;
        riskFactors.coverage_level = formData.coverageLevel;
        break;
      case 'voyage':
        riskFactors.destination = formData.destination;
        riskFactors.duration = formData.duration;
        riskFactors.activities = formData.activities;
        riskFactors.frequency = formData.travelFrequency;
        break;
      case 'responsabilite':
        riskFactors.business_type = formData.businessType;
        riskFactors.turnover = formData.turnover;
        riskFactors.employees = formData.employees;
        riskFactors.risk_level = formData.riskLevel;
        break;
    }

    return riskFactors;
  }

  private transformApiQuoteResponse(apiResponse: any): ComparisonResult {
    const offers: InsuranceOffer[] = [];
    
    // Ajouter l'offre principale si elle existe
    if (apiResponse.monthly_premium || apiResponse.quotes) {
      const mainOffer: InsuranceOffer = {
        id: 'main_offer',
        insurerId: this.extractCompanyId(apiResponse.company_name || 'Bamboo'),
        insurerName: apiResponse.company_name || 'Simulateur Bamboo',
        productName: apiResponse.product_name || `Assurance ${this.selectedType}`,
        type: this.selectedType,
        monthlyPremium: apiResponse.monthly_premium || 0,
        annualPremium: apiResponse.annual_premium || 0,
        coverage: this.transformCoverageDetails(apiResponse.coverage_details),
        deductible: apiResponse.deductible || 50000,
        maxCoverage: apiResponse.coverage_amount || this.getDefaultMaxCoverage(),
        features: [],
        exclusions: apiResponse.exclusions || [],
        advantages: this.getCompanyAdvantages(apiResponse.company_name),
        customerRating: 4.2,
        claimSettlementTime: '48h',
        renewalDiscount: 5,
        eligibility: this.getDefaultEligibility(),
        contact: this.getCompanyContact(apiResponse.company_name)
      };
      offers.push(mainOffer);
    }
    
    // Ajouter les offres alternatives
    if (apiResponse.quotes && Array.isArray(apiResponse.quotes)) {
      apiResponse.quotes.forEach((quote: any, index: number) => {
        const offer: InsuranceOffer = {
          id: `quote_${index + 1}`,
          insurerId: this.extractCompanyId(quote.company_name),
          insurerName: quote.company_name,
          productName: quote.product_name,
          type: this.selectedType,
          monthlyPremium: quote.monthly_premium,
          annualPremium: quote.annual_premium,
          coverage: this.transformCoverageDetails(quote.coverage_details),
          deductible: quote.deductible || 50000,
          maxCoverage: this.getDefaultMaxCoverage(),
          features: [],
          exclusions: [],
          advantages: quote.advantages || this.getCompanyAdvantages(quote.company_name),
          customerRating: quote.rating || 4.0,
          claimSettlementTime: '48h',
          renewalDiscount: 5,
          eligibility: this.getDefaultEligibility(),
          contact: this.getCompanyContact(quote.company_name)
        };
        offers.push(offer);
      });
    }

    // Si aucune offre, créer une offre par défaut
    if (offers.length === 0) {
      offers.push(this.createDefaultOffer());
    }

    const sortedByPrice = [...offers].sort((a, b) => a.monthlyPremium - b.monthlyPremium);
    const sortedByRating = [...offers].sort((a, b) => b.customerRating - a.customerRating);
    const sortedByCoverage = [...offers].sort((a, b) => b.maxCoverage - a.maxCoverage);

    return {
      offers,
      bestValue: sortedByRating[0],
      cheapest: sortedByPrice[0],
      mostComprehensive: sortedByCoverage[0],
      recommendations: apiResponse.recommendations || this.getDefaultRecommendations(),
      marketInsights: this.generateMarketInsights()
    };
  }

  // Helper Methods
  getUniqueCompaniesCount(): number {
    const companies = new Set(this.availableProducts.map(p => p.company?.name));
    return companies.size;
  }

  getProgressPercentage(): number {
    return (this.currentStep / 4) * 100;
  }

  getStarsArray(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  getInsuranceTypeLabel(type: InsuranceType): string {
    const labels = {
      auto: 'Assurance Automobile',
      habitation: 'Assurance Habitation',
      vie: 'Assurance Vie',
      sante: 'Assurance Santé',
      voyage: 'Assurance Voyage',
      responsabilite: 'Responsabilité Civile Professionnelle'
    };
    return labels[type] || type;
  }

  getProfessionLabel(profession: string): string {
    const labels: { [key: string]: string } = {
      employee: 'Salarié',
      self_employed: 'Indépendant',
      public_servant: 'Fonctionnaire',
      student: 'Étudiant',
      retired: 'Retraité'
    };
    return labels[profession] || profession;
  }

  formatCurrency(amount: number): string {
    if (!amount || amount === 0) return '0 FCFA';
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
  }

  // Action Methods
  requestDetailedQuote(offer: InsuranceOffer): void {
    this.notificationService.showSuccess(`Demande de devis détaillé envoyée à ${offer.insurerName}`);
    this.analyticsService.trackEvent('detailed_quote_requested', {
      insurer: offer.insurerName,
      product: offer.productName,
      type: offer.type,
      monthly_premium: offer.monthlyPremium
    });
  }

  selectOffer(offer: InsuranceOffer): void {
    this.notificationService.showInfo(`Redirection vers ${offer.insurerName}...`);
    this.analyticsService.trackEvent('offer_selected', {
      insurer: offer.insurerName,
      product: offer.productName,
      monthly_premium: offer.monthlyPremium
    });
  }

  contactBambooAssur(): void {
    this.notificationService.showInfo('Redirection vers le service client Bamboo Assur...');
    this.analyticsService.trackEvent('contact_requested', {
      source: 'insurance_comparator',
      type: this.selectedType
    });
  }

  saveQuote(): void {
    if (!this.comparisonResult) return;
    
    const quoteData = {
      id: Date.now().toString(),
      type: this.selectedType,
      offers: this.comparisonResult.offers,
      form_data: this.quoteForm.value,
      created_at: new Date()
    };
    
    localStorage.setItem(`bamboo_quote_${quoteData.id}`, JSON.stringify(quoteData));
    this.notificationService.showSuccess('Devis sauvegardé avec succès');
  }

  // Utility Methods (keeping existing implementations)
  private transformCoverageDetails(coverageDetails: any): Coverage[] {
    if (!coverageDetails || typeof coverageDetails !== 'object') {
      return this.getDefaultCoverage();
    }

    return Object.entries(coverageDetails).map(([key, value]) => ({
      type: this.formatCoverageType(key),
      description: `Couverture ${this.formatCoverageType(key)}`,
      amount: typeof value === 'number' ? value : 0
    }));
  }

  private formatCoverageType(key: string): string {
    const typeMap: { [key: string]: string } = {
      'responsabilite_civile': 'Responsabilité civile',
      'dommages_collision': 'Dommages collision',
      'vol': 'Vol',
      'incendie': 'Incendie',
      'degats_eaux': 'Dégâts des eaux',
      'hospitalisation': 'Hospitalisation',
      'consultations': 'Consultations',
      'pharmacie': 'Pharmacie',
      'deces': 'Décès',
      'invalidite': 'Invalidité'
    };
    
    return typeMap[key] || key.replace('_', ' ');
  }

  private extractCompanyId(companyName: string): string {
    if (!companyName) return 'bamboo';
    
    const nameMap: { [key: string]: string } = {
      'Bamboo Assur': 'bamboo',
      'OGAR Assurances': 'ogar',
      'NSIA Assurances': 'nsia',
      'Simulateur Bamboo': 'bamboo'
    };
    
    return nameMap[companyName] || 'bamboo';
  }

  private getCompanyAdvantages(companyName: string): string[] {
    const advantagesMap: { [key: string]: string[] } = {
      'Bamboo Assur': [
        'Service client 24/7',
        'Application mobile',
        'Tarifs compétitifs',
        'Assistance routière incluse'
      ],
      'OGAR Assurances': [
        'Réseau d\'agences étendu',
        'Expertise locale',
        'Remboursement rapide',
        'Conseiller dédié'
      ],
      'NSIA Assurances': [
        'Groupe panafricain',
        'Innovation digitale',
        'Offres flexibles',
        'Assistance juridique'
      ]
    };
    
    return advantagesMap[companyName] || advantagesMap['Bamboo Assur'];
  }

  private getCompanyContact(companyName: string): ContactInfo {
    const contactMap: { [key: string]: ContactInfo } = {
      'Bamboo Assur': {
        phone: '+241 01 70 00 00',
        email: 'contact@bamboo-assur.ga',
        address: 'Immeuble Bamboo, Boulevard Triomphal, Libreville',
        website: 'www.bamboo-assur.ga',
        emergencyPhone: '+241 07 70 00 00'
      },
      'OGAR Assurances': {
        phone: '+241 01 72 35 00',
        email: 'info@ogar-gabon.com',
        address: 'Avenue du Colonel Parant, Libreville',
        website: 'www.ogar-gabon.com'
      },
      'NSIA Assurances': {
        phone: '+241 01 44 35 55',
        email: 'contact@nsia-gabon.com',
        address: 'Immeuble NSIA, Quartier Batterie IV, Libreville',
        website: 'www.nsia-gabon.com'
      }
    };
    
    return contactMap[companyName] || contactMap['Bamboo Assur'];
  }

  private getDefaultMaxCoverage(): number {
    switch (this.selectedType) {
      case 'auto':
        return this.quoteForm.get('vehicleValue')?.value || 15000000;
      case 'habitation':
        return this.quoteForm.get('propertyValue')?.value || 25000000;
      case 'vie':
        return this.quoteForm.get('coverageAmount')?.value || 50000000;
      case 'sante':
        return 100000000;
      case 'voyage':
        return 50000000;
      default:
        return 50000000;
    }
  }
  
    /**
   * Gère la soumission de la demande d'assurance
   */
  onApplicationSubmitted(notification: any): void {
    console.log('Demande d\'assurance soumise:', notification);
    
    // Sauvegarder en localStorage pour le suivi
    const applicationHistory = JSON.parse(localStorage.getItem('bamboo_insurance_applications') || '[]');
    applicationHistory.push({
      ...notification,
      quote_data: this.selectedQuoteForApplication,
      product_data: this.selectedProductForApplication,
      form_data: this.quoteForm.value,
      submitted_at: new Date().toISOString()
    });
    localStorage.setItem('bamboo_insurance_applications', JSON.stringify(applicationHistory));

    // Analytics
    this.analyticsService.trackEvent('insurance_application_submitted', {
      application_id: notification.application_id,
      application_number: notification.application_number,
      company_name: notification.contact_info.company_name,
      insurance_type: this.selectedType,
      monthly_premium: this.selectedQuoteForApplication?.monthlyPremium
    });

    // Notification utilisateur
    this.notificationService.showSuccess(
      `Votre demande d'assurance a été transmise avec succès ! Numéro de dossier: ${notification.application_number}`,
      'Demande envoyée'
    );

    // Fermer la modal après 3 secondes
    setTimeout(() => {
      this.closeApplicationModal();
    }, 3000);
  }

  /**
   * Transforme les données de couverture pour la modal
   */
  private transformCoverageForModal(coverage: Coverage[]): any {
    const coverageObj: any = {};
    
    coverage.forEach(cov => {
      const key = this.getCoverageKey(cov.type);
      coverageObj[key] = cov.amount;
    });

    return coverageObj;
  }

  /**
   * Obtient la clé de couverture standardisée
   */
  private getCoverageKey(coverageType: string): string {
    const keyMap: { [key: string]: string } = {
      'Responsabilité civile': 'responsabilite_civile',
      'Dommages collision': 'dommages_collision',
      'Vol': 'vol',
      'Incendie': 'incendie',
      'Dégâts des eaux': 'degats_eaux',
      'Hospitalisation': 'hospitalisation',
      'Consultations': 'consultations',
      'Pharmacie': 'pharmacie',
      'Décès': 'deces',
      'Invalidité': 'invalidite'
    };
    
    return keyMap[coverageType] || coverageType.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Télécharge le devis au format PDF
   */
  downloadQuote(offer: InsuranceOffer): void {
    const quoteContent = this.generateQuoteContent(offer);
    const blob = new Blob([quoteContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `devis_assurance_${offer.type}_${Date.now()}.html`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    this.notificationService.showSuccess('Devis téléchargé avec succès');
    this.analyticsService.trackEvent('insurance_quote_downloaded', {
      insurer: offer.insurerName,
      product: offer.productName,
      type: offer.type
    });
  }

  /**
   * Génère le contenu HTML du devis
   */
  private generateQuoteContent(offer: InsuranceOffer): string {
    const formData = this.quoteForm.value;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Devis Assurance ${this.getInsuranceTypeLabel(offer.type)}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2c5aa0; padding-bottom: 20px; }
            .company-logo { max-height: 60px; margin-bottom: 10px; }
            .section { margin: 20px 0; }
            .highlight { background: #f0f8ff; padding: 15px; border-radius: 5px; border-left: 4px solid #2c5aa0; }
            .pricing { font-size: 1.2em; font-weight: bold; color: #2c5aa0; }
            .coverage-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .coverage-table th, .coverage-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .coverage-table th { background: #f5f5f5; }
            .footer { margin-top: 40px; font-size: 0.9em; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Devis d'Assurance ${this.getInsuranceTypeLabel(offer.type)}</h1>
            <h2>${offer.insurerName}</h2>
            <p><strong>Produit:</strong> ${offer.productName}</p>
        </div>
        
        <div class="section">
            <h3>Informations du devis</h3>
            <p><strong>Date de génération:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            <p><strong>Validité:</strong> 30 jours</p>
            <p><strong>Type d'assurance:</strong> ${this.getInsuranceTypeLabel(offer.type)}</p>
        </div>
        
        <div class="section highlight">
            <h3>Tarification</h3>
            <div class="pricing">
                <p>Prime mensuelle: ${this.formatCurrency(offer.monthlyPremium)}</p>
                <p>Prime annuelle: ${this.formatCurrency(offer.annualPremium)}</p>
                <p>Franchise: ${this.formatCurrency(offer.deductible)}</p>
            </div>
        </div>
        
        <div class="section">
            <h3>Garanties incluses</h3>
            <table class="coverage-table">
                <thead>
                    <tr>
                        <th>Type de garantie</th>
                        <th>Montant de couverture</th>
                    </tr>
                </thead>
                <tbody>
                    ${offer.coverage.map(cov => `
                        <tr>
                            <td>${cov.type}</td>
                            <td>${this.formatCurrency(cov.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        ${offer.advantages && offer.advantages.length > 0 ? `
        <div class="section">
            <h3>Avantages</h3>
            <ul>
                ${offer.advantages.map(adv => `<li>${adv}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${offer.exclusions && offer.exclusions.length > 0 ? `
        <div class="section">
            <h3>Exclusions principales</h3>
            <ul>
                ${offer.exclusions.map(exc => `<li>${exc}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div class="section">
            <h3>Vos informations</h3>
            <p><strong>Âge:</strong> ${formData.age} ans</p>
            <p><strong>Profession:</strong> ${this.getProfessionLabel(formData.profession)}</p>
            <p><strong>Ville:</strong> ${formData.city}</p>
            ${this.getPersonalizedInfoForQuote(offer.type, formData)}
        </div>
        
        <div class="section">
            <h3>Contact</h3>
            <p><strong>Téléphone:</strong> ${offer.contact?.phone || '+241 01 00 00 00'}</p>
            <p><strong>Email:</strong> ${offer.contact?.email || 'contact@assurance.ga'}</p>
            <p><strong>Adresse:</strong> ${offer.contact?.address || 'Libreville, Gabon'}</p>
        </div>
        
        <div class="footer">
            <p><strong>Important:</strong> Ce devis est indicatif et n'engage pas définitivement l'assureur. Les conditions définitives seront précisées dans le contrat final.</p>
            <p>Devis généré par Bamboo le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Génère les informations personnalisées selon le type d'assurance
   */
  private getPersonalizedInfoForQuote(type: string, formData: any): string {
    switch (type) {
      case 'auto':
        return `
            <p><strong>Valeur du véhicule:</strong> ${this.formatCurrency(formData.vehicleValue || 0)}</p>
            <p><strong>Âge du véhicule:</strong> ${formData.vehicleAge || 0} ans</p>
            <p><strong>Expérience de conduite:</strong> ${formData.drivingExperience || 0} ans</p>
        `;
      case 'habitation':
        return `
            <p><strong>Valeur du bien:</strong> ${this.formatCurrency(formData.propertyValue || 0)}</p>
            <p><strong>Type de logement:</strong> ${formData.propertyType || 'Non spécifié'}</p>
            <p><strong>Niveau de sécurité:</strong> ${formData.securityLevel || 'Standard'}</p>
        `;
      case 'vie':
        return `
            <p><strong>Capital souhaité:</strong> ${this.formatCurrency(formData.coverageAmount || 0)}</p>
            <p><strong>État de santé:</strong> ${formData.healthStatus || 'Non spécifié'}</p>
            <p><strong>Statut fumeur:</strong> ${formData.smokingStatus || 'Non spécifié'}</p>
        `;
      case 'sante':
        return `
            <p><strong>Taille de la famille:</strong> ${formData.familySize || 1} personne(s)</p>
            <p><strong>Couverture hospitalisation:</strong> ${this.formatCurrency(formData.hospitalization || 0)}</p>
            <p><strong>Niveau de couverture:</strong> ${formData.coverageLevel || 'Standard'}</p>
        `;
      case 'voyage':
        return `
            <p><strong>Destination:</strong> ${formData.destination || 'Non spécifiée'}</p>
            <p><strong>Durée:</strong> ${formData.duration || 0} jours</p>
            <p><strong>Type d'activités:</strong> ${formData.activities || 'Tourisme'}</p>
        `;
      default:
        return '';
    }
  }

  private getDefaultCoverage(): Coverage[] {
    const coverageMap: { [key: string]: Coverage[] } = {
      'auto': [
        { type: 'Responsabilité civile', description: 'Dommages causés aux tiers', amount: 500000000 },
        { type: 'Dommages collision', description: 'Réparation suite à collision', amount: 15000000 },
        { type: 'Vol', description: 'Remboursement en cas de vol', amount: 15000000 },
        { type: 'Incendie', description: 'Dommages par le feu', amount: 15000000 }
      ],
      'habitation': [
        { type: 'Responsabilité civile', description: 'Dommages causés aux tiers', amount: 100000000 },
        { type: 'Incendie', description: 'Dégâts des eaux et incendie', amount: 25000000 },
        { type: 'Vol', description: 'Biens mobiliers', amount: 10000000 },
        { type: 'Catastrophes naturelles', description: 'Événements climatiques', amount: 25000000 }
      ],
      'vie': [
        { type: 'Décès', description: 'Capital versé aux bénéficiaires', amount: 50000000 },
        { type: 'Invalidité permanente', description: 'Rente en cas d\'invalidité', amount: 50000000 }
      ],
      'sante': [
        { type: 'Hospitalisation', description: 'Frais médicaux et chirurgicaux', amount: 50000000 },
        { type: 'Consultations', description: 'Médecine générale et spécialisée', amount: 5000000 },
        { type: 'Pharmacie', description: 'Médicaments prescrits', amount: 3000000 }
      ],
      'voyage': [
        { type: 'Frais médicaux', description: 'Soins médicaux à l\'étranger', amount: 50000000 },
        { type: 'Rapatriement', description: 'Rapatriement sanitaire', amount: 100000000 },
        { type: 'Bagages', description: 'Perte ou vol de bagages', amount: 2000000 }
      ]
    };
    
    return coverageMap[this.selectedType] || [];
  }

  private getDefaultEligibility(): EligibilityInfo {
    return {
      minAge: 18,
      maxAge: 75,
      healthRequirements: ['Questionnaire médical'],
      professionRestrictions: ['Professions à risque évaluées au cas par cas'],
      geographicRestrictions: ['Couverture territoriale: Gabon et CEMAC']
    };
  }

  private createDefaultOffer(): InsuranceOffer {
    const formData = this.quoteForm.value;
    let basePremium = 50000;

    // Calcul simple selon le type
    switch (this.selectedType) {
      case 'auto':
        basePremium = (formData.vehicleValue || 15000000) * 0.003;
        break;
      case 'habitation':
        basePremium = (formData.propertyValue || 25000000) * 0.002;
        break;
      case 'vie':
        basePremium = (formData.coverageAmount || 50000000) * 0.0015;
        break;
      case 'sante':
        basePremium = 45000 * (formData.familySize || 1);
        break;
      case 'voyage':
        basePremium = 25000 * Math.max(1, (formData.duration || 7) / 7);
        break;
    }

    return {
      id: 'default_offer',
      insurerId: 'bamboo',
      insurerName: 'Simulateur Bamboo',
      productName: `Assurance ${this.selectedType} Standard`,
      type: this.selectedType,
      monthlyPremium: Math.round(basePremium / 12),
      annualPremium: Math.round(basePremium),
      coverage: this.getDefaultCoverage(),
      deductible: 50000,
      maxCoverage: this.getDefaultMaxCoverage(),
      features: [],
      exclusions: ['Conditions générales non respectées'],
      advantages: this.getCompanyAdvantages('Bamboo Assur'),
      customerRating: 4.2,
      claimSettlementTime: '48h',
      renewalDiscount: 5,
      eligibility: this.getDefaultEligibility(),
      contact: this.getCompanyContact('Bamboo Assur')
    };
  }

  private getDefaultRecommendations(): string[] {
    const recommendationsMap: { [key: string]: string[] } = {
      'auto': [
        'Conduisez prudemment pour bénéficier de bonus',
        'Installez un système antivol pour réduire les risques',
        'Comparez les franchises avant de choisir'
      ],
      'habitation': [
        'Installez des détecteurs de fumée',
        'Vérifiez régulièrement vos installations électriques',
        'Sécurisez votre domicile contre le vol'
      ],
      'vie': [
        'Déclarez tous vos antécédents médicaux',
        'Maintenez un mode de vie sain',
        'Mettez à jour vos bénéficiaires régulièrement'
      ],
      'sante': [
        'Effectuez des bilans de santé réguliers',
        'Prévenez plutôt que guérir',
        'Utilisez le réseau de soins partenaires'
      ],
      'voyage': [
        'Vérifiez les conditions sanitaires de destination',
        'Emportez une trousse de premiers secours',
        'Conservez les coordonnées d\'urgence'
      ]
    };
    
    return recommendationsMap[this.selectedType] || [
      'Lisez attentivement les conditions générales',
      'Conservez tous vos justificatifs',
      'Contactez votre assureur en cas de doute'
    ];
  }

  private generateMarketInsights(): MarketInsight[] {
    return [
      {
        title: `Marché de l'assurance ${this.selectedType}`,
        description: `Le marché de l'assurance ${this.selectedType} au Gabon offre plusieurs options compétitives`,
        impact: 'positive'
      },
      {
        title: 'Évolution des tarifs',
        description: 'Les tarifs d\'assurance restent stables avec une légère tendance à la hausse',
        impact: 'neutral'
      }
    ];
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private trackPageView(): void {
    this.analyticsService.trackPageView('insurance_comparator', {
      page_title: 'Comparateur d\'Assurances',
      insurance_type: this.selectedType
    });
  }

  private trackQuoteGenerated(): void {
    if (!this.comparisonResult) return;

    this.analyticsService.trackEvent('insurance_quote_generated', {
      insurance_type: this.selectedType,
      offers_count: this.comparisonResult.offers.length,
      best_premium: this.comparisonResult.cheapest.monthlyPremium,
      selected_product: this.selectedProduct?.name,
      form_data: this.quoteForm.value
    });
  }
}