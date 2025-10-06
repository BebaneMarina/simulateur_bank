// insurance-filter.component.ts - Composant de filtrage interactif
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InsuranceFilterService, FilterCriteria, FilterResult, ScoredQuote } from '../../services/insurance-filter.service';

@Component({
  selector: 'app-insurance-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-container" *ngIf="quotes && quotes.length > 0">
      <!-- Header avec statistiques -->
      <div class="filter-header">
        <h3>
          <span class="filter-icon">🔍</span>
          Filtrer et comparer les offres
        </h3>
        <div class="stats-summary" *ngIf="filterResult">
          <span class="stat-item">
            <strong>{{ filterResult.filterSummary.filteredOffers }}</strong> sur 
            {{ filterResult.filterSummary.totalOffers }} offres
          </span>
          <span class="stat-item">
            Prix moyen: <strong>{{ formatCurrency(filterResult.filterSummary.averagePrice) }}</strong>
          </span>
        </div>
      </div>

      <!-- Panneau de filtres -->
      <div class="filters-panel" [class.expanded]="showFilters">
        <button 
          class="filters-toggle" 
          (click)="toggleFilters()"
          [class.active]="showFilters">
          <span class="toggle-icon">{{ showFilters ? '▼' : '▶' }}</span>
          {{ showFilters ? 'Masquer les filtres' : 'Afficher les filtres' }}
          <span class="active-filters-count" *ngIf="getActiveFiltersCount() > 0">
            ({{ getActiveFiltersCount() }})
          </span>
        </button>

        <div class="filters-content" *ngIf="showFilters">
          <!-- Filtre par prix -->
          <div class="filter-group">
            <label for="maxPrice">
              <span class="filter-label">Budget maximum (par mois)</span>
              <span class="filter-value" *ngIf="filters.maxMonthlyPremium">
                {{ formatCurrency(filters.maxMonthlyPremium) }}
              </span>
            </label>
            <input 
              type="range" 
              id="maxPrice"
              [(ngModel)]="filters.maxMonthlyPremium"
              [min]="priceRange.min"
              [max]="priceRange.max"
              [step]="5000"
              (change)="applyFilters()"
              class="range-slider">
            <div class="range-labels">
              <span>{{ formatCurrency(priceRange.min) }}</span>
              <span>{{ formatCurrency(priceRange.max) }}</span>
            </div>
          </div>

          <!-- Filtre par notation -->
          <div class="filter-group">
            <label for="minRating">
              <span class="filter-label">Note minimum</span>
              <span class="filter-value" *ngIf="filters.minRating">
                {{ filters.minRating }}/5 ⭐
              </span>
            </label>
            <input 
              type="range" 
              id="minRating"
              [(ngModel)]="filters.minRating"
              min="0"
              max="5"
              step="0.5"
              (change)="applyFilters()"
              class="range-slider">
            <div class="range-labels">
              <span>0/5</span>
              <span>5/5</span>
            </div>
          </div>

          <!-- Filtre par compagnies -->
          <div class="filter-group">
            <label class="filter-label">Assureurs préférés</label>
            <div class="checkbox-group">
              <label 
                *ngFor="let insurer of availableInsurers" 
                class="checkbox-label">
                <input 
                  type="checkbox" 
                  [value]="insurer.id"
                  [checked]="isInsurerSelected(insurer.id)"
                  (change)="toggleInsurer(insurer.id)">
                <img 
                  *ngIf="insurer.logo" 
                  [src]="insurer.logo" 
                  [alt]="insurer.name"
                  class="insurer-logo-small">
                <span>{{ insurer.name }}</span>
              </label>
            </div>
          </div>

          <!-- Tri -->
          <div class="filter-group">
            <label for="sortBy" class="filter-label">Trier par</label>
            <select 
              id="sortBy"
              [(ngModel)]="filters.sortBy"
              (change)="applyFilters()"
              class="sort-select">
              <option value="recommended">🎯 Recommandé</option>
              <option value="price">💰 Prix (croissant)</option>
              <option value="rating">⭐ Note (décroissant)</option>
              <option value="coverage">🛡️ Couverture</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button 
              class="btn-reset" 
              (click)="resetFilters()"
              *ngIf="getActiveFiltersCount() > 0">
              🔄 Réinitialiser
            </button>
            <button 
              class="btn-apply" 
              (click)="applyFilters()">
              ✓ Appliquer les filtres
            </button>
          </div>
        </div>
      </div>

      <!-- Aperçu rapide des critères actifs -->
      <div class="active-filters-tags" *ngIf="getActiveFiltersCount() > 0 && !showFilters">
        <span class="filter-tag" *ngIf="filters.maxMonthlyPremium">
          Budget: ≤ {{ formatCurrency(filters.maxMonthlyPremium) }}
          <button class="tag-remove" (click)="removeFilter('maxMonthlyPremium')">×</button>
        </span>
        <span class="filter-tag" *ngIf="filters.minRating">
          Note: ≥ {{ filters.minRating }}/5
          <button class="tag-remove" (click)="removeFilter('minRating')">×</button>
        </span>
        <span class="filter-tag" *ngIf="filters.preferredCompanies && filters.preferredCompanies.length > 0">
          {{ filters.preferredCompanies.length }} assureur(s)
          <button class="tag-remove" (click)="removeFilter('preferredCompanies')">×</button>
        </span>
        <span class="filter-tag" *ngIf="filters.sortBy && filters.sortBy !== 'recommended'">
          Tri: {{ getSortLabel(filters.sortBy) }}
          <button class="tag-remove" (click)="removeFilter('sortBy')">×</button>
        </span>
      </div>

      <!-- Message si aucun résultat -->
      <div class="no-results" *ngIf="filterResult && filterResult.rankedOffers.length === 0">
        <div class="no-results-icon">🔍</div>
        <h4>Aucune offre ne correspond à vos critères</h4>
        <p>Essayez d'ajuster vos filtres pour voir plus d'offres.</p>
        <button class="btn-reset-large" (click)="resetFilters()">
          Réinitialiser les filtres
        </button>
      </div>
    </div>
  `,
  styles: [`
    .filter-container {
      margin-bottom: 30px;
    }

    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;

      h3 {
        font-size: 1.3rem;
        color: #111827;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;

        .filter-icon {
          font-size: 1.2rem;
        }
      }

      .stats-summary {
        display: flex;
        gap: 20px;
        font-size: 14px;

        .stat-item {
          color: #6b7280;

          strong {
            color: #10b981;
            font-weight: 600;
          }
        }
      }
    }

    .filters-panel {
      background: linear-gradient(145deg, #f9fafb, #ffffff);
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      margin-bottom: 20px;
    }

    .filters-toggle {
      width: 100%;
      padding: 16px 20px;
      background: transparent;
      border: none;
      text-align: left;
      font-size: 15px;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: background 0.2s;

      &:hover {
        background: rgba(16, 185, 129, 0.05);
      }

      &.active {
        background: rgba(16, 185, 129, 0.08);
        color: #10b981;
      }

      .toggle-icon {
        font-size: 12px;
        transition: transform 0.3s;
      }

      .active-filters-count {
        margin-left: auto;
        background: #10b981;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
      }
    }

    .filters-content {
      padding: 24px 20px;
      border-top: 1px solid #e5e7eb;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .filter-group {
      margin-bottom: 24px;

      &:last-child {
        margin-bottom: 0;
      }

      label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .filter-label {
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }

      .filter-value {
        font-size: 13px;
        color: #10b981;
        font-weight: 600;
      }
    }

    .range-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, #d1fae5, #10b981);
      outline: none;
      -webkit-appearance: none;
      margin-bottom: 8px;
      cursor: pointer;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #10b981;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
      }

      &::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #10b981;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
      }
    }

    .range-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #6b7280;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: rgba(16, 185, 129, 0.05);
          border-color: #10b981;
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #10b981;
          cursor: pointer;
        }

        .insurer-logo-small {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        span {
          font-size: 14px;
          color: #374151;
        }
      }
    }

    .sort-select {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
      }
    }

    .filter-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;

      button {
        flex: 1;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s;
        border: none;
      }

      .btn-reset {
        background: white;
        color: #6b7280;
        border: 2px solid #e5e7eb;

        &:hover {
          border-color: #10b981;
          color: #10b981;
          transform: translateY(-2px);
        }
      }

      .btn-apply {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);

        &:hover {
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
          transform: translateY(-2px);
        }
      }
    }

    .active-filters-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 16px;
      background: rgba(16, 185, 129, 0.05);
      border-radius: 10px;
      margin-bottom: 20px;

      .filter-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: white;
        border: 1px solid #10b981;
        border-radius: 20px;
        font-size: 13px;
        color: #374151;
        font-weight: 500;

        .tag-remove {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;

          &:hover {
            background: #fee2e2;
          }
        }
      }
    }

    .no-results {
      text-align: center;
      padding: 60px 20px;
      background: linear-gradient(145deg, #f9fafb, #ffffff);
      border-radius: 12px;
      border: 2px dashed #e5e7eb;

      .no-results-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        opacity: 0.5;
      }

      h4 {
        font-size: 1.3rem;
        color: #374151;
        margin-bottom: 12px;
      }

      p {
        color: #6b7280;
        margin-bottom: 24px;
      }

      .btn-reset-large {
        padding: 12px 24px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
        }
      }
    }

    @media (max-width: 768px) {
      .filter-header {
        flex-direction: column;
        align-items: flex-start;

        .stats-summary {
          flex-direction: column;
          gap: 8px;
        }
      }

      .filter-actions {
        flex-direction: column;
      }

      .active-filters-tags {
        gap: 8px;
      }
    }
  `]
})
export class InsuranceFilterComponent implements OnInit, OnChanges {
  @Input() quotes: any[] = [];
  @Input() insurersList: any[] = [];
  
  @Output() filtersChanged = new EventEmitter<FilterResult>();
  @Output() offerSelected = new EventEmitter<ScoredQuote>();

  showFilters = false;
  filterResult: FilterResult | null = null;

  filters: FilterCriteria = {
    sortBy: 'recommended'
  };

  priceRange = {
    min: 0,
    max: 200000
  };

  availableInsurers: any[] = [];

  constructor(private filterService: InsuranceFilterService) {}

  ngOnInit(): void {
    this.initializeFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['quotes'] && this.quotes?.length > 0) {
      this.calculatePriceRange();
      this.extractAvailableInsurers();
      this.applyFilters();
    }
  }

  private initializeFilters(): void {
    this.filters = {
      sortBy: 'recommended',
      preferredCompanies: []
    };
  }

  private calculatePriceRange(): void {
    if (!this.quotes || this.quotes.length === 0) return;

    const prices = this.quotes.map(q => 
      Number(q.monthly_premium || q.monthlyPremium || 0)
    );

    this.priceRange = {
      min: Math.floor(Math.min(...prices) * 0.9),
      max: Math.ceil(Math.max(...prices) * 1.1)
    };

    // Initialiser le filtre de prix au maximum par défaut
    if (!this.filters.maxMonthlyPremium) {
      this.filters.maxMonthlyPremium = this.priceRange.max;
    }
  }

  private extractAvailableInsurers(): void {
    if (this.insurersList && this.insurersList.length > 0) {
      this.availableInsurers = this.insurersList;
      return;
    }

    // Extraire depuis les quotes si pas fourni
    const insurersMap = new Map<string, any>();
    
    this.quotes.forEach(quote => {
      const companyName = quote.company_name || quote.companyName;
      const companyId = quote.company_id || 
        companyName?.toLowerCase().replace(/\s+/g, '_');
      
      if (companyName && !insurersMap.has(companyId)) {
        insurersMap.set(companyId, {
          id: companyId,
          name: companyName,
          logo: quote.company_logo || null
        });
      }
    });

    this.availableInsurers = Array.from(insurersMap.values());
  }

  applyFilters(): void {
    console.log('Application des filtres:', this.filters);
    
    this.filterResult = this.filterService.filterAndRankOffers(
      this.quotes,
      this.filters
    );

    console.log('Résultat du filtrage:', this.filterResult);
    
    this.filtersChanged.emit(this.filterResult);
  }

  resetFilters(): void {
    this.filters = {
      sortBy: 'recommended',
      preferredCompanies: []
    };
    this.filters.maxMonthlyPremium = this.priceRange.max;
    this.filters.minRating = undefined;
    
    this.applyFilters();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  toggleInsurer(insurerId: string): void {
    if (!this.filters.preferredCompanies) {
      this.filters.preferredCompanies = [];
    }

    const index = this.filters.preferredCompanies.indexOf(insurerId);
    
    if (index > -1) {
      this.filters.preferredCompanies.splice(index, 1);
    } else {
      this.filters.preferredCompanies.push(insurerId);
    }

    this.applyFilters();
  }

  isInsurerSelected(insurerId: string): boolean {
    return this.filters.preferredCompanies?.includes(insurerId) || false;
  }

  removeFilter(filterKey: string): void {
    switch (filterKey) {
      case 'maxMonthlyPremium':
        this.filters.maxMonthlyPremium = this.priceRange.max;
        break;
      case 'minRating':
        this.filters.minRating = undefined;
        break;
      case 'preferredCompanies':
        this.filters.preferredCompanies = [];
        break;
      case 'sortBy':
        this.filters.sortBy = 'recommended';
        break;
    }
    
    this.applyFilters();
  }

  getActiveFiltersCount(): number {
    let count = 0;
    
    if (this.filters.maxMonthlyPremium && 
        this.filters.maxMonthlyPremium < this.priceRange.max) {
      count++;
    }
    
    if (this.filters.minRating) {
      count++;
    }
    
    if (this.filters.preferredCompanies && 
        this.filters.preferredCompanies.length > 0) {
      count++;
    }
    
    if (this.filters.sortBy && this.filters.sortBy !== 'recommended') {
      count++;
    }
    
    return count;
  }

  getSortLabel(sortBy: string): string {
    const labels: { [key: string]: string } = {
      'price': 'Prix',
      'rating': 'Note',
      'coverage': 'Couverture',
      'recommended': 'Recommandé'
    };
    return labels[sortBy] || sortBy;
  }

  formatCurrency(amount: number): string {
    if (!amount) return '0 FCFA';
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA';
  }
}