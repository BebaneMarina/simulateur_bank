// pdf-quote.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

export interface QuoteData {
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
  quotes?: any[];
}

export interface CustomerData {
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  city?: string;
  address?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfQuoteService {

  constructor() {}

  /**
   * Génère et télécharge un PDF de devis d'assurance
   */
  async generateAndDownloadQuote(
    quoteData: QuoteData, 
    customerData: CustomerData = {},
    formData: any = {}
  ): Promise<void> {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      await this.buildQuotePDF(pdf, quoteData, customerData, formData);
      
      const filename = `devis_${quoteData.insurance_type}_${quoteData.quote_id}_${this.getDateString()}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      throw new Error('Impossible de générer le PDF');
    }
  }

  /**
   * Construit le contenu du PDF
   */
  private async buildQuotePDF(
    pdf: jsPDF, 
    quoteData: QuoteData, 
    customerData: CustomerData,
    formData: any
  ): Promise<void> {
    let currentY = 20;

    // En-tête
    currentY = this.addHeader(pdf, currentY);
    
    // Informations du devis
    currentY = this.addQuoteInfo(pdf, quoteData, currentY);
    
    // Informations client
    if (Object.keys(customerData).length > 0) {
      currentY = this.addCustomerInfo(pdf, customerData, currentY);
    }
    
    // Détails de l'assurance selon le type
    currentY = this.addInsuranceDetails(pdf, quoteData, formData, currentY);
    
    // Tarification
    currentY = this.addPricing(pdf, quoteData, currentY);
    
    // Garanties et exclusions
    currentY = this.addCoverageDetails(pdf, quoteData, currentY);
    
    // Offres alternatives (si disponibles)
    if (quoteData.quotes && quoteData.quotes.length > 0) {
      currentY = this.addAlternativeQuotes(pdf, quoteData.quotes, currentY);
    }
    
    // Recommandations
    currentY = this.addRecommendations(pdf, quoteData.recommendations, currentY);
    
    // Pied de page
    this.addFooter(pdf);
  }

  /**
   * Ajoute l'en-tête du document
   */
  private addHeader(pdf: jsPDF, startY: number): number {
    let y = startY;
    
    // Logo ou titre principal
    pdf.setFontSize(24);
    pdf.setTextColor(41, 128, 185);
    pdf.text('DEVIS D\'ASSURANCE', 20, y);
    
    // Sous-titre
    pdf.setFontSize(14);
    pdf.setTextColor(52, 73, 94);
    pdf.text('simbot gab - Gabon', 20, y + 10);
    
    // Ligne de séparation
    pdf.setDrawColor(189, 195, 199);
    pdf.setLineWidth(0.5);
    pdf.line(20, y + 20, 190, y + 20);
    
    return y + 30;
  }

  /**
   * Ajoute les informations du devis
   */
  private addQuoteInfo(pdf: jsPDF, quoteData: QuoteData, startY: number): number {
    let y = startY;
    
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185);
    pdf.text('INFORMATIONS DU DEVIS', 20, y);
    y += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    const quoteInfo = [
      `Numéro de devis: ${quoteData.quote_id}`,
      `Type d'assurance: ${this.getInsuranceTypeName(quoteData.insurance_type)}`,
      `Assureur: ${quoteData.company_name}`,
      `Produit: ${quoteData.product_name}`,
      `Date de génération: ${this.formatDate(new Date())}`,
      `Validité: ${this.formatDate(new Date(quoteData.valid_until))}`
    ];
    
    quoteInfo.forEach(info => {
      pdf.text(info, 20, y);
      y += 6;
    });
    
    return y + 10;
  }

  /**
   * Ajoute les informations client
   */
  private addCustomerInfo(pdf: jsPDF, customerData: CustomerData, startY: number): number {
    let y = startY;
    
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185);
    pdf.text('INFORMATIONS CLIENT', 20, y);
    y += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    const clientInfo = [
      customerData.name ? `Nom: ${customerData.name}` : null,
      customerData.email ? `Email: ${customerData.email}` : null,
      customerData.phone ? `Téléphone: ${customerData.phone}` : null,
      customerData.age ? `Âge: ${customerData.age} ans` : null,
      customerData.city ? `Ville: ${customerData.city}` : null,
      customerData.address ? `Adresse: ${customerData.address}` : null
    ].filter(Boolean);
    
    clientInfo.forEach(info => {
      if (info) {
        pdf.text(info, 20, y);
        y += 6;
      }
    });
    
    return y + 10;
  }

  /**
   * Ajoute les détails spécifiques selon le type d'assurance
   */
  private addInsuranceDetails(pdf: jsPDF, quoteData: QuoteData, formData: any, startY: number): number {
    let y = startY;
    
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185);
    pdf.text('DÉTAILS DE L\'ASSURANCE', 20, y);
    y += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    switch (quoteData.insurance_type) {
      case 'auto':
        y = this.addAutoDetails(pdf, formData, y);
        break;
      case 'habitation':
        y = this.addHabitationDetails(pdf, formData, y);
        break;
      case 'vie':
        y = this.addVieDetails(pdf, formData, y);
        break;
      case 'sante':
        y = this.addSanteDetails(pdf, formData, y);
        break;
      case 'voyage':
        y = this.addVoyageDetails(pdf, formData, y);
        break;
    }
    
    return y + 10;
  }

  /**
   * Détails spécifiques à l'assurance auto
   */
  private addAutoDetails(pdf: jsPDF, formData: any, startY: number): number {
    let y = startY;
    
    const autoDetails = [
      `Catégorie de véhicule: ${formData.vehicleCategory || 'Non spécifié'}`,
      `Type de carburant: ${formData.fuelType || 'Non spécifié'}`,
      `Puissance fiscale: ${formData.fiscalPower ? formData.fiscalPower + ' CV' : 'Non spécifié'}`,
      `Nombre de places: ${formData.seats || 'Non spécifié'}`,
      `Valeur du véhicule: ${formData.vehicleValue ? this.formatCurrency(formData.vehicleValue) : 'Non spécifié'}`,
      `Ville de circulation: ${formData.city || 'Non spécifié'}`
    ];
    
    autoDetails.forEach(detail => {
      pdf.text(detail, 20, y);
      y += 6;
    });
    
    return y;
  }

  /**
   * Détails spécifiques à l'assurance habitation
   */
  private addHabitationDetails(pdf: jsPDF, formData: any, startY: number): number {
    let y = startY;
    
    const habitationDetails = [
      `Type de logement: ${formData.propertyType || 'Non spécifié'}`,
      `Surface habitable: ${formData.surface ? formData.surface + ' m²' : 'Non spécifié'}`,
      `Valeur du bien: ${formData.propertyValue ? this.formatCurrency(formData.propertyValue) : 'Non spécifié'}`,
      `Année de construction: ${formData.constructionYear || 'Non spécifié'}`,
      `Niveau de sécurité: ${formData.securityLevel || 'Non spécifié'}`,
      `Type d'occupation: ${formData.occupancy || 'Non spécifié'}`
    ];
    
    habitationDetails.forEach(detail => {
      pdf.text(detail, 20, y);
      y += 6;
    });
    
    return y;
  }

  /**
   * Détails spécifiques à l'assurance vie
   */
  private addVieDetails(pdf: jsPDF, formData: any, startY: number): number {
    let y = startY;
    
    const vieDetails = [
      `Capital souhaité: ${formData.coverageAmount ? this.formatCurrency(formData.coverageAmount) : 'Non spécifié'}`,
      `État de santé: ${formData.healthStatus || 'Non spécifié'}`,
      `Statut fumeur: ${formData.smokingStatus || 'Non spécifié'}`,
      `Profession: ${formData.profession || 'Non spécifié'}`,
      `Bénéficiaires: ${formData.beneficiaries || 'Non spécifié'}`
    ];
    
    vieDetails.forEach(detail => {
      pdf.text(detail, 20, y);
      y += 6;
    });
    
    return y;
  }

  /**
   * Détails spécifiques à l'assurance santé
   */
  private addSanteDetails(pdf: jsPDF, formData: any, startY: number): number {
    let y = startY;
    
    const santeDetails = [
      `Composition familiale: ${formData.familySize || 'Non spécifié'}`,
      `Antécédents médicaux: ${formData.medicalHistory || 'Non spécifié'}`,
      `Niveau de couverture: ${formData.coverageLevel || 'Non spécifié'}`,
      `Préférence hospitalisation: ${formData.hospitalization || 'Non spécifié'}`
    ];
    
    santeDetails.forEach(detail => {
      pdf.text(detail, 20, y);
      y += 6;
    });
    
    return y;
  }

  /**
   * Détails spécifiques à l'assurance voyage
   */
  private addVoyageDetails(pdf: jsPDF, formData: any, startY: number): number {
    let y = startY;
    
    const voyageDetails = [
      `Destination: ${formData.destination || 'Non spécifié'}`,
      `Durée du voyage: ${formData.duration ? formData.duration + ' jours' : 'Non spécifié'}`,
      `Type d'activités: ${formData.activities || 'Non spécifié'}`,
      `Fréquence de voyage: ${formData.travelFrequency || 'Non spécifié'}`,
      `Nombre de voyageurs: ${formData.travelers || 'Non spécifié'}`
    ];
    
    voyageDetails.forEach(detail => {
      pdf.text(detail, 20, y);
      y += 6;
    });
    
    return y;
  }

  /**
   * Ajoute la section tarification
   */
  private addPricing(pdf: jsPDF, quoteData: QuoteData, startY: number): number {
    let y = startY;
    
    // Titre
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185);
    pdf.text('TARIFICATION', 20, y);
    y += 15;
    
    // Encadré pour la tarification principale
    pdf.setDrawColor(41, 128, 185);
    pdf.setLineWidth(1);
    pdf.rect(20, y - 5, 170, 40);
    
    // Prime mensuelle
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Prime mensuelle:', 25, y + 5);
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185);
    pdf.text(this.formatCurrency(quoteData.monthly_premium), 120, y + 5);
    
    // Prime annuelle
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Prime annuelle:', 25, y + 15);
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185);
    pdf.text(this.formatCurrency(quoteData.annual_premium), 120, y + 15);
    
    // Franchise
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Franchise:', 25, y + 25);
    pdf.setFontSize(16);
    pdf.setTextColor(231, 76, 60);
    pdf.text(this.formatCurrency(quoteData.deductible), 120, y + 25);
    
    return y + 50;
  }

  /**
   * Ajoute les détails de couverture
   */
  private addCoverageDetails(pdf: jsPDF, quoteData: QuoteData, startY: number): number {
    let y = startY;
    
    // Garanties incluses
    if (quoteData.coverage_details && Object.keys(quoteData.coverage_details).length > 0) {
      pdf.setFontSize(14);
      pdf.setTextColor(46, 204, 113);
      pdf.text('✓ GARANTIES INCLUSES', 20, y);
      y += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      Object.entries(quoteData.coverage_details).forEach(([key, value]) => {
        pdf.text(`• ${key}: ${value}`, 25, y);
        y += 6;
      });
      
      y += 10;
    }
    
    // Exclusions
    if (quoteData.exclusions && quoteData.exclusions.length > 0) {
      pdf.setFontSize(14);
      pdf.setTextColor(231, 76, 60);
      pdf.text('✗ EXCLUSIONS', 20, y);
      y += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      quoteData.exclusions.slice(0, 8).forEach(exclusion => {
        const lines = pdf.splitTextToSize(`• ${exclusion}`, 160);
        lines.forEach((line: string) => {
          pdf.text(line, 25, y);
          y += 6;
        });
      });
      
      if (quoteData.exclusions.length > 8) {
        pdf.text(`... et ${quoteData.exclusions.length - 8} autres exclusions`, 25, y);
        y += 6;
      }
    }
    
    return y + 10;
  }

  /**
   * Ajoute les offres alternatives
   */
  private addAlternativeQuotes(pdf: jsPDF, quotes: any[], startY: number): number {
    let y = startY;
    
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185);
    pdf.text('AUTRES OFFRES DISPONIBLES', 20, y);
    y += 15;
    
    quotes.slice(0, 3).forEach((quote, index) => {
      // Encadré pour chaque offre alternative
      pdf.setDrawColor(189, 195, 199);
      pdf.setLineWidth(0.5);
      pdf.rect(20, y - 2, 170, 25);
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${quote.company_name} - ${quote.product_name}`, 25, y + 5);
      
      pdf.setFontSize(10);
      pdf.text(`${this.formatCurrency(quote.monthly_premium)}/mois`, 25, y + 12);
      pdf.text(`${this.formatCurrency(quote.annual_premium)}/an`, 25, y + 18);
      
      if (quote.rating) {
        pdf.text(`Note: ${quote.rating}/5`, 140, y + 12);
      }
      
      y += 30;
    });
    
    return y + 10;
  }

  /**
   * Ajoute les recommandations
   */
  private addRecommendations(pdf: jsPDF, recommendations: string[], startY: number): number {
    if (!recommendations || recommendations.length === 0) return startY;
    
    let y = startY;
    
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185);
    pdf.text('CONSEILS ET RECOMMANDATIONS', 20, y);
    y += 15;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    recommendations.slice(0, 5).forEach(recommendation => {
      const lines = pdf.splitTextToSize(`💡 ${recommendation}`, 160);
      lines.forEach((line: string) => {
        pdf.text(line, 25, y);
        y += 6;
      });
      y += 2;
    });
    
    return y + 10;
  }

  /**
   * Ajoute le pied de page
   */
  private addFooter(pdf: jsPDF): void {
    const pageHeight = pdf.internal.pageSize.height;
    
    // Ligne de séparation
    pdf.setDrawColor(189, 195, 199);
    pdf.setLineWidth(0.5);
    pdf.line(20, pageHeight - 30, 190, pageHeight - 30);
    
    // Texte du pied de page
    pdf.setFontSize(8);
    pdf.setTextColor(127, 140, 141);
    pdf.text('Ce devis est valable 30 jours à compter de sa date de génération.', 20, pageHeight - 20);
    pdf.text('Pour toute question, contactez notre service client au +241 01 00 00 00', 20, pageHeight - 15);
    pdf.text('© 2024 Comparateur Bamboo - Tous droits réservés', 20, pageHeight - 10);
    
    // Numéro de page
    pdf.text(`Page 1`, 170, pageHeight - 10);
  }

  /**
   * Méthodes utilitaires
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  private getDateString(): string {
    const now = new Date();
    return now.toISOString().slice(0, 10).replace(/-/g, '');
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
}