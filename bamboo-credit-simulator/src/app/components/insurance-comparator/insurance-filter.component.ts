// insurance-filter.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { InsuranceFilterService, FilterCriteria, FilterResult, ScoredQuote } from '../../services/insurance-filter.service';

@Component({
  selector: 'app-insurance-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <!-- Filtres de recherche -->
    <div class="insurance-filter-container">
      <!-- Header avec toggle -->
      <div class="filter-header" (click)="toggleFilters()">
        <h4>
          🔍 Trouver la meilleure offre
          <span class="offer-count" *ngIf="filterResult">
            ({{ filterResult.filterSummary.filteredOffers }} sur {{ filterResult.filterSummary.totalOffers }})
          </span>
        </h4>
        <button class="toggle-btn" [class.expanded]="showFilters">
          {{ showFilters ? '▼' : '▶' }}
        </button>
      </div>

      <!-- Filtres détaillés -->
      <div class="filter-content" [class.visible]="showFilters">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          
          <!-- Priorités -->
          <div class="filter-section">
            <h5>Vos priorités</h5>
            <div class="priority-options">
              <label class="priority-option">
                <input type="checkbox" formControlName="prioritizePrice">
                <span class="checkmark"></span>
                💰 Meilleur prix
              </label>
              <label class="priority-option">
                <input type="checkbox" formControlName="prioritizeCoverage">
                <span class="checkmark"></span>
                🛡️ Couverture complète
              </label>
              <label class="priority-option">
                <input type="checkbox" formControlName="prioritizeRating">
                <span class="checkmark"></span>
                ⭐ Assureur reconnu
              </label>
            </div>
          </div>

          <!-- Budget maximum -->
          <div class="filter-section">
            <h5>Budget mensuel maximum</h5>
            <div class="budget-input">
              <input 
                type="range" 
                formControlName="maxBudget"
                [min]="budgetRange.min" 
                [max]="budgetRange.max"
                [step]="5000"
                class="budget-slider">
              <div class="budget-display">
                <span>{{ formatCurrency(filterForm.get('maxBudget')?.value || budgetRange.max) }}</span>
                <small>par mois</small>
              </div>
            </div>
          </div>

          <!-- Assureurs préférés -->
          <div class="filter-section">
            <h5>Assureurs préférés (optionnel)</h5>
            <div class="insurer-chips">
              <label *ngFor="let insurer of availableInsurers" class="insurer-chip">
                <input 
                  type="checkbox" 
                  [value]="insurer.id"
                  (change)="togglePreferredInsurer(insurer.id, $event)">
                <span class="chip-content">
                  <img *ngIf="insurer.logo" [src]="insurer.logo" [alt]="insurer.name" class="insurer-logo">
                  {{ insurer.name }}
                </span>
              </label>
            </div>
          </div>

          <!-- Garanties obligatoires -->
          <div class="filter-section" *ngIf="availableGuarantees.length > 0">
            <h5>Garanties indispensables</h5>
            <div class="guarantee-list">
              <label *ngFor="let guarantee of availableGuarantees" class="guarantee-option">
                <input 
                  type="checkbox" 
                  [value]="guarantee.id"
                  [checked]="guarantee.required"
                  [disabled]="guarantee.required"
                  (change)="toggleMustHaveGuarantee(guarantee.id, $event)">
                <span class="guarantee-content">
                  <strong>{{ guarantee.name }}</strong>
                  <small>{{ guarantee.description }}</small>
                  <span *ngIf="guarantee.required" class="required-badge">Obligatoire</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Profil de risque -->
          <div class="filter-section">
            <h5>Votre profil</h5>
            <div class="risk-tolerance">
              <label class="radio-option">
                <input type="radio" formControlName="riskTolerance" value="low">
                <span>🛡️ Prudent - Je privilégie la sécurité</span>
              </label>
              <label class="radio-option">
                <input type="radio" formControlName="riskTolerance" value="medium">
                <span>⚖️ Équilibré - Je cherche le bon compromis</span>
              </label>
              <label class="radio-option">
                <input type="radio" formControlName="riskTolerance" value="high">
                <span>⚡ Dynamique - J'optimise le rapport qualité/prix</span>
              </label>
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="filter-actions">
            <button type="button" (click)="resetFilters()" class="btn-secondary">
              Réinitialiser
            </button>
            <button type="submit" class="btn-primary">
              Appliquer les filtres
            </button>
          </div>
        </form>
      </div>

      <!-- Résultats du filtrage -->
      <div *ngIf="filterResult && !showFilters" class="filter-results">
        
        <!-- Meilleure offre mise en avant -->
        <div class="best-offer-highlight">
          <div class="best-offer-header">
            <h4>🏆 Meilleure offre pour vous</h4>
            <div class="score-badge">{{ filterResult.bestOffer.score }}/100</div>
          </div>
          
          <div class="best-offer-content">
            <div class="offer-main-info">
              <h5>{{ filterResult.bestOffer.product_name }}</h5>
              <p class="company-name">{{ filterResult.bestOffer.company_name }}</p>
              <div class="price-info">
                <span class="monthly-price">{{ formatCurrency(filterResult.bestOffer.monthly_premium) }}</span>
                <small>/mois</small>
              </div>
            </div>
            
            <div class="offer-details">
              <div class="badges">
                <span *ngFor="let badge of filterResult.bestOffer.badges" class="badge">
                  {{ badge }}
                </span>
              </div>
              <p class="recommendation">{{ filterResult.bestOffer.recommendation }}</p>
            </div>
          </div>

          <!-- Détails du score -->
          <div class="score-breakdown" *ngIf="showScoreDetails">
            <div class="score-item">
              <span>Prix</span>
              <div class="score-bar">
                <div class="score-fill" [style.width.%]="filterResult.bestOffer.scoreDetails.priceScore"></div>
              </div>
              <span>{{ filterResult.bestOffer.scoreDetails.priceScore }}/100</span>
            </div>
            <div class="score-item">
              <span>Couverture</span>
              <div class="score-bar">
                <div class="score-fill" [style.width.%]="filterResult.bestOffer.scoreDetails.coverageScore"></div>
              </div>
              <span>{{ filterResult.bestOffer.scoreDetails.coverageScore }}/100</span>
            </div>
            <div class="score-item">
              <span>Notation</span>
              <div class="score-bar">
                <div class="score-fill" [style.width.%]="filterResult.bestOffer.scoreDetails.ratingScore"></div>
              </div>
              <span>{{ filterResult.bestOffer.scoreDetails.ratingScore }}/100</span>
            </div>
          </div>

          <div class="offer-actions">
            <button (click)="toggleScoreDetails()" class="btn-outline btn-small">
              {{ showScoreDetails ? 'Masquer' : 'Voir' }} le détail
            </button>
            <button (click)="selectOffer(filterResult.bestOffer)" class="btn-primary">
              Choisir cette offre
            </button>
          </div>
        </div>

        <!-- Offres alternatives -->
        <div *ngIf="filterResult.rankedOffers.length > 1" class="alternative-offers">
          <h4>Autres offres intéressantes</h4>
          
          <div class="offers-list">
            <div *ngFor="let offer of filterResult.rankedOffers.slice(1, 4); let i = index" 
               class="alternative-offer">
              <div class="offer-rank">#{{ offer.rank }}</div>
              
              <div class="offer-info">
                <h6>{{ offer.product_name }}</h6>
                <p class="company">{{ offer.company_name }}</p>
                
                <div class="offer-metrics">
                  <span class="price">{{ formatCurrency(offer.monthly_premium) }}/mois</span>
                  <span class="rating">
                    <span *ngFor="let star of getStarsArray(offer.rating)" class="star">⭐</span>
                    {{ offer.rating }}/5
                  </span>
                  <span class="score">{{ offer.score }}/100</span>
                </div>
                
                <div class="offer-badges" *ngIf="offer.badges.length > 0">
                  <span *ngFor="let badge of offer.badges.slice(0, 2)" class="mini-badge">
                    {{ badge }}
                  </span>
                </div>
              </div>
              
              <div class="offer-actions-mini">
                <button (click)="selectOffer(offer)" class="btn-outline btn-small">
                  Choisir
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Recommandations globales -->
        <div *ngIf="filterResult.recommendations.length > 0" class="global-recommendations">
          <h5>💡 Nos conseils</h5>
          <ul>
            <li *ngFor="let recommendation of filterResult.recommendations">
              {{ recommendation }}
            </li>
          </ul>
        </div>

        <!-- Résumé statistique -->
        <div class="filter-summary">
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-value">{{ filterResult.filterSummary.filteredOffers }}</span>
              <span class="stat-label">offres analysées</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ formatCurrency(filterResult.filterSummary.averagePrice) }}</span>
              <span class="stat-label">prix moyen</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ formatCurrency(filterResult.filterSummary.priceRange.max - filterResult.filterSummary.priceRange.min) }}</span>
              <span class="stat-label">écart de prix</span>
            </div>
          </div>
          
          <div class="active-criteria" *ngIf="filterResult.filterSummary.topCriteria.length > 0">
            <strong>Critères prioritaires :</strong>
            <ng-container *ngFor="let criteria of filterResult.filterSummary.topCriteria; let last = last">
              {{ criteria }}<span *ngIf="!last">, </span>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./insurance-filter.component.scss']
})
export class InsuranceFilterComponent implements OnInit {
  @Input() quotes: any[] = [];
  @Input() mainQuote: any = null;
  @Input() selectedGuarantees: string[] = [];
  @Input() insuranceType: string = '';
  @Input() availableInsurers: any[] = [];
  
  @Output() offerSelected = new EventEmitter<any>();
  @Output() filtersChanged = new EventEmitter<FilterResult>();

  filterForm!: FormGroup;
  filterResult: FilterResult | null = null;
  showFilters = false;
  showScoreDetails = false;
  
  budgetRange = { min: 10000, max: 200000 };
  availableGuarantees: any[] = [];
  preferredInsurers: string[] = [];

  constructor(
    private fb: FormBuilder,
    private filterService: InsuranceFilterService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.calculateBudgetRange();
    this.loadAvailableGuarantees();
    this.applyInitialFilters();
  }

  private initializeForm(): void {
    this.filterForm = this.fb.group({
      prioritizePrice: [false],
      prioritizeCoverage: [true], // Par défaut, privilégier la couverture
      prioritizeRating: [false],
      maxBudget: [this.budgetRange.max],
      riskTolerance: ['medium']
    });

    // Écouter les changements pour mise à jour automatique
    this.filterForm.valueChanges.subscribe(() => {
      if (!this.showFilters) {
        this.applyFilters();
      }
    });
  }

  private calculateBudgetRange(): void {
    const allQuotes = [this.mainQuote, ...this.quotes].filter(q => q);
    if (allQuotes.length > 0) {
      const prices = allQuotes.map(q => q.monthly_premium || 0);
      this.budgetRange.min = Math.max(5000, Math.min(...prices) - 10000);
      this.budgetRange.max = Math.max(...prices) + 20000;
      
      this.filterForm.patchValue({
        maxBudget: this.budgetRange.max
      });
    }
  }

  private loadAvailableGuarantees(): void {
    // Simuler les garanties disponibles selon le type d'assurance
    const guaranteesByType: { [key: string]: any[] } = {
      'auto': [
        { id: 'responsabilite_civile', name: 'Responsabilité civile', description: 'Obligatoire', required: true },
        { id: 'vol', name: 'Vol', description: 'Protection contre le vol', required: false },
        { id: 'incendie', name: 'Incendie', description: 'Dommages par le feu', required: false },
        { id: 'assistance', name: 'Assistance 24h/24', description: 'Dépannage', required: false }
      ],
      'habitation': [
        { id: 'incendie', name: 'Incendie', description: 'Obligatoire', required: true },
        { id: 'degats_eaux', name: 'Dégâts des eaux', description: 'Fuites et ruptures', required: false },
        { id: 'vol', name: 'Vol/Cambriolage', description: 'Protection biens', required: false }
      ],
      'sante': [
        { id: 'hospitalisation', name: 'Hospitalisation', description: 'Obligatoire', required: true },
        { id: 'dentaire', name: 'Soins dentaires', description: 'Prothèses et soins', required: false },
        { id: 'optique', name: 'Optique', description: 'Lunettes et lentilles', required: false }
      ]
    };

    this.availableGuarantees = guaranteesByType[this.insuranceType] || [];
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    if (!this.showFilters) {
      this.applyFilters();
    }
  }

  toggleScoreDetails(): void {
    this.showScoreDetails = !this.showScoreDetails;
  }

  togglePreferredInsurer(insurerId: string, event: any): void {
    if (event.target.checked) {
      if (!this.preferredInsurers.includes(insurerId)) {
        this.preferredInsurers.push(insurerId);
      }
    } else {
      this.preferredInsurers = this.preferredInsurers.filter(id => id !== insurerId);
    }
  }

  toggleMustHaveGuarantee(guaranteeId: string, event: any): void {
    // Logique pour les garanties obligatoires
    // Implémentation selon les besoins
  }

  applyFilters(): void {
    if (this.quotes.length === 0) return;

    const formValue = this.filterForm.value;
    
    const criteria: FilterCriteria = {
      prioritizePrice: formValue.prioritizePrice,
      prioritizeCoverage: formValue.prioritizeCoverage,
      prioritizeRating: formValue.prioritizeRating,
      maxBudget: formValue.maxBudget,
      mustHaveGuarantees: this.selectedGuarantees,
      preferredInsurers: this.preferredInsurers,
      riskTolerance: formValue.riskTolerance
    };

    console.log('Application des filtres avec critères:', criteria);

    this.filterResult = this.filterService.filterAndRankOffers(
      this.quotes,
      this.mainQuote,
      criteria,
      this.selectedGuarantees,
      this.insuranceType
    );

    console.log('Résultat du filtrage:', this.filterResult);
    this.filtersChanged.emit(this.filterResult);
  }

  getStarsArray(rating: number | undefined): number[] {
  return Array(Math.floor(rating || 4)).fill(0);
}

  private applyInitialFilters(): void {
    // Appliquer les filtres par défaut au chargement
    setTimeout(() => {
      this.applyFilters();
    }, 100);
  }

  resetFilters(): void {
    this.filterForm.reset({
      prioritizePrice: false,
      prioritizeCoverage: true,
      prioritizeRating: false,
      maxBudget: this.budgetRange.max,
      riskTolerance: 'medium'
    });
    this.preferredInsurers = [];
    this.applyFilters();
  }

  selectOffer(offer: any): void {
    console.log('Offre sélectionnée:', offer);
    this.offerSelected.emit(offer);
  }

  formatCurrency(amount: number): string {
    if (!amount) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
  }

}