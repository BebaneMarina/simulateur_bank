// insurance-comparator.component.ts - Version corrigée complète
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
import { PdfQuoteService, QuoteData, CustomerData } from '../../services/pdf-quote.service';
import { InsuranceApplicationModalComponent } from '../../components/application-modal/insurance-application-modal.component';
import { InsuranceFilterComponent } from './insurance-filter.component';
import { InsuranceFilterService, FilterResult, ScoredQuote } from '../../services/insurance-filter.service';
import { AutoFillService } from '../../services/auto-fill.service';


// Interfaces existantes...
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

interface ExtendedScoredQuote extends ScoredQuote {
  quote_id?: string;
  id?: string;
  contact_phone?: string;
  contact_email?: string;
  coverage_details?: any;
  exclusions?: string[];
  valid_until?: string;
  recommendations?: string[];
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
  deductible_options?: any;
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
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InsuranceApplicationModalComponent, InsuranceFilterComponent],
  template: `
 <!-- Template HTML complet corrigé avec intégration PDF -->
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
                        <option value="libreville">Libreville</option>
                        <option value="port-gentil">Port-Gentil</option>
                        <option value="franceville">Franceville</option>
                        <option value="oyem">Oyem</option>
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
                      <label for="propertyValue">Valeur du bien (FCFA) *</label>
                      <input 
                        type="number"
                        formControlName="propertyValue"
                        id="propertyValue"
                        class="form-input"
                        placeholder="Ex: 50000000">
                    </div>

                    <div class="form-group">
                      <label for="city">Ville *</label>
                      <select 
                        formControlName="city" 
                        id="city"
                        class="form-select">
                        <option value="">Choisissez votre ville</option>
                        <option value="libreville">Libreville</option>
                        <option value="port-gentil">Port-Gentil</option>
                        <option value="franceville">Franceville</option>
                        <option value="oyem">Oyem</option>
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

                      <div class="selection-indicator">
                        <span *ngIf="isInsurerSelected(company.id)" class="selected-text">✓ Sélectionné</span>
                        <span *ngIf="!isInsurerSelected(company.id)" class="select-text">Cliquer pour sélectionner</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Assurance Vie -->
            <div *ngSwitchCase="'vie'">
              <div [ngSwitch]="currentStep">
                <!-- Step 1: Profil assuré -->
                <div *ngSwitchCase="0" class="step-form">
                  <h3>Votre profil d'assuré</h3>
                  <form [formGroup]="insuranceForm" class="form-grid">
                    <div class="form-group">
                      <label for="coverageAmount">Capital souhaité (FCFA) *</label>
                      <input 
                        type="number"
                        formControlName="coverageAmount"
                        id="coverageAmount"
                        class="form-input"
                        placeholder="Ex: 50000000"
                        min="1000000">
                    </div>

                    <div class="form-group">
                      <label for="healthStatus">État de santé *</label>
                      <select 
                        formControlName="healthStatus" 
                        id="healthStatus"
                        class="form-select">
                        <option value="">Votre état de santé</option>
                        <option value="excellent">Excellent</option>
                        <option value="bon">Bon</option>
                        <option value="moyen">Moyen</option>
                        <option value="fragile">Fragile avec suivi médical</option>
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
                        min="18" max="75">
                    </div>
                  </form>
                </div>

                <!-- Step 2: Type de contrat -->
                <div *ngSwitchCase="1" class="step-form">
                  <h3>Type de contrat souhaité</h3>
                  <div class="contract-types-grid">
                    <div 
                      *ngFor="let contractType of getVieContractTypes()" 
                      class="contract-type-card"
                      [class.selected]="isContractTypeSelected(contractType.id)"
                      (click)="selectContractType(contractType.id)">
                      
                      <div class="contract-icon">{{ contractType.icon }}</div>
                      <h4>{{ contractType.name }}</h4>
                      <p>{{ contractType.description }}</p>
                      <div class="contract-price">{{ contractType.priceRange }}</div>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Garanties -->
                <div *ngSwitchCase="2" class="step-form">
                  <h3>Choisissez vos garanties</h3>
                  <div class="guarantees-list">
                    <div 
                      *ngFor="let guarantee of getVieGuarantees()" 
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

                <!-- Step 4: Assureurs -->
                <div *ngSwitchCase="3" class="step-form">
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

                      <div class="selection-indicator">
                        <span *ngIf="isInsurerSelected(company.id)" class="selected-text">✓ Sélectionné</span>
                        <span *ngIf="!isInsurerSelected(company.id)" class="select-text">Cliquer pour sélectionner</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Assurance Santé -->
            <div *ngSwitchCase="'sante'">
              <div [ngSwitch]="currentStep">
                <!-- Step 1: Composition familiale -->
                <div *ngSwitchCase="0" class="step-form">
                  <h3>Composition de votre famille</h3>
                  <form [formGroup]="insuranceForm" class="form-grid">
                    <div class="form-group">
                      <label for="familySize">Nombre de personnes à assurer *</label>
                      <select 
                        formControlName="familySize" 
                        id="familySize"
                        class="form-select"
                        (change)="onFamilySizeChange($event)">
                        <option value="">Sélectionnez</option>
                        <option value="1">Moi seul(e)</option>
                        <option value="2">Couple</option>
                        <option value="3">Couple + 1 enfant</option>
                        <option value="4">Couple + 2 enfants</option>
                        <option value="5">Couple + 3 enfants</option>
                        <option value="6">Famille nombreuse (6+)</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="coverageLevel">Niveau de couverture souhaité *</label>
                      <select 
                        formControlName="coverageLevel" 
                        id="coverageLevel"
                        class="form-select">
                        <option value="">Choisissez votre niveau</option>
                        <option value="essentiel">Essentiel (hospitalisation)</option>
                        <option value="confort">Confort (+ consultations)</option>
                        <option value="premium">Premium (couverture complète)</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="age">Âge du souscripteur *</label>
                      <input 
                        type="number"
                        formControlName="age"
                        id="age"
                        class="form-input"
                        placeholder="Ex: 35"
                        min="18" max="70">
                    </div>
                  </form>
                </div>

                <!-- Step 2: Besoins médicaux -->
                <div *ngSwitchCase="1" class="step-form">
                  <h3>Vos besoins médicaux prioritaires</h3>
                  <div class="medical-needs-grid">
                    <div 
                      *ngFor="let need of getMedicalNeeds()" 
                      class="medical-need-card"
                      [class.selected]="isMedicalNeedSelected(need.id)"
                      [class.priority]="need.priority"
                      (click)="toggleMedicalNeed(need.id)">
                      <div class="need-icon">{{ need.icon }}</div>
                      <h4>{{ need.name }}</h4>
                      <p>{{ need.description }}</p>
                      <div class="need-frequency" *ngIf="need.frequency">{{ need.frequency }}</div>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Garanties -->
                <div *ngSwitchCase="2" class="step-form">
                  <h3>Garanties recommandées</h3>
                  <div class="guarantees-list">
                    <div 
                      *ngFor="let guarantee of getSanteGuarantees()" 
                      class="guarantee-item"
                      [class.required]="guarantee.required"
                      [class.recommended]="guarantee.recommended">
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
                          <span *ngIf="guarantee.recommended" class="recommended-mark">Recommandé</span>
                        </label>
                        <p class="guarantee-desc">{{ guarantee.description }}</p>
                        <div class="guarantee-coverage" *ngIf="guarantee.coverage">
                          Prise en charge : {{ guarantee.coverage }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 4: Assureurs -->
                <div *ngSwitchCase="3" class="step-form">
                  <h3>Assureurs santé spécialisés</h3>
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
                          class="insurer-logo">
                        <div class="insurer-info">
                          <h4>{{ company.name }}</h4>
                          <p>{{ company.full_name }}</p>
                        </div>
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

            <!-- Assurance Voyage -->
            <div *ngSwitchCase="'voyage'">
              <div [ngSwitch]="currentStep">
                <!-- Step 1: Votre voyage -->
                <div *ngSwitchCase="0" class="step-form">
                  <h3>Informations sur votre voyage</h3>
                  <form [formGroup]="insuranceForm" class="form-grid">
                    <div class="form-group">
                      <label for="destination">Destination *</label>
                      <select 
                        formControlName="destination" 
                        id="destination"
                        class="form-select"
                        (change)="onDestinationChange($event)">
                        <option value="">Choisissez votre destination</option>
                        <option value="afrique">Afrique</option>
                        <option value="europe">Europe</option>
                        <option value="amerique_nord">Amérique du Nord</option>
                        <option value="amerique_sud">Amérique du Sud</option>
                        <option value="asie">Asie</option>
                        <option value="oceanie">Océanie</option>
                        <option value="mondial">Monde entier</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="duration">Durée du voyage (jours) *</label>
                      <input 
                        type="number"
                        formControlName="duration"
                        id="duration"
                        class="form-input"
                        placeholder="Ex: 14"
                        min="1" max="365">
                    </div>

                    <div class="form-group">
                      <label for="age">Âge du voyageur principal *</label>
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

                <!-- Step 2: Risques et besoins -->
                <div *ngSwitchCase="1" class="step-form">
                  <h3>Évaluez vos risques voyage</h3>
                  <div class="travel-risks-grid">
                    <div 
                      *ngFor="let risk of getTravelRisks()" 
                      class="risk-assessment-card"
                      [class.high-risk]="risk.level === 'high'"
                      [class.medium-risk]="risk.level === 'medium'"
                      [class.low-risk]="risk.level === 'low'">
                      <div class="risk-icon">{{ risk.icon }}</div>
                      <h4>{{ risk.name }}</h4>
                      <p>{{ risk.description }}</p>
                      <div class="risk-level">Risque : {{ risk.levelText }}</div>
                      <label class="risk-checkbox">
                        <input type="checkbox" [value]="risk.id" (change)="toggleTravelRisk(risk.id, $event)">
                        Me couvrir pour ce risque
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Garanties -->
                <div *ngSwitchCase="2" class="step-form">
                  <h3>Garanties voyage essentielles</h3>
                  <div class="guarantees-list">
                    <div 
                      *ngFor="let guarantee of getVoyageGuarantees()" 
                      class="guarantee-item"
                      [class.required]="guarantee.required"
                      [class.essential]="guarantee.essential">
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
                          <span *ngIf="guarantee.essential" class="essential-mark">Essentiel</span>
                        </label>
                        <p class="guarantee-desc">{{ guarantee.description }}</p>
                        <div class="guarantee-amount" *ngIf="guarantee.amount">
                          Jusqu'à {{ formatCurrency(guarantee.amount) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 4: Assureurs -->
                <div *ngSwitchCase="3" class="step-form">
                  <h3>Assureurs voyage internationaux</h3>
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
                          class="insurer-logo">
                        <div class="insurer-info">
                          <h4>{{ company.name }}</h4>
                          <p>{{ company.full_name }}</p>
                        </div>
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

            <!-- Transport Steps -->
            <div *ngSwitchCase="'transport'">
              <div [ngSwitch]="currentStep">
                <!-- Step 1: Marchandises -->
                <div *ngSwitchCase="0" class="step-form">
                  <h3>Informations sur vos marchandises</h3>
                  <form [formGroup]="insuranceForm" class="form-grid">
                    <div class="form-group">
                      <label for="cargoType">Type de marchandises *</label>
                      <select 
                        formControlName="cargoType" 
                        id="cargoType"
                        class="form-select">
                        <option value="">Sélectionnez le type</option>
                        <option value="generale">Marchandise générale</option>
                        <option value="perissable">Denrées périssables</option>
                        <option value="fragile">Produits fragiles</option>
                        <option value="dangereux">Matières dangereuses</option>
                        <option value="vehicules">Véhicules</option>
                        <option value="conteneur">Conteneurs</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="cargoValue">Valeur des marchandises (FCFA) *</label>
                      <input 
                        type="number"
                        formControlName="cargoValue"
                        id="cargoValue"
                        class="form-input"
                        placeholder="Ex: 100000000">
                    </div>

                    <div class="form-group">
                      <label for="transportMode">Mode de transport *</label>
                      <select 
                        formControlName="transportMode" 
                        id="transportMode"
                        class="form-select">
                        <option value="">Mode de transport</option>
                        <option value="routier">Transport routier</option>
                        <option value="maritime">Transport maritime</option>
                        <option value="aerien">Transport aérien</option>
                        <option value="ferroviaire">Transport ferroviaire</option>
                        <option value="multimodal">Transport multimodal</option>
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

                <!-- Step 2: Garanties -->
                <div *ngSwitchCase="1" class="step-form">
                  <h3>Choisissez vos garanties transport</h3>
                  <div class="guarantees-list">
                    <div 
                      *ngFor="let guarantee of getTransportGuarantees()" 
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

                <!-- Step 3: Assureurs -->
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

                      <div class="selection-indicator">
                        <span *ngIf="isInsurerSelected(company.id)" class="selected-text">✓ Sélectionné</span>
                        <span *ngIf="!isInsurerSelected(company.id)" class="select-text">Cliquer pour sélectionner</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- Results Section avec boutons PDF améliorés -->
        <div *ngIf="simulationResults && !isLoading" class="results-section">
          <h3>Résultats de votre comparaison</h3>
          
          <!-- Main Quote avec boutons PDF -->
          <div class="main-quote-card">
            <div class="quote-header">
              <div class="best-offer-badge">Meilleur tarif</div>
            </div>

          <!-- Alternative Quotes avec boutons PDF -->
          <div *ngIf="simulationResults.quotes && simulationResults.quotes.length > 0" class="alternative-quotes">
            <h4>offres trouvées</h4>
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

                <div class="quote-card-actions">
                  <button 
                    (click)="openApplicationModal(quote)" 
                    class="btn-secondary btn-small">
                    Souscrire
                  </button>
                  <button 
                    (click)="downloadQuote(quote)" 
                    class="btn-outline btn-small btn-pdf">
                    📄 PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Section résultats mise à jour avec corrections TypeScript -->
          <div *ngIf="filteredResults" class="enhanced-results-section">
            <h3>Offres recommandées selon vos critères</h3>
            
            <!-- Affichage optimisé de la meilleure offre avec corrections -->
            <div class="top-recommendation">
              <div class="recommendation-badge">RECOMMANDÉ POUR VOUS</div>
              <div class="offer-card premium" 
                   [class.selected]="selectedOfferForDetails?.id === getOfferUniqueId(filteredResults.bestOffer)">
                <div class="offer-header">
                  <div class="company-info">
                    <h4>{{ filteredResults.bestOffer.product_name }}</h4>
                    <p>{{ filteredResults.bestOffer.company_name }}</p>
                  </div>
                  <div class="score-display">
                    <div class="score-circle">{{ filteredResults.bestOffer.score }}</div>
                    <small>Score/100</small>
                  </div>
                </div>
                
                <div class="offer-pricing">
                  <div class="main-price">{{ formatCurrency(filteredResults.bestOffer.monthly_premium) }}<span>/mois</span></div>
                  <div class="annual-info">{{ formatCurrency(filteredResults.bestOffer.annual_premium || (filteredResults.bestOffer.monthly_premium * 12)) }} par an</div>
                </div>
                
                <div class="offer-badges">
                  <span *ngFor="let badge of filteredResults.bestOffer.badges" class="offer-badge">{{ badge }}</span>
                </div>
                
                <div class="offer-recommendation">
                  <strong>Pourquoi c'est recommandé :</strong>
                  <p>{{ filteredResults.bestOffer.recommendation }}</p>
                </div>
                
                <div class="offer-actions">
                  <button (click)="openApplicationModal(filteredResults.bestOffer)" class="btn-primary">
                    Souscrire maintenant
                  </button>
                  <button (click)="downloadQuote(filteredResults.bestOffer)" class="btn-outline">
                    PDF
                  </button>
                  <button (click)="toggleOfferDetails(filteredResults.bestOffer)" class="btn-outline">
                    {{ selectedOfferForDetails?.id === getOfferUniqueId(filteredResults.bestOffer) ? 'Masquer' : 'Détails' }}
                  </button>
                </div>
              </div>
              
              <!-- Détails étendus avec corrections -->
              <div *ngIf="selectedOfferForDetails?.id === getOfferUniqueId(filteredResults.bestOffer)" class="offer-details-expanded">
                <div class="details-grid">
                  <div class="detail-section">
                    <h5>Analyse du score</h5>
                    <div class="score-breakdown">
                      <div class="score-item">
                        <span>Prix</span>
                        <div class="score-bar">
                          <div class="fill" [style.width.%]="filteredResults.bestOffer.scoreDetails.priceScore"></div>
                        </div>
                        <span>{{ filteredResults.bestOffer.scoreDetails.priceScore }}/100</span>
                      </div>
                      <div class="score-item">
                        <span>Couverture</span>
                        <div class="score-bar">
                          <div class="fill" [style.width.%]="filteredResults.bestOffer.scoreDetails.coverageScore"></div>
                        </div>
                        <span>{{ filteredResults.bestOffer.scoreDetails.coverageScore }}/100</span>
                      </div>
                      <div class="score-item">
                        <span>Assureur</span>
                        <div class="score-bar">
                          <div class="fill" [style.width.%]="filteredResults.bestOffer.scoreDetails.ratingScore"></div>
                        </div>
                        <span>{{ filteredResults.bestOffer.scoreDetails.ratingScore }}/100</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="detail-section">
                    <h5>Informations de contact</h5>
                    <div class="contact-info">
                      <p><strong>Téléphone :</strong> {{ getOfferContactPhone(filteredResults.bestOffer) }}</p>
                      <p><strong>Email :</strong> {{ getOfferContactEmail(filteredResults.bestOffer) }}</p>
                    </div>
                  </div>
                  
                  <div class="detail-section" *ngIf="getOfferAdvantages(filteredResults.bestOffer).length > 0">
                    <h5>Avantages inclus</h5>
                    <ul class="advantages-list">
                      <li *ngFor="let advantage of getOfferAdvantages(filteredResults.bestOffer)">{{ advantage }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Autres offres classées avec corrections -->
            <div *ngIf="filteredResults.rankedOffers.length > 1" class="ranked-offers">
              <h4>Autres offres intéressantes</h4>
              <div class="offers-grid">
                <div *ngFor="let offer of filteredResults.rankedOffers.slice(1, 4)" 
                     class="offer-card standard"
                     [class.selected]="selectedOfferForDetails?.id === getOfferUniqueId(offer)">
                  <div class="offer-rank">{{ offer.rank }}</div>
                  
                  <div class="offer-content">
                    <h5>{{ offer.product_name }}</h5>
                    <p>{{ offer.company_name }}</p>
                    
                    <div class="price-score">
                      <span class="price">{{ formatCurrency(offer.monthly_premium) }}/mois</span>
                      <span class="score">{{ offer.score }}/100</span>
                    </div>
                    
                    <div class="offer-mini-badges">
                      <span *ngFor="let badge of offer.badges.slice(0, 2)" class="mini-badge">{{ badge }}</span>
                    </div>
                    
                    <div class="offer-actions-mini">
                      <button (click)="openApplicationModal(offer)" class="btn-primary-small">Souscrire</button>
                      <button (click)="toggleOfferDetails(offer)" class="btn-outline-small">
                        {{ selectedOfferForDetails?.id === getOfferUniqueId(offer) ? 'Masquer' : 'Détails' }}
                      </button>
                    </div>
                  </div>
                  
                  <!-- Détails condensés avec corrections -->
                  <div *ngIf="selectedOfferForDetails?.id === getOfferUniqueId(offer)" class="offer-details-condensed">
                    <p><strong>Recommandation :</strong> {{ offer.recommendation }}</p>
                    <div class="quick-contact">
                      <span>{{ getOfferContactPhone(offer) }}</span>
                      <button (click)="downloadQuote(offer)" class="btn-link">PDF</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section de téléchargement groupé -->
          <div class="download-section">
            <h4>Téléchargements</h4>
            <div class="download-options">
              <button 
                (click)="downloadMainQuote()" 
                class="btn-outline btn-download">
                📄 Devis principal (PDF)
              </button>
              <button 
                *ngIf="simulationResults.quotes && simulationResults.quotes.length > 0"
                (click)="downloadAllQuotes()" 
                class="btn-outline btn-download">
                📁 Toutes les offres (PDF)
              </button>
              <button 
                (click)="downloadComparison()" 
                class="btn-outline btn-download">
                📊 Tableau comparatif (PDF)
              </button>
            </div>
            <p class="download-info">
              💡 Les PDF incluent tous les détails de votre simulation et sont valables 30 jours
            </p>
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
  selectedContractType: string = '';
  selectedMedicalNeeds: string[] = [];
  selectedTravelRisks: string[] = [];
  selectedTransportRisks: string[] = [];
  availableProducts: InsuranceProductInfo[] = [];
  availableCompanies: InsuranceCompanyInfo[] = [];
  filteredResults: FilterResult | null = null;
  selectedOfferForDetails: { id: string } | null = null;

  private destroy$ = new Subject<void>();
  
  // Année courante pour la validation
  currentYear = new Date().getFullYear();

  // Configuration des chemins d'assets
  readonly assetPaths: AssetPaths = {
    hero: '/assets/images/insurance-hero.png',
    heroBackground: '/assets/images/hero-background.png',
    icons: {
      auto: '/assets/images/icons/card-icon.png',
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
      nsia: '/assets/images/logos/nsia-logo.png',
      bambooassur: '/assets/images/logos/bamboo-assur'
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
    private analyticsService: AnalyticsService,
    private pdfQuoteService: PdfQuoteService,
    private filterService: InsuranceFilterService,
    private autoFillService: AutoFillService,
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

  // ==================== MÉTHODES CORRIGÉES POUR LA NAVIGATION ====================

  // CORRECTION 1: Configuration des étapes pour tous les types
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
        { title: 'Profil', subtitle: 'Votre profil d\'assuré' },
        { title: 'Contrat', subtitle: 'Type de contrat souhaité' },
        { title: 'Garanties', subtitle: 'Choisissez vos garanties' },
        { title: 'Assureurs', subtitle: 'Sélectionnez les assureurs à comparer' }
      ],
      sante: [
        { title: 'Famille', subtitle: 'Composition de votre famille' },
        { title: 'Besoins', subtitle: 'Vos besoins médicaux prioritaires' },
        { title: 'Garanties', subtitle: 'Garanties recommandées' },
        { title: 'Assureurs', subtitle: 'Assureurs santé spécialisés' }
      ],
      voyage: [
        { title: 'Voyage', subtitle: 'Informations sur votre voyage' },
        { title: 'Risques', subtitle: 'Évaluez vos risques voyage' },
        { title: 'Garanties', subtitle: 'Garanties voyage essentielles' },
        { title: 'Assureurs', subtitle: 'Assureurs voyage internationaux' }
      ],
      transport: [
        { title: 'Marchandises', subtitle: 'Type de marchandises transportées' },
        { title: 'Garanties', subtitle: 'Niveaux de couverture' },
        { title: 'Assureurs', subtitle: 'Sélectionnez les assureurs à comparer' }
      ]
    };

    return configs[this.selectedInsuranceType] || [];
  }

  // CORRECTION 2: Validation pour tous les types et toutes les étapes
  canProceedToNextStep(): boolean {
    if (this.isLoading) return false;

    const totalSteps = this.getStepsConfig().length;
    
    switch (this.selectedInsuranceType) {
      case 'auto':
      case 'habitation':
      case 'transport':
        return this.canProceedStandardFlow(this.currentStep);
        
      case 'vie':
        return this.canProceedVieFlow(this.currentStep);
        
      case 'sante':
        return this.canProceedSanteFlow(this.currentStep);
        
      case 'voyage':
        return this.canProceedVoyageFlow(this.currentStep);
        
      default:
        return false;
    }
  }

  // CORRECTION 3: Validation pour le flux standard (auto, habitation, transport)
  private canProceedStandardFlow(step: number): boolean {
    switch (step) {
      case 0: // Étape informations
        return this.isStep1Valid();
      case 1: // Étape garanties
        return this.selectedGuarantees.length > 0;
      case 2: // Étape assureurs
        return this.selectedInsurers.length > 0;
      default:
        return false;
    }
  }

  

  // CORRECTION 4: Validation pour le flux Assurance Vie (4 étapes)
  private canProceedVieFlow(step: number): boolean {
    switch (step) {
      case 0: // Profil assuré
        return this.isVieStep1Valid();
      case 1: // Type de contrat
        return this.selectedContractType !== '';
      case 2: // Garanties
        return this.selectedGuarantees.length > 0;
      case 3: // Assureurs
        return this.selectedInsurers.length > 0;
      default:
        return false;
    }
  }

  // CORRECTION 5: Validation pour le flux Assurance Santé (4 étapes)
  private canProceedSanteFlow(step: number): boolean {
    switch (step) {
      case 0: // Composition familiale
        return this.isSanteStep1Valid();
      case 1: // Besoins médicaux
        return this.selectedMedicalNeeds.length > 0;
      case 2: // Garanties
        return this.selectedGuarantees.length > 0;
      case 3: // Assureurs
        return this.selectedInsurers.length > 0;
      default:
        return false;
    }
  }

  // CORRECTION 6: Validation pour le flux Assurance Voyage (4 étapes)
  private canProceedVoyageFlow(step: number): boolean {
    switch (step) {
      case 0: // Informations voyage
        return this.isVoyageStep1Valid();
      case 1: // Risques voyage
        return this.selectedTravelRisks.length > 0;
      case 2: // Garanties
        return this.selectedGuarantees.length > 0;
      case 3: // Assureurs
        return this.selectedInsurers.length > 0;
      default:
        return false;
    }
  }


private saveSimulationDataForAutoFill(): void {
  const formData = this.insuranceForm.value;
  const selections = {
    guarantees: this.selectedGuarantees,
    insurers: this.selectedInsurers,
    contractType: this.selectedContractType,
    medicalNeeds: this.selectedMedicalNeeds,
    travelRisks: this.selectedTravelRisks
  };

  this.autoFillService.saveSimulationData(formData, this.selectedInsuranceType, selections);
  
  console.log('💾 Données sauvegardées pour préremplissage automatique');
}

 openApplicationModal(quoteData: any): void {
    console.log('Données reçues dans openApplicationModal:', quoteData);
    
    let productName = '';
    let companyName = '';
    
    // Gestion spécifique des offres filtrées (ScoredQuote)
    if (quoteData.score !== undefined) {
      // C'est une offre filtrée (ScoredQuote)
      productName = quoteData.product_name;
      companyName = quoteData.company_name;
    } else if (quoteData === this.simulationResults && this.simulationResults) {
      // C'est l'offre principale
      productName = this.simulationResults.product_name || `Assurance ${this.selectedInsuranceType}`;
      companyName = this.simulationResults.company_name || 'Comparateur simbot Gab';
    } else if (quoteData?.product_name) {
      // Offre alternative standard
      productName = quoteData.product_name;
      companyName = quoteData.company_name || 'Assureur partenaire';
    } else {
      // Fallback
      productName = `Assurance ${this.getInsuranceTypeLabel()}`;
      companyName = this.getCompanyNameFromQuote(quoteData);
    }
    
    // Normalisation des données
    const normalizedQuoteData = {
      quote_id: quoteData.quote_id || quoteData.id || this.generateQuoteId(),
      productName: productName,
      product_name: productName,
      companyName: companyName,
      company_name: companyName,
      monthlyPremium: quoteData.monthly_premium || quoteData.monthlyPremium || 0,
      monthly_premium: quoteData.monthly_premium || quoteData.monthlyPremium || 0,
      annualPremium: quoteData.annual_premium || quoteData.annualPremium || (quoteData.monthly_premium || 0) * 12,
      annual_premium: quoteData.annual_premium || quoteData.annualPremium || (quoteData.monthly_premium || 0) * 12,
      deductible: quoteData.deductible || this.getDefaultDeductible(),
      coverageAmount: this.calculateCoverageAmount(),
      insurance_type: this.selectedInsuranceType,
      coverage_details: quoteData.coverage_details || this.getDefaultCoverageDetails(),
      exclusions: quoteData.exclusions || this.getDefaultExclusions(),
      valid_until: quoteData.valid_until || this.getValidUntilDate(),
      advantages: quoteData.advantages || [],
      // Données spécifiques aux offres filtrées
      score: quoteData.score,
      rank: quoteData.rank,
      badges: quoteData.badges || [],
      recommendation: quoteData.recommendation
    };
    
    console.log('Données normalisées:', normalizedQuoteData);
    
    this.selectedQuoteForApplication = normalizedQuoteData;
    this.selectedProductForApplication = {
      id: normalizedQuoteData.quote_id,
      name: productName,
      type: this.selectedInsuranceType,
      description: `Assurance ${this.getInsuranceTypeLabel()}`,
      insurance_company: {
        id: this.getCompanyIdFromName(companyName),
        name: companyName,
        contact_phone: quoteData.contact_phone || this.getCompanyContact(companyName).phone,
        contact_email: quoteData.contact_email || this.getCompanyContact(companyName).email
      }
    };
    
    this.showApplicationModal = true;
    
    // Analytics enrichies
    this.analyticsService.trackEvent('application_modal_opened', {
      insurance_type: this.selectedInsuranceType,
      company_name: companyName,
      monthly_premium: normalizedQuoteData.monthly_premium,
      source: quoteData.score ? 'filtered_offer' : 'standard_offer',
      score: quoteData.score,
      rank: quoteData.rank
    });
  }

private calculateCoverageAmount(): number {
  const formData = this.insuranceForm.value;
  
  switch (this.selectedInsuranceType) {
    case 'auto':
      return formData.vehicleValue || 0;
    case 'habitation':
      return formData.propertyValue || 0;
    case 'vie':
      return formData.coverageAmount || 0;
    case 'transport':
      return formData.cargoValue || 0;
    case 'sante':
      // Pour la santé, calculer un montant basé sur la composition familiale
      const familySize = parseInt(formData.familySize || '1');
      return familySize * 2000000; // 2M FCFA par personne
    case 'voyage':
      // Pour le voyage, montant basé sur la destination et la durée
      const duration = parseInt(formData.duration || '7');
      const baseAmount = formData.destination === 'mondial' ? 50000000 : 25000000;
      return baseAmount + (duration * 100000);
    default:
      return 0;
  }
}

/**
   * Gestionnaire des changements de filtres
   */
  onFiltersChanged(filterResult: FilterResult): void {
    console.log('Résultat du filtrage reçu:', filterResult);
    this.filteredResults = filterResult;
    
    // Analytics sur l'utilisation des filtres
    this.analyticsService.trackEvent('insurance_filters_applied', {
      insurance_type: this.selectedInsuranceType,
      total_offers: filterResult.filterSummary.totalOffers,
      filtered_offers: filterResult.filterSummary.filteredOffers,
      best_offer_score: filterResult.bestOffer.score,
      top_criteria: filterResult.filterSummary.topCriteria
    });
  }

  /**
   * Gestionnaire de sélection d'offre via le filtre
   */
  onFilteredOfferSelected(offer: ScoredQuote): void {
    console.log('Offre sélectionnée via filtre:', offer);
    this.openApplicationModal(offer);
    
    this.analyticsService.trackEvent('filtered_offer_selected', {
      insurance_type: this.selectedInsuranceType,
      company_name: offer.company_name,
      score: offer.score,
      rank: offer.rank,
      monthly_premium: offer.monthly_premium
    });
  }

  getOfferAdvantages(offer: ScoredQuote): string[] {
    const extendedOffer = offer as ExtendedScoredQuote;
    return extendedOffer.advantages || [];
  }

  getOfferContactPhone(offer: ScoredQuote): string {
    const extendedOffer = offer as ExtendedScoredQuote;
    return extendedOffer.contact_phone || this.getCompanyContact(offer.company_name).phone;
  }

  getOfferContactEmail(offer: ScoredQuote): string {
    const extendedOffer = offer as ExtendedScoredQuote;
    return extendedOffer.contact_email || this.getCompanyContact(offer.company_name).email;
  }

  getOfferUniqueId(offer: ScoredQuote): string {
    return `${offer.company_name}_${offer.product_name}_${offer.monthly_premium}`.replace(/\s+/g, '_').toLowerCase();
  }

   toggleOfferDetails(offer: ScoredQuote): void {
    const offerId = this.getOfferUniqueId(offer);
    
    if (this.selectedOfferForDetails?.id === offerId) {
      this.selectedOfferForDetails = null;
    } else {
      this.selectedOfferForDetails = { id: offerId };
    }
  }
  

  /**
   * Génère la liste des assureurs pour le filtre
   */
  getInsurersList(): any[] {
    const insurers = this.availableCompanies.map(company => ({
      id: company.id,
      name: company.name,
      logo: company.logo_url || this.getCompanyLogo(company.id)
    }));
    
    // Ajouter des assureurs par défaut si la liste est vide
    if (insurers.length === 0) {
      return [
        { id: 'ogar', name: 'OGAR Assurances', logo: this.getCompanyLogo('ogar') },
        { id: 'nsia', name: 'NSIA Assurances', logo: this.getCompanyLogo('nsia') },
        { id: 'axa', name: 'AXA Gabon', logo: this.getCompanyLogo('axa') },
        { id: 'colina', name: 'Colina Assurances', logo: this.getCompanyLogo('colina') }
      ];
    }
    
    return insurers;
  }


  // CORRECTION 7: Méthodes de validation spécifiques par type
  private isStep1Valid(): boolean {
    const requiredFields = this.getRequiredFieldsForCurrentType();
    return requiredFields.every(field => {
      const control = this.insuranceForm.get(field);
      return control && control.valid && control.value;
    });
  }

  private isVieStep1Valid(): boolean {
    const requiredFields = ['age', 'coverageAmount', 'healthStatus'];
    return requiredFields.every(field => {
      const control = this.insuranceForm.get(field);
      return control && control.valid && control.value;
    });
  }

  private isSanteStep1Valid(): boolean {
    const requiredFields = ['age', 'familySize', 'coverageLevel'];
    return requiredFields.every(field => {
      const control = this.insuranceForm.get(field);
      return control && control.valid && control.value;
    });
  }

  private isVoyageStep1Valid(): boolean {
    const requiredFields = ['age', 'destination', 'duration'];
    return requiredFields.every(field => {
      const control = this.insuranceForm.get(field);
      return control && control.valid && control.value;
    });
  }

  // CORRECTION 8: Champs requis par type
  private getRequiredFieldsForCurrentType(): string[] {
    const fieldsByType: { [key: string]: string[] } = {
      auto: ['age', 'vehicleCategory', 'vehicleValue', 'city'],
      habitation: ['age', 'propertyType', 'propertyValue', 'city'],
      transport: ['age', 'cargoType', 'cargoValue', 'transportMode'],
      vie: ['age', 'coverageAmount', 'healthStatus'],
      sante: ['age', 'familySize', 'coverageLevel'],
      voyage: ['age', 'destination', 'duration']
    };

    return fieldsByType[this.selectedInsuranceType] || ['age'];
  }

  // CORRECTION 9: Texte du bouton suivant selon l'étape
  getNextButtonText(): string {
    const totalSteps = this.getStepsConfig().length;
    if (this.currentStep === totalSteps - 1) {
      return this.isLoading ? 'Simulation en cours...' : 'Lancer la simulation';
    }
    return 'Suivant';
  }

  // CORRECTION 10: Garanties pour Assurance Transport
  getTransportGuarantees() {
    return [
      { 
        id: 'tous_risques', 
        name: 'Tous risques transport', 
        description: 'Couverture complète pendant le transport', 
        required: true 
      },
      { 
        id: 'avarie_particuliere', 
        name: 'Avaries particulières', 
        description: 'Dommages spécifiques aux marchandises', 
        required: false 
      },
      { 
        id: 'vol', 
        name: 'Vol et pillage', 
        description: 'Protection contre le vol des marchandises', 
        required: false 
      },
      { 
        id: 'avarie_commune', 
        name: 'Avarie commune', 
        description: 'Participation aux avaries communes maritimes', 
        required: false 
      },
      { 
        id: 'guerre_greve', 
        name: 'Guerre et grèves', 
        description: 'Couverture des risques de guerre et grèves', 
        required: false 
      },
      { 
        id: 'retard_livraison', 
        name: 'Retard de livraison', 
        description: 'Indemnisation en cas de retard', 
        required: false 
      }
    ];
  }

  // ==================== MÉTHODES POUR LES GARANTIES ET SÉLECTIONS ====================

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

  // Méthodes pour Assurance Vie
  getVieContractTypes() {
    return [
      {
        id: 'temporaire',
        name: 'Assurance Temporaire',
        description: 'Protection pour une durée déterminée',
        priceRange: 'À partir de 15 000 FCFA/mois',
        icon: '⏳'
      },
      {
        id: 'vie_entiere',
        name: 'Assurance Vie Entière',
        description: 'Protection à vie avec épargne',
        priceRange: 'À partir de 45 000 FCFA/mois',
        icon: '♾️'
      },
      {
        id: 'mixte',
        name: 'Assurance Mixte',
        description: 'Décès + épargne + rente',
        priceRange: 'À partir de 65 000 FCFA/mois',
        icon: '🔄'
      },
      {
        id: 'groupe',
        name: 'Assurance Groupe',
        description: 'Pour les entreprises et familles',
        priceRange: 'À partir de 25 000 FCFA/mois',
        icon: '👥'
      }
    ];
  }

  getVieGuarantees() {
    return [
      { 
        id: 'deces', 
        name: 'Décès toutes causes', 
        description: 'Capital versé aux bénéficiaires en cas de décès', 
        required: true 
      },
      { 
        id: 'invalidite', 
        name: 'Invalidité permanente totale', 
        description: 'Protection en cas d\'invalidité totale et définitive', 
        required: false 
      },
      { 
        id: 'maladie_grave', 
        name: 'Maladies graves', 
        description: 'Capital versé pour cancer, AVC, infarctus...', 
        required: false 
      },
      { 
        id: 'rente_education', 
        name: 'Rente éducation', 
        description: 'Financement des études des enfants', 
        required: false 
      },
      { 
        id: 'exoneration_primes', 
        name: 'Exonération des primes', 
        description: 'Maintien du contrat sans paiement en cas d\'incapacité', 
        required: false 
      },
      { 
        id: 'double_effet', 
        name: 'Double effet accidentel', 
        description: 'Capital doublé en cas de décès accidentel', 
        required: false 
      }
    ];
  }

  selectContractType(contractId: string): void {
    this.selectedContractType = contractId;
  }

  isContractTypeSelected(contractId: string): boolean {
    return this.selectedContractType === contractId;
  }

  // Méthodes pour Assurance Santé
  onFamilySizeChange(event: any): void {
    const familySize = parseInt(event.target.value);
    console.log('Famille de', familySize, 'personnes');
  }

  getFamilyComposition(): string[] | null {
    const familySize = this.insuranceForm.get('familySize')?.value;
    if (!familySize) return null;

    const compositions = {
      '1': ['Vous'],
      '2': ['Vous', 'Conjoint'],
      '3': ['Vous', 'Conjoint', '1 enfant'],
      '4': ['Vous', 'Conjoint', '2 enfants'],
      '5': ['Vous', 'Conjoint', '3 enfants'],
      '6': ['Vous', 'Conjoint', '4+ enfants']
    };

    return compositions[familySize as keyof typeof compositions] || null;
  }

  getMedicalNeeds() {
    return [
      {
        id: 'consultations',
        name: 'Consultations fréquentes',
        description: 'Médecin généraliste et spécialistes',
        frequency: 'Mensuel',
        priority: 'high',
        icon: '👩‍⚕️'
      },
      {
        id: 'pharmacie',
        name: 'Médicaments réguliers',
        description: 'Traitements chroniques et ponctuels',
        frequency: 'Hebdomadaire',
        priority: 'high',
        icon: '💊'
      },
      {
        id: 'dentaire',
        name: 'Soins dentaires',
        description: 'Prévention et soins dentaires',
        frequency: 'Semestriel',
        priority: 'medium',
        icon: '🦷'
      },
      {
        id: 'optique',
        name: 'Optique',
        description: 'Lunettes et lentilles',
        frequency: 'Annuel',
        priority: 'medium',
        icon: '👓'
      },
      {
        id: 'maternite',
        name: 'Maternité',
        description: 'Suivi grossesse et accouchement',
        frequency: 'Occasionnel',
        priority: 'high',
        icon: '🤱'
      },
      {
        id: 'hospitalisation',
        name: 'Hospitalisation',
        description: 'Chambres privées et interventions',
        frequency: 'Rare mais coûteux',
        priority: 'high',
        icon: '🏥'
      }
    ];
  }

  getSanteGuarantees() {
    return [
      { 
        id: 'hospitalisation', 
        name: 'Hospitalisation', 
        description: 'Frais d\'hospitalisation et chirurgie', 
        required: true,
        coverage: '100%'
      },
      { 
        id: 'consultations', 
        name: 'Consultations médicales', 
        description: 'Généralistes et spécialistes', 
        required: false,
        recommended: true,
        coverage: '70-80%'
      },
      { 
        id: 'pharmacie', 
        name: 'Médicaments', 
        description: 'Médicaments prescrits', 
        required: false,
        recommended: true,
        coverage: '60-80%'
      },
      { 
        id: 'dentaire', 
        name: 'Soins dentaires', 
        description: 'Soins et prothèses dentaires', 
        required: false,
        coverage: '50-70%'
      },
      { 
        id: 'optique', 
        name: 'Optique', 
        description: 'Lunettes et lentilles de contact', 
        required: false,
        coverage: '100-300 FCFA'
      },
      { 
        id: 'maternite', 
        name: 'Maternité', 
        description: 'Suivi grossesse et accouchement', 
        required: false,
        coverage: '100%'
      }
    ];
  }

  toggleMedicalNeed(needId: string): void {
    if (this.isMedicalNeedSelected(needId)) {
      this.selectedMedicalNeeds = this.selectedMedicalNeeds.filter(id => id !== needId);
    } else {
      this.selectedMedicalNeeds.push(needId);
    }
  }

  isMedicalNeedSelected(needId: string): boolean {
    return this.selectedMedicalNeeds.includes(needId);
  }

  getNetworkDescription(companyId: string): string {
    const networks = {
      'nsia': '150+ centres de soins partenaires',
      'axa': '200+ professionnels de santé agréés',
      'ogar': '100+ établissements conventionnés',
      'default': 'Large réseau de professionnels'
    };
    return networks[companyId as keyof typeof networks] || networks['default'];
  }

  // Méthodes pour Assurance Voyage
  onDestinationChange(event: any): void {
    const destination = event.target.value;
    console.log('Destination sélectionnée:', destination);
  }

  getTravelRisks() {
    return [
      {
        id: 'medical_emergency',
        name: 'Urgence médicale',
        description: 'Frais médicaux d\'urgence à l\'étranger',
        level: 'high',
        levelText: 'Élevé',
        icon: '🚨'
      },
      {
        id: 'repatriation',
        name: 'Rapatriement sanitaire',
        description: 'Rapatriement médical vers le Gabon',
        level: 'high',
        levelText: 'Élevé',
        icon: '✈️'
      },
      {
        id: 'baggage_loss',
        name: 'Perte de bagages',
        description: 'Vol ou perte de vos affaires personnelles',
        level: 'medium',
        levelText: 'Moyen',
        icon: '🧳'
      },
      {
        id: 'trip_cancellation',
        name: 'Annulation voyage',
        description: 'Remboursement en cas d\'annulation',
        level: 'medium',
        levelText: 'Moyen',
        icon: '❌'
      },
      {
        id: 'delay',
        name: 'Retard de vol',
        description: 'Compensation pour retards importants',
        level: 'low',
        levelText: 'Faible',
        icon: '⏰'
      },
      {
        id: 'legal_assistance',
        name: 'Assistance juridique',
        description: 'Aide juridique à l\'étranger',
        level: 'low',
        levelText: 'Faible',
        icon: '⚖️'
      }
    ];
  }

  getVoyageGuarantees() {
    return [
      { 
        id: 'assistance_medicale', 
        name: 'Assistance médicale', 
        description: 'Soins médicaux d\'urgence 24h/24', 
        required: true,
        amount: 50000000
      },
      { 
        id: 'rapatriement', 
        name: 'Rapatriement sanitaire', 
        description: 'Rapatriement médical vers le Gabon', 
        required: true,
        amount: null // Illimité
      },
      { 
        id: 'bagages', 
        name: 'Bagages et effets personnels', 
        description: 'Vol, perte ou détérioration', 
        required: false,
        essential: true,
        amount: 2000000
      },
      { 
        id: 'annulation', 
        name: 'Annulation voyage', 
        description: 'Remboursement des frais d\'annulation', 
        required: false,
        amount: 10000000
      },
      { 
        id: 'retard', 
        name: 'Retard de transport', 
        description: 'Compensation pour retards importants', 
        required: false,
        amount: 500000
      },
      { 
        id: 'responsabilite_civile', 
        name: 'Responsabilité civile voyage', 
        description: 'Dommages causés aux tiers', 
        required: false,
        amount: 5000000
      }
    ];
  }

  toggleTravelRisk(riskId: string, event: any): void {
    if (event.target.checked) {
      if (!this.selectedTravelRisks.includes(riskId)) {
        this.selectedTravelRisks.push(riskId);
      }
    } else {
      this.selectedTravelRisks = this.selectedTravelRisks.filter(id => id !== riskId);
    }
  }

  getCoverageZone(companyId: string): string {
    const zones = {
      'saham': 'Couverture mondiale',
      'axa': 'Europe + Amérique + Asie',
      'nsia': 'Afrique + Europe',
      'default': 'Couverture internationale'
    };
    return zones[companyId as keyof typeof zones] || zones['default'];
  }

  // ==================== MÉTHODES COMMUNES ====================

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

  // ==================== NAVIGATION ET SÉLECTION ====================

  selectInsuranceType(type: string): void {
    this.selectedInsuranceType = type;
    this.currentStep = 0;
    this.resetForm();
    this.loadInsuranceData();
    
    // Initialiser les garanties obligatoires
    this.initializeMandatoryGuarantees();
    
    this.analyticsService.trackEvent('insurance_type_selected', {
      type: type,
      has_image: !!this.getInsuranceTypeImage(type)
    });
  }

  // CORRECTION 11: Initialiser les garanties obligatoires
  private initializeMandatoryGuarantees(): void {
    this.selectedGuarantees = [];
    
    // Ajouter automatiquement les garanties obligatoires
    const guaranteeMethods = {
      'auto': this.getAutoGuarantees(),
      'habitation': this.getHabitationGuarantees(),
      'vie': this.getVieGuarantees(),
      'sante': this.getSanteGuarantees(),
      'voyage': this.getVoyageGuarantees(),
      'transport': this.getTransportGuarantees()
    };

    const guarantees = guaranteeMethods[this.selectedInsuranceType as keyof typeof guaranteeMethods] || [];
    
    guarantees.forEach(guarantee => {
      if (guarantee.required) {
        this.selectedGuarantees.push(guarantee.id);
      }
    });
  }

  nextStep(): void {
    const totalSteps = this.getStepsConfig().length;
    
    if (this.currentStep === totalSteps - 1) {
      // Dernière étape : lancer la simulation
      this.handleSimulation();
    } else {
      // Passer à l'étape suivante
      this.currentStep++;
      
      // Charger les données spécifiques à l'étape si nécessaire
      if (this.isInsurerSelectionStep()) {
        this.loadInsuranceData();
      }
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

  // CORRECTION 12: Vérifier si c'est l'étape de sélection des assureurs
  private isInsurerSelectionStep(): boolean {
    const totalSteps = this.getStepsConfig().length;
    return this.currentStep === totalSteps - 1;
  }

  private resetForm(): void {
    this.insuranceForm.reset();
    this.selectedGuarantees = [];
    this.selectedInsurers = [];
    this.selectedContractType = '';
    this.selectedMedicalNeeds = [];
    this.selectedTravelRisks = [];
    this.simulationResults = null;
  }

  // ==================== MÉTHODES DE GESTION DES IMAGES ====================

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
    img.style.display = 'none';
    console.warn('Image failed to load:', img.src);
  }

  private preloadImages(): void {
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

  // ==================== INITIALISATION ET CONFIGURATION ====================

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
      travelers: ['1'],

      // Transport
      cargoType: [''],
      cargoValue: [''],
      transportMode: [''],
      coverage: ['']
    });
  }

  // ==================== CHARGEMENT DES DONNÉES ====================

  private loadInsuranceData(): void {
    this.isLoadingCompanies = true;
    
    this.apiService.getInsuranceProducts({ 
      insurance_type: this.selectedInsuranceType 
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (products) => {
        console.log('Produits reçus:', products);
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
          specialties: [this.selectedInsuranceType],
          is_active: false
        });
      }
    });
    
    this.availableCompanies = Array.from(companiesMap.values());
    
    // S'assurer qu'il y a des compagnies disponibles
    if (this.availableCompanies.length === 0) {
      this.generateFallbackCompanies();
    }
  }

  private generateFallbackCompanies(): void {
  const fallbackCompanies = [
    {
      id: 'ogar',
      name: 'OGAR Assurances',
      full_name: 'Organisation Gabonaise d\'Assurance et de Réassurance',
      logo_url: this.getCompanyLogo('ogar'),
      rating: 4.5,
      solvency_ratio: undefined, 
      contact_phone: '+241 01 76 20 20',
      contact_email: 'info@ogar.ga',
      specialties: [this.selectedInsuranceType],
      is_active: true
    },
    {
      id: 'nsia',
      name: 'NSIA Assurances',
      full_name: 'Nouvelle Société Interafricaine d\'Assurance',
      logo_url: this.getCompanyLogo('nsia'),
      rating: 4.2,
      solvency_ratio: undefined, 
      contact_phone: '+241 01 44 26 26',
      contact_email: 'contact@nsia.ga',
      specialties: [this.selectedInsuranceType],
      is_active: true
    },
    {
      id: 'axa',
      name: 'AXA Gabon',
      full_name: 'AXA Assurances Gabon',
      logo_url: this.getCompanyLogo('axa'),
      rating: 4.3,
      solvency_ratio: undefined,
      contact_phone: '+241 01 44 63 63',
      contact_email: 'info@axa-gabon.ga',
      specialties: [this.selectedInsuranceType],
      is_active: true
    }
  ];

  this.availableCompanies = fallbackCompanies;
}
  // ==================== SIMULATION ====================

  private handleSimulation(): void {
    if (!this.canProceedToNextStep()) {
      this.notificationService.showError('Veuillez remplir tous les champs requis');
      return;
    }
    this.saveSimulationDataForAutoFill();

    this.isLoading = true;

    const simulationData = {
      insurance_type: this.selectedInsuranceType,
      age: this.insuranceForm.get('age')?.value || 35,
      risk_factors: this.buildRiskFactors(),
      selected_insurers: this.selectedInsurers,
      guarantees: this.selectedGuarantees,
      contract_type: this.selectedContractType,
      medical_needs: this.selectedMedicalNeeds,
      travel_risks: this.selectedTravelRisks
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
          // En cas d'erreur, générer un résultat de secours
          this.simulationResults = this.generateFallbackSimulation();
          this.notificationService.showWarning('Simulation réalisée avec données par défaut');
        }
      });
  }

  // CORRECTION 14: Générer une simulation de secours en cas d'échec API
  private generateFallbackSimulation(): SimulationResult {
    const basePremium = this.calculateFallbackPremium();
    
    return {
      quote_id: this.generateQuoteId(),
      product_name: `Assurance ${this.selectedInsuranceType.charAt(0).toUpperCase() + this.selectedInsuranceType.slice(1)}`,
      company_name: 'Comparateur simbot Gab',
      insurance_type: this.selectedInsuranceType,
      monthly_premium: Math.round(basePremium / 12),
      annual_premium: Math.round(basePremium),
      deductible: this.getDefaultDeductible(),
      coverage_details: this.getDefaultCoverageDetails(),
      exclusions: this.getDefaultExclusions(),
      valid_until: this.getValidUntilDate(),
      recommendations: this.getDefaultRecommendations(),
      quotes: this.generateFallbackQuotes(basePremium)
    };
  }

  private calculateFallbackPremium(): number {
    const formData = this.insuranceForm.value;
    const age = formData.age || 35;
    
    let basePremium = 50000; // Prime de base
    
    // Ajustement par type d'assurance
    const premiumByType = {
      'auto': (formData.vehicleValue || 15000000) * 0.003,
      'habitation': (formData.propertyValue || 25000000) * 0.002,
      'vie': (formData.coverageAmount || 50000000) * 0.0015,
      'sante': 45000 * parseInt(formData.familySize || '1'),
      'voyage': 25000 * (1 + parseInt(formData.duration || '7') / 30),
      'transport': (formData.cargoValue || 100000000) * 0.001
    };
    
    basePremium = premiumByType[this.selectedInsuranceType as keyof typeof premiumByType] || basePremium;
    
    // Facteur âge
    let ageFactor = 1.0;
    if (age < 25) ageFactor = 1.3;
    else if (age > 60) ageFactor = 1.2;
    
    // Facteur garanties
    const guaranteeFactor = 1 + (this.selectedGuarantees.length * 0.1);
    
    return basePremium * ageFactor * guaranteeFactor;
  }

  private generateFallbackQuotes(basePremium: number): QuoteOption[] {
    const quotes: QuoteOption[] = [];
    
    this.availableCompanies.slice(0, 3).forEach((company, index) => {
      const variation = 0.9 + (index * 0.1);
      const premium = basePremium * variation;
      
      quotes.push({
        company_name: company.name,
        product_name: `${company.name} ${this.selectedInsuranceType}`,
        monthly_premium: Math.round(premium / 12),
        annual_premium: Math.round(premium),
        deductible: this.getDefaultDeductible(),
        rating: company.rating || 4.0,
        advantages: this.getCompanyAdvantages(company.name)
      });
    });
    
    return quotes;
  }

  private getCompanyAdvantages(companyName: string): string[] {
    const advantages = {
      "OGAR Assurances": ["Leader du marché gabonais", "Réseau d'agences étendu", "Expertise locale"],
      "NSIA Assurances": ["Groupe panafricain", "Innovation digitale", "Offres flexibles"],
      "AXA Gabon": ["Marque internationale", "Expertise reconnue", "Services premium"],
      "Colina Assurances": ["Spécialiste dommages", "Tarifs attractifs", "Proximité client"],
      "Saham Assurance": ["Groupe Sanlam", "Solutions innovantes", "Accompagnement personnalisé"]
    };
    return advantages[companyName as keyof typeof advantages] || ["Service de qualité", "Expertise reconnue", "Tarifs compétitifs"];
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
          vehicle_value: formData.vehicleValue
        });
        break;

      case 'habitation':
        Object.assign(riskFactors, {
          property_type: formData.propertyType,
          property_value: formData.propertyValue
        });
        break;

      case 'vie':
        Object.assign(riskFactors, {
          coverage_amount: formData.coverageAmount,
          health_status: formData.healthStatus,
          contract_type: this.selectedContractType
        });
        break;

      case 'sante':
        Object.assign(riskFactors, {
          family_size: formData.familySize,
          coverage_level: formData.coverageLevel,
          medical_needs: this.selectedMedicalNeeds
        });
        break;

      case 'voyage':
        Object.assign(riskFactors, {
          destination: formData.destination,
          duration: formData.duration,
          travel_risks: this.selectedTravelRisks
        });
        break;

      case 'transport':
        Object.assign(riskFactors, {
          cargo_type: formData.cargoType,
          cargo_value: formData.cargoValue,
          transport_mode: formData.transportMode
        });
        break;
    }

    return riskFactors;
  }

  private transformApiResponse(apiResponse: any): SimulationResult {
    return {
      quote_id: apiResponse.quote_id || this.generateQuoteId(),
      product_name: apiResponse.product_name || `Assurance ${this.selectedInsuranceType}`,
      company_name: apiResponse.company_name || 'Simulateur simbot Gab',
      insurance_type: this.selectedInsuranceType,
      monthly_premium: apiResponse.monthly_premium || 0,
      annual_premium: apiResponse.annual_premium || 0,
      deductible: apiResponse.deductible || this.getDefaultDeductible(),
      coverage_details: apiResponse.coverage_details || this.getDefaultCoverageDetails(),
      exclusions: apiResponse.exclusions || this.getDefaultExclusions(),
      valid_until: apiResponse.valid_until || this.getValidUntilDate(),
      recommendations: apiResponse.recommendations || this.getDefaultRecommendations(),
      quotes: this.generateAlternativeQuotes(apiResponse.quotes || [])
    };
  }

  private generateAlternativeQuotes(quotes: any[]): QuoteOption[] {
    if (quotes.length === 0) {
      return this.selectedInsurers.slice(1, 4).map(insurerId => {
        const company = this.availableCompanies.find(c => c.id === insurerId);
        return this.createMockQuote(company);
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

  private createMockQuote(company: any): QuoteOption {
    const basePremium = this.calculateFallbackPremium();
    const variation = Math.random() * 0.4 + 0.8; // 80% à 120% du prix de base
    
    return {
      company_name: company?.name || 'Assureur',
      product_name: `${this.selectedInsuranceType} ${company?.name || 'Standard'}`,
      monthly_premium: Math.round((basePremium * variation) / 12),
      annual_premium: Math.round(basePremium * variation),
      deductible: this.getDefaultDeductible(),
      rating: company?.rating || 4.0,
      advantages: this.getCompanyAdvantages(company?.name || 'Default')
    };
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  getProgressPercentage(): number {
    const totalSteps = this.getStepsConfig().length;
    return totalSteps > 0 ? ((this.currentStep + 1) / totalSteps) * 100 : 0;
  }

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

  private getDefaultDeductible(): number {
    const deductibles = {
      'auto': 100000,
      'habitation': 50000,
      'vie': 0,
      'sante': 25000,
      'voyage': 0,
      'transport': 250000
    };
    return deductibles[this.selectedInsuranceType as keyof typeof deductibles] || 50000;
  }

  private getDefaultCoverageDetails(): any {
    const coverageDetails: { [key: string]: any } = {
      'auto': {
        'Responsabilité civile': '500 000 000 FCFA',
        'Dommages collision': '15 000 000 FCFA',
        'Vol': '15 000 000 FCFA',
        'Incendie': '15 000 000 FCFA'
      },
      'habitation': {
        'Incendie': '25 000 000 FCFA',
        'Dégâts des eaux': '15 000 000 FCFA',
        'Vol': '10 000 000 FCFA',
        'Responsabilité civile': '100 000 000 FCFA'
      },
      'vie': {
        'Capital décès': '50 000 000 FCFA',
        'Invalidité': '50 000 000 FCFA',
        'Maladies graves': '25 000 000 FCFA'
      },
      'sante': {
        'Hospitalisation': '20 000 000 FCFA',
        'Consultations': '2 000 000 FCFA',
        'Pharmacie': '1 500 000 FCFA',
        'Dentaire': '1 000 000 FCFA'
      },
      'voyage': {
        'Assistance médicale': '50 000 000 FCFA',
        'Rapatriement': 'Illimité',
        'Bagages': '2 000 000 FCFA',
        'Annulation': '10 000 000 FCFA'
      },
      'transport': {
        'Tous risques': '100 000 000 FCFA',
        'Vol': '100 000 000 FCFA',
        'Avarie': '100 000 000 FCFA'
      }
    };
    
    return coverageDetails[this.selectedInsuranceType] || {};
  }

  private getDefaultExclusions(): string[] {
    const exclusionsByType: { [key: string]: string[] } = {
      'auto': [
        "Conduite en état d'ivresse ou sous stupéfiants",
        "Usage commercial non déclaré",
        "Courses ou compétitions",
        "Guerre et actes de terrorisme"
      ],
      'habitation': [
        "Négligence grave du souscripteur",
        "Dommages antérieurs à la souscription",
        "Vice de construction",
        "Guerre et émeutes"
      ],
      'vie': [
        "Suicide première année",
        "Sports extrêmes non déclarés",
        "Guerre dans pays de résidence",
        "Fausse déclaration d'état de santé"
      ],
      'sante': [
        "Affections antérieures non déclarées",
        "Cures thermales",
        "Médecines non conventionnelles",
        "Chirurgie esthétique"
      ],
      'voyage': [
        "Voyage dans zones déconseillées",
        "Pratique de sports à risques",
        "État d'ébriété",
        "Négligence caractérisée"
      ],
      'transport': [
        "Vice propre de la marchandise",
        "Emballage défaillant",
        "Guerre et grèves (sauf garantie souscrite)",
        "Retard simple"
      ]
    };
    return exclusionsByType[this.selectedInsuranceType] || ["Conditions générales non respectées"];
  }

  private getDefaultRecommendations(): string[] {
    const recommendationsByType: { [key: string]: string[] } = {
      'auto': [
        "Conduisez prudemment pour bénéficier de bonus",
        "Installez un système antivol pour réduire les risques",
        "Comparez les franchises avant de choisir"
      ],
      'habitation': [
        "Installez des détecteurs de fumée",
        "Sécurisez votre domicile contre le vol",
        "Vérifiez régulièrement vos installations"
      ],
      'vie': [
        "Adaptez le capital à vos besoins familiaux",
        "Déclarez votre état de santé avec précision",
        "Mettez à jour vos bénéficiaires régulièrement"
      ],
      'sante': [
        "Vérifiez le réseau de soins partenaires",
        "Comparez les plafonds de remboursement",
        "Pensez à la couverture à l'étranger"
      ],
      'voyage': [
        "Vérifiez la couverture dans votre zone de destination",
        "Souscrivez dès la réservation pour la garantie annulation",
        "Gardez vos justificatifs médicaux"
      ],
      'transport': [
        "Déclarez précisément la nature des marchandises",
        "Vérifiez les conditions d'emballage",
        "Adaptez la couverture à la valeur transportée"
      ]
    };

    return recommendationsByType[this.selectedInsuranceType] || [
      "Lisez attentivement les conditions générales",
      "Comparez les offres avant de choisir",
      "Conservez tous vos justificatifs"
    ];
  }

  private generateQuoteId(): string {
    return 'quote_' + Date.now().toString();
  }

  private getValidUntilDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  }

  // ==================== PDF ET MODAL ====================

  async downloadQuote(quote: any): Promise<void> {
    try {
      this.notificationService.showInfo('Génération du PDF en cours...');
      
      const customerData: CustomerData = {
        age: this.insuranceForm.get('age')?.value,
        city: this.insuranceForm.get('city')?.value,
        email: '',
        phone: '',
        name: ''
      };

      const quoteData: QuoteData = {
        quote_id: quote.quote_id || this.generateQuoteId(),
        product_name: quote.product_name || `Assurance ${this.selectedInsuranceType}`,
        company_name: quote.company_name || 'Comparateur simbot Gab',
        insurance_type: this.selectedInsuranceType,
        monthly_premium: quote.monthly_premium || 0,
        annual_premium: quote.annual_premium || 0,
        deductible: quote.deductible || this.getDefaultDeductible(),
        coverage_details: quote.coverage_details || this.getDefaultCoverageDetails(),
        exclusions: quote.exclusions || this.getDefaultExclusions(),
        valid_until: quote.valid_until || this.getValidUntilDate(),
        recommendations: quote.recommendations || this.getDefaultRecommendations(),
        quotes: quote.quotes || []
      };

      await this.pdfQuoteService.generateAndDownloadQuote(
        quoteData,
        customerData,
        this.insuranceForm.value
      );

      this.notificationService.showSuccess('PDF téléchargé avec succès !');
      
      this.analyticsService.trackEvent('pdf_quote_downloaded', {
        insurance_type: this.selectedInsuranceType,
        company_name: quote.company_name,
        has_customer_data: Object.keys(customerData).some(key => customerData[key as keyof CustomerData])
      });

    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      this.notificationService.showError('Erreur lors de la génération du PDF');
    }
  }

  async downloadMainQuote(): Promise<void> {
    if (this.simulationResults) {
      await this.downloadQuote(this.simulationResults);
    }
  }

  async downloadAllQuotes(): Promise<void> {
    if (!this.simulationResults?.quotes || this.simulationResults.quotes.length === 0) {
      this.notificationService.showWarning('Aucune offre alternative disponible');
      return;
    }

    try {
      this.notificationService.showInfo('Génération des PDF en cours...');
      
      await this.downloadMainQuote();
      await this.delay(1000);
      
      for (let i = 0; i < this.simulationResults.quotes.length; i++) {
        const quote = this.simulationResults.quotes[i];
        await this.downloadQuote(quote);
        
        if (i < this.simulationResults.quotes.length - 1) {
          await this.delay(500);
        }
      }
      
      this.notificationService.showSuccess(`${this.simulationResults.quotes.length + 1} PDF téléchargés avec succès !`);
      
    } catch (error) {
      console.error('Erreur lors du téléchargement groupé:', error);
      this.notificationService.showError('Erreur lors du téléchargement de certains PDF');
    }
  }

  async downloadComparison(): Promise<void> {
    if (!this.simulationResults) {
      this.notificationService.showWarning('Aucune simulation disponible');
      return;
    }

    try {
      this.notificationService.showInfo('Génération du tableau comparatif...');
      
      const comparisonData: QuoteData = {
        quote_id: `comparison_${this.generateQuoteId()}`,
        product_name: 'Tableau Comparatif',
        company_name: 'Comparateur simbot Gab',
        insurance_type: this.selectedInsuranceType,
        monthly_premium: 0,
        annual_premium: 0,
        deductible: 0,
        coverage_details: this.buildComparisonDetails(),
        exclusions: [],
        valid_until: this.getValidUntilDate(),
        recommendations: this.getComparisonRecommendations(),
        quotes: this.simulationResults.quotes || []
      };

      const customerData: CustomerData = {
        age: this.insuranceForm.get('age')?.value,
        city: this.insuranceForm.get('city')?.value
      };

      await this.pdfQuoteService.generateAndDownloadQuote(
        comparisonData,
        customerData,
        this.insuranceForm.value
      );

      this.notificationService.showSuccess('Tableau comparatif téléchargé avec succès !');
      
    } catch (error) {
      console.error('Erreur lors de la génération du comparatif:', error);
      this.notificationService.showError('Erreur lors de la génération du tableau comparatif');
    }
  }

  private buildComparisonDetails(): any {
    if (!this.simulationResults) return {};

    const details: any = {
      'Offre principale': `${this.simulationResults.company_name} - ${this.formatCurrency(this.simulationResults.monthly_premium)}/mois`,
      'Type d\'assurance': this.getInsuranceTypeName(this.selectedInsuranceType),
      'Nombre d\'offres comparées': (this.simulationResults.quotes?.length || 0) + 1,
      'Garanties sélectionnées': this.selectedGuarantees.join(', '),
      'Assureurs consultés': this.selectedInsurers.length
    };

    const formData = this.insuranceForm.value;
    switch (this.selectedInsuranceType) {
      case 'auto':
        details['Véhicule'] = `${formData.vehicleCategory || 'N/A'}`;
        details['Valeur assurée'] = formData.vehicleValue ? this.formatCurrency(formData.vehicleValue) : 'N/A';
        break;
      case 'habitation':
        details['Type de bien'] = `${formData.propertyType || 'N/A'}`;
        details['Valeur assurée'] = formData.propertyValue ? this.formatCurrency(formData.propertyValue) : 'N/A';
        break;
      case 'vie':
        details['Capital souhaité'] = formData.coverageAmount ? this.formatCurrency(formData.coverageAmount) : 'N/A';
        details['Profil'] = `${formData.healthStatus || 'N/A'}`;
        break;
      case 'sante':
        details['Composition familiale'] = formData.familySize || 'N/A';
        details['Niveau de couverture'] = formData.coverageLevel || 'N/A';
        break;
      case 'voyage':
        details['Destination'] = formData.destination || 'N/A';
        details['Durée'] = formData.duration ? `${formData.duration} jours` : 'N/A';
        break;
      case 'transport':
        details['Type de marchandises'] = formData.cargoType || 'N/A';
        details['Valeur transportée'] = formData.cargoValue ? this.formatCurrency(formData.cargoValue) : 'N/A';
        break;
    }

    return details;
  }

  private getComparisonRecommendations(): string[] {
    const recommendations = [
      'Comparez attentivement les garanties incluses dans chaque offre',
      'Vérifiez les exclusions spécifiques à chaque assureur',
      'Prenez en compte la qualité du service client et la réputation de l\'assureur'
    ];

    if (this.simulationResults?.quotes && this.simulationResults.quotes.length > 0) {
      const prices = [this.simulationResults.monthly_premium, ...this.simulationResults.quotes.map(q => q.monthly_premium)];
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceDiff = ((maxPrice - minPrice) / minPrice * 100).toFixed(0);
      
      recommendations.push(`Les tarifs varient de ${priceDiff}% entre les différentes offres`);
    }

    return recommendations;
  }

  private getInsuranceTypeName(type: string): string {
    const types: { [key: string]: string } = {
      'auto': 'Assurance Automobile',
      'habitation': 'Assurance Habitation',
      'vie': 'Assurance Vie',
      'sante': 'Assurance Santé',
      'voyage': 'Assurance Voyage',
      'transport': 'Assurance Transport'
    };
    return types[type] || type;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


// 2. NOUVELLES MÉTHODES utilitaires pour les noms

private getCompanyNameFromQuote(quoteData: any): string {
  // Essayer différentes propriétés pour le nom de la compagnie
  if (quoteData.company_name && quoteData.company_name !== 'Comparateur simbot Gab') {
    return quoteData.company_name;
  }
  
  if (quoteData.companyName && quoteData.companyName !== 'Comparateur simbot Gab') {
    return quoteData.companyName;
  }
  
  // Si pas de nom de compagnie spécifique, utiliser les compagnies disponibles
  if (this.availableCompanies && this.availableCompanies.length > 0) {
    const randomCompany = this.availableCompanies[Math.floor(Math.random() * this.availableCompanies.length)];
    return randomCompany.name;
  }
  
  // Fallback avec de vraies compagnies gabonaises
  const gabonCompanies = [
    'OGAR Assurances',
    'NSIA Assurances Gabon',
    'AXA Assurances Gabon',
    'Colina Assurances',
    'Saham Assurance Gabon'
  ];
  
  return gabonCompanies[Math.floor(Math.random() * gabonCompanies.length)];
}

private getInsuranceTypeLabel(): string {
  const types: { [key: string]: string } = {
    'auto': 'Automobile',
    'habitation': 'Habitation',
    'vie': 'Vie',
    'sante': 'Santé',
    'voyage': 'Voyage',
    'transport': 'Transport'
  };
  return types[this.selectedInsuranceType] || 'Générale';
}

private getCompanyIdFromName(companyName: string): string {
  const companyIds: { [key: string]: string } = {
    'OGAR Assurances': 'ogar',
    'NSIA Assurances Gabon': 'nsia',
    'AXA Assurances Gabon': 'axa',
    'Colina Assurances': 'colina',
    'Saham Assurance Gabon': 'saham'
  };
  return companyIds[companyName] || 'company_temp';
}

private getCompanyContact(companyName: string): { phone: string, email: string } {
  const contacts: { [key: string]: { phone: string, email: string } } = {
    'OGAR Assurances': {
      phone: '+241 01 76 20 20',
      email: 'info@ogar.ga'
    },
    'NSIA Assurances Gabon': {
      phone: '+241 01 44 26 26',
      email: 'contact@nsia.ga'
    },
    'AXA Assurances Gabon': {
      phone: '+241 01 44 63 63',
      email: 'info@axa-gabon.ga'
    },
    'Colina Assurances': {
      phone: '+241 01 74 25 25',
      email: 'contact@colina.ga'
    },
    'Saham Assurance Gabon': {
      phone: '+241 01 44 88 88',
      email: 'info@saham.ga'
    }
  };
  
  return contacts[companyName] || {
    phone: '+241 01 00 00 00',
    email: 'contact@assurance.ga'
  };
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

  // ==================== TRACKING ET ANALYTICS ====================

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
      contract_type: this.selectedContractType,
      medical_needs_count: this.selectedMedicalNeeds.length,
      travel_risks_count: this.selectedTravelRisks.length,
      form_data: this.insuranceForm.value,
      ui_enhanced: true,
      images_loaded: true
    });
  }
}