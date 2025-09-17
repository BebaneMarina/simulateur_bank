// insurance-comparator-steps.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';
import { InsuranceProductInfo, InsuranceCompanyInfo } from '../../models/insurance.interface';
import { InsuranceApplicationModalComponent } from '../../components/application-modal/insurance-application-modal.component';

// Interfaces
interface InsuranceType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  imageUrl?: string;
}

interface StepConfig {
  title: string;
  subtitle: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
  full_name: string;
  logo_url?: string;
  rating?: number;
  solvency_ratio?: number;
  contact_phone?: string;
  contact_email?: string;
  specialties?: string[];
}

interface InsuranceProduct {
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
  company: InsuranceCompany;
  created_at: string;
  updated_at: string;
}

interface SimulationResult {
  quote_id: string;
  product_name: string;
  company_name: string;
  insurance_type: string;
  monthly_premium: number;
  annual_premium: number;
  deductible: number;
  coverage_details: any;
  exclusions: string[];
  valid_until: string;
  recommendations: string[];
  quotes: QuoteOption[];
}

interface QuoteOption {
  company_name: string;
  product_name: string;
  monthly_premium: number;
  annual_premium: number;
  deductible: number;
  rating?: number;
  advantages: string[];
}

interface AssetPaths {
  hero: string;
  heroBackground: string;
  icons: {
    [key: string]: string;
  };
  decorative: {
    shield: string;
    checkCircle: string;
    stars: string;
  };
  logos: {
    [key: string]: string;
  };
}

@Component({
  selector: 'app-insurance-comparator-steps',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InsuranceApplicationModalComponent],
  template: `
    <div class="insurance-comparator-container">
      <!-- Hero Section avec image -->
      <div class="hero-section">
        <div class="container">
          <div class="hero-content">
            <h1>Comparateur d'Assurances - Gabon</h1>
            <p class="hero-subtitle">
              Trouvez la meilleure assurance adaptée à vos besoins parmi nos partenaires gabonais
            </p>
          </div>
        </div>
      </div>

      <!-- Type Selection avec images -->
      <div *ngIf="!selectedInsuranceType" class="type-selection-section">
        <div class="container">
          <h2>Choisissez votre type d'assurance</h2>
          <div class="insurance-types-grid">
            <div 
              *ngFor="let type of insuranceTypes"
              (click)="selectInsuranceType(type.id)"
              class="insurance-type-card"
              [class]="type.color">
              
              <div class="card-image" *ngIf="getInsuranceTypeImage(type.id)">
                <img 
                  [src]="getInsuranceTypeImage(type.id)" 
                  [alt]="type.name"
                  loading="lazy"
                  (error)="onImageError($event)"
                  class="type-image">
              </div>
              
              <div class="type-icon">{{ type.icon }}</div>
              <h3>{{ type.name }}</h3>
              <p>{{ type.description }}</p>
              
              <!-- Badge populaire pour certains types -->
              <div 
                *ngIf="isPopularType(type.id)" 
                class="popular-badge">
                Populaire
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps Section -->
      <div *ngIf="selectedInsuranceType" class="steps-section">
        <div class="container">
          <!-- Progress Indicator -->
          <div class="progress-indicator">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                [style.width.%]="getProgressPercentage()">
              </div>
            </div>
            <div class="progress-steps">
              <div 
                *ngFor="let step of getStepsConfig(); let i = index" 
                class="progress-step"
                [class.active]="currentStep >= i"
                [class.completed]="currentStep > i">
                <span class="step-number">{{ i + 1 }}</span>
                <span class="step-label">{{ step.title }}</span>
              </div>
            </div>
          </div>

          <!-- Step Content -->
          <div class="step-content">
            <div *ngIf="isLoading" class="loading-state">
              <div class="spinner"></div>
              <p>Chargement...</p>
            </div>

            <div *ngIf="!isLoading && !simulationResults">
              <ng-container [ngSwitch]="selectedInsuranceType">
                <!-- Auto Steps -->
                <div *ngSwitchCase="'auto'">
                  <div [ngSwitch]="currentStep">
                    <!-- Step 1: Vehicle Info -->
                    <div *ngSwitchCase="0" class="step-form">
                      <h3>Informations sur votre véhicule</h3>
                      <form [formGroup]="insuranceForm" class="form-grid">
                        <div class="form-group">
                          <label for="vehicleCategory">Catégorie de véhicule *</label>
                          <select 
                            formControlName="vehicleCategory" 
                            id="vehicleCategory"
                            class="form-select">
                            <option value="">Sélectionnez une catégorie</option>
                            <option value="particulier">Véhicule particulier</option>
                            <option value="utilitaire">Véhicule utilitaire</option>
                            <option value="transport">Transport en commun</option>
                            <option value="moto">Moto/Scooter</option>
                          </select>
                        </div>

                        <div class="form-group">
                          <label for="fuelType">Carburation *</label>
                          <select 
                            formControlName="fuelType" 
                            id="fuelType"
                            class="form-select">
                            <option value="">Type de carburant</option>
                            <option value="essence">Essence</option>
                            <option value="diesel">Diesel</option>
                            <option value="hybride">Hybride</option>
                            <option value="electrique">Électrique</option>
                          </select>
                        </div>

                        <div class="form-group">
                          <label for="fiscalPower">Puissance fiscale (CV) *</label>
                          <input 
                            type="number"
                            formControlName="fiscalPower"
                            id="fiscalPower"
                            class="form-input"
                            placeholder="Ex: 8">
                        </div>

                        <div class="form-group">
                          <label for="firstRegistration">Date de 1ère mise en circulation *</label>
                          <input 
                            type="date"
                            formControlName="firstRegistration"
                            id="firstRegistration"
                            class="form-input">
                        </div>

                        <div class="form-group">
                          <label for="seats">Nombre de places *</label>
                          <select 
                            formControlName="seats" 
                            id="seats"
                            class="form-select">
                            <option value="">Nombre de places</option>
                            <option value="2">2 places</option>
                            <option value="3">3 places</option>
                            <option value="4">4 places</option>
                            <option value="5">5 places</option>
                            <option value="7">7 places</option>
                            <option value="9">9 places</option>
                          </select>
                        </div>

                        <div class="form-group">
                          <label for="vehicleValue">Valeur du véhicule (FCFA) *</label>
                          <input 
                            type="number"
                            formControlName="vehicleValue"
                            id="vehicleValue"
                            class="form-input"
                            placeholder="Ex: 15000000">
                        </div>

                        <div class="form-group">
                          <label for="city">Ville de circulation principale *</label>
                          <select 
                            formControlName="city" 
                            id="city"
                            class="form-select">
                            <option value="">Choisissez votre ville</option>
                            <option value="libreville">Libreville (Estuaire)</option>
                            <option value="port-gentil">Port-Gentil (Ogooué-Maritime)</option>
                            <option value="franceville">Franceville (Haut-Ogooué)</option>
                            <option value="oyem">Oyem (Woleu-Ntem)</option>
                            <option value="lambarene">Lambaréné (Moyen-Ogooué)</option>
                            <option value="mouila">Mouila (Ngounié)</option>
                            <option value="tchibanga">Tchibanga (Nyanga)</option>
                            <option value="koulamoutou">Koulamoutou (Ogooué-Lolo)</option>
                            <option value="makokou">Makokou (Ogooué-Ivindo)</option>
                          </select>
                        </div>

                        <div class="form-group">
                          <label for="age">Votre âge *</label>
                          <input 
                            type="number"
                            formControlName="age"
                            id="age"
                            class="form-input"
                            placeholder="Ex: 35"
                            min="18" max="80">
                        </div>
                      </form>
                    </div>

                    <!-- Step 2: Guarantees -->
                    <div *ngSwitchCase="1" class="step-form">
                      <h3>Choisissez vos garanties</h3>
                      <div class="guarantees-list">
                        <div 
                          *ngFor="let guarantee of getAutoGuarantees()" 
                          class="guarantee-item"
                          [class.required]="guarantee.required">
                          <div class="guarantee-checkbox">
                            <input
                              type="checkbox"
                              [id]="guarantee.id"
                              [checked]="isGuaranteeSelected(guarantee.id) || guarantee.required"
                              [disabled]="guarantee.required"
                              (change)="toggleGuarantee(guarantee.id, $event)">
                          </div>
                          <div class="guarantee-content">
                            <label [for]="guarantee.id" class="guarantee-name">
                              {{ guarantee.name }}
                              <span *ngIf="guarantee.required" class="required-mark">*</span>
                            </label>
                            <p class="guarantee-desc">{{ guarantee.description }}</p>
                          </div>
                          <div class="guarantee-icon" *ngIf="assetPaths.decorative.checkCircle">
                            <img 
                              [src]="assetPaths.decorative.checkCircle" 
                              alt="Garantie"
                              class="check-icon"
                              (error)="onImageError($event)">
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Step 3: Insurers Selection -->
                    <div *ngSwitchCase="2" class="step-form">
                      <h3>Sélectionnez les assureurs à comparer</h3>
                      <div *ngIf="isLoadingCompanies" class="loading-state">
                        <div class="spinner"></div>
                        <p>Chargement des assureurs...</p>
                      </div>
                      
                      <div *ngIf="!isLoadingCompanies" class="insurers-grid">
                        <div 
                          *ngFor="let company of availableCompanies" 
                          class="insurer-card"
                          [class.selected]="isInsurerSelected(company.id)"
                          (click)="toggleInsurer(company.id)">
                          
                          <div class="insurer-header">
                            <img 
                              *ngIf="company.logo_url || getCompanyLogo(company.id)" 
                              [src]="company.logo_url || getCompanyLogo(company.id)" 
                              [alt]="company.name"
                              class="insurer-logo"
                              (error)="onImageError($event)"
                              loading="lazy">
                            <div class="insurer-info">
                              <h4>{{ company.name }}</h4>
                              <p>{{ company.full_name }}</p>
                            </div>
                          </div>

                          <div class="insurer-rating" *ngIf="company.rating">
                            <div class="stars">
                              <span 
                                *ngFor="let star of getStarsArray(company.rating)" 
                                class="star">★</span>
                            </div>
                            <span class="rating-text">{{ company.rating }}/5</span>
                          </div>

                          <div class="insurer-contact">
                            <p><strong>Téléphone:</strong> {{ company.contact_phone || 'Non disponible' }}</p>
                            <p><strong>Email:</strong> {{ company.contact_email || 'Non disponible' }}</p>
                          </div>

                          <div class="selection-indicator">
                            <span *ngIf="isInsurerSelected(company.id)" class="selected-text">✓ Sélectionné</span>
                            <span *ngIf="!isInsurerSelected(company.id)" class="select-text">Cliquer pour sélectionner</span>
                          </div>
                        </div>
                      </div>

                      <div class="selection-summary" *ngIf="selectedInsurers.length > 0">
                        <p><strong>{{ selectedInsurers.length }}</strong> assureur(s) sélectionné(s) pour comparaison</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Habitation Steps -->
                <div *ngSwitchCase="'habitation'">
                  <div [ngSwitch]="currentStep">
                    <!-- Step 1: Property Info -->
                    <div *ngSwitchCase="0" class="step-form">
                      <h3>Informations sur votre logement</h3>
                      <form [formGroup]="insuranceForm" class="form-grid">
                        <div class="form-group">
                          <label for="propertyType">Type de logement *</label>
                          <select 
                            formControlName="propertyType" 
                            id="propertyType"
                            class="form-select">
                            <option value="">Sélectionnez le type</option>
                            <option value="appartement">Appartement</option>
                            <option value="maison">Maison individuelle</option>
                            <option value="villa">Villa</option>
                            <option value="duplex">Duplex</option>
                            <option value="studio">Studio</option>
                          </select>
                        </div>

                        <div class="form-group">
                          <label for="surface">Surface habitable (m²) *</label>
                          <input 
                            type="number"
                            formControlName="surface"
                            id="surface"
                            class="form-input"
                            placeholder="Ex: 120">
                        </div>

                        <div class="form-group">
                          <label for="propertyValue">Valeur du bien (FCFA) *</label>
                          <input 
                            type="number"
                            formControlName="propertyValue"
                            id="propertyValue"
                            class="form-input"
                            placeholder="Ex: 50000000">
                        </div>

                        <div class="form-group">
                          <label for="constructionYear">Année de construction *</label>
                          <input 
                            type="number"
                            formControlName="constructionYear"
                            id="constructionYear"
                            class="form-input"
                            placeholder="Ex: 2015"
                            [min]="1900" 
                            [max]="currentYear">
                        </div>

                        <div class="form-group">
                          <label for="city">Ville *</label>
                          <select 
                            formControlName="city" 
                            id="city"
                            class="form-select">
                            <option value="">Choisissez votre ville</option>
                            <option value="libreville">Libreville (Estuaire)</option>
                            <option value="port-gentil">Port-Gentil (Ogooué-Maritime)</option>
                            <option value="franceville">Franceville (Haut-Ogooué)</option>
                            <option value="oyem">Oyem (Woleu-Ntem)</option>
                            <option value="lambarene">Lambaréné (Moyen-Ogooué)</option>
                            <option value="mouila">Mouila (Ngounié)</option>
                            <option value="tchibanga">Tchibanga (Nyanga)</option>
                            <option value="koulamoutou">Koulamoutou (Ogooué-Lolo)</option>
                            <option value="makokou">Makokou (Ogooué-Ivindo)</option>
                          </select>
                        </div>

                        <div class="form-group">
                          <label for="securityLevel">Niveau de sécurité *</label>
                          <select 
                            formControlName="securityLevel" 
                            id="securityLevel"
                            class="form-select">
                            <option value="">Niveau de sécurité</option>
                            <option value="basic">Basique (serrures standard)</option>
                            <option value="standard">Standard (alarme)</option>
                            <option value="high">Renforcé (gardiennage, caméras)</option>
                          </select>
                        </div>

                        <div class="form-group">
                          <label for="occupancy">Type d'occupation *</label>
                          <select 
                            formControlName="occupancy" 
                            id="occupancy"
                            class="form-select">
                            <option value="">Type d'occupation</option>
                            <option value="primary">Résidence principale</option>
                            <option value="secondary">Résidence secondaire</option>
                            <option value="rental">Bien en location</option>
                          </select>
                        </div>

                        <div class="form-group">
                          <label for="age">Votre âge *</label>
                          <input 
                            type="number"
                            formControlName="age"
                            id="age"
                            class="form-input"
                            placeholder="Ex: 35"
                            min="18" max="80">
                        </div>
                      </form>
                    </div>

                    <!-- Step 2: Guarantees -->
                    <div *ngSwitchCase="1" class="step-form">
                      <h3>Choisissez vos garanties</h3>
                      <div class="guarantees-list">
                        <div 
                          *ngFor="let guarantee of getHabitationGuarantees()" 
                          class="guarantee-item"
                          [class.required]="guarantee.required">
                          <div class="guarantee-checkbox">
                            <input
                              type="checkbox"
                              [id]="guarantee.id"
                              [checked]="isGuaranteeSelected(guarantee.id) || guarantee.required"
                              [disabled]="guarantee.required"
                              (change)="toggleGuarantee(guarantee.id, $event)">
                          </div>
                          <div class="guarantee-content">
                            <label [for]="guarantee.id" class="guarantee-name">
                              {{ guarantee.name }}
                              <span *ngIf="guarantee.required" class="required-mark">*</span>
                            </label>
                            <p class="guarantee-desc">{{ guarantee.description }}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Step 3: Insurers -->
                    <div *ngSwitchCase="2" class="step-form">
                      <h3>Sélectionnez les assureurs à comparer</h3>
                      <div *ngIf="isLoadingCompanies" class="loading-state">
                        <div class="spinner"></div>
                        <p>Chargement des assureurs...</p>
                      </div>
                      
                      <div *ngIf="!isLoadingCompanies" class="insurers-grid">
                        <div 
                          *ngFor="let company of availableCompanies" 
                          class="insurer-card"
                          [class.selected]="isInsurerSelected(company.id)"
                          (click)="toggleInsurer(company.id)">
                          
                          <div class="insurer-header">
                            <img 
                              *ngIf="company.logo_url || getCompanyLogo(company.id)" 
                              [src]="company.logo_url || getCompanyLogo(company.id)" 
                              [alt]="company.name"
                              class="insurer-logo"
                              (error)="onImageError($event)"
                              loading="lazy">
                            <div class="insurer-info">
                              <h4>{{ company.name }}</h4>
                              <p>{{ company.full_name }}</p>
                            </div>
                          </div>

                          <div class="insurer-rating" *ngIf="company.rating">
                            <div class="stars">
                              <span 
                                *ngFor="let star of getStarsArray(company.rating)" 
                                class="star">★</span>
                            </div>
                            <span class="rating-text">{{ company.rating }}/5</span>
                          </div>

                          <div class="selection-indicator">
                            <span *ngIf="isInsurerSelected(company.id)" class="selected-text">✓ Sélectionné</span>
                            <span *ngIf="!isInsurerSelected(company.id)" class="select-text">Cliquer pour sélectionner</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Autres types d'assurance similaires... -->
                <div *ngSwitchDefault>
                  <div class="generic-step">
                    <p>Configuration pour {{ selectedInsuranceType }} en cours de développement...</p>
                  </div>
                </div>
              </ng-container>
            </div>

            <!-- Results -->
            <!-- Results -->
            <div *ngIf="simulationResults && !isLoading" class="results-section">
              <h3>Résultats de votre comparaison</h3>
              
              <!-- Main Quote -->
              <div class="main-quote-card">
                <div class="quote-header">
                  <h4>{{ simulationResults.product_name }}</h4>
                  <span class="company-badge">{{ simulationResults.company_name }}</span>
                  <div class="best-offer-badge">Meilleur tarif</div>
                </div>

                <div class="quote-pricing">
                  <div class="price-display">
                    <div class="monthly-price">
                      <span class="amount">{{ formatCurrency(simulationResults.monthly_premium) }}</span>
                      <span class="period">/mois</span>
                    </div>
                    <div class="annual-price">
                      {{ formatCurrency(simulationResults.annual_premium) }}/an
                    </div>
                  </div>
                  <div class="deductible-info">
                    <span class="label">Franchise:</span>
                    <span class="value">{{ formatCurrency(simulationResults.deductible) }}</span>
                  </div>
                </div>

                <div class="quote-actions">
                  <button 
                    (click)="openApplicationModal(simulationResults)" 
                    class="btn-primary">
                    Souscrire maintenant
                  </button>
                  <button 
                    (click)="downloadQuote(simulationResults)" 
                    class="btn-outline">
                    Télécharger
                  </button>
                </div>
              </div>

              <!-- Alternative Quotes -->
              <div *ngIf="simulationResults.quotes && simulationResults.quotes.length > 0" class="alternative-quotes">
                <h4>Autres offres</h4>
                <div class="quotes-grid">
                  <div *ngFor="let quote of simulationResults.quotes" class="quote-card">
                    <div class="quote-header">
                      <h5>{{ quote.product_name }}</h5>
                      <div class="company-name">{{ quote.company_name }}</div>
                    </div>

                    <div class="quote-price">
                      <div class="monthly">{{ formatCurrency(quote.monthly_premium) }}/mois</div>
                      <div class="deductible">Franchise: {{ formatCurrency(quote.deductible) }}</div>
                    </div>

                    <div class="quote-advantages" *ngIf="quote.advantages && quote.advantages.length > 0">
                      <ul>
                        <li *ngFor="let advantage of quote.advantages.slice(0, 2)">{{ advantage }}</li>
                      </ul>
                    </div>

                    <button 
                      (click)="openApplicationModal(quote)" 
                      class="btn-secondary btn-small">
                      Souscrire
                    </button>
                  </div>
                </div>
              </div>

              <!-- Recommendations -->
              <div *ngIf="simulationResults.recommendations && simulationResults.recommendations.length > 0" 
                   class="recommendations-section">
                <h4>Conseils</h4>
                <div class="recommendations-list">
                  <div *ngFor="let recommendation of simulationResults.recommendations.slice(0, 3)" 
                       class="recommendation-item">
                    <span class="recommendation-icon">💡</span>
                    <p>{{ recommendation }}</p>
                  </div>
                </div>
              </div>
            </div>

          <!-- Navigation -->
          <div class="step-navigation">
            <button 
              *ngIf="currentStep > 0 || selectedInsuranceType"
              (click)="previousStep()" 
              class="btn-secondary">
              <span class="icon">←</span> Précédent
            </button>
            
            <button 
              *ngIf="!simulationResults && canProceedToNextStep()"
              (click)="nextStep()" 
              [disabled]="isLoading"
              class="btn-primary">
              {{ getNextButtonText() }} <span class="icon">→</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Application Modal -->
      <app-insurance-application-modal
        [isVisible]="showApplicationModal"
        [quoteData]="selectedQuoteForApplication"
        [productData]="selectedProductForApplication"
        (closeModal)="closeApplicationModal()"
        (applicationSubmitted)="onApplicationSubmitted($event)">
      </app-insurance-application-modal>
    </div>
  `,
  styleUrls: ['./insurance-comparator.component.scss']
})
export class InsuranceComparatorComponent implements OnInit, OnDestroy {
  // Propriétés du composant
  selectedInsuranceType: string = '';
  currentStep: number = 0;
  insuranceForm!: FormGroup;
  selectedGuarantees: string[] = [];
  selectedInsurers: string[] = [];
  simulationResults: SimulationResult | null = null;
  isLoading = false;
  isLoadingCompanies = false;
  showApplicationModal = false;
  selectedQuoteForApplication: any = null;
  selectedProductForApplication: any = null;
  availableProducts: InsuranceProductInfo[] = [];
  availableCompanies: InsuranceCompanyInfo[] = [];

  private destroy$ = new Subject<void>();
  
  // Année courante pour la validation
  currentYear = new Date().getFullYear();

  // Configuration des chemins d'assets
  readonly assetPaths: AssetPaths = {
    hero: '/assets/images/insurance-hero.png',
    heroBackground: '/assets/images/hero-background.png',
    icons: {
      auto: '/assets/images/icons/car-icon.png',
      habitation: '/assets/images/icons/home.png',
      vie: '/assets/images/icons/life-icon.png',
      sante: '/assets/images/icons/health-icon.png',
      voyage: '/assets/images/icons/travel-icon.png',
      transport: '/assets/images/icons/truck-icon.png'
    },
    decorative: {
      shield: '/assets/images/decorative/shield-pattern.png',
      checkCircle: '/assets/images/decorative/check-circle.png',
      stars: '/assets/images/decorative/stars-rating.png'
    },
    logos: {
      ogar: '/assets/images/logos/ogar-logo.png',
      saham: '/assets/images/logos/saham-logo.png',
      axa: '/assets/images/logos/axa-logo.png',
      allianz: '/assets/images/logos/allianz-logo.png',
      nsia: '/assets/images/logos/nsia-logo.png'
    }
  };

  // Types d'assurance disponibles avec images
  insuranceTypes: InsuranceType[] = [
    { 
      id: 'auto', 
      name: 'Automobile', 
      description: 'Protégez votre véhicule contre tous les risques', 
      icon: '', 
      color: 'auto-type',
      imageUrl: this.assetPaths.icons['auto']
    },
    { 
      id: 'habitation', 
      name: 'Habitation', 
      description: 'Assurance multirisque habitation complète', 
      icon: '', 
      color: 'habitation-type',
      imageUrl: this.assetPaths.icons['habitation']
    },
    { 
      id: 'vie', 
      name: 'Vie', 
      description: 'Assurance vie et épargne pour votre famille', 
      icon: '', 
      color: 'vie-type',
      imageUrl: this.assetPaths.icons['vie']
    },
    { 
      id: 'sante', 
      name: 'Santé', 
      description: 'Complémentaire santé premium', 
      icon: '', 
      color: 'sante-type',
      imageUrl: this.assetPaths.icons['sante']
    },
    { 
      id: 'voyage', 
      name: 'Voyage', 
      description: 'Assistance voyage internationale 24h/24', 
      icon: '', 
      color: 'voyage-type',
      imageUrl: this.assetPaths.icons['voyage']
    },
    { 
      id: 'transport', 
      name: 'Transport', 
      description: 'Assurance transport de marchandises', 
      icon: '', 
      color: 'transport-type',
      imageUrl: this.assetPaths.icons['transport']
    }
  ];

  // Types populaires
  private popularTypes = ['auto', 'habitation'];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.trackPageView();
    this.preloadImages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Méthodes de gestion des images
  getInsuranceTypeImage(typeId: string): string {
    return this.assetPaths.icons[typeId] || '';
  }

  getCompanyLogo(companyId: string): string {
    return this.assetPaths.logos[companyId] || '';
  }

  isPopularType(typeId: string): boolean {
    return this.popularTypes.includes(typeId);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Fallback vers une image par défaut ou masquer l'image
    img.style.display = 'none';
    console.warn('Image failed to load:', img.src);
  }

  private preloadImages(): void {
    // Préchargement des images critiques
    const criticalImages = [
      this.assetPaths.hero,
      ...Object.values(this.assetPaths.icons),
      ...Object.values(this.assetPaths.decorative)
    ];

    criticalImages.forEach(src => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }

  private initializeForm(): void {
    this.insuranceForm = this.fb.group({
      // Champs communs
      age: [35, [Validators.required, Validators.min(18), Validators.max(80)]],
      city: ['', Validators.required],

      // Auto
      vehicleCategory: [''],
      fuelType: [''],
      fiscalPower: [''],
      firstRegistration: [''],
      seats: [''],
      vehicleValue: [''],

      // Habitation
      propertyType: [''],
      surface: [''],
      propertyValue: [''],
      constructionYear: [''],
      securityLevel: [''],
      occupancy: [''],

      // Vie
      coverageAmount: [''],
      healthStatus: [''],
      smokingStatus: [''],
      beneficiaries: [''],

      // Santé
      familySize: [''],
      medicalHistory: [''],
      coverageLevel: [''],
      hospitalization: [''],

      // Voyage
      destination: [''],
      duration: [''],
      activities: [''],
      travelFrequency: [''],

      // Transport
      cargoType: [''],
      cargoValue: [''],
      transportMode: [''],
      coverage: ['']
    });
  }

  // Méthodes de navigation et sélection
  selectInsuranceType(type: string): void {
    this.selectedInsuranceType = type;
    this.currentStep = 0;
    this.resetForm();
    this.loadInsuranceData();
    
    this.analyticsService.trackEvent('insurance_type_selected', {
      type: type,
      has_image: !!this.getInsuranceTypeImage(type)
    });
  }

  nextStep(): void {
    if (this.currentStep === this.getStepsConfig().length - 1) {
      this.handleSimulation();
    } else {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    } else {
      this.selectedInsuranceType = '';
      this.currentStep = 0;
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.insuranceForm.reset();
    this.selectedGuarantees = [];
    this.selectedInsurers = [];
    this.simulationResults = null;
  }

  // Méthodes pour les garanties
  getAutoGuarantees() {
    return [
      { id: 'responsabilite_civile', name: 'Responsabilité civile', description: 'Obligatoire - Dommages causés aux tiers', required: true },
      { id: 'dommages_collision', name: 'Dommages collision', description: 'Réparation de votre véhicule en cas d\'accident', required: false },
      { id: 'vol', name: 'Vol', description: 'Protection contre le vol du véhicule', required: false },
      { id: 'incendie', name: 'Incendie', description: 'Dommages causés par le feu', required: false },
      { id: 'bris_glace', name: 'Bris de glace', description: 'Réparation/remplacement des vitres', required: false },
      { id: 'assistance', name: 'Assistance', description: 'Dépannage et remorquage 24h/24', required: false }
    ];
  }

  getHabitationGuarantees() {
    return [
      { id: 'incendie', name: 'Incendie/Explosion', description: 'Protection contre les dégâts d\'incendie', required: true },
      { id: 'degats_eaux', name: 'Dégâts des eaux', description: 'Fuites, ruptures de canalisations', required: false },
      { id: 'vol', name: 'Vol/Cambriolage', description: 'Protection des biens mobiliers', required: false },
      { id: 'responsabilite_civile', name: 'Responsabilité civile', description: 'Dommages causés aux tiers', required: false },
      { id: 'catastrophes_naturelles', name: 'Catastrophes naturelles', description: 'Événements climatiques exceptionnels', required: false },
      { id: 'bris_glace', name: 'Bris de glace', description: 'Vitres, miroirs, sanitaires', required: false }
    ];
  }

  toggleGuarantee(guaranteeId: string, event: any): void {
    if (event.target.checked) {
      if (!this.selectedGuarantees.includes(guaranteeId)) {
        this.selectedGuarantees.push(guaranteeId);
      }
    } else {
      this.selectedGuarantees = this.selectedGuarantees.filter(g => g !== guaranteeId);
    }
  }

  isGuaranteeSelected(guaranteeId: string): boolean {
    return this.selectedGuarantees.includes(guaranteeId);
  }

  // Méthodes pour les assureurs
  toggleInsurer(insurerId: string): void {
    if (this.isInsurerSelected(insurerId)) {
      this.selectedInsurers = this.selectedInsurers.filter(id => id !== insurerId);
    } else {
      this.selectedInsurers.push(insurerId);
    }
  }

  isInsurerSelected(insurerId: string): boolean {
    return this.selectedInsurers.includes(insurerId);
  }

  // Chargement des données depuis l'API
  private loadInsuranceData(): void {
    this.isLoadingCompanies = true;
    
    this.apiService.getInsuranceProducts({ 
      insurance_type: this.selectedInsuranceType 
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (products: InsuranceProductInfo[]) => {
        this.availableProducts = products;
        this.extractUniqueCompanies(products);
        this.isLoadingCompanies = false;
      },
      error: (error) => {
        console.error('Erreur chargement produits:', error);
        this.isLoadingCompanies = false;
        this.notificationService.showError('Impossible de charger les données d\'assurance');
      }
    });
  }

  private extractUniqueCompanies(products: InsuranceProductInfo[]): void {
    const companiesMap = new Map<string, InsuranceCompanyInfo>();
    
    products.forEach(product => {
      if (product.company && !companiesMap.has(product.company.id)) {
        companiesMap.set(product.company.id, {
          id: product.company.id,
          name: product.company.name,
          full_name: product.company.full_name || product.company.name,
          logo_url: product.company.logo_url || this.getCompanyLogo(product.company.id),
          rating: product.company.rating || 4.0,
          solvency_ratio: product.company.solvency_ratio,
          contact_phone: product.company.contact_phone || '+241 01 00 00 00',
          contact_email: product.company.contact_email || 'contact@assurance.ga',
          specialties: [this.selectedInsuranceType]
        });
      }
    });
    
    this.availableCompanies = Array.from(companiesMap.values());
  }

  // Simulation
  private handleSimulation(): void {
    if (!this.canProceedToNextStep()) {
      this.notificationService.showError('Veuillez remplir tous les champs requis');
      return;
    }

    this.isLoading = true;

    const simulationData = {
      insurance_type: this.selectedInsuranceType,
      age: this.insuranceForm.get('age')?.value || 35,
      risk_factors: this.buildRiskFactors(),
      selected_insurers: this.selectedInsurers,
      guarantees: this.selectedGuarantees
    };

    this.apiService.getInsuranceQuote(simulationData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: any) => {
          this.simulationResults = this.transformApiResponse(results);
          this.isLoading = false;
          this.notificationService.showSuccess('Simulation réalisée avec succès !');
          this.trackSimulation();
        },
        error: (error) => {
          console.error('Erreur simulation:', error);
          this.isLoading = false;
          this.notificationService.showError('Erreur lors de la simulation');
        }
      });
  }

  private buildRiskFactors(): any {
    const formData = this.insuranceForm.value;
    const riskFactors: any = {
      city: formData.city,
      guarantees: this.selectedGuarantees
    };

    switch (this.selectedInsuranceType) {
      case 'auto':
        Object.assign(riskFactors, {
          vehicle_category: formData.vehicleCategory,
          fuel_type: formData.fuelType,
          fiscal_power: formData.fiscalPower,
          first_registration: formData.firstRegistration,
          seats: formData.seats,
          vehicle_value: formData.vehicleValue
        });
        break;

      case 'habitation':
        Object.assign(riskFactors, {
          property_type: formData.propertyType,
          surface: formData.surface,
          property_value: formData.propertyValue,
          construction_year: formData.constructionYear,
          security_level: formData.securityLevel,
          occupancy: formData.occupancy
        });
        break;

      case 'vie':
        Object.assign(riskFactors, {
          coverage_amount: formData.coverageAmount,
          health_status: formData.healthStatus,
          smoking_status: formData.smokingStatus,
          beneficiaries: formData.beneficiaries
        });
        break;

      case 'sante':
        Object.assign(riskFactors, {
          family_size: formData.familySize,
          medical_history: formData.medicalHistory,
          coverage_level: formData.coverageLevel,
          hospitalization: formData.hospitalization
        });
        break;

      case 'voyage':
        Object.assign(riskFactors, {
          destination: formData.destination,
          duration: formData.duration,
          activities: formData.activities,
          travel_frequency: formData.travelFrequency
        });
        break;

      case 'transport':
        Object.assign(riskFactors, {
          cargo_type: formData.cargoType,
          cargo_value: formData.cargoValue,
          transport_mode: formData.transportMode,
          coverage: formData.coverage
        });
        break;
    }

    return riskFactors;
  }

  private transformApiResponse(apiResponse: any): SimulationResult {
    return {
      quote_id: apiResponse.quote_id || this.generateQuoteId(),
      product_name: apiResponse.product_name || `Assurance ${this.selectedInsuranceType}`,
      company_name: apiResponse.company_name || 'Simulateur Bamboo',
      insurance_type: this.selectedInsuranceType,
      monthly_premium: apiResponse.monthly_premium || 0,
      annual_premium: apiResponse.annual_premium || 0,
      deductible: apiResponse.deductible || 50000,
      coverage_details: apiResponse.coverage_details || {},
      exclusions: apiResponse.exclusions || [],
      valid_until: apiResponse.valid_until || this.getValidUntilDate(),
      recommendations: apiResponse.recommendations || this.getDefaultRecommendations(),
      quotes: this.generateAlternativeQuotes(apiResponse.quotes || [])
    };
  }

  private generateAlternativeQuotes(quotes: any[]): QuoteOption[] {
    if (quotes.length === 0) {
      return this.selectedInsurers.slice(1, 4).map(insurerId => {
        const company = this.availableCompanies.find(c => c.id === insurerId);
        return this.createMockQuote(company ? { ...company, full_name: company.full_name || '' } : undefined);
      });
    }
    
    return quotes.map(quote => ({
      company_name: quote.company_name,
      product_name: quote.product_name,
      monthly_premium: quote.monthly_premium,
      annual_premium: quote.annual_premium,
      deductible: quote.deductible,
      rating: quote.rating || 4.0,
      advantages: quote.advantages || []
    }));
  }

  private createMockQuote(company: InsuranceCompany | undefined): QuoteOption {
    const basePremium = Math.random() * 100000 + 50000;
    return {
      company_name: company?.name || 'Assureur',
      product_name: `${this.selectedInsuranceType} ${company?.name || 'Standard'}`,
      monthly_premium: Math.round(basePremium / 12),
      annual_premium: Math.round(basePremium),
      deductible: 50000,
      rating: company?.rating || 4.0,
      advantages: ['Service de qualité', 'Tarifs compétitifs', 'Réseau étendu']
    };
  }

  // Méthodes utilitaires
  getStepsConfig(): StepConfig[] {
    const configs: { [key: string]: StepConfig[] } = {
      auto: [
        { title: 'Véhicule', subtitle: 'Informations sur votre véhicule' },
        { title: 'Garanties', subtitle: 'Choisissez vos garanties' },
        { title: 'Assureurs', subtitle: 'Sélectionnez les assureurs à comparer' }
      ],
      habitation: [
        { title: 'Logement', subtitle: 'Informations sur votre logement' },
        { title: 'Garanties', subtitle: 'Choisissez vos garanties' },
        { title: 'Assureurs', subtitle: 'Sélectionnez les assureurs à comparer' }
      ],
      vie: [
        { title: 'Profil', subtitle: 'Vos informations personnelles' },
        { title: 'Garanties', subtitle: 'Capital et bénéficiaires' },
        { title: 'Assureurs', subtitle: 'Sélectionnez les assureurs à comparer' }
      ],
      sante: [
        { title: 'Famille', subtitle: 'Composition de votre famille' },
        { title: 'Garanties', subtitle: 'Niveaux de couverture' },
        { title: 'Assureurs', subtitle: 'Sélectionnez les assureurs à comparer' }
      ],
      voyage: [
        { title: 'Destination', subtitle: 'Informations sur votre voyage' },
        { title: 'Garanties', subtitle: 'Type de couverture' },
        { title: 'Assureurs', subtitle: 'Sélectionnez les assureurs à comparer' }
      ],
      transport: [
        { title: 'Marchandises', subtitle: 'Type de marchandises transportées' },
        { title: 'Garanties', subtitle: 'Niveaux de couverture' },
        { title: 'Assureurs', subtitle: 'Sélectionnez les assureurs à comparer' }
      ]
    };

    return configs[this.selectedInsuranceType] || [];
  }

  getProgressPercentage(): number {
    const totalSteps = this.getStepsConfig().length;
    return totalSteps > 0 ? ((this.currentStep + 1) / totalSteps) * 100 : 0;
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 0:
        return this.isStep1Valid();
      case 1:
        return this.selectedGuarantees.length > 0;
      case 2:
        return this.selectedInsurers.length > 0;
      default:
        return false;
    }
  }

  private isStep1Valid(): boolean {
    const requiredFields = this.getRequiredFieldsForCurrentType();
    return requiredFields.every(field => {
      const control = this.insuranceForm.get(field);
      return control && control.valid && control.value;
    });
  }

  private getRequiredFieldsForCurrentType(): string[] {
    const fieldsByType: { [key: string]: string[] } = {
      auto: ['age', 'vehicleCategory', 'fuelType', 'vehicleValue', 'city'],
      habitation: ['age', 'propertyType', 'propertyValue', 'city'],
      vie: ['age', 'coverageAmount'],
      sante: ['age', 'familySize'],
      voyage: ['age', 'destination', 'duration'],
      transport: ['age', 'cargoType', 'cargoValue']
    };

    return fieldsByType[this.selectedInsuranceType] || ['age'];
  }

  getNextButtonText(): string {
    const totalSteps = this.getStepsConfig().length;
    if (this.currentStep === totalSteps - 1) {
      return this.isLoading ? 'Simulation en cours...' : 'Lancer la simulation';
    }
    return 'Suivant';
  }

  // Modal application
  openApplicationModal(quoteData: any): void {
    this.selectedQuoteForApplication = quoteData;
    this.selectedProductForApplication = {
      id: quoteData.quote_id || 'quote_temp',
      name: quoteData.product_name,
      type: this.selectedInsuranceType,
      description: `Assurance ${this.selectedInsuranceType}`,
      insurance_company: {
        id: quoteData.company_id || 'company_temp',
        name: quoteData.company_name,
        contact_phone: '+241 01 00 00 00',
        contact_email: 'contact@assurance.ga'
      }
    };
    
    this.showApplicationModal = true;
  }

  closeApplicationModal(): void {
    this.showApplicationModal = false;
    this.selectedQuoteForApplication = null;
    this.selectedProductForApplication = null;
  }

  onApplicationSubmitted(notification: any): void {
    console.log('Demande d\'assurance soumise:', notification);
    
    this.analyticsService.trackEvent('insurance_application_submitted', {
      application_id: notification.application_id,
      insurance_type: this.selectedInsuranceType,
      company_name: notification.contact_info?.company_name,
      has_images: true
    });

    this.notificationService.showSuccess(
      `Votre demande d'assurance a été transmise avec succès ! Numéro de dossier: ${notification.application_number}`
    );

    setTimeout(() => {
      this.closeApplicationModal();
    }, 3000);
  }

  // Méthodes de formatage et utilitaires
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
  }

  getStarsArray(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  downloadQuote(quote: any): void {
    const quoteContent = this.generateQuoteContent(quote);
    const blob = new Blob([quoteContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `devis_${this.selectedInsuranceType}_${Date.now()}.html`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    this.notificationService.showSuccess('Devis téléchargé avec succès');
  }

  private generateQuoteContent(quote: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Devis Assurance ${this.selectedInsuranceType}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin: 20px 0; }
            .highlight { background: #f0f8ff; padding: 15px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Devis d'Assurance ${this.selectedInsuranceType}</h1>
            <h2>${quote.company_name}</h2>
        </div>
        
        <div class="section highlight">
            <h3>Tarification</h3>
            <p><strong>Prime mensuelle:</strong> ${this.formatCurrency(quote.monthly_premium)}</p>
            <p><strong>Prime annuelle:</strong> ${this.formatCurrency(quote.annual_premium)}</p>
            <p><strong>Franchise:</strong> ${this.formatCurrency(quote.deductible)}</p>
        </div>
        
        <div class="section">
            <p><strong>Date de génération:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            <p><strong>Validité:</strong> 30 jours</p>
        </div>
    </body>
    </html>
    `;
  }

  // Méthodes privées utilitaires
  private generateQuoteId(): string {
    return 'quote_' + Date.now().toString();
  }

  private getValidUntilDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  }

  private getDefaultRecommendations(): string[] {
    const recommendations: { [key: string]: string[] } = {
      auto: [
        'Conduisez prudemment pour bénéficier de bonus',
        'Installez un système antivol pour réduire les risques',
        'Comparez les franchises avant de choisir'
      ],
      habitation: [
        'Installez des détecteurs de fumée',
        'Sécurisez votre domicile contre le vol',
        'Vérifiez régulièrement vos installations'
      ],
      vie: [
        'Adaptez le capital à vos besoins familiaux',
        'Déclarez votre état de santé avec précision',
        'Mettez à jour vos bénéficiaires régulièrement'
      ]
    };

    return recommendations[this.selectedInsuranceType] || [
      'Lisez attentivement les conditions générales',
      'Comparez les offres avant de choisir'
    ];
  }

  private trackPageView(): void {
    this.analyticsService.trackPageView('insurance_comparator_steps', {
      page_title: 'Comparateur d\'Assurances par Étapes',
      has_hero_image: !!this.assetPaths.hero,
      total_insurance_types: this.insuranceTypes.length
    });
  }

  private trackSimulation(): void {
    this.analyticsService.trackEvent('insurance_simulation_completed', {
      insurance_type: this.selectedInsuranceType,
      selected_insurers_count: this.selectedInsurers.length,
      selected_guarantees_count: this.selectedGuarantees.length,
      form_data: this.insuranceForm.value,
      ui_enhanced: true,
      images_loaded: true
    });
  }
}