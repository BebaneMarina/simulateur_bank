// enhanced-pdf.service.ts - Version optimisée pour SimBot Gab
import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EnhancedSimulationData {
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
  simulation_id?: string;
  confidence_score?: number;
  market_position?: 'excellent' | 'good' | 'average';
  monthly_income?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedPdfService {
  
  private readonly simbotColors = {
    primary: [20, 85, 150] as [number, number, number],
    secondary: [50, 190, 120] as [number, number, number],
    accent: [255, 140, 0] as [number, number, number],
    success: [40, 180, 70] as [number, number, number],
    warning: [255, 165, 0] as [number, number, number],
    danger: [220, 53, 69] as [number, number, number],
    dark: [45, 55, 72] as [number, number, number],
    medium: [107, 114, 128] as [number, number, number],
    light: [248, 250, 252] as [number, number, number],
    white: [255, 255, 255] as [number, number, number]
  };
    addDocumentMetadata: any;
  generateSimbotComparisonPDF: any;

  /**
   * Génère un PDF premium optimisé pour SimBot Gab
   */
  generateSimbotPremiumPDF(
    simulationData: EnhancedSimulationData,
    amortizationSchedule: any[]
  ): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    this.setupSimbotDocument(doc);

    // Page 1: Couverture moderne
    this.addSimbotCoverPage(doc, simulationData);
    
    // Page 2: Synthèse exécutive
    doc.addPage();
    this.addEnhancedExecutiveSummary(doc, simulationData);
    
    // Page 3-4: Tableau d'amortissement optimisé
    doc.addPage();
    this.addOptimizedAmortizationTable(doc, amortizationSchedule, simulationData);
    
    // Page 5: Analyse comparative
    doc.addPage();
    this.addMarketAnalysis(doc, simulationData);
    
    // Page 6: Plan d'action personnalisé
    doc.addPage();
    this.addPersonalizedActionPlan(doc, simulationData);

    this.addSimbotFooter(doc);

    const filename = `SimBot-Credit-Analysis-${simulationData.bank_name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  private setupSimbotDocument(doc: jsPDF): void {
    doc.setProperties({
      title: 'Analyse de Crédit - SimBot Gab',
      subject: 'Rapport personnalisé de simulation de crédit par IA',
      author: 'SimBot Gab - Assistant IA Financier',
      creator: 'SimBot Gab Platform v2.0',
      keywords: 'crédit, simulation, gabon, financement, simbot, ia'
    });
  }

  private addSimbotCoverPage(doc: jsPDF, data: EnhancedSimulationData): void {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Arrière-plan dégradé moderne
    this.addModernGradient(doc, pageWidth, pageHeight);
    
    // Logo et branding SimBot Gab
    this.addSimbotBranding(doc, pageWidth);
    
    // Titre principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(...this.simbotColors.white);
    this.centerText(doc, 'ANALYSE DE CRÉDIT', 100);
    
    doc.setFontSize(18);
    doc.setTextColor(...this.simbotColors.light);
    this.centerText(doc, 'Rapport Personnalisé par IA', 115);
    
    // Card d'informations principales avec design moderne
    this.addModernInfoCard(doc, data, pageWidth, pageHeight);
    
    // Badge de confiance IA
    this.addConfidenceBadge(doc, data, pageWidth);
    
    // Métadonnées du document
    this.addDocumentMetadata(doc, pageWidth, pageHeight);
  }

  private addModernGradient(doc: jsPDF, width: number, height: number): void {
    // Dégradé de base
    doc.setFillColor(...this.simbotColors.primary);
    doc.rect(0, 0, width, height, 'F');
    
    // Formes géométriques modernes
    doc.setFillColor(50, 190, 120, 0.1);
    doc.circle(width * 0.85, 40, 80, 'F');
    
    doc.setFillColor(255, 140, 0, 0.08);
    doc.triangle(0, height, 100, height, 50, height - 80, 'F');
    
    // Accent géométrique en haut à droite
    doc.setFillColor(...this.simbotColors.accent);
    doc.triangle(width - 60, 0, width, 0, width, 40, 'F');
  }

  private addSimbotBranding(doc: jsPDF, width: number): void {
    // Container du logo moderne
    doc.setFillColor(255, 255, 255, 0.95);
    doc.roundedRect(width/2 - 90, 30, 180, 40, 12, 12, 'F');
    
    // Logo SimBot (design moderne)
    doc.setFillColor(...this.simbotColors.secondary);
    doc.circle(width/2 - 50, 50, 16, 'F');
    
    // Icône robot stylisée
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...this.simbotColors.white);
    doc.text('SB', width/2 - 55, 55);
    
    // Nom de l'application
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...this.simbotColors.primary);
    doc.text('SIMBOT', width/2 - 15, 45);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...this.simbotColors.medium);
    doc.text('GAB - Assistant IA Financier', width/2 - 15, 55);
  }

  private addModernInfoCard(doc: jsPDF, data: EnhancedSimulationData, width: number, height: number): void {
    const cardY = height/2 - 50;
    const cardHeight = 100;
    
    // Ombre moderne
    doc.setFillColor(0, 0, 0, 0.1);
    doc.roundedRect(25, cardY + 3, width - 50, cardHeight, 15, 15, 'F');
    
    // Card principale
    doc.setFillColor(...this.simbotColors.white);
    doc.roundedRect(20, cardY, width - 40, cardHeight, 15, 15, 'F');
    
    // En-tête de la card
    doc.setFillColor(...this.simbotColors.primary);
    doc.roundedRect(20, cardY, width - 40, 25, 15, 15, 'F');
    doc.rect(20, cardY + 12, width - 40, 13, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...this.simbotColors.white);
    doc.text(data.bank_name, 35, cardY + 16);
    
    // Informations structurées en colonnes
    const metrics = [
      { 
        label: 'Montant Emprunté', 
        value: this.formatCurrency(data.requested_amount),
        icon: '💰',
        color: this.simbotColors.success
      },
      { 
        label: 'Mensualité', 
        value: this.formatCurrency(data.monthly_payment),
        icon: '📅',
        color: this.simbotColors.primary
      },
      { 
        label: 'Taux Appliqué', 
        value: `${data.applied_rate}%`,
        icon: '📈',
        color: this.simbotColors.accent
      },
      { 
        label: 'Durée', 
        value: `${data.duration_months} mois`,
        icon: '⏱️',
        color: this.simbotColors.secondary
      }
    ];

    // Disposition en grille 2x2
    metrics.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 35 + (col * ((width - 70) / 2));
      const y = cardY + 40 + (row * 25);
      
      // Icône
      doc.setFontSize(16);
      doc.text(metric.icon, x, y);
      
      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...this.simbotColors.medium);
      doc.text(metric.label, x + 15, y - 3);
      
      // Valeur
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...metric.color);
      doc.text(metric.value, x + 15, y + 8);
    });
  }

  private addConfidenceBadge(doc: jsPDF, data: EnhancedSimulationData, width: number): void {
    const badgeY = 200;
    const confidence = data.confidence_score || 95;
    
    // Badge de confiance IA
    doc.setFillColor(...this.simbotColors.secondary);
    doc.roundedRect(width/2 - 60, badgeY, 120, 30, 15, 15, 'F');
    
    // Icône IA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...this.simbotColors.white);
    doc.text('🤖', width/2 - 45, badgeY + 20);
    
    // Texte de confiance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Analyse IA - Confiance: ${confidence}%`, width/2 - 25, badgeY + 15);
    
    // Statut d'éligibilité
    const statusText = data.eligible ? 'DOSSIER ÉLIGIBLE' : 'OPTIMISATION REQUISE';
    doc.setFontSize(10);
    doc.text(statusText, width/2 - 25, badgeY + 25);
  }

  private addEnhancedExecutiveSummary(doc: jsPDF, data: EnhancedSimulationData): void {
    let yPos = 25;
    
    // Titre avec design moderne
    this.addModernSectionTitle(doc, 'SYNTHÈSE EXÉCUTIVE', yPos);
    yPos += 20;
    
    // Scorecard principale
    this.addScorecardSection(doc, data, yPos);
    yPos += 80;
    
    // KPI avec visualisations améliorées
    this.addEnhancedKPISection(doc, data, yPos);
    yPos += 60;
    
    // Recommandation IA
    this.addAIRecommendation(doc, data, yPos);
  }

  private addScorecardSection(doc: jsPDF, data: EnhancedSimulationData, y: number): void {
    // Score global calculé par l'IA
    const overallScore = this.calculateOverallScore(data);
    
    // Container de la scorecard
    doc.setFillColor(...this.simbotColors.light);
    doc.roundedRect(15, y, 180, 70, 10, 10, 'F');
    
    // Score principal (grand cercle)
    const centerX = 50;
    const centerY = y + 35;
    
    doc.setFillColor(...this.getScoreColor(overallScore));
    doc.circle(centerX, centerY, 25, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...this.simbotColors.white);
    this.centerText(doc, overallScore.toString(), centerY + 3, centerX - 15, centerX + 15);
    
    doc.setFontSize(8);
    this.centerText(doc, 'SCORE IA', centerY + 12, centerX - 15, centerX + 15);
    
    // Détails à droite
    const details = [
      { label: 'Éligibilité', value: data.eligible ? 'APPROUVÉ' : 'À RÉVISER', color: data.eligible ? this.simbotColors.success : this.simbotColors.warning },
      { label: 'Ratio d\'endettement', value: `${data.debt_ratio}%`, color: this.getRatioColor(data.debt_ratio) },
      { label: 'Position marché', value: data.market_position || 'Excellente', color: this.simbotColors.primary },
      { label: 'Coût/Revenus', value: `${((data.monthly_payment / (data.monthly_income || 1000000)) * 100).toFixed(1)}%`, color: this.simbotColors.secondary }
    ];
    
    details.forEach((detail, index) => {
      const detailY = y + 15 + (index * 12);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...this.simbotColors.dark);
      doc.text(detail.label, 85, detailY);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...detail.color);
      doc.text(detail.value, 150, detailY);
    });
  }

  private addOptimizedAmortizationTable(doc: jsPDF, schedule: any[], data: EnhancedSimulationData): void {
    this.addModernSectionTitle(doc, 'ÉCHÉANCIER D\'AMORTISSEMENT', 25);
    
    // Graphique d'évolution en haut
    this.addAmortizationChart(doc, schedule, 45);
    
    // Tableau optimisé avec pagination
    this.addPaginatedAmortizationTable(doc, schedule, 120);
  }

  private addAmortizationChart(doc: jsPDF, schedule: any[], y: number): void {
    const chartHeight = 60;
    const chartWidth = 170;
    const chartX = 20;
    
    // Container du graphique
    doc.setFillColor(...this.simbotColors.white);
    doc.roundedRect(chartX, y, chartWidth, chartHeight, 8, 8, 'F');
    
    // Axes
    doc.setDrawColor(...this.simbotColors.medium);
    doc.setLineWidth(0.5);
    doc.line(chartX + 10, y + chartHeight - 10, chartX + chartWidth - 10, y + chartHeight - 10); // X
    doc.line(chartX + 10, y + 10, chartX + 10, y + chartHeight - 10); // Y
    
    // Courbe d'amortissement
    if (schedule.length > 0) {
      const maxBalance = schedule[0].remaining_balance + schedule[0].principal;
      
      doc.setDrawColor(...this.simbotColors.primary);
      doc.setLineWidth(2);
      
      for (let i = 0; i < schedule.length - 1; i++) {
        const x1 = chartX + 10 + (i / schedule.length) * (chartWidth - 20);
        const y1 = y + chartHeight - 10 - (schedule[i].remaining_balance / maxBalance) * (chartHeight - 20);
        const x2 = chartX + 10 + ((i + 1) / schedule.length) * (chartWidth - 20);
        const y2 = y + chartHeight - 10 - (schedule[i + 1].remaining_balance / maxBalance) * (chartHeight - 20);
        
        doc.line(x1, y1, x2, y2);
      }
    }
    
    // Labels
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...this.simbotColors.dark);
    doc.text('Évolution du Capital Restant', chartX + 5, y - 5);
  }

  private addPersonalizedActionPlan(doc: jsPDF, data: EnhancedSimulationData): void {
    this.addModernSectionTitle(doc, 'PLAN D\'ACTION PERSONNALISÉ', 25);
    
    const steps = this.generatePersonalizedSteps(data);
    
    steps.forEach((step, index) => {
      const stepY = 50 + (index * 35);
      
      // Timeline connector
      if (index > 0) {
        doc.setDrawColor(...this.simbotColors.medium);
        doc.setLineWidth(2);
        doc.line(35, stepY - 15, 35, stepY - 5);
      }
      
      // Step circle
      doc.setFillColor(...step.color);
      doc.circle(35, stepY + 5, 12, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...this.simbotColors.white);
      doc.text((index + 1).toString(), 32, stepY + 8);
      
      // Step content
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...this.simbotColors.dark);
      doc.text(step.title, 55, stepY + 3);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...this.simbotColors.medium);
      doc.text(step.description, 55, stepY + 12, { maxWidth: 120 });
      
      // Priority badge
      if (step.priority === 'high') {
        doc.setFillColor(...this.simbotColors.danger);
        doc.roundedRect(175, stepY - 2, 20, 10, 5, 5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...this.simbotColors.white);
        doc.text('URGENT', 178, stepY + 4);
      }
    });
    
    // Contact SimBot
    this.addContactSection(doc, 220);
  }

  private addContactSection(doc: jsPDF, y: number): void {
    doc.setFillColor(...this.simbotColors.secondary);
    doc.roundedRect(20, y, 170, 40, 10, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...this.simbotColors.white);
    doc.text('🤖 Besoin d\'aide ? SimBot Gab est là !', 30, y + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Continuez votre analyse sur simbot-gab.com', 30, y + 25);
    doc.text('Support IA 24/7 | Conseils personnalisés | Suivi en temps réel', 30, y + 35);
  }

  // Méthodes utilitaires
  private calculateOverallScore(data: EnhancedSimulationData): number {
    let score = 0;
    
    // Éligibilité (40%)
    score += data.eligible ? 40 : 0;
    
    // Ratio d'endettement (30%)
    if (data.debt_ratio <= 25) score += 30;
    else if (data.debt_ratio <= 33) score += 20;
    else if (data.debt_ratio <= 40) score += 10;
    
    // Rapport mensualité/revenus (20%)
    const paymentRatio = (data.monthly_payment / (data.monthly_income || 1000000)) * 100;
    if (paymentRatio <= 15) score += 20;
    else if (paymentRatio <= 25) score += 15;
    else if (paymentRatio <= 35) score += 10;
    
    // Taux appliqué (10%)
    if (data.applied_rate <= 12) score += 10;
    else if (data.applied_rate <= 15) score += 8;
    else if (data.applied_rate <= 18) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private getScoreColor(score: number): [number, number, number] {
    if (score >= 80) return this.simbotColors.success;
    if (score >= 60) return this.simbotColors.secondary;
    if (score >= 40) return this.simbotColors.warning;
    return this.simbotColors.danger;
  }

  private getRatioColor(ratio: number): [number, number, number] {
    if (ratio <= 25) return this.simbotColors.success;
    if (ratio <= 33) return this.simbotColors.secondary;
    if (ratio <= 40) return this.simbotColors.warning;
    return this.simbotColors.danger;
  }

  private generatePersonalizedSteps(data: EnhancedSimulationData) {
    if (data.eligible) {
      return [
        {
          title: 'Préparer le dossier',
          description: 'Rassembler tous les documents requis selon la checklist IA',
          priority: 'high',
          color: this.simbotColors.danger
        },
        {
          title: 'Optimiser les conditions',
          description: 'Négocier avec SimBot Gab comme assistant',
          priority: 'medium',
          color: this.simbotColors.primary
        },
        {
          title: 'Finaliser avec la banque',
          description: 'Rendez-vous avec votre conseiller dans les 48h',
          priority: 'high',
          color: this.simbotColors.success
        }
      ];
    } else {
      return [
        {
          title: 'Améliorer le profil',
          description: 'Optimisations suggérées par l\'IA pour l\'éligibilité',
          priority: 'high',
          color: this.simbotColors.warning
        },
        {
          title: 'Constituer un apport',
          description: 'Augmenter vos chances avec un apport personnel',
          priority: 'medium',
          color: this.simbotColors.secondary
        },
        {
          title: 'Nouvelle simulation',
          description: 'Refaire une analyse dans 3-6 mois avec SimBot',
          priority: 'low',
          color: this.simbotColors.primary
        }
      ];
    }
  }

  // Méthodes utilitaires existantes adaptées
  private addModernSectionTitle(doc: jsPDF, title: string, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...this.simbotColors.primary);
    doc.text(title, 20, y);
    
    // Ligne décorative
    doc.setDrawColor(...this.simbotColors.secondary);
    doc.setLineWidth(3);
    doc.line(20, y + 3, 20 + doc.getTextWidth(title), y + 3);
  }

  private centerText(doc: jsPDF, text: string, y: number, startX?: number, endX?: number): void {
    const pageWidth = endX && startX ? endX - startX : doc.internal.pageSize.width;
    const textWidth = doc.getTextWidth(text);
    const x = startX ? startX + (pageWidth - textWidth) / 2 : (doc.internal.pageSize.width - textWidth) / 2;
    doc.text(text, x, y);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private addSimbotFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      
      // Ligne de séparation
      doc.setDrawColor(...this.simbotColors.light);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
      
      // Arrière-plan du footer
      doc.setFillColor(...this.simbotColors.light);
      doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');
      
      // Informations du footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...this.simbotColors.medium);
      doc.text('SimBot Gab - Assistant IA Financier | Analyse confidentielle', 20, pageHeight - 12);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, pageHeight - 7);
      
      // Logo mini SimBot
      doc.setFillColor(...this.simbotColors.secondary);
      doc.circle(pageWidth - 25, pageHeight - 12, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...this.simbotColors.white);
      doc.text('SB', pageWidth - 27, pageHeight - 10);
      
      // Numérotation des pages
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...this.simbotColors.primary);
      doc.text(`${i}`, pageWidth - 45, pageHeight - 9);
      
      doc.setTextColor(...this.simbotColors.medium);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`/ ${pageCount}`, pageWidth - 40, pageHeight - 9);
    }
  }

  private addPaginatedAmortizationTable(doc: jsPDF, schedule: any[], startY: number): void {
    if (!schedule || schedule.length === 0) return;

    const tableData = schedule.map((entry, index) => [
      entry.month.toString(),
      this.formatCurrencyCompact(entry.payment),
      this.formatCurrencyCompact(entry.principal),
      this.formatCurrencyCompact(entry.interest),
      this.formatCurrencyCompact(entry.remaining_balance)
    ]);

    autoTable(doc, {
      startY: startY,
      head: [['Mois', 'Mensualité', 'Capital', 'Intérêts', 'Solde Restant']],
      body: tableData,
      
      theme: 'grid',
      styles: { 
        fontSize: 8,
        cellPadding: 4,
        font: 'helvetica',
        textColor: this.simbotColors.dark,
        lineWidth: 0.1,
        lineColor: this.simbotColors.medium
      },
      
      headStyles: { 
        fillColor: this.simbotColors.primary,
        textColor: this.simbotColors.white,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      
      columnStyles: {
        0: { halign: 'center', cellWidth: 20, fillColor: [248, 250, 252] },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
      },
      
      alternateRowStyles: { 
        fillColor: [249, 250, 251]
      },
      
      didParseCell: (data: any) => {
        // Mise en évidence des fins d'année
        if (data.row.index > 0 && (data.row.index + 1) % 12 === 0) {
          data.cell.styles.fillColor = this.simbotColors.light;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = this.simbotColors.primary;
        }
        
        // Dernière ligne en vert
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.textColor = this.simbotColors.success;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
  }

  private addMarketAnalysis(doc: jsPDF, data: EnhancedSimulationData): void {
    this.addModernSectionTitle(doc, 'ANALYSE COMPARATIVE MARCHÉ', 25);
    
    // Position sur le marché gabonais
    this.addMarketPositionCard(doc, data, 45);
    
    // Analyse des taux du marché
    this.addMarketRatesAnalysis(doc, data, 110);
    
    // Recommandations d'optimisation
    this.addOptimizationRecommendations(doc, data, 175);
  }

  private addMarketPositionCard(doc: jsPDF, data: EnhancedSimulationData, y: number): void {
    // Card principale
    doc.setFillColor(...this.simbotColors.white);
    doc.roundedRect(20, y, 170, 55, 10, 10, 'F');
    doc.setDrawColor(...this.simbotColors.primary);
    doc.setLineWidth(2);
    doc.roundedRect(20, y, 170, 55, 10, 10, 'D');
    
    // En-tête
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...this.simbotColors.primary);
    doc.text('📊 Position sur le Marché Gabonais', 30, y + 15);
    
    // Analyse comparative
    const marketData = this.getMarketComparison(data);
    
    // Gauge de position
    this.drawMarketGauge(doc, marketData.percentile, 140, y + 35);
    
    // Détails textuels
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...this.simbotColors.dark);
    doc.text(`Votre offre se situe dans le ${marketData.position} des offres du marché`, 30, y + 30);
    doc.text(`Taux moyen du marché: ${marketData.averageRate}%`, 30, y + 40);
    doc.text(`Votre avantage: ${marketData.advantage}`, 30, y + 50);
  }

  private drawMarketGauge(doc: jsPDF, percentile: number, x: number, y: number): void {
    const radius = 15;
    
    // Cercle de base
    doc.setFillColor(...this.simbotColors.light);
    doc.circle(x, y, radius, 'F');
    
    // Arc de progression
    const angle = (percentile / 100) * 180; // Demi-cercle
    doc.setDrawColor(...this.getPercentileColor(percentile));
    doc.setLineWidth(4);
    // Note: jsPDF ne supporte pas nativement les arcs, simulation avec lignes
    
    // Texte central
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...this.simbotColors.primary);
    this.centerText(doc, `${percentile}%`, y + 3, x - 15, x + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...this.simbotColors.medium);
    this.centerText(doc, 'PERCENTILE', y + 10, x - 15, x + 15);
  }

  private addMarketRatesAnalysis(doc: jsPDF, data: EnhancedSimulationData, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...this.simbotColors.primary);
    doc.text('📈 Analyse des Taux - Marché Gabonais', 20, y);
    
    // Tableau comparatif des taux
    const ratesData = [
      ['Banque', 'Taux Min', 'Taux Max', 'Taux Moyen', 'Votre Taux'],
      ['BGFI Bank', '12.5%', '18.0%', '15.2%', data.bank_name === 'BGFI Bank' ? `${data.applied_rate}%` : '-'],
      ['UGB', '13.0%', '17.5%', '15.8%', data.bank_name === 'UGB' ? `${data.applied_rate}%` : '-'],
      ['BICIG', '12.0%', '19.0%', '14.9%', data.bank_name === 'BICIG' ? `${data.applied_rate}%` : '-'],
      ['Ecobank', '13.5%', '18.5%', '16.1%', data.bank_name === 'Ecobank' ? `${data.applied_rate}%` : '-'],
      ['CBAO', '12.8%', '17.2%', '15.0%', data.bank_name === 'CBAO Gabon' ? `${data.applied_rate}%` : '-']
    ];

    autoTable(doc, {
      startY: y + 10,
      head: [ratesData[0]],
      body: ratesData.slice(1),
      
      theme: 'striped',
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      
      headStyles: { 
        fillColor: this.simbotColors.secondary,
        textColor: this.simbotColors.white
      },
      
      didParseCell: (data: any) => {
        // Mettre en évidence la ligne de la banque du client
        if (data.cell.text[0] && data.cell.text[0].includes(data.applied_rate)) {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
  }

  private addOptimizationRecommendations(doc: jsPDF, data: EnhancedSimulationData, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...this.simbotColors.primary);
    doc.text('🎯 Recommandations d\'Optimisation SimBot', 20, y);
    
    const recommendations = this.generateOptimizationRecommendations(data);
    
    recommendations.forEach((rec, index) => {
      const recY = y + 15 + (index * 25);
      
      // Icône de priorité
      doc.setFillColor(...rec.priorityColor);
      doc.circle(25, recY + 5, 6, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...this.simbotColors.white);
      doc.text(rec.priority, 22, recY + 7);
      
      // Contenu de la recommandation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...this.simbotColors.dark);
      doc.text(rec.title, 40, recY + 3);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...this.simbotColors.medium);
      doc.text(rec.description, 40, recY + 12, { maxWidth: 140 });
      
      // Impact estimé
      if (rec.impact) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...this.simbotColors.success);
        doc.text(`💰 ${rec.impact}`, 40, recY + 20);
      }
    });
  }

  private addAIRecommendation(doc: jsPDF, data: EnhancedSimulationData, y: number): void {
    // Card de recommandation IA
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, y, 180, 50, 10, 10, 'F');
    doc.setDrawColor(...this.simbotColors.secondary);
    doc.setLineWidth(2);
    doc.roundedRect(15, y, 180, 50, 10, 10, 'D');
    
    // En-tête avec icône IA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...this.simbotColors.primary);
    doc.text('🤖 Recommandation SimBot IA', 25, y + 15);
    
    // Recommandation personnalisée
    const aiRecommendation = this.generateAIRecommendation(data);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...this.simbotColors.dark);
    doc.text(aiRecommendation.text, 25, y + 28, { maxWidth: 160 });
    
    // Score de confiance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...this.simbotColors.secondary);
    doc.text(`Confiance IA: ${aiRecommendation.confidence}%`, 25, y + 42);
  }

  private addEnhancedKPISection(doc: jsPDF, data: EnhancedSimulationData, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...this.simbotColors.secondary);
    doc.text('📊 Indicateurs Clés de Performance', 20, y);
    
    // KPI avec visualisations modernes
    const kpis = [
      {
        label: 'Ratio d\'Endettement',
        value: data.debt_ratio,
        unit: '%',
        target: 33,
        status: data.debt_ratio <= 25 ? 'excellent' : data.debt_ratio <= 33 ? 'bon' : 'attention'
      },
      {
        label: 'Coût du Crédit',
        value: (data.total_interest / data.requested_amount) * 100,
        unit: '%',
        target: 20,
        status: 'info'
      },
      {
        label: 'Impact Revenus',
        value: (data.monthly_payment / (data.monthly_income || 1000000)) * 100,
        unit: '%',
        target: 30,
        status: 'info'
      }
    ];

    kpis.forEach((kpi, index) => {
      const kpiX = 25 + (index * 60);
      const kpiY = y + 20;
      
      this.addModernKPICard(doc, kpi, kpiX, kpiY);
    });
  }

  private addModernKPICard(doc: jsPDF, kpi: any, x: number, y: number): void {
    // Card du KPI
    doc.setFillColor(...this.simbotColors.white);
    doc.roundedRect(x, y, 50, 40, 8, 8, 'F');
    doc.setDrawColor(...this.simbotColors.light);
    doc.roundedRect(x, y, 50, 40, 8, 8, 'D');
    
    // Indicateur circulaire
    const progress = Math.min(kpi.value / kpi.target, 1);
    const centerX = x + 25;
    const centerY = y + 15;
    
    // Cercle de fond
    doc.setDrawColor(...this.simbotColors.light);
    doc.setLineWidth(3);
    doc.circle(centerX, centerY, 8, 'D');
    
    // Arc de progression (simulation)
    const color = this.getKPIColor(kpi.status);
    doc.setDrawColor(...color);
    doc.setLineWidth(3);
    // Simulation d'arc avec lignes courtes
    for (let angle = 0; angle < progress * 360; angle += 10) {
      const radian = (angle * Math.PI) / 180;
      const x1 = centerX + 8 * Math.cos(radian);
      const y1 = centerY + 8 * Math.sin(radian);
      const x2 = centerX + 6 * Math.cos(radian);
      const y2 = centerY + 6 * Math.sin(radian);
      doc.line(x1, y1, x2, y2);
    }
    
    // Valeur centrale
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...color);
    this.centerText(doc, `${kpi.value.toFixed(1)}`, centerY + 1, centerX - 10, centerX + 10);
    
    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...this.simbotColors.dark);
    this.centerText(doc, kpi.label, y + 35, x, x + 50);
  }

  // Méthodes utilitaires supplémentaires

  private getMarketComparison(data: EnhancedSimulationData) {
    // Simulation de données de marché
    const averageRate = 15.5;
    const percentile = data.applied_rate < averageRate ? 75 : 45;
    
    return {
      percentile,
      averageRate,
      position: percentile > 70 ? 'top 30%' : percentile > 50 ? 'milieu' : 'bottom 50%',
      advantage: data.applied_rate < averageRate ? 
        `Économie de ${(averageRate - data.applied_rate).toFixed(1)}% vs marché` :
        `Surcoût de ${(data.applied_rate - averageRate).toFixed(1)}% vs marché`
    };
  }

  private getPercentileColor(percentile: number): [number, number, number] {
    if (percentile >= 75) return this.simbotColors.success;
    if (percentile >= 50) return this.simbotColors.secondary;
    if (percentile >= 25) return this.simbotColors.warning;
    return this.simbotColors.danger;
  }

  private getKPIColor(status: string): [number, number, number] {
    switch (status) {
      case 'excellent': return this.simbotColors.success;
      case 'bon': return this.simbotColors.secondary;
      case 'attention': return this.simbotColors.warning;
      default: return this.simbotColors.primary;
    }
  }

  private generateOptimizationRecommendations(data: EnhancedSimulationData) {
    const recommendations = [];
    
    if (data.debt_ratio > 30) {
      recommendations.push({
        priority: '1',
        priorityColor: this.simbotColors.danger,
        title: 'Réduire l\'endettement',
        description: 'Votre ratio dépasse 30%. Remboursez partiellement vos dettes actuelles avant cette demande.',
        impact: `Économie potentielle: ${this.formatCurrency(data.monthly_payment * 0.15 * data.duration_months)}`
      });
    }
    
    if (data.applied_rate > 15) {
      recommendations.push({
        priority: '2',
        priorityColor: this.simbotColors.warning,
        title: 'Négocier le taux',
        description: 'Votre taux est supérieur à la moyenne. Utilisez SimBot pour préparer votre négociation.',
        impact: `Économie possible: ${this.formatCurrency((data.applied_rate - 14) * data.requested_amount / 100)}`
      });
    }
    
    recommendations.push({
      priority: '3',
      priorityColor: this.simbotColors.secondary,
      title: 'Constituer un apport',
      description: 'Un apport de 20% réduirait significativement vos intérêts et améliorerait votre dossier.',
      impact: `Économie estimée: ${this.formatCurrency(data.total_interest * 0.25)}`
    });
    
    return recommendations.slice(0, 3); // Limiter à 3 recommandations
  }

  private generateAIRecommendation(data: EnhancedSimulationData) {
    if (data.eligible && data.debt_ratio <= 30) {
      return {
        text: 'Excellent profil ! Votre dossier présente tous les indicateurs favorables. Je recommande de procéder rapidement car les taux du marché montrent une tendance à la hausse. Votre simulation place cette offre dans le top 25% du marché gabonais.',
        confidence: 92
      };
    } else if (data.eligible) {
      return {
        text: 'Dossier éligible avec optimisations possibles. Je suggère de négocier une réduction de taux en mettant en avant votre stabilité financière. Un apport de 15% pourrait améliorer significativement les conditions.',
        confidence: 78
      };
    } else {
      return {
        text: 'Dossier nécessitant des ajustements. Mes algorithmes suggèrent de réduire le montant de 20% ou d\'augmenter la durée. Alternative: constituer un apport de 25% pour débloquer l\'éligibilité.',
        confidence: 85
      };
    }
  }

  private formatCurrencyCompact(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return `${amount.toFixed(0)}`;
  }
}