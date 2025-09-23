// insurance-filter.service.ts - Service pour identifier la meilleure offre
import { Injectable } from '@angular/core';
import { QuoteOption } from './api.service';

export interface FilterCriteria {
  prioritizePrice: boolean;        // Privilégier le prix
  prioritizeCoverage: boolean;     // Privilégier la couverture
  prioritizeRating: boolean;       // Privilégier la notation
  maxBudget?: number;             // Budget maximum mensuel
  mustHaveGuarantees: string[];   // Garanties obligatoires
  preferredInsurers: string[];    // Assureurs préférés
  riskTolerance: 'low' | 'medium' | 'high'; // Tolérance au risque
}

export interface ScoredQuote extends QuoteOption {
  score: number;
  scoreDetails: {
    priceScore: number;
    coverageScore: number;
    ratingScore: number;
    guaranteeScore: number;
    companyScore: number;
  };
  rank: number;
  recommendation: string;
  badges: string[];
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
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class InsuranceFilterService {

  constructor() {}

  /**
   * Filtre et classe les offres selon les critères spécifiés
   */
  filterAndRankOffers(
    quotes: QuoteOption[], 
    mainQuote: any, 
    criteria: FilterCriteria,
    selectedGuarantees: string[],
    insuranceType: string
  ): FilterResult {
    console.log('🔍 Filtrage des offres avec critères:', criteria);
    
    // Combiner l'offre principale avec les alternatives
    const allQuotes = this.normalizeQuotes([mainQuote, ...quotes]);
    
    // Étape 1: Filtrage par critères stricts
    const filteredQuotes = this.applyStrictFilters(allQuotes, criteria);
    
    // Étape 2: Calcul des scores pour chaque offre
    const scoredQuotes = this.calculateScores(filteredQuotes, criteria, selectedGuarantees, insuranceType);
    
    // Étape 3: Classement final
    const rankedOffers = this.rankOffers(scoredQuotes);
    
    // Étape 4: Attribution des badges
    const badgedOffers = this.assignBadges(rankedOffers);
    
    // Étape 5: Génération du résumé et recommandations
    const filterSummary = this.generateFilterSummary(allQuotes, badgedOffers, criteria);
    const recommendations = this.generateRecommendations(badgedOffers, criteria);
    
    return {
      bestOffer: badgedOffers[0],
      rankedOffers: badgedOffers,
      filterSummary,
      recommendations
    };
  }

  /**
   * Normalise les données des offres pour un traitement uniforme
   */
  private normalizeQuotes(quotes: any[]): QuoteOption[] {
    return quotes.map((quote, index) => ({
      company_name: quote.company_name || `Assureur ${index + 1}`,
      product_name: quote.product_name || `Produit ${index + 1}`,
      monthly_premium: Number(quote.monthly_premium) || 0,
      annual_premium: Number(quote.annual_premium) || Number(quote.monthly_premium) * 12 || 0,
      deductible: Number(quote.deductible) || 0,
      rating: Number(quote.rating) || 4.0,
      advantages: Array.isArray(quote.advantages) ? quote.advantages : [],
      company_id: quote.company_id || quote.company_name?.toLowerCase().replace(/\s+/g, '_'),
      contact_phone: quote.contact_phone || '+241 01 00 00 00',
      contact_email: quote.contact_email || 'contact@assurance.ga'
    }));
  }

  /**
   * Applique les filtres stricts (budget, garanties obligatoires, etc.)
   */
  private applyStrictFilters(quotes: QuoteOption[], criteria: FilterCriteria): QuoteOption[] {
    return quotes.filter(quote => {
      // Filtre budget
      if (criteria.maxBudget && quote.monthly_premium > criteria.maxBudget) {
        return false;
      }
      
      // Filtre assureurs préférés (si spécifié)
      if (criteria.preferredInsurers.length > 0) {
        const isPreferred = criteria.preferredInsurers.some(preferred => 
          quote.company_name.toLowerCase().includes(preferred.toLowerCase()) ||
          quote.company_id?.includes(preferred)
        );
        if (!isPreferred) return false;
      }
      
      return true;
    });
  }

  /**
   * Calcule le score de chaque offre selon les critères
   */
  private calculateScores(
    quotes: QuoteOption[], 
    criteria: FilterCriteria, 
    selectedGuarantees: string[],
    insuranceType: string
  ): ScoredQuote[] {
    if (quotes.length === 0) return [];
    
    const prices = quotes.map(q => q.monthly_premium);
    const ratings = quotes.map(q => q.rating || 4.0);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    
    return quotes.map(quote => {
      const scoreDetails = {
        priceScore: this.calculatePriceScore(quote.monthly_premium, minPrice, maxPrice),
        coverageScore: this.calculateCoverageScore(quote, selectedGuarantees, insuranceType),
        ratingScore: this.calculateRatingScore(quote.rating || 4.0, avgRating),
        guaranteeScore: this.calculateGuaranteeScore(quote, selectedGuarantees),
        companyScore: this.calculateCompanyScore(quote, criteria.preferredInsurers)
      };
      
      // Score pondéré selon les priorités
      const weightedScore = this.calculateWeightedScore(scoreDetails, criteria);
      
      return {
        ...quote,
        score: weightedScore,
        scoreDetails,
        rank: 0, // Sera défini lors du classement
        recommendation: this.generateQuoteRecommendation(quote, scoreDetails),
        badges: [] // Seront attribués plus tard
      };
    });
  }

  /**
   * Score basé sur le prix (plus c'est bas, mieux c'est)
   */
  private calculatePriceScore(price: number, minPrice: number, maxPrice: number): number {
    if (maxPrice === minPrice) return 100;
    return Math.max(0, 100 - ((price - minPrice) / (maxPrice - minPrice)) * 100);
  }

  /**
   * Score basé sur la couverture
   */
  private calculateCoverageScore(quote: QuoteOption, selectedGuarantees: string[], insuranceType: string): number {
    let score = 60; // Score de base
    
    // Bonus pour les avantages
    if (quote.advantages && quote.advantages.length > 0) {
      score += Math.min(20, quote.advantages.length * 5);
    }
    
    // Bonus selon le type d'assurance
    const typeBonus = this.getInsuranceTypeBonus(quote, insuranceType);
    score += typeBonus;
    
    // Malus pour franchise élevée
    if (quote.deductible > 100000) {
      score -= 10;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Score basé sur la notation de la compagnie
   */
  private calculateRatingScore(rating: number, avgRating: number): number {
    const normalizedRating = rating / 5; // Normaliser sur 5 étoiles
    const avgNormalized = avgRating / 5;
    
    let score = normalizedRating * 100;
    
    // Bonus si au-dessus de la moyenne
    if (rating > avgRating) {
      score += (rating - avgRating) * 10;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Score basé sur la correspondance avec les garanties sélectionnées
   */
  private calculateGuaranteeScore(quote: QuoteOption, selectedGuarantees: string[]): number {
    // Pour le moment, score basique - peut être amélioré avec plus de données
    return selectedGuarantees.length > 0 ? 70 : 50;
  }

  /**
   * Score basé sur la préférence pour la compagnie
   */
  private calculateCompanyScore(quote: QuoteOption, preferredInsurers: string[]): number {
    if (preferredInsurers.length === 0) return 50;
    
    const isPreferred = preferredInsurers.some(preferred => 
      quote.company_name.toLowerCase().includes(preferred.toLowerCase())
    );
    
    return isPreferred ? 100 : 30;
  }

  /**
   * Calcule le score pondéré selon les priorités
   */
  private calculateWeightedScore(scoreDetails: any, criteria: FilterCriteria): number {
    let totalWeight = 0;
    let weightedSum = 0;
    
    // Poids par défaut
    const weights = {
      price: 25,
      coverage: 30,
      rating: 25,
      guarantee: 10,
      company: 10
    };
    
    // Ajustement selon les priorités
    if (criteria.prioritizePrice) {
      weights.price += 20;
      weights.coverage -= 5;
      weights.rating -= 10;
      weights.company -= 5;
    }
    
    if (criteria.prioritizeCoverage) {
      weights.coverage += 20;
      weights.price -= 5;
      weights.guarantee += 5;
      weights.rating -= 10;
      weights.company -= 10;
    }
    
    if (criteria.prioritizeRating) {
      weights.rating += 20;
      weights.company += 10;
      weights.price -= 15;
      weights.coverage -= 10;
      weights.guarantee -= 5;
    }
    
    // Calcul du score pondéré
    weightedSum += scoreDetails.priceScore * weights.price;
    weightedSum += scoreDetails.coverageScore * weights.coverage;
    weightedSum += scoreDetails.ratingScore * weights.rating;
    weightedSum += scoreDetails.guaranteeScore * weights.guarantee;
    weightedSum += scoreDetails.companyScore * weights.company;
    
    totalWeight = weights.price + weights.coverage + weights.rating + weights.guarantee + weights.company;
    
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Bonus selon le type d'assurance
   */
  private getInsuranceTypeBonus(quote: QuoteOption, insuranceType: string): number {
    const companySpecialties = {
      'auto': ['OGAR', 'NSIA', 'AXA'],
      'habitation': ['NSIA', 'Colina', 'Saham'],
      'vie': ['AXA', 'Saham', 'NSIA'],
      'sante': ['NSIA', 'AXA', 'Colina'],
      'voyage': ['AXA', 'Saham'],
      'transport': ['OGAR', 'Colina']
    };
    
    const specialists = companySpecialties[insuranceType as keyof typeof companySpecialties] || [];
    const isSpecialist = specialists.some(specialist => 
      quote.company_name.toUpperCase().includes(specialist)
    );
    
    return isSpecialist ? 15 : 0;
  }

  /**
   * Classe les offres par score
   */
  private rankOffers(scoredQuotes: ScoredQuote[]): ScoredQuote[] {
    return scoredQuotes
      .sort((a, b) => b.score - a.score)
      .map((quote, index) => ({
        ...quote,
        rank: index + 1
      }));
  }

  /**
   * Attribue des badges aux offres
   */
  private assignBadges(rankedOffers: ScoredQuote[]): ScoredQuote[] {
    if (rankedOffers.length === 0) return [];
    
    return rankedOffers.map(offer => {
      const badges = [];
      
      // Badge meilleure offre
      if (offer.rank === 1) {
        badges.push('🏆 Meilleure offre');
      }
      
      // Badge meilleur prix
      const lowestPrice = Math.min(...rankedOffers.map(o => o.monthly_premium));
      if (offer.monthly_premium === lowestPrice) {
        badges.push('💰 Meilleur prix');
      }
      
      // Badge meilleure notation
      const highestRating = Math.max(...rankedOffers.map(o => o.rating || 4.0));
      if ((offer.rating || 4.0) === highestRating && highestRating >= 4.5) {
        badges.push('⭐ Meilleure notation');
      }
      
      // Badge rapport qualité-prix
      if (offer.scoreDetails.priceScore > 80 && offer.scoreDetails.coverageScore > 70) {
        badges.push('🎯 Bon rapport qualité-prix');
      }
      
      // Badge couverture complète
      if (offer.scoreDetails.coverageScore > 85) {
        badges.push('🛡️ Couverture complète');
      }
      
      // Badge assureur reconnu
      if (offer.scoreDetails.ratingScore > 85 && offer.scoreDetails.companyScore > 80) {
        badges.push('🏛️ Assureur reconnu');
      }
      
      return {
        ...offer,
        badges: badges.slice(0, 3) // Limiter à 3 badges
      };
    });
  }

  /**
   * Génère une recommandation pour une offre
   */
  private generateQuoteRecommendation(quote: QuoteOption, scoreDetails: any): string {
    const recommendations = [];
    
    if (scoreDetails.priceScore > 85) {
      recommendations.push('Prix très compétitif');
    } else if (scoreDetails.priceScore < 40) {
      recommendations.push('Prix élevé mais couverture premium');
    }
    
    if (scoreDetails.coverageScore > 80) {
      recommendations.push('Excellente couverture');
    }
    
    if (scoreDetails.ratingScore > 85) {
      recommendations.push('Assureur de confiance');
    }
    
    if (quote.deductible < 50000) {
      recommendations.push('Franchise réduite');
    }
    
    if (quote.advantages && quote.advantages.length > 3) {
      recommendations.push('Nombreux avantages inclus');
    }
    
    return recommendations.length > 0 
      ? recommendations.join(' • ') 
      : 'Offre équilibrée';
  }

  /**
   * Génère le résumé du filtrage
   */
  private generateFilterSummary(
    originalQuotes: QuoteOption[], 
    filteredQuotes: ScoredQuote[], 
    criteria: FilterCriteria
  ): FilterResult['filterSummary'] {
    const prices = filteredQuotes.map(q => q.monthly_premium);
    
    const topCriteria = [];
    if (criteria.prioritizePrice) topCriteria.push('Prix');
    if (criteria.prioritizeCoverage) topCriteria.push('Couverture');
    if (criteria.prioritizeRating) topCriteria.push('Notation');
    
    return {
      totalOffers: originalQuotes.length,
      filteredOffers: filteredQuotes.length,
      averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0
      },
      topCriteria
    };
  }

  /**
   * Génère des recommandations globales
   */
  private generateRecommendations(rankedOffers: ScoredQuote[], criteria: FilterCriteria): string[] {
    const recommendations = [];
    
    if (rankedOffers.length === 0) {
      return ['Aucune offre ne correspond aux critères spécifiés'];
    }
    
    const bestOffer = rankedOffers[0];
    const priceRange = rankedOffers[rankedOffers.length - 1].monthly_premium - bestOffer.monthly_premium;
    
    // Recommandation principale
    recommendations.push(
      `La meilleure offre (${bestOffer.company_name}) obtient un score de ${bestOffer.score}/100`
    );
    
    // Analyse des prix
    if (priceRange > 50000) {
      recommendations.push(
        `Les prix varient de ${this.formatCurrency(bestOffer.monthly_premium)} à ${this.formatCurrency(rankedOffers[rankedOffers.length - 1].monthly_premium)} par mois`
      );
    }
    
    // Conseil selon les priorités
    if (criteria.prioritizePrice && bestOffer.scoreDetails.priceScore > 90) {
      recommendations.push('Excellent choix pour optimiser votre budget');
    } else if (criteria.prioritizeCoverage && bestOffer.scoreDetails.coverageScore > 85) {
      recommendations.push('Cette offre propose une couverture très complète');
    } else if (criteria.prioritizeRating && bestOffer.scoreDetails.ratingScore > 85) {
      recommendations.push('Assureur avec une excellente réputation');
    }
    
    // Top 3 recommandation
    if (rankedOffers.length >= 3) {
      const top3Avg = rankedOffers.slice(0, 3).reduce((sum, offer) => sum + offer.score, 0) / 3;
      if (top3Avg > 75) {
        recommendations.push('Le top 3 propose des offres de qualité équivalente');
      }
    }
    
    return recommendations;
  }

  /**
   * Formate les montants en devise locale
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
  }

  /**
   * Critères par défaut selon le profil utilisateur
   */
  getDefaultCriteria(userProfile: {
    budget?: number;
    priorité?: string;
    expérience?: string;
  }): FilterCriteria {
    const criteria: FilterCriteria = {
      prioritizePrice: false,
      prioritizeCoverage: false,
      prioritizeRating: false,
      mustHaveGuarantees: [],
      preferredInsurers: [],
      riskTolerance: 'medium'
    };
    
    // Adaptation selon le budget
    if (userProfile.budget && userProfile.budget < 50000) {
      criteria.prioritizePrice = true;
      criteria.maxBudget = userProfile.budget;
    }
    
    // Adaptation selon la priorité
    switch (userProfile.priorité) {
      case 'prix':
        criteria.prioritizePrice = true;
        break;
      case 'couverture':
        criteria.prioritizeCoverage = true;
        break;
      case 'confiance':
        criteria.prioritizeRating = true;
        break;
    }
    
    // Adaptation selon l'expérience
    if (userProfile.expérience === 'débutant') {
      criteria.prioritizeRating = true;
      criteria.preferredInsurers = ['OGAR', 'NSIA', 'AXA']; // Assureurs établis
    }
    
    return criteria;
  }
}