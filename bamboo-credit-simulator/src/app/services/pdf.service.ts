// pdf.service.ts - Version simplifiée pour SimBot Gab
import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SimulationData {
  bank_name: string;
  product_name: string;
  requested_amount: number;
  duration_months: number;
  applied_rate: number;
  monthly_payment: number;
  total_cost: number;
  total_interest: number;
  debt_ratio: number;
  eligible: boolean;
  applicant_name?: string;
  monthly_income?: number;
}

interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining_balance: number;
}

type ColorTuple = [number, number, number];

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  private readonly colors: Record<string, ColorTuple> = {
    primary: [20, 85, 166],      // Bleu SimBot
    accent: [50, 190, 120],      // Vert SimBot
    dark: [31, 41, 55],
    medium: [107, 114, 128],
    light: [243, 244, 246],
    white: [255, 255, 255],
    success: [34, 197, 94],
    warning: [251, 191, 36]
  };

  constructor() {}

  private setFillColorSafe(doc: jsPDF, colorKey: keyof typeof this.colors): void {
    const color = this.colors[colorKey];
    doc.setFillColor(color[0], color[1], color[2]);
  }

  private setTextColorSafe(doc: jsPDF, colorKey: keyof typeof this.colors): void {
    const color = this.colors[colorKey];
    doc.setTextColor(color[0], color[1], color[2]);
  }

  private setDrawColorSafe(doc: jsPDF, colorKey: keyof typeof this.colors): void {
    const color = this.colors[colorKey];
    doc.setDrawColor(color[0], color[1], color[2]);
  }

  /**
   * Génère un PDF simple avec tableau d'amortissement et conseils
   */
  generateAmortizationPDF(
    simulationData: SimulationData, 
    amortizationSchedule: AmortizationEntry[]
  ): void {
    const doc = new jsPDF();
    this.setupSimplePDFDocument(doc);

    // Page 1: En-tête + Résumé
    this.addSimpleHeader(doc, simulationData);
    this.addSimpleSummary(doc, simulationData);

    // Page 2: Tableau d'amortissement
    doc.addPage();
    this.addSimpleAmortizationTable(doc, amortizationSchedule, simulationData);
    
    // Page 3: Conseils
    doc.addPage();
    this.addSimpleRecommendations(doc, simulationData);

    this.addSimpleFooter(doc);

    const filename = `Amortissement-SimBot-${simulationData.bank_name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  /**
   * Configuration simple du document
   */
  private setupSimplePDFDocument(doc: jsPDF): void {
    doc.setProperties({
      title: 'Tableau d\'Amortissement - SimBot Gab',
      subject: 'Simulation de crédit',
      author: 'SimBot Gab',
      creator: 'SimBot Financial Assistant'
    });
  }

  /**
   * En-tête simple avec branding SimBot
   */
  private addSimpleHeader(doc: jsPDF, data: SimulationData): void {
    const pageWidth = doc.internal.pageSize.width;

    // Barre de couleur en haut
    this.setFillColorSafe(doc, 'primary');
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Logo SimBot simple
    this.setFillColorSafe(doc, 'white');
    doc.circle(20, 12.5, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, 'primary');
    doc.text('🤖', 16, 16);

    // Titre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'white');
    doc.text('SimBot Gab - Tableau d\'Amortissement', 35, 16);

    // Informations de base
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    this.setTextColorSafe(doc, 'primary');
    doc.text(data.bank_name, 20, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, 'medium');
    doc.text(data.product_name, 20, 55);

    // Badge éligibilité
    const badgeColor = data.eligible ? 'success' : 'warning';
    const badgeText = data.eligible ? '✓ ÉLIGIBLE' : '⚠ NON ÉLIGIBLE';
    
    this.setFillColorSafe(doc, badgeColor);
    doc.roundedRect(pageWidth - 80, 35, 60, 20, 4, 4, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    this.setTextColorSafe(doc, 'white');
    this.centerText(doc, badgeText, 47, pageWidth - 80, pageWidth - 20);
  }

  /**
   * Résumé simplifié
   */
  private addSimpleSummary(doc: jsPDF, data: SimulationData): void {
    let yPos = 75;

    // Cadre du résumé
    this.setFillColorSafe(doc, 'light');
    doc.roundedRect(20, yPos, 170, 80, 6, 6, 'F');
    
    this.setFillColorSafe(doc, 'accent');
    doc.rect(20, yPos, 4, 80, 'F');

    // Titre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    this.setTextColorSafe(doc, 'primary');
    doc.text('Résumé de votre crédit', 30, yPos + 15);

    // Métriques principales en 2 colonnes
    const metrics = [
      { label: 'Montant emprunté', value: this.formatCurrency(data.requested_amount) },
      { label: 'Durée', value: `${data.duration_months} mois` },
      { label: 'Taux appliqué', value: `${data.applied_rate}%` },
      { label: 'Mensualité', value: this.formatCurrency(data.monthly_payment) },
      { label: 'Coût total', value: this.formatCurrency(data.total_cost) },
      { label: 'Intérêts totaux', value: this.formatCurrency(data.total_interest) }
    ];

    metrics.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 35 + (col * 85);
      const y = yPos + 30 + (row * 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      this.setTextColorSafe(doc, 'medium');
      doc.text(metric.label, x, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      this.setTextColorSafe(doc, 'dark');
      doc.text(metric.value, x, y + 8);
    });

    // Ratio d'endettement
    const ratioY = yPos + 90;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    this.setTextColorSafe(doc, 'medium');
    doc.text(`Ratio d'endettement : ${data.debt_ratio}%`, 20, ratioY);

    // Barre de progression du ratio
    const barWidth = 100;
    const ratioWidth = Math.min((data.debt_ratio / 50) * barWidth, barWidth);
    
    this.setFillColorSafe(doc, 'light');
    doc.rect(120, ratioY - 5, barWidth, 8, 'F');
    
    const ratioColor = data.debt_ratio <= 33 ? 'success' : data.debt_ratio <= 40 ? 'warning' : 'primary';
    this.setFillColorSafe(doc, ratioColor);
    doc.rect(120, ratioY - 5, ratioWidth, 8, 'F');
  }

  /**
   * Tableau d'amortissement simplifié
   */
  private addSimpleAmortizationTable(doc: jsPDF, schedule: AmortizationEntry[], data: SimulationData): void {
    // Titre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'primary');
    doc.text('Échéancier d\'Amortissement', 20, 30);

    // Info rapide
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    this.setTextColorSafe(doc, 'medium');
    doc.text(`${schedule.length} mensualités de ${this.formatCurrency(data.monthly_payment)}`, 20, 42);

    // Préparation des données du tableau
    const tableData = schedule.map((entry) => [
      `Mois ${entry.month}`,
      this.formatCurrencyCompact(entry.payment),
      this.formatCurrencyCompact(entry.principal),
      this.formatCurrencyCompact(entry.interest),
      this.formatCurrencyCompact(entry.remaining_balance)
    ]);

    // Tableau avec autoTable
    autoTable(doc, {
      startY: 50,
      head: [['Période', 'Mensualité', 'Capital', 'Intérêts', 'Solde restant']],
      body: tableData,
      
      theme: 'plain',
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        font: 'helvetica',
        textColor: this.colors['dark'],
        lineWidth: 0.1,
        lineColor: this.colors['medium']
      },
      
      headStyles: { 
        fillColor: this.colors['primary'],
        textColor: this.colors['white'],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
      },
      
      alternateRowStyles: { 
        fillColor: [249, 250, 251]
      },
      
      // Mettre en évidence les années complètes
      didParseCell: (data: any) => {
        if (data.row.index > 0 && (data.row.index + 1) % 12 === 0) {
          data.cell.styles.fillColor = [239, 246, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Synthèse en bas de page
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    this.addAmortizationSynthesis(doc, data, finalY);
  }

  /**
   * Synthèse du tableau d'amortissement
   */
  private addAmortizationSynthesis(doc: jsPDF, data: SimulationData, yPos: number): void {
    this.setFillColorSafe(doc, 'light');
    doc.roundedRect(20, yPos, 170, 40, 6, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, 'primary');
    doc.text('Répartition Capital / Intérêts', 30, yPos + 15);

    const totalPrincipal = data.requested_amount;
    const totalInterest = data.total_interest;
    const principalPercent = (totalPrincipal / (totalPrincipal + totalInterest)) * 100;
    const interestPercent = 100 - principalPercent;

    // Barre de répartition
    const barY = yPos + 25;
    const barWidth = 120;
    const principalWidth = (barWidth * principalPercent) / 100;

    this.setFillColorSafe(doc, 'success');
    doc.rect(30, barY, principalWidth, 10, 'F');
    
    this.setFillColorSafe(doc, 'warning');
    doc.rect(30 + principalWidth, barY, barWidth - principalWidth, 10, 'F');

    // Légende
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    this.setTextColorSafe(doc, 'dark');
    doc.text(`Capital: ${principalPercent.toFixed(1)}%`, 160, barY + 3);
    doc.text(`Intérêts: ${interestPercent.toFixed(1)}%`, 160, barY + 13);
  }

  /**
   * Conseils simplifiés
   */
  private addSimpleRecommendations(doc: jsPDF, data: SimulationData): void {
    // Titre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'primary');
    doc.text('Conseils SimBot', 20, 30);

    let yPos = 50;

    if (data.eligible) {
      // Conseils pour dossier éligible
      this.addRecommendationSection(doc, yPos, '✅ Votre dossier est éligible !', [
        'Préparez vos documents : pièce d\'identité, bulletins de salaire, relevés bancaires',
        'Contactez la banque dans les plus brefs délais pour confirmer votre demande',
        'Négociez si possible les frais de dossier et d\'assurance',
        'Lisez attentivement le contrat avant de signer'
      ], 'success');
      yPos += 80;

      this.addRecommendationSection(doc, yPos, '💡 Optimisations possibles', [
        `Un apport de ${this.formatCurrency(data.requested_amount * 0.1)} réduirait vos intérêts`,
        'Vérifiez votre éligibilité aux assurances groupe moins chères',
        'Considérez un remboursement anticipé si votre situation s\'améliore'
      ], 'accent');

    } else {
      // Conseils pour dossier non éligible
      this.addRecommendationSection(doc, yPos, '⚠️ Points à améliorer', [
        'Réduisez vos charges mensuelles existantes',
        'Augmentez vos revenus ou attendez une promotion',
        'Constituez un apport personnel plus important',
        'Considérez un montant ou une durée différente'
      ], 'warning');
      yPos += 80;

      this.addRecommendationSection(doc, yPos, '🎯 Plan d\'action', [
        'Attendez 3-6 mois avant de refaire une demande',
        'Consultez un conseiller financier',
        'Étudiez d\'autres types de financement',
        'Améliorez votre score de crédit'
      ], 'primary');
    }

    yPos += 80;

    // Section générale
    this.addRecommendationSection(doc, yPos, '📊 À retenir', [
      `Votre ratio d\'endettement est de ${data.debt_ratio}% ${data.debt_ratio <= 33 ? '(excellent)' : data.debt_ratio <= 40 ? '(acceptable)' : '(élevé)'}`,
      `Les intérêts représentent ${((data.total_interest / data.requested_amount) * 100).toFixed(1)}% du capital`,
      'Ce tableau d\'amortissement est indicatif et peut évoluer',
      'N\'hésitez pas à comparer avec d\'autres établissements'
    ], 'medium');
  }

  /**
   * Section de recommandations
   */
  private addRecommendationSection(doc: jsPDF, yPos: number, title: string, items: string[], colorKey: keyof typeof this.colors): void {
    // Cadre de la section
    this.setFillColorSafe(doc, 'light');
    doc.roundedRect(20, yPos, 170, 15 + (items.length * 10), 6, 6, 'F');
    
    // Barre colorée
    this.setFillColorSafe(doc, colorKey);
    doc.rect(20, yPos, 4, 15 + (items.length * 10), 'F');

    // Titre de section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, colorKey);
    doc.text(title, 30, yPos + 12);

    // Items
    items.forEach((item, index) => {
      const itemY = yPos + 25 + (index * 10);
      
      // Puce
      this.setFillColorSafe(doc, colorKey);
      doc.circle(32, itemY - 2, 1.5, 'F');
      
      // Texte
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      this.setTextColorSafe(doc, 'dark');
      doc.text(item, 38, itemY, { maxWidth: 145 });
    });
  }

  /**
   * PDF de comparaison simplifié
   */
  generateComparisonPDF(simulations: any[]): void {
    const doc = new jsPDF();
    this.setupSimplePDFDocument(doc);

    this.addSimpleComparisonHeader(doc, simulations);
    this.addSimpleComparisonTable(doc, simulations);
    
    doc.addPage();
    this.addComparisonRecommendations(doc, simulations);

    this.addSimpleFooter(doc);
    
    const filename = `Comparaison-SimBot-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  private addSimpleComparisonHeader(doc: jsPDF, simulations: any[]): void {
    const pageWidth = doc.internal.pageSize.width;

    // Barre de couleur
    this.setFillColorSafe(doc, 'primary');
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Logo et titre
    this.setFillColorSafe(doc, 'white');
    doc.circle(20, 12.5, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, 'primary');
    doc.text('🤖', 16, 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'white');
    doc.text('SimBot Gab - Comparaison d\'Offres', 35, 16);

    // Stats rapides
    const eligible = simulations.filter(s => s.simulation.eligible).length;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, 'dark');
    doc.text(`${simulations.length} offres analysées • ${eligible} éligibles`, 20, 40);
  }

  private addSimpleComparisonTable(doc: jsPDF, simulations: any[]): void {
    const tableData = simulations.map((sim, index) => [
      `#${index + 1}`,
      sim.product.bank.name,
      `${sim.simulation.applied_rate}%`,
      this.formatCurrencyCompact(sim.simulation.monthly_payment),
      this.formatCurrencyCompact(sim.simulation.total_cost),
      sim.simulation.eligible ? 'OUI' : 'NON'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Rang', 'Banque', 'Taux', 'Mensualité', 'Coût total', 'Éligible']],
      body: tableData,
      
      theme: 'plain',
      styles: { 
        fontSize: 9,
        cellPadding: 4,
        textColor: this.colors['dark']
      },
      
      headStyles: { 
        fillColor: this.colors['primary'],
        textColor: this.colors['white'],
        fontStyle: 'bold'
      },
      
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 },
        5: { halign: 'center', cellWidth: 25 }
      },
      
      didParseCell: (data: any) => {
        if (data.column.index === 5) {
          if (data.cell.text[0] === 'OUI') {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = this.colors['success'];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        
        if (data.row.index === 0) {
          data.cell.styles.fillColor = [239, 246, 255];
        }
      }
    });
  }

  private addComparisonRecommendations(doc: jsPDF, simulations: any[]): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'primary');
    doc.text('Analyse comparative', 20, 30);

    const eligible = simulations.filter(s => s.simulation.eligible);
    
    if (eligible.length > 0) {
      const best = eligible[0];
      this.addRecommendationSection(doc, 50, '🏆 Meilleure offre', [
        `${best.product.bank.name} - ${this.formatCurrency(best.simulation.monthly_payment)}/mois`,
        `Taux : ${best.simulation.applied_rate}%`,
        `Coût total : ${this.formatCurrency(best.simulation.total_cost)}`,
        'Cette offre présente le meilleur rapport qualité/prix'
      ], 'success');
    }

    const recommendations = eligible.length > 0 ? [
      'Contactez en priorité les banques éligibles',
      'Négociez les frais annexes (dossier, assurance)',
      'Vérifiez les conditions de remboursement anticipé',
      'Demandez plusieurs offres fermes avant de choisir'
    ] : [
      'Travaillez sur l\'amélioration de votre profil',
      'Considérez un montant ou une durée différente',
      'Consultez un courtier en crédit',
      'Réessayez dans quelques mois'
    ];

    this.addRecommendationSection(doc, 130, '📋 Nos conseils', recommendations, 'accent');
  }

  /**
   * PDF synthèse express simplifié
   */
  generateQuickSummaryPDF(simulationData: SimulationData): void {
    const doc = new jsPDF();

    // En-tête simple
    this.addSimpleHeader(doc, simulationData);
    
    // Résumé compact
    this.addCompactSummary(doc, simulationData);
    
    // Contact
    this.addSimpleContact(doc);

    this.addSimpleFooter(doc);

    const filename = `Synthese-SimBot-${simulationData.bank_name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    doc.save(filename);
  }

  private addCompactSummary(doc: jsPDF, data: SimulationData): void {
    let yPos = 110;

    // Cadre principal
    this.setFillColorSafe(doc, 'white');
    this.setDrawColorSafe(doc, 'primary');
    doc.roundedRect(20, yPos, 170, 100, 8, 8, 'FD');

    // Métriques essentielles
    const metrics = [
      { label: 'Montant', value: this.formatCurrency(data.requested_amount) },
      { label: 'Mensualité', value: this.formatCurrency(data.monthly_payment) },
      { label: 'Durée', value: `${data.duration_months} mois` },
      { label: 'Taux', value: `${data.applied_rate}%` }
    ];

    metrics.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 35 + (col * 80);
      const y = yPos + 25 + (row * 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      this.setTextColorSafe(doc, 'medium');
      doc.text(metric.label, x, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      this.setTextColorSafe(doc, 'primary');
      doc.text(metric.value, x, y + 12);
    });

    // Status
    const statusY = yPos + 80;
    const statusColor = data.eligible ? 'success' : 'warning';
    const statusText = data.eligible ? '✓ DOSSIER ÉLIGIBLE' : '⚠ DOSSIER À AMÉLIORER';
    
    this.setFillColorSafe(doc, statusColor);
    doc.roundedRect(30, statusY, 130, 15, 4, 4, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    this.setTextColorSafe(doc, 'white');
    this.centerText(doc, statusText, statusY + 10, 30, 160);
  }

  private addSimpleContact(doc: jsPDF): void {
    const yPos = 230;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, 'primary');
    doc.text('Prochaine étape', 20, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    this.setTextColorSafe(doc, 'dark');
    doc.text('Contactez votre conseiller avec ce document pour finaliser votre dossier', 20, yPos + 15);
  }

  /**
   * Footer simple
   */
  private addSimpleFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      
      // Ligne de séparation
      this.setDrawColorSafe(doc, 'light');
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      
      // Texte du footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      this.setTextColorSafe(doc, 'medium');
      doc.text('SimBot Gab - Assistant IA pour le crédit', 20, pageHeight - 12);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, pageHeight - 7);
      
      // Numéro de page
      doc.text(`Page ${i}/${pageCount}`, pageWidth - 30, pageHeight - 10);
    }
  }

  // Méthodes utilitaires
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private formatCurrencyCompact(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toFixed(0);
  }

  private centerText(doc: jsPDF, text: string, y: number, startX?: number, endX?: number): void {
    const pageWidth = endX && startX ? endX - startX : doc.internal.pageSize.width;
    const textWidth = doc.getTextWidth(text);
    const x = startX ? startX + (pageWidth - textWidth) / 2 : (doc.internal.pageSize.width - textWidth) / 2;
    doc.text(text, x, y);
  }
}