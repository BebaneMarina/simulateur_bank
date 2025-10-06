// insurance-filter.service.ts - Service de filtrage amélioré
import { Injectable } from '@angular/core';

export interface FilterCriteria {
  maxMonthlyPremium?: number;
  minRating?: number;
  preferredCompanies?: string[];
  coverageLevel?: 'basique' | 'standard' | 'premium';
  sortBy?: 'price' | 'rating' | 'coverage' | 'recommended';
  includedGuarantees?: string[];
  minCoverageAmount?: number;
}

export interface ScoredQuote {
  // Données de base du devis
  company_name: string;
  product_name: string;
  monthly_premium: number;
  annual_premium: number;
  deductible: number;
  rating?: number;
  advantages?: string[];
  
  // Scoring et classement
  score: number;
  rank: number;
  badges: string[];
  recommendation: string;
  
  // Détails du scoring
  scoreDetails: {
    priceScore: number;
    coverageScore: number;
    ratingScore: number;
    matchScore: number;
  };
  
  // Métadonnées
  coverage_details?: any;
  exclusions?: string[];
  company_id?: string;
  contact_phone?: string;
  contact_email?: string;
  
  // Nouveaux champs pour analyse
  valueForMoney: number;
  isRecommended: boolean;
  matchPercentage: number;
}

export interface FilterResult {
  bestOffer: ScoredQuote;
  rankedOffers: ScoredQuote[];
  filterSummary: {
    totalOffers: number;
    filteredOffers: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    topCriteria: string[];
  };
  appliedFilters: FilterCriteria;
}

@Injectable({
  providedIn: 'root'
})
export class InsuranceFilterService {
  
  /**
   * Filtre et classe les offres selon les critères
   */
  filterAndRankOffers(
    quotes: any[],
    criteria: FilterCriteria,
    userProfile?: any
  ): FilterResult {
    console.log('🔍 Début du filtrage:', { quotesCount: quotes.length, criteria });
    
    if (!quotes || quotes.length === 0) {
      return this.createEmptyResult(criteria);
    }

    // 1. Normaliser les offres
    const normalizedQuotes = quotes.map(q => this.normalizeQuote(q));
    
    // 2. Filtrer selon les critères
    let filteredQuotes = this.applyFilters(normalizedQuotes, criteria);
    
    // 3. Scorer chaque offre
    const scoredQuotes = filteredQuotes.map(quote => 
      this.calculateQuoteScore(quote, criteria, userProfile)
    );
    
    // 4. Trier selon le critère de tri
    const sortedQuotes = this.sortQuotes(scoredQuotes, criteria.sortBy || 'recommended');
    
    // 5. Attribuer les rangs
    const rankedQuotes = sortedQuotes.map((quote, index) => ({
      ...quote,
      rank: index + 1
    }));
    
    // 6. Identifier la meilleure offre
    const bestOffer = rankedQuotes[0];
    
    // 7. Créer le résumé
    const filterSummary = this.createFilterSummary(
      normalizedQuotes,
      rankedQuotes,
      criteria
    );
    
    console.log('✅ Filtrage terminé:', {
      filtered: rankedQuotes.length,
      bestScore: bestOffer.score
    });
    
    return {
      bestOffer,
      rankedOffers: rankedQuotes,
      filterSummary,
      appliedFilters: criteria
    };
  }

  /**
   * Normalise un devis pour uniformiser la structure
   */
  private normalizeQuote(quote: any): any {
    return {
      company_name: quote.company_name || quote.companyName || 'Assureur',
      product_name: quote.product_name || quote.productName || 'Assurance',
      monthly_premium: Number(quote.monthly_premium || quote.monthlyPremium || 0),
      annual_premium: Number(quote.annual_premium || quote.annualPremium || 
        (quote.monthly_premium || 0) * 12),
      deductible: Number(quote.deductible || 0),
      rating: Number(quote.rating || 4.0),
      advantages: Array.isArray(quote.advantages) ? quote.advantages : [],
      coverage_details: quote.coverage_details || {},
      exclusions: Array.isArray(quote.exclusions) ? quote.exclusions : [],
      company_id: quote.company_id,
      contact_phone: quote.contact_phone,
      contact_email: quote.contact_email
    };
  }

  /**
   * Applique les filtres sur les offres
   */
  private applyFilters(quotes: any[], criteria: FilterCriteria): any[] {
    let filtered = [...quotes];
    
    // Filtre par prix maximum
    if (criteria.maxMonthlyPremium) {
      filtered = filtered.filter(q => 
        q.monthly_premium <= criteria.maxMonthlyPremium!
      );
    }
    
    // Filtre par note minimum
    if (criteria.minRating) {
      filtered = filtered.filter(q => 
        (q.rating || 0) >= criteria.minRating!
      );
    }
    
    // Filtre par compagnies préférées
    if (criteria.preferredCompanies && criteria.preferredCompanies.length > 0) {
      filtered = filtered.filter(q =>
        criteria.preferredCompanies!.some(company =>
          q.company_name.toLowerCase().includes(company.toLowerCase())
        )
      );
    }
    
    return filtered;
  }

  /**
   * Calcule le score d'une offre
   */
  private calculateQuoteScore(
    quote: any,
    criteria: FilterCriteria,
    userProfile?: any
  ): ScoredQuote {
    // Calcul des sous-scores (0-100)
    const priceScore = this.calculatePriceScore(quote.monthly_premium, criteria);
    const coverageScore = this.calculateCoverageScore(quote, criteria);
    const ratingScore = this.calculateRatingScore(quote.rating);
    const matchScore = this.calculateMatchScore(quote, criteria, userProfile);
    
    // Score global pondéré
    const totalScore = Math.round(
      (priceScore * 0.35) +
      (coverageScore * 0.25) +
      (ratingScore * 0.20) +
      (matchScore * 0.20)
    );
    
    // Calcul du rapport qualité-prix
    const valueForMoney = this.calculateValueForMoney(
      quote.monthly_premium,
      coverageScore,
      ratingScore
    );
    
    // Badges
    const badges = this.generateBadges(quote, {
      priceScore,
      coverageScore,
      ratingScore,
      matchScore,
      totalScore
    });
    
    // Recommandation personnalisée
    const recommendation = this.generateRecommendation(quote, {
      priceScore,
      coverageScore,
      ratingScore,
      matchScore
    });
    
    return {
      ...quote,
      score: totalScore,
      rank: 0, // Sera défini après le tri
      badges,
      recommendation,
      scoreDetails: {
        priceScore,
        coverageScore,
        ratingScore,
        matchScore
      },
      valueForMoney,
      isRecommended: totalScore >= 80,
      matchPercentage: matchScore
    };
  }

  /**
   * Score basé sur le prix (0-100)
   */
  private calculatePriceScore(price: number, criteria: FilterCriteria): number {
    if (!price) return 0;
    
    const maxPrice = criteria.maxMonthlyPremium || price * 1.5;
    const minPrice = price * 0.5;
    
    // Score inversement proportionnel au prix
    const normalizedPrice = (maxPrice - price) / (maxPrice - minPrice);
    return Math.max(0, Math.min(100, normalizedPrice * 100));
  }

  /**
   * Score basé sur la couverture (0-100)
   */
  private calculateCoverageScore(quote: any, criteria: FilterCriteria): number {
    let score = 50; // Score de base
    
    // Bonus pour les avantages
    if (quote.advantages && quote.advantages.length > 0) {
      score += Math.min(25, quote.advantages.length * 5);
    }
    
    // Bonus pour la couverture détaillée
    if (quote.coverage_details && Object.keys(quote.coverage_details).length > 0) {
      score += Math.min(15, Object.keys(quote.coverage_details).length * 3);
    }
    
    // Pénalité pour franchise élevée
    if (quote.deductible > 100000) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score basé sur la note (0-100)
   */
  private calculateRatingScore(rating: number): number {
    if (!rating) return 50;
    return (rating / 5) * 100;
  }

  /**
   * Score de correspondance avec les critères (0-100)
   */
  private calculateMatchScore(
    quote: any,
    criteria: FilterCriteria,
    userProfile?: any
  ): number {
    let matchPoints = 0;
    let totalCriteria = 0;
    
    // Correspondance avec le budget
    if (criteria.maxMonthlyPremium) {
      totalCriteria++;
      if (quote.monthly_premium <= criteria.maxMonthlyPremium * 0.9) {
        matchPoints++; // Largement en-dessous du budget
      } else if (quote.monthly_premium <= criteria.maxMonthlyPremium) {
        matchPoints += 0.5; // Dans le budget
      }
    }
    
    // Correspondance avec la note minimale
    if (criteria.minRating) {
      totalCriteria++;
      if (quote.rating >= criteria.minRating + 0.5) {
        matchPoints++; // Dépasse largement
      } else if (quote.rating >= criteria.minRating) {
        matchPoints += 0.5; // Atteint le minimum
      }
    }
    
    // Correspondance avec les compagnies préférées
    if (criteria.preferredCompanies && criteria.preferredCompanies.length > 0) {
      totalCriteria++;
      if (criteria.preferredCompanies.some(c => 
        quote.company_name.toLowerCase().includes(c.toLowerCase())
      )) {
        matchPoints++;
      }
    }
    
    // Score par défaut si pas de critères
    if (totalCriteria === 0) return 75;
    
    return (matchPoints / totalCriteria) * 100;
  }

  /**
   * Calcule le rapport qualité-prix
   */
  private calculateValueForMoney(
    price: number,
    coverageScore: number,
    ratingScore: number
  ): number {
    const qualityScore = (coverageScore + ratingScore) / 2;
    const priceNormalized = Math.max(1, price / 10000); // Normaliser le prix
    return Math.round((qualityScore / priceNormalized) * 10);
  }

  /**
   * Génère des badges pour l'offre
   */
  private generateBadges(quote: any, scores: any): string[] {
    const badges: string[] = [];
    
    if (scores.totalScore >= 90) {
      badges.push('⭐ Excellent choix');
    } else if (scores.totalScore >= 80) {
      badges.push('✓ Très bon rapport');
    }
    
    if (scores.priceScore >= 85) {
      badges.push('💰 Prix attractif');
    }
    
    if (scores.ratingScore >= 90) {
      badges.push('🏆 Top noté');
    }
    
    if (scores.coverageScore >= 85) {
      badges.push('🛡️ Couverture étendue');
    }
    
    if (quote.advantages && quote.advantages.length >= 5) {
      badges.push('✨ Nombreux avantages');
    }
    
    return badges;
  }

  /**
   * Génère une recommandation personnalisée
   */
  private generateRecommendation(quote: any, scores: any): string {
    if (scores.totalScore >= 90) {
      return `Offre exceptionnelle combinant ${scores.priceScore >= 80 ? 'un prix compétitif' : 'une excellente couverture'} et une excellente réputation.`;
    }
    
    if (scores.priceScore >= 85 && scores.ratingScore >= 80) {
      return `Excellent équilibre entre prix attractif et qualité de service reconnue.`;
    }
    
    if (scores.coverageScore >= 85) {
      return `Couverture très complète avec ${quote.advantages?.length || 0} avantages inclus.`;
    }
    
    if (scores.ratingScore >= 90) {
      return `Assureur hautement noté (${quote.rating}/5) par les clients.`;
    }
    
    if (scores.priceScore >= 80) {
      return `Prix compétitif de ${this.formatPrice(quote.monthly_premium)}/mois pour cette couverture.`;
    }
    
    return `Offre solide avec un bon rapport qualité-prix global.`;
  }

  /**
   * Trie les offres selon le critère
   */
  private sortQuotes(quotes: ScoredQuote[], sortBy: string): ScoredQuote[] {
    const sorted = [...quotes];
    
    switch (sortBy) {
      case 'price':
        return sorted.sort((a, b) => a.monthly_premium - b.monthly_premium);
      
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      case 'coverage':
        return sorted.sort((a, b) => 
          b.scoreDetails.coverageScore - a.scoreDetails.coverageScore
        );
      
      case 'recommended':
      default:
        return sorted.sort((a, b) => b.score - a.score);
    }
  }

  /**
   * Crée un résumé du filtrage
   */
  private createFilterSummary(
    originalQuotes: any[],
    filteredQuotes: ScoredQuote[],
    criteria: FilterCriteria
  ): FilterResult['filterSummary'] {
    const prices = filteredQuotes.map(q => q.monthly_premium);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const topCriteria: string[] = [];
    if (criteria.maxMonthlyPremium) topCriteria.push('Budget');
    if (criteria.minRating) topCriteria.push('Notation');
    if (criteria.preferredCompanies?.length) topCriteria.push('Assureur');
    if (criteria.sortBy) topCriteria.push('Tri: ' + criteria.sortBy);
    
    return {
      totalOffers: originalQuotes.length,
      filteredOffers: filteredQuotes.length,
      averagePrice: Math.round(avgPrice),
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      topCriteria
    };
  }

  /**
   * Crée un résultat vide
   */
  private createEmptyResult(criteria: FilterCriteria): FilterResult {
    const emptyQuote: ScoredQuote = {
      company_name: 'Aucune offre',
      product_name: 'Aucune offre disponible',
      monthly_premium: 0,
      annual_premium: 0,
      deductible: 0,
      score: 0,
      rank: 0,
      badges: [],
      recommendation: 'Veuillez ajuster vos critères de recherche',
      scoreDetails: {
        priceScore: 0,
        coverageScore: 0,
        ratingScore: 0,
        matchScore: 0
      },
      valueForMoney: 0,
      isRecommended: false,
      matchPercentage: 0
    };
    
    return {
      bestOffer: emptyQuote,
      rankedOffers: [],
      filterSummary: {
        totalOffers: 0,
        filteredOffers: 0,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        topCriteria: []
      },
      appliedFilters: criteria
    };
  }

  /**
   * Utilitaire de formatage des prix
   */
  private formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA';
  }
}