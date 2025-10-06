// pdf-quote.service.ts - Version corrigée avec formatage amélioré
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  private readonly colors = {
    primary: { r: 16, g: 185, b: 129 },
    secondary: { r: 59, g: 130, b: 246 },
    white: { r: 255, g: 255, b: 255 },
    dark: { r: 17, g: 24, b: 39 },
    lightGray: { r: 249, g: 250, b: 251 },
    success: { r: 34, g: 197, b: 94 },
    warning: { r: 251, g: 191, b: 36 }
  };

  constructor() {}

  async generateAndDownloadQuote(
    quoteData: QuoteData, 
    customerData: CustomerData = {},
    formData: any = {}
  ): Promise<void> {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      await this.buildSimbotGabPDF(pdf, quoteData, customerData, formData);
      const filename = `simbot_devis_${quoteData.insurance_type}_${Date.now()}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      throw new Error('Impossible de générer le PDF');
    }
  }

  private async buildSimbotGabPDF(
    pdf: jsPDF, 
    quoteData: QuoteData, 
    customerData: CustomerData,
    formData: any
  ): Promise<void> {
    let currentY = 15;

    currentY = this.addSimbotHeader(pdf, currentY);
    currentY = this.addQuoteTitle(pdf, quoteData, currentY);
    currentY = this.addTwoColumnInfo(pdf, quoteData, customerData, formData, currentY);
    currentY = this.addPremiumPricing(pdf, quoteData, currentY);
    currentY = this.addModernCoverageTable(pdf, quoteData, currentY);
    
    if (quoteData.quotes && quoteData.quotes.length > 0) {
      currentY = this.addAlternativeOffersTable(pdf, quoteData.quotes, currentY);
    }
    
    if (quoteData.recommendations && quoteData.recommendations.length > 0) {
      currentY = this.addRecommendations(pdf, quoteData.recommendations, currentY);
    }
    
    this.addSimbotFooter(pdf);
  }

  private addSimbotHeader(pdf: jsPDF, startY: number): number {
    const bannerHeight = 25;
    
    // Bannière tricolore
    pdf.setFillColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.rect(0, 0, 70, bannerHeight, 'F');
    
    pdf.setFillColor(this.colors.secondary.r, this.colors.secondary.g, this.colors.secondary.b);
    pdf.rect(70, 0, 70, bannerHeight, 'F');
    
    pdf.setFillColor(this.colors.white.r, this.colors.white.g, this.colors.white.b);
    pdf.rect(140, 0, 70, bannerHeight, 'F');
    
    // Logo et titre
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('SIMBOT GAB', 15, 17);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Comparateur d\'Assurances - Gabon', 15, 22);
    
    // Contact
    pdf.setFontSize(8);
    pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
    pdf.text('Tel: +241 01 00 00 00', 145, 15);
    pdf.text('contact@simbotgab.com', 145, 20);
    
    return bannerHeight + 10;
  }

  private addQuoteTitle(pdf: jsPDF, quoteData: QuoteData, startY: number): number {
    let y = startY;
    
    pdf.setFillColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.roundedRect(15, y, 180, 28, 3, 3, 'F');
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    const title = `DEVIS ${this.getInsuranceTypeName(quoteData.insurance_type).toUpperCase()}`;
    pdf.text(title, 105, y + 11, { align: 'center' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`N° ${quoteData.quote_id.substring(0, 20)}`, 105, y + 18, { align: 'center' });
    pdf.text(`Généré le ${this.formatDate(new Date())}`, 105, y + 24, { align: 'center' });
    
    return y + 38;
  }

  private addTwoColumnInfo(
    pdf: jsPDF, 
    quoteData: QuoteData, 
    customerData: CustomerData,
    formData: any,
    startY: number
  ): number {
    let y = startY;
    
    // Colonne gauche - Souscripteur
    pdf.setFillColor(this.colors.lightGray.r, this.colors.lightGray.g, this.colors.lightGray.b);
    pdf.roundedRect(15, y, 85, 65, 2, 2, 'F');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.text('SOUSCRIPTEUR', 20, y + 8);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
    
    let leftY = y + 18;
    
    if (customerData.name) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('NOM :', 20, leftY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(customerData.name, 20, leftY + 5);
      leftY += 12;
    }
    
    if (customerData.email) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('EMAIL :', 20, leftY);
      pdf.setFont('helvetica', 'normal');
      const emailLines = pdf.splitTextToSize(customerData.email, 60);
      pdf.text(emailLines, 20, leftY + 5);
      leftY += 12;
    }
    
    if (customerData.phone) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('TEL :', 20, leftY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(customerData.phone, 20, leftY + 5);
      leftY += 12;
    }
    
    if (customerData.city) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('VILLE :', 20, leftY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(customerData.city, 20, leftY + 5);
    }
    
    // Colonne droite - Caractéristiques
    pdf.setFillColor(this.colors.lightGray.r, this.colors.lightGray.g, this.colors.lightGray.b);
    pdf.roundedRect(110, y, 85, 65, 2, 2, 'F');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.secondary.r, this.colors.secondary.g, this.colors.secondary.b);
    pdf.text('CARACTÉRISTIQUES', 115, y + 8);
    
    pdf.setFontSize(9);
    pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
    
    let rightY = y + 18;
    const details = this.getInsuranceSpecificDetails(quoteData.insurance_type, formData);
    
    details.slice(0, 5).forEach(detail => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(detail.label, 115, rightY);
      pdf.setFont('helvetica', 'normal');
      const valueLines = pdf.splitTextToSize(detail.value, 65);
      pdf.text(valueLines, 115, rightY + 5);
      rightY += 12;
    });
    
    return y + 75;
  }

  private addPremiumPricing(pdf: jsPDF, quoteData: QuoteData, startY: number): number {
    let y = startY;
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.text('TARIFICATION', 15, y);
    y += 8;
    
    pdf.setDrawColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.setLineWidth(2);
    pdf.roundedRect(15, y, 180, 50, 3, 3);
    
    pdf.setFillColor(250, 252, 251);
    pdf.roundedRect(16, y + 1, 178, 48, 2, 2, 'F');
    
    // Prime mensuelle
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
    pdf.text('Prime Mensuelle', 25, y + 17);
    
    pdf.setFontSize(20);
    pdf.setTextColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.text(this.formatCurrency(quoteData.monthly_premium), 180, y + 17, { align: 'right' });
    
    // Séparateur
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(25, y + 25, 185, y + 25);
    
    // Prime annuelle
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
    pdf.text('Prime Annuelle', 25, y + 34);
    
    pdf.setFontSize(13);
    pdf.setTextColor(this.colors.secondary.r, this.colors.secondary.g, this.colors.secondary.b);
    pdf.text(this.formatCurrency(quoteData.annual_premium), 180, y + 34, { align: 'right' });
    
    // Franchise
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
    pdf.text('Franchise', 25, y + 44);
    
    pdf.setFontSize(12);
    pdf.setTextColor(this.colors.warning.r, this.colors.warning.g, this.colors.warning.b);
    pdf.text(this.formatCurrency(quoteData.deductible), 180, y + 44, { align: 'right' });
    
    return y + 60;
  }

  private addModernCoverageTable(pdf: jsPDF, quoteData: QuoteData, startY: number): number {
    let y = startY;
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.text('GARANTIES INCLUSES', 15, y);
    y += 8;
    
    // Préparer les données
    const guaranteesData: any[] = [];
    
    if (quoteData.coverage_details && typeof quoteData.coverage_details === 'object') {
      Object.entries(quoteData.coverage_details).forEach(([key, value]) => {
        guaranteesData.push([
          key, 
          String(value), 
          '✓ Inclus'
        ]);
      });
    }
    
    // Si pas de données, ajouter un message
    if (guaranteesData.length === 0) {
      guaranteesData.push([
        'Responsabilité civile',
        'Selon contrat',
        '✓ Inclus'
      ]);
      guaranteesData.push([
        'Dommages matériels',
        'Selon contrat',
        '✓ Inclus'
      ]);
    }
    
    // Créer le tableau
    autoTable(pdf, {
      startY: y,
      head: [['Garantie', 'Montant/Détails', 'Statut']],
      body: guaranteesData,
      theme: 'grid',
      headStyles: {
        fillColor: [this.colors.primary.r, this.colors.primary.g, this.colors.primary.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [this.colors.dark.r, this.colors.dark.g, this.colors.dark.b],
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [this.colors.lightGray.r, this.colors.lightGray.g, this.colors.lightGray.b]
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 80 },
        2: { cellWidth: 35, halign: 'center' }
      },
      margin: { left: 15, right: 15 }
    });
    
    y = (pdf as any).lastAutoTable.finalY + 15;
    
    // Exclusions
    if (quoteData.exclusions && quoteData.exclusions.length > 0) {
      // Vérifier si on a assez d'espace
      if (y > 240) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(231, 76, 60);
      pdf.text('EXCLUSIONS', 15, y);
      y += 8;
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
      
      quoteData.exclusions.slice(0, 5).forEach(exclusion => {
        const lines = pdf.splitTextToSize(`• ${exclusion}`, 170);
        lines.forEach((line: string) => {
          if (y > 270) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, 20, y);
          y += 4;
        });
        y += 1;
      });
      
      y += 5;
    }
    
    return y;
  }

  private addAlternativeOffersTable(pdf: jsPDF, quotes: any[], startY: number): number {
    let y = startY;
    
    // Vérifier si on a assez d'espace
    if (y > 220) {
      pdf.addPage();
      y = 20;
    }
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.secondary.r, this.colors.secondary.g, this.colors.secondary.b);
    pdf.text('AUTRES OFFRES', 15, y);
    y += 8;
    
    const quotesData: any[] = quotes.slice(0, 3).map(quote => [
      quote.company_name || 'Assureur',
      quote.product_name || 'Produit',
      this.formatCurrency(quote.monthly_premium || 0),
      quote.rating ? `${quote.rating}/5 ⭐` : 'N/A'
    ]);
    
    autoTable(pdf, {
      startY: y,
      head: [['Assureur', 'Produit', 'Prime/mois', 'Note']],
      body: quotesData,
      theme: 'striped',
      headStyles: {
        fillColor: [this.colors.secondary.r, this.colors.secondary.g, this.colors.secondary.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      margin: { left: 15, right: 15 }
    });
    
    return (pdf as any).lastAutoTable.finalY + 10;
  }

  private addRecommendations(pdf: jsPDF, recommendations: string[], startY: number): number {
    let y = startY;
    
    // Vérifier si on a assez d'espace
    if (y > 230) {
      pdf.addPage();
      y = 20;
    }
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.text('CONSEILS', 15, y);
    y += 8;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
    
    recommendations.slice(0, 3).forEach(rec => {
      const lines = pdf.splitTextToSize(`• ${rec}`, 170);
      lines.forEach((line: string) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, 20, y);
        y += 5;
      });
      y += 2;
    });
    
    return y;
  }

  private addSimbotFooter(pdf: jsPDF): void {
    const pageHeight = pdf.internal.pageSize.height;
    
    pdf.setDrawColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.setLineWidth(1);
    pdf.line(15, pageHeight - 25, 195, pageHeight - 25);
    
    pdf.setFontSize(8);
    pdf.setTextColor(this.colors.dark.r, this.colors.dark.g, this.colors.dark.b);
    pdf.text('Ce devis est valable 30 jours. Pour souscrire, contactez-nous.', 15, pageHeight - 18);
    pdf.text('Simbot Gab - Libreville, Gabon | Tel: +241 01 00 00 00 | contact@simbotgab.com', 15, pageHeight - 13);
    
    pdf.setTextColor(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b);
    pdf.text('© 2024 Simbot Gab - Tous droits réservés', 15, pageHeight - 8);
  }

  private getInsuranceSpecificDetails(type: string, formData: any): Array<{label: string, value: string}> {
    const details: Array<{label: string, value: string}> = [];
    
    switch (type) {
      case 'auto':
        details.push(
          { label: 'Catégorie :', value: formData.vehicleCategory || 'Particulier' },
          { label: 'Valeur véhicule :', value: formData.vehicleValue ? this.formatCurrency(formData.vehicleValue) : 'Non spécifié' },
          { label: 'Carburant :', value: formData.fuelType || 'Non spécifié' },
          { label: 'Places :', value: formData.seats ? `${formData.seats} places` : 'Non spécifié' },
          { label: 'Ville :', value: formData.city || 'Non spécifié' }
        );
        break;
      case 'habitation':
        details.push(
          { label: 'Type logement :', value: formData.propertyType || 'Non spécifié' },
          { label: 'Valeur bien :', value: formData.propertyValue ? this.formatCurrency(formData.propertyValue) : 'Non spécifié' },
          { label: 'Surface :', value: formData.surface ? `${formData.surface} m²` : 'Non spécifié' },
          { label: 'Ville :', value: formData.city || 'Non spécifié' }
        );
        break;
      case 'vie':
        details.push(
          { label: 'Capital souhaité :', value: formData.coverageAmount ? this.formatCurrency(formData.coverageAmount) : 'Non spécifié' },
          { label: 'État santé :', value: formData.healthStatus || 'Non spécifié' },
          { label: 'Âge :', value: formData.age ? `${formData.age} ans` : 'Non spécifié' }
        );
        break;
      case 'sante':
        details.push(
          { label: 'Composition :', value: formData.familySize || '1 personne' },
          { label: 'Niveau couverture :', value: formData.coverageLevel || 'Standard' },
          { label: 'Âge :', value: formData.age ? `${formData.age} ans` : 'Non spécifié' }
        );
        break;
      case 'voyage':
        details.push(
          { label: 'Destination :', value: formData.destination || 'Non spécifié' },
          { label: 'Durée :', value: formData.duration ? `${formData.duration} jours` : 'Non spécifié' },
          { label: 'Voyageurs :', value: formData.travelers || '1' }
        );
        break;
    }
    
    return details;
  }

  private formatCurrency(amount: number): string {
    if (!amount || isNaN(amount)) return '0 FCFA';
    
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).replace(/\s/g, ' ') + ' FCFA';
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private getInsuranceTypeName(type: string): string {
    const types: { [key: string]: string } = {
      'auto': 'Automobile',
      'habitation': 'Habitation',
      'vie': 'Vie',
      'sante': 'Santé',
      'voyage': 'Voyage',
      'transport': 'Transport'
    };
    return types[type] || type;
  }
}