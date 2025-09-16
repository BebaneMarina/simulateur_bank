// utils/credit.utils.ts
import { 
  CreditFormData, 
  CreditTypeId, 
  ValidationRule, 
  FormValidationState,
  DurationOption,
  CreditTypeInfo
} from '../types/credit.type';
import { BankComparison } from '../services/credit.service';

/**
 * Configuration des types de crédit
 */
export const CREDIT_TYPES: CreditTypeInfo[] = [
  {
    id: 'consommation',
    name: 'Crédit Consommation',
    description: 'Pour vos achats personnels',
    icon: 'shopping_cart',
    minAmount: 100000,
    maxAmount: 10000000,
    minDuration: 6,
    maxDuration: 60
  },
  {
    id: 'auto',
    name: 'Crédit Auto',
    description: 'Financement véhicule',
    icon: 'directions_car',
    minAmount: 500000,
    maxAmount: 50000000,
    minDuration: 12,
    maxDuration: 84
  },
  {
    id: 'immobilier',
    name: 'Crédit Immobilier',
    description: 'Achat ou construction',
    icon: 'home',
    minAmount: 5000000,
    maxAmount: 500000000,
    minDuration: 60,
    maxDuration: 300
  },
  {
    id: 'investissement',
    name: 'Crédit Investissement',
    description: 'Projets d\'entreprise',
    icon: 'trending_up',
    minAmount: 1000000,
    maxAmount: 100000000,
    minDuration: 12,
    maxDuration: 120
  },
  {
    id: 'equipement',
    name: 'Crédit Équipement',
    description: 'Matériel professionnel',
    icon: 'build',
    minAmount: 500000,
    maxAmount: 20000000,
    minDuration: 12,
    maxDuration: 84
  },
  {
    id: 'travaux',
    name: 'Crédit Travaux',
    description: 'Rénovation et amélioration',
    icon: 'construction',
    minAmount: 200000,
    maxAmount: 15000000,
    minDuration: 6,
    maxDuration: 120
  }
];

/**
 * Options de durée disponibles
 */
export const DURATION_OPTIONS: DurationOption[] = [
  { value: 6, label: '6 mois', years: 0.5 },
  { value: 12, label: '12 mois', years: 1, isPopular: true },
  { value: 18, label: '18 mois', years: 1.5 },
  { value: 24, label: '2 ans', years: 2, isPopular: true },
  { value: 36, label: '3 ans', years: 3, isPopular: true },
  { value: 48, label: '4 ans', years: 4 },
  { value: 60, label: '5 ans', years: 5, isPopular: true },
  { value: 72, label: '6 ans', years: 6 },
  { value: 84, label: '7 ans', years: 7 },
  { value: 96, label: '8 ans', years: 8 },
  { value: 120, label: '10 ans', years: 10 },
  { value: 180, label: '15 ans', years: 15 },
  { value: 240, label: '20 ans', years: 20 },
  { value: 300, label: '25 ans', years: 25 }
];

/**
 * Règles de validation pour le formulaire
 */
export const VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'fullName',
    rules: {
      required: true,
      minLength: 3
    },
    messages: {
      required: 'Le nom complet est requis',
      minLength: 'Le nom doit contenir au moins 3 caractères'
    }
  },
  {
    field: 'phoneNumber',
    rules: {
      required: true,
      pattern: /^(\+241|241)?[0-9]{8}$/
    },
    messages: {
      required: 'Le numéro de téléphone est requis',
      pattern: 'Format invalide (ex: +241 XX XX XX XX)'
    }
  },
  {
    field: 'email',
    rules: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    messages: {
      pattern: 'Format d\'email invalide'
    }
  },
  {
    field: 'monthlyIncome',
    rules: {
      required: true,
      min: 200000
    },
    messages: {
      required: 'Les revenus mensuels sont requis',
      min: 'Revenus minimum: 200 000 FCFA'
    }
  },
  {
    field: 'requestedAmount',
    rules: {
      required: true,
      min: 100000,
      max: 500000000
    },
    messages: {
      required: 'Le montant est requis',
      min: 'Montant minimum: 100 000 FCFA',
      max: 'Montant maximum: 500 000 000 FCFA'
    }
  },
  {
    field: 'duration',
    rules: {
      required: true,
      min: 6,
      max: 360
    },
    messages: {
      required: 'La durée est requise',
      min: 'Durée minimum: 6 mois',
      max: 'Durée maximum: 30 ans'
    }
  },
  {
    field: 'purpose',
    rules: {
      required: true,
      minLength: 5
    },
    messages: {
      required: 'L\'objet du crédit est requis',
      minLength: 'Description minimum: 5 caractères'
    }
  }
];

/**
 * Classe utilitaire pour la validation des formulaires
 */
export class CreditFormValidator {
  private static getRuleForField(fieldName: string): ValidationRule | undefined {
    return VALIDATION_RULES.find(rule => rule.field === fieldName);
  }

  /**
   * Valide un champ spécifique
   */
  static validateField(fieldName: string, value: any, formData?: CreditFormData): string | null {
    const rule = this.getRuleForField(fieldName);
    if (!rule) return null;

    // Vérification required
    if (rule.rules.required && (!value || value === '')) {
      return rule.messages['required'];
    }

    // Si le champ est vide et non requis, pas d'erreur
    if (!value || value === '') {
      return null;
    }

    // Vérification minLength
    if (rule.rules.minLength && value.length < rule.rules.minLength) {
      return rule.messages['minLength'];
    }

    // Vérification min
    if (rule.rules.min !== undefined && parseFloat(value) < rule.rules.min) {
      return rule.messages['min'];
    }

    // Vérification max
    if (rule.rules.max !== undefined && parseFloat(value) > rule.rules.max) {
      return rule.messages['max'];
    }

    // Vérification pattern
    if (rule.rules.pattern && !rule.rules.pattern.test(value)) {
      return rule.messages['pattern'];
    }

    // Vérification custom
    if (rule.rules.custom && !rule.rules.custom(value)) {
      return rule.messages['custom'] || 'Valeur invalide';
    }

    // Validations contextuelles
    return this.validateContextualRules(fieldName, value, formData);
  }

  /**
   * Validations dépendantes du contexte
   */
  private static validateContextualRules(fieldName: string, value: any, formData?: CreditFormData): string | null {
    if (!formData) return null;

    switch (fieldName) {
      case 'monthlyIncome':
        // Validation revenus selon type de client
        if (formData.clientType === 'entreprise' && parseFloat(value) < 500000) {
          return 'Revenus minimum pour entreprise: 500 000 FCFA';
        }
        break;

      case 'profession':
        // Profession requise pour entreprises
        if (formData.clientType === 'entreprise' && (!value || value.trim() === '')) {
          return 'Le secteur d\'activité est requis pour les entreprises';
        }
        break;

      case 'requestedAmount':
        // Vérifier compatibilité avec le type de crédit
        const creditType = CREDIT_TYPES.find(ct => ct.id === formData.creditType);
        if (creditType) {
          if (creditType.minAmount && parseFloat(value) < creditType.minAmount) {
            return `Montant minimum pour ${creditType.name}: ${formatCurrency(creditType.minAmount)}`;
          }
          if (creditType.maxAmount && parseFloat(value) > creditType.maxAmount) {
            return `Montant maximum pour ${creditType.name}: ${formatCurrency(creditType.maxAmount)}`;
          }
        }
        break;

      case 'duration':
        // Vérifier compatibilité avec le type de crédit
        const creditTypeForDuration = CREDIT_TYPES.find(ct => ct.id === formData.creditType);
        if (creditTypeForDuration) {
          if (creditTypeForDuration.minDuration && parseInt(value) < creditTypeForDuration.minDuration) {
            return `Durée minimum pour ${creditTypeForDuration.name}: ${creditTypeForDuration.minDuration} mois`;
          }
          if (creditTypeForDuration.maxDuration && parseInt(value) > creditTypeForDuration.maxDuration) {
            return `Durée maximum pour ${creditTypeForDuration.name}: ${creditTypeForDuration.maxDuration} mois`;
          }
        }
        break;

      case 'currentDebts':
        // Vérifier que les dettes ne dépassent pas un ratio raisonnable
        const debtRatio = (parseFloat(value) / formData.monthlyIncome) * 100;
        if (debtRatio > 50) {
          return 'Vos dettes actuelles semblent trop élevées par rapport à vos revenus';
        }
        break;
    }

    return null;
  }

  /**
   * Valide tout le formulaire
   */
  static validateForm(formData: CreditFormData): FormValidationState {
    const errors: { [key: string]: string } = {};
    const warnings: { [key: string]: string } = {};

    // Valider chaque champ
    Object.keys(formData).forEach(fieldName => {
      const error = this.validateField(fieldName, (formData as any)[fieldName], formData);
      if (error) {
        errors[fieldName] = error;
      }
    });

    // Validations globales
    const globalValidation = this.validateGlobalRules(formData);
    if (globalValidation.errors) {
      Object.assign(errors, globalValidation.errors);
    }
    if (globalValidation.warnings) {
      Object.assign(warnings, globalValidation.warnings);
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validations globales (inter-champs)
   */
  private static validateGlobalRules(formData: CreditFormData): { errors?: any, warnings?: any } {
    const errors: { [key: string]: string } = {};
    const warnings: { [key: string]: string } = {};

    // Ratio d'endettement
    const totalDebts = formData.currentDebts + (formData.requestedAmount / formData.duration);
    const debtRatio = (totalDebts / formData.monthlyIncome) * 100;

    if (debtRatio > 33) {
      if (debtRatio > 40) {
        errors['_global'] = 'Votre taux d\'endettement dépasserait 40%, le crédit sera probablement refusé';
      } else {
        warnings['_global'] = 'Votre taux d\'endettement dépasserait 33%, cela peut réduire vos chances d\'approbation';
      }
    }

    // Cohérence montant/revenus
    if (formData.requestedAmount > formData.monthlyIncome * 60) {
      warnings['requestedAmount'] = 'Le montant demandé semble très élevé par rapport à vos revenus';
    }

    return { errors: Object.keys(errors).length > 0 ? errors : undefined, 
             warnings: Object.keys(warnings).length > 0 ? warnings : undefined };
  }
}

/**
 * Utilitaires de formatage
 */
export class CreditFormatter {
  /**
   * Formate un montant en FCFA
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Formate un pourcentage
   */
  static formatPercent(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Formate une durée en texte lisible
   */
  static formatDuration(months: number): string {
    if (months < 12) {
      return `${months} mois`;
    }
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) {
      return `${years} an${years > 1 ? 's' : ''}`;
    }
    
    return `${years} an${years > 1 ? 's' : ''} et ${remainingMonths} mois`;
  }

  /**
   * Formate le temps de traitement
   */
  static formatProcessingTime(hours: number): string {
    if (hours <= 24) {
      return `${hours}h`;
    }
    
    const days = Math.ceil(hours / 24);
    if (days <= 7) {
      return `${days} jour${days > 1 ? 's' : ''}`;
    }
    
    const weeks = Math.ceil(days / 7);
    return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }

  /**
   * Formate un numéro de téléphone gabonais
   */
  static formatPhoneNumber(phone: string): string {
    // Nettoyer le numéro
    const cleaned = phone.replace(/\D/g, '');
    
    // Format gabonais
    if (cleaned.startsWith('241')) {
      const number = cleaned.slice(3);
      return `+241 ${number.slice(0, 2)} ${number.slice(2, 4)} ${number.slice(4, 6)} ${number.slice(6, 8)}`;
    }
    
    if (cleaned.length === 8) {
      return `+241 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)}`;
    }
    
    return phone;
  }
}

/**
 * Utilitaires de calcul financier
 */
export class CreditCalculator {
  /**
   * Calcule la mensualité d'un crédit
   */
  static calculateMonthlyPayment(amount: number, rate: number, durationMonths: number): number {
    if (rate === 0) {
      return amount / durationMonths;
    }
    
    const monthlyRate = rate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, durationMonths);
    
    return amount * (monthlyRate * factor) / (factor - 1);
  }

  /**
   * Calcule le coût total d'un crédit
   */
  static calculateTotalCost(monthlyPayment: number, durationMonths: number): number {
    return monthlyPayment * durationMonths;
  }

  /**
   * Calcule les intérêts totaux
   */
  static calculateTotalInterest(amount: number, monthlyPayment: number, durationMonths: number): number {
    return (monthlyPayment * durationMonths) - amount;
  }

  /**
   * Calcule le taux d'endettement
   */
  static calculateDebtRatio(monthlyPayment: number, currentDebts: number, monthlyIncome: number): number {
    return ((monthlyPayment + currentDebts) / monthlyIncome) * 100;
  }

  /**
   * Calcule la capacité d'emprunt maximale
   */
  static calculateBorrowingCapacity(
    monthlyIncome: number, 
    currentDebts: number, 
    rate: number, 
    durationMonths: number,
    maxDebtRatio: number = 33
  ): number {
    const availableForCredit = (monthlyIncome * maxDebtRatio / 100) - currentDebts;
    
    if (availableForCredit <= 0) return 0;
    
    if (rate === 0) {
      return availableForCredit * durationMonths;
    }
    
    const monthlyRate = rate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, durationMonths);
    
    return availableForCredit * (factor - 1) / (monthlyRate * factor);
  }

  /**
   * Génère un tableau d'amortissement
   */
  static generateAmortizationSchedule(
    amount: number, 
    rate: number, 
    durationMonths: number,
    maxRows: number = 12
  ): Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    remainingBalance: number;
  }> {
    const monthlyPayment = this.calculateMonthlyPayment(amount, rate, durationMonths);
    const monthlyRate = rate / 100 / 12;
    
    const schedule = [];
    let remainingBalance = amount;
    
    const rowsToGenerate = Math.min(maxRows, durationMonths);
    
    for (let month = 1; month <= rowsToGenerate; month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      schedule.push({
        month,
        payment: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100,
        interest: Math.round(interestPayment * 100) / 100,
        remainingBalance: Math.round(Math.max(0, remainingBalance) * 100) / 100
      });
    }
    
    return schedule;
  }
}

/**
 * Utilitaires de comparaison et scoring
 */
export class CreditComparator {
  /**
   * Calcule un score pour une offre de crédit
   */
  static calculateOfferScore(
    offer: BankComparison,
    preferences: {
      rateWeight: number;
      speedWeight: number;
      eligibilityWeight: number;
      paymentWeight: number;
    } = {
      rateWeight: 0.4,
      speedWeight: 0.2,
      eligibilityWeight: 0.3,
      paymentWeight: 0.1
    }
  ): number {
    // Normalisation des scores (0-1, 1 = meilleur)
    const rateScore = Math.max(0, (20 - offer.product.rate) / 20); // Supposé max 20%
    const speedScore = Math.max(0, (168 - offer.product.processing_time) / 168); // Max 7 jours
    const eligibilityScore = offer.eligible ? 1 : 0;
    const paymentScore = Math.max(0, (10000000 - offer.monthly_payment) / 10000000); // Max supposé 10M
    
    return (
      rateScore * preferences.rateWeight +
      speedScore * preferences.speedWeight +
      eligibilityScore * preferences.eligibilityWeight +
      paymentScore * preferences.paymentWeight
    );
  }

  /**
   * Trie les offres selon différents critères
   */
  static sortOffers(
    offers: BankComparison[], 
    sortBy: 'rate' | 'payment' | 'time' | 'approval' | 'score',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): BankComparison[] {
    const sorted = [...offers].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'rate':
          comparison = a.product.rate - b.product.rate;
          break;
        case 'payment':
          comparison = a.monthly_payment - b.monthly_payment;
          break;
        case 'time':
          comparison = a.product.processing_time - b.product.processing_time;
          break;
        case 'approval':
          comparison = (b.eligible ? 1 : 0) - (a.eligible ? 1 : 0);
          break;
        case 'score':
          comparison = this.calculateOfferScore(b) - this.calculateOfferScore(a);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }

  /**
   * Filtre les offres selon des critères
   */
  static filterOffers(
    offers: BankComparison[], 
    filters: {
      maxRate?: number;
      maxPayment?: number;
      maxProcessingTime?: number;
      eligibleOnly?: boolean;
      bankIds?: string[];
    }
  ): BankComparison[] {
    return offers.filter(offer => {
      if (filters.maxRate && offer.product.rate > filters.maxRate) return false;
      if (filters.maxPayment && offer.monthly_payment > filters.maxPayment) return false;
      if (filters.maxProcessingTime && offer.product.processing_time > filters.maxProcessingTime) return false;
      if (filters.eligibleOnly && !offer.eligible) return false;
      if (filters.bankIds && !filters.bankIds.includes(offer.bank.id)) return false;
      
      return true;
    });
  }

  /**
   * Trouve la meilleure offre selon des critères
   */
  static findBestOffer(
    offers: BankComparison[],
    criteria: 'rate' | 'payment' | 'score' = 'score'
  ): BankComparison | null {
    const eligibleOffers = offers.filter(offer => offer.eligible);
    if (eligibleOffers.length === 0) return offers[0] || null;
    
    switch (criteria) {
      case 'rate':
        return eligibleOffers.reduce((best, current) => 
          current.product.rate < best.product.rate ? current : best
        );
      case 'payment':
        return eligibleOffers.reduce((best, current) => 
          current.monthly_payment < best.monthly_payment ? current : best
        );
      case 'score':
      default:
        return eligibleOffers.reduce((best, current) => 
          this.calculateOfferScore(current) > this.calculateOfferScore(best) ? current : best
        );
    }
  }
}

/**
 * Utilitaires d'export et sauvegarde
 */
export class CreditExporter {
  /**
   * Exporte les résultats en CSV
   */
  static exportToCSV(offers: BankComparison[], filename: string = 'comparaison-credits.csv'): void {
    const headers = [
      'Banque',
      'Produit',
      'Taux (%)',
      'Mensualité (FCFA)',
      'Coût total (FCFA)',
      'Intérêts (FCFA)',
      'Délai (heures)',
      'Éligible'
    ];
    
    const rows = offers.map(offer => [
      offer.bank.name,
      offer.product.name,
      offer.product.rate,
      offer.monthly_payment,
      offer.total_cost,
      offer.total_interest,
      offer.product.processing_time,
      offer.eligible ? 'Oui' : 'Non'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  /**
   * Sauvegarde les données en localStorage
   */
  static saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erreur sauvegarde localStorage:', error);
    }
  }

  /**
   * Récupère les données du localStorage
   */
  static loadFromLocalStorage(key: string): any | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Erreur chargement localStorage:', error);
      return null;
    }
  }

  /**
   * Utilitaire pour télécharger un fichier
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Fonction utilitaire pour formater la monnaie
 */
export function formatCurrency(amount: number): string {
  return CreditFormatter.formatCurrency(amount);
}

/**
 * Fonction utilitaire pour obtenir les durées filtrées par type de crédit
 */
export function getDurationOptionsForCreditType(creditType: CreditTypeId): DurationOption[] {
  const creditTypeInfo = CREDIT_TYPES.find(ct => ct.id === creditType);
  
  if (!creditTypeInfo) return DURATION_OPTIONS;
  
  return DURATION_OPTIONS.filter(option => 
    option.value >= (creditTypeInfo.minDuration || 6) && 
    option.value <= (creditTypeInfo.maxDuration || 360)
  );
}

/**
 * Fonction pour obtenir les informations d'un type de crédit
 */
export function getCreditTypeInfo(creditTypeId: CreditTypeId): CreditTypeInfo | undefined {
  return CREDIT_TYPES.find(ct => ct.id === creditTypeId);
}