// pdf.service.ts - Version finale sans erreurs TypeScript
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
    primary: [30, 64, 175],
    secondary: [59, 130, 246],
    accent: [16, 185, 129],
    success: [34, 197, 94],
    warning: [251, 191, 36],
    danger: [239, 68, 68],
    dark: [31, 41, 55],
    medium: [107, 114, 128],
    light: [243, 244, 246],
    white: [255, 255, 255]
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
   * Génère un PDF premium du tableau d'amortissement
   */
  generateAmortizationPDF(
    simulationData: SimulationData, 
    amortizationSchedule: AmortizationEntry[]
  ): void {
    const doc = new jsPDF();
    this.setupPDFDocument(doc);

    this.addPremiumCoverPage(doc, simulationData);
    
    doc.addPage();
    this.addExecutiveSummary(doc, simulationData);
    
    doc.addPage();
    this.addPremiumAmortizationTable(doc, amortizationSchedule, simulationData);
    
    doc.addPage();
    this.addPremiumAnalysis(doc, simulationData, amortizationSchedule);
    
    doc.addPage();
    this.addPremiumRecommendations(doc, simulationData);

    this.addPremiumFooter(doc);

    const filename = `Amortissement-Premium-${simulationData.bank_name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  /**
   * Configuration du document
   */
  private setupPDFDocument(doc: jsPDF): void {
    doc.setProperties({
      title: 'Tableau d\'Amortissement Premium - Bamboo Financial',
      subject: 'Simulation de crédit détaillée',
      author: 'Bamboo Financial Services',
      creator: 'Bamboo Credit Comparator',
      keywords: 'crédit, amortissement, simulation, financement'
    });
  }

  /**
   * Page de couverture premium
   */
  private addPremiumCoverPage(doc: jsPDF, simulationData: SimulationData): void {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    this.addGradientBackground(doc, pageWidth, pageHeight);
    this.addBrandHeader(doc, pageWidth);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    this.setTextColorSafe(doc, 'white');
    this.centerText(doc, 'TABLEAU D\'AMORTISSEMENT', 80);

    doc.setFontSize(20);
    this.setTextColorSafe(doc, 'light');
    this.centerText(doc, 'Simulation de Crédit Détaillée', 95);

    this.addMainInfoCard(doc, simulationData, pageWidth, pageHeight);
    this.addEligibilityBadge(doc, simulationData, pageWidth);
    this.addDocumentInfo(doc, pageWidth, pageHeight);
  }

  private addPremiumAmortizationTable(doc: jsPDF, schedule: AmortizationEntry[], data: SimulationData, startY: number = 30): void {
  this.addSectionTitle(doc, 'ÉCHÉANCIER D\'AMORTISSEMENT', startY);

  const tableData = schedule.map((entry, index) => [
    entry.month.toString(),
    this.formatCurrencyCompact(entry.payment),
    this.formatCurrencyCompact(entry.principal),
    this.formatCurrencyCompact(entry.interest),
    this.formatCurrencyCompact(entry.remaining_balance)
  ]);

  // UTILISEZ autoTable comme fonction importée :
  autoTable(doc, {
    startY: startY + 15,
    head: [['Mois', 'Mensualité', 'Capital', 'Intérêts', 'Solde Restant']],
    body: tableData,
    
    theme: 'plain',
    styles: { 
      fontSize: 8,
      cellPadding: 4,
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
      0: { halign: 'center', cellWidth: 15, fillColor: [248, 250, 252] },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
    },
    
    alternateRowStyles: { 
      fillColor: [249, 250, 251]
    },
    
    didParseCell: (data: any) => {
      if (data.row.index > 0 && (data.row.index + 1) % 12 === 0) {
        data.cell.styles.fillColor = [239, 246, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });
}


  private addGradientBackground(doc: jsPDF, width: number, height: number): void {
    this.setFillColorSafe(doc, 'primary');
    doc.rect(0, 0, width, height, 'F');

    doc.setFillColor(59, 130, 246, 0.1);
    doc.circle(width * 0.8, 30, 60, 'F');
    doc.circle(width * 0.2, height * 0.7, 40, 'F');
    
    doc.setFillColor(16, 185, 129, 0.08);
    doc.triangle(0, height, 80, height, 40, height - 60, 'F');
    doc.triangle(width, 0, width - 60, 0, width - 30, 40, 'F');
  }

  private addBrandHeader(doc: jsPDF, width: number): void {
    doc.setFillColor(255, 255, 255, 0.95);
    doc.roundedRect(width/2 - 80, 25, 160, 35, 8, 8, 'F');

    this.setFillColorSafe(doc, 'accent');
    doc.circle(width/2 - 50, 42, 12, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'white');
    doc.text('B', width/2 - 54, 47);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    this.setTextColorSafe(doc, 'primary');
    doc.text('BAMBOO', width/2 - 25, 40);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    this.setTextColorSafe(doc, 'medium');
    doc.text('FINANCIAL SERVICES', width/2 - 25, 48);
  }

  private addMainInfoCard(doc: jsPDF, data: SimulationData, width: number, height: number): void {
    const cardY = height/2 - 40;
    
    this.setFillColorSafe(doc, 'white');
    doc.roundedRect(30, cardY, width - 60, 80, 12, 12, 'F');
    
    doc.setFillColor(0, 0, 0, 0.1);
    doc.roundedRect(32, cardY + 2, width - 60, 80, 12, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'dark');
    doc.text(data.bank_name, 50, cardY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, 'medium');
    doc.text(data.product_name, 50, cardY + 32);

    const metrics = [
      { label: 'Montant', value: this.formatCurrency(data.requested_amount), color: 'primary' as const },
      { label: 'Durée', value: `${data.duration_months} mois`, color: 'secondary' as const },
      { label: 'Taux', value: `${data.applied_rate}%`, color: 'accent' as const },
      { label: 'Mensualité', value: this.formatCurrency(data.monthly_payment), color: 'success' as const }
    ];

    const startX = 50;
    const startY = cardY + 50;
    const colWidth = (width - 100) / 4;

    metrics.forEach((metric, index) => {
      const x = startX + (index * colWidth);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      this.setTextColorSafe(doc, 'medium');
      doc.text(metric.label, x, startY);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      this.setTextColorSafe(doc, metric.color);
      doc.text(metric.value, x, startY + 10);
    });
  }

  private addEligibilityBadge(doc: jsPDF, data: SimulationData, width: number): void {
    const badgeY = 180;
    const badgeColor = data.eligible ? 'success' : 'danger';
    const badgeText = data.eligible ? 'ÉLIGIBLE' : 'NON ÉLIGIBLE';
    const badgeIcon = data.eligible ? '✓' : '✗';

    this.setFillColorSafe(doc, badgeColor);
    doc.roundedRect(width/2 - 40, badgeY, 80, 25, 8, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    this.setTextColorSafe(doc, 'white');
    doc.text(badgeIcon, width/2 - 25, badgeY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(badgeText, width/2 - 15, badgeY + 16);
  }

  private addDocumentInfo(doc: jsPDF, width: number, height: number): void {
    const infoY = height - 40;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    this.setTextColorSafe(doc, 'light');
    
    this.centerText(doc, `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, infoY);
    this.centerText(doc, `Référence: SIM-${Date.now().toString().slice(-8)}`, infoY + 12);
    this.centerText(doc, 'Document confidentiel - Usage personnel uniquement', infoY + 24);
  }

  private addExecutiveSummary(doc: jsPDF, data: SimulationData): void {
    let yPos = 30;

    this.addSectionTitle(doc, 'RÉSUMÉ EXÉCUTIF', yPos);
    yPos += 25;

    this.addSummaryCard(doc, data, yPos);
    yPos += 80;

    this.addKPISection(doc, data, yPos);
  }

  private addSectionTitle(doc: jsPDF, title: string, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    this.setTextColorSafe(doc, 'primary');
    doc.text(title, 25, y);

    this.setDrawColorSafe(doc, 'accent');
    doc.setLineWidth(2);
    doc.line(25, y + 3, 25 + doc.getTextWidth(title), y + 3);
  }

  private addSummaryCard(doc: jsPDF, data: SimulationData, startY: number): void {
    const cardHeight = 70;
    
    this.setFillColorSafe(doc, 'light');
    doc.roundedRect(20, startY, 170, cardHeight, 6, 6, 'F');
    
    this.setFillColorSafe(doc, 'primary');
    doc.rect(20, startY, 4, cardHeight, 'F');

    const summaryData = [
      { label: 'Institution Financière', value: data.bank_name, icon: '🏦' },
      { label: 'Produit de Crédit', value: data.product_name, icon: '💳' },
      { label: 'Capital Emprunté', value: this.formatCurrency(data.requested_amount), icon: '💰' },
      { label: 'Échéance', value: `${data.duration_months} mensualités`, icon: '📅' },
      { label: 'Taux Appliqué', value: `${data.applied_rate}% annuel`, icon: '📈' },
      { label: 'Coût Total', value: this.formatCurrency(data.total_cost), icon: '🧮' }
    ];

    let x = 35;
    let y = startY + 15;

    summaryData.forEach((item, index) => {
      if (index === 3) {
        x = 35;
        y += 25;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(item.icon, x, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      this.setTextColorSafe(doc, 'medium');
      doc.text(item.label, x + 15, y - 2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      this.setTextColorSafe(doc, 'dark');
      doc.text(item.value, x + 15, y + 8);

      x += (index < 3) ? 55 : 55;
    });
  }

  private addKPISection(doc: jsPDF, data: SimulationData, startY: number): void {
    this.addSubSectionTitle(doc, 'Indicateurs Clés de Performance', startY);
    
    const kpis = [
      { 
        label: 'Ratio d\'Endettement', 
        value: data.debt_ratio, 
        unit: '%',
        status: data.debt_ratio <= 33 ? 'excellent' : data.debt_ratio <= 40 ? 'bon' : 'attention'
      },
      { 
        label: 'Intérêts/Capital', 
        value: (data.total_interest / data.requested_amount) * 100, 
        unit: '%',
        status: 'info'
      },
      { 
        label: 'Coût Mensuel', 
        value: (data.monthly_payment / (data.monthly_income || 1000000)) * 100, 
        unit: '% revenus',
        status: 'info'
      }
    ];

    let x = 25;
    const y = startY + 20;

    kpis.forEach((kpi, index) => {
      this.addKPIIndicator(doc, kpi, x + (index * 60), y);
    });
  }

  private addKPIIndicator(doc: jsPDF, kpi: any, x: number, y: number): void {
    const indicatorColorKey = kpi.status === 'excellent' ? 'success' :
                             kpi.status === 'bon' ? 'accent' :
                             kpi.status === 'attention' ? 'warning' : 'secondary';

    this.setFillColorSafe(doc, indicatorColorKey);
    doc.circle(x + 15, y + 10, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    this.setTextColorSafe(doc, 'white');
    const valueText = `${kpi.value.toFixed(1)}`;
    const textWidth = doc.getTextWidth(valueText);
    doc.text(valueText, x + 15 - textWidth/2, y + 12);

    doc.setFontSize(6);
    doc.text(kpi.unit, x + 15 - doc.getTextWidth(kpi.unit)/2, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    this.setTextColorSafe(doc, 'dark');
    doc.text(kpi.label, x, y + 30, { maxWidth: 40, align: 'center' });
  }

  private addSubSectionTitle(doc: jsPDF, title: string, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    this.setTextColorSafe(doc, 'secondary');
    doc.text(title, 25, y);
  }

  private addPremiumComparisonTable(doc: jsPDF, simulations: any[]): void {
  this.addSectionTitle(doc, 'TABLEAU COMPARATIF DÉTAILLÉ', 30);

  const tableData = simulations.map((sim, index) => [
    `#${index + 1}`,
    sim.product.bank.name,
    sim.product.name,
    `${sim.simulation.applied_rate}%`,
    this.formatCurrencyCompact(sim.simulation.monthly_payment),
    this.formatCurrencyCompact(sim.simulation.total_cost),
    sim.simulation.eligible ? 'OUI' : 'NON',
    `${sim.simulation.debt_ratio}%`,
    this.getProcessingTime(sim.product.processing_time_hours)
  ]);

  // UTILISEZ autoTable comme fonction :
  autoTable(doc, {
    startY: 45,
    head: [['Rang', 'Banque', 'Produit', 'Taux', 'Mensualité', 'Coût Total', 'Éligible', 'Endettement', 'Délai']],
    body: tableData,
    
    theme: 'plain',
    styles: { 
      fontSize: 8,
      cellPadding: 3,
      textColor: this.colors['dark'],
      lineWidth: 0.1
    },
    
    headStyles: { 
      fillColor: this.colors['primary'],
      textColor: this.colors['white'],
      fontSize: 8,
      fontStyle: 'bold'
    },
    
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 25, fontStyle: 'bold' },
      2: { cellWidth: 30, fontSize: 7 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 15 },
      7: { halign: 'center', cellWidth: 18 },
      8: { halign: 'center', cellWidth: 16 }
    },
    
    didParseCell: (data: any) => {
      if (data.column.index === 6) {
        if (data.cell.text[0] === 'OUI') {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.textColor = this.colors['success'];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = this.colors['danger'];
        }
      }
      
      if (data.row.index === 0 && data.column.index > 0) {
        data.cell.styles.fillColor = [239, 246, 255];
      }
    }
  });
}

  private addPremiumAnalysis(doc: jsPDF, data: SimulationData, schedule: AmortizationEntry[]): void {
    let yPos = 30;
    
    this.addSectionTitle(doc, 'ANALYSE FINANCIÈRE DÉTAILLÉE', yPos);
    yPos += 30;

    this.addCapitalInterestChart(doc, data, schedule, yPos);
    yPos += 80;

    this.addBalanceEvolutionChart(doc, schedule, yPos);
    yPos += 60;

    this.addComparativeAnalysis(doc, data, yPos);
  }

  private addCapitalInterestChart(doc: jsPDF, data: SimulationData, schedule: AmortizationEntry[], y: number): void {
    this.addSubSectionTitle(doc, 'Répartition Capital / Intérêts', y);

    const totalPrincipal = data.requested_amount;
    const totalInterest = data.total_interest;
    const total = totalPrincipal + totalInterest;
    
    const principalPercent = (totalPrincipal / total) * 100;
    const interestPercent = (totalInterest / total) * 100;

    const chartY = y + 15;
    const chartWidth = 140;
    const chartHeight = 20;

    this.setFillColorSafe(doc, 'light');
    doc.roundedRect(25, chartY, chartWidth, chartHeight, 4, 4, 'F');

    const principalWidth = (chartWidth * principalPercent) / 100;
    this.setFillColorSafe(doc, 'success');
    doc.roundedRect(25, chartY, principalWidth, chartHeight, 4, 4, 'F');

    this.setFillColorSafe(doc, 'warning');
    doc.rect(25 + principalWidth, chartY, chartWidth - principalWidth, chartHeight, 'F');
    
    const legendY = chartY + 35;
    
    this.setFillColorSafe(doc, 'success');
    doc.circle(30, legendY, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    this.setTextColorSafe(doc, 'dark');
    doc.text(`Capital: ${this.formatCurrency(totalPrincipal)} (${principalPercent.toFixed(1)}%)`, 38, legendY + 2);

    this.setFillColorSafe(doc, 'warning');
    doc.circle(130, legendY, 3, 'F');
    doc.text(`Intérêts: ${this.formatCurrency(totalInterest)} (${interestPercent.toFixed(1)}%)`, 138, legendY + 2);
  }

  private addBalanceEvolutionChart(doc: jsPDF, schedule: AmortizationEntry[], y: number): void {
    this.addSubSectionTitle(doc, 'Évolution du Capital Restant Dû', y);

    const chartY = y + 15;
    const chartWidth = 140;
    const chartHeight = 40;

    this.setDrawColorSafe(doc, 'medium');
    doc.setLineWidth(0.5);
    doc.line(25, chartY + chartHeight, 25 + chartWidth, chartY + chartHeight);
    doc.line(25, chartY, 25, chartY + chartHeight);

    this.setDrawColorSafe(doc, 'primary');
    doc.setLineWidth(1.5);
    
    const points: number[][] = [];
    schedule.forEach((entry, index) => {
      if (index % 6 === 0 || index === schedule.length - 1) {
        const x = 25 + (index / schedule.length) * chartWidth;
        const maxBalance = schedule[0].remaining_balance + schedule[0].principal;
        const y = chartY + chartHeight - (entry.remaining_balance / maxBalance) * chartHeight;
        points.push([x, y]);
      }
    });

    for (let i = 0; i < points.length - 1; i++) {
      doc.line(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
    }

    points.forEach(point => {
      this.setFillColorSafe(doc, 'accent');
      doc.circle(point[0], point[1], 1.5, 'F');
    });
  }

  private addComparativeAnalysis(doc: jsPDF, data: SimulationData, y: number): void {
    this.addSubSectionTitle(doc, 'Points Clés à Retenir', y);

    const insights = [
      `Votre mensualité représente ${((data.monthly_payment / (data.monthly_income || 1000000)) * 100).toFixed(1)}% de vos revenus`,
      `Le coût total du crédit s'élève à ${((data.total_interest / data.requested_amount) * 100).toFixed(1)}% du montant emprunté`,
      `Votre ratio d'endettement de ${data.debt_ratio}% ${data.debt_ratio <= 33 ? 'est excellent' : data.debt_ratio <= 40 ? 'reste acceptable' : 'nécessite une attention particulière'}`,
      data.eligible ? 'Votre profil répond parfaitement aux critères d\'acceptation' : 'Des améliorations de profil sont recommandées'
    ];

    insights.forEach((insight, index) => {
      const bulletY = y + 15 + (index * 12);
      
      this.setFillColorSafe(doc, 'accent');
      doc.circle(30, bulletY, 2, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      this.setTextColorSafe(doc, 'dark');
      doc.text(insight, 38, bulletY + 1, { maxWidth: 140 });
    });
  }

  private addPremiumRecommendations(doc: jsPDF, data: SimulationData): void {
    let yPos = 30;
    
    this.addSectionTitle(doc, 'RECOMMANDATIONS STRATÉGIQUES', yPos);
    yPos += 30;

    this.addActionPlan(doc, data, yPos);
    yPos += 80;

    this.addOptimizationSuggestions(doc, data, yPos);
    yPos += 60;

    this.addLegalNotices(doc, yPos);
  }

  private addActionPlan(doc: jsPDF, data: SimulationData, y: number): void {
    this.addSubSectionTitle(doc, 'Plan d\'Action Recommandé', y);

    const steps = data.eligible ? [
      { step: 1, action: 'Finaliser votre dossier', desc: 'Rassembler tous les documents requis', urgent: true },
      { step: 2, action: 'Prendre rendez-vous', desc: 'Contacter votre conseiller dans les 48h', urgent: true },
      { step: 3, action: 'Négocier les conditions', desc: 'Discuter des modalités de remboursement', urgent: false },
      { step: 4, action: 'Signer le contrat', desc: 'Finaliser votre financement', urgent: false }
    ] : [
      { step: 1, action: 'Améliorer votre profil', desc: 'Réduire vos charges mensuelles', urgent: true },
      { step: 2, action: 'Constituer un apport', desc: 'Augmenter votre mise de fonds', urgent: false },
      { step: 3, action: 'Consulter un expert', desc: 'Obtenir des conseils personnalisés', urgent: false },
      { step: 4, action: 'Nouvelle simulation', desc: 'Refaire une demande dans 3-6 mois', urgent: false }
    ];

    steps.forEach((item, index) => {
      const stepY = y + 15 + (index * 18);
      
      const stepColorKey = item.urgent ? 'danger' : 'primary';
      
      this.setFillColorSafe(doc, stepColorKey);
      doc.circle(30, stepY + 5, 8, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      this.setTextColorSafe(doc, 'white');
      doc.text(item.step.toString(), 27, stepY + 8);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      this.setTextColorSafe(doc, 'dark');
      doc.text(item.action, 45, stepY + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      this.setTextColorSafe(doc, 'medium');
      doc.text(item.desc, 45, stepY + 13);
      
      if (item.urgent) {
        this.setFillColorSafe(doc, 'warning');
        doc.roundedRect(150, stepY, 25, 8, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        this.setTextColorSafe(doc, 'white');
        doc.text('URGENT', 155, stepY + 5);
      }
    });
  }

  private addOptimizationSuggestions(doc: jsPDF, data: SimulationData, y: number): void {
    this.addSubSectionTitle(doc, 'Optimisations Suggérées', y);

    const suggestions = [
      {
        title: 'Réduction des Coûts',
        items: [
          `Un apport de ${this.formatCurrency(data.requested_amount * 0.2)} réduirait vos intérêts de ~${this.formatCurrency(data.total_interest * 0.15)}`,
          'Négociation du taux possible avec un excellent dossier'
        ],
        icon: '💰'
      },
      {
        title: 'Optimisation Fiscale',
        items: [
          'Possibilité de déduction d\'intérêts selon votre situation',
          'Étalement des remboursements pour optimiser votre fiscalité'
        ],
        icon: '📊'
      }
    ];

    let currentY = y + 15;

    suggestions.forEach(suggestion => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text(suggestion.icon, 25, currentY + 10);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      this.setTextColorSafe(doc, 'dark');
      doc.text(suggestion.title, 35, currentY + 8);
      
      currentY += 15;
      
      suggestion.items.forEach(item => {
        this.setFillColorSafe(doc, 'accent');
        doc.circle(30, currentY, 1, 'F');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        this.setTextColorSafe(doc, 'dark');
        doc.text(item, 35, currentY + 1, { maxWidth: 140 });
        currentY += 10;
      });
      
      currentY += 5;
    });
  }

  private addLegalNotices(doc: jsPDF, y: number): void {
    doc.setFillColor(254, 242, 242);
    this.setDrawColorSafe(doc, 'danger');
    doc.roundedRect(20, y, 170, 40, 6, 6, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'danger');
    doc.text('⚠', 30, y + 15);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('AVERTISSEMENTS LÉGAUX', 45, y + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    this.setTextColorSafe(doc, 'dark');
    
    const legalText = [
      'Cette simulation est indicative et ne constitue pas une offre de crédit définitive.',
      'L\'accord de financement reste soumis à l\'étude approfondie de votre dossier.',
      'Tout crédit vous engage et doit être remboursé. Vérifiez vos capacités avant de vous engager.',
      'Document valable 30 jours. Conditions susceptibles d\'évolution selon les marchés financiers.'
    ];
    
    legalText.forEach((text, index) => {
      doc.text(`• ${text}`, 45, y + 20 + (index * 5), { maxWidth: 135 });
    });
  }

  private addPremiumFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      
      this.setDrawColorSafe(doc, 'light');
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
      
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      this.setTextColorSafe(doc, 'medium');
      doc.text('Bamboo Financial Services | Confidentiel', 20, pageHeight - 12);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, pageHeight - 7);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      this.setTextColorSafe(doc, 'primary');
      
      this.setFillColorSafe(doc, 'primary');
      doc.circle(pageWidth - 25, pageHeight - 12, 6, 'F');
      this.setTextColorSafe(doc, 'white');
      doc.text(i.toString(), pageWidth - 27, pageHeight - 9);
      
      this.setTextColorSafe(doc, 'medium');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`sur ${pageCount}`, pageWidth - 45, pageHeight - 9);
      
      this.setFillColorSafe(doc, 'accent');
      doc.circle(pageWidth - 60, pageHeight - 12, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      this.setTextColorSafe(doc, 'white');
      doc.text('B', pageWidth - 62, pageHeight - 10);
    }
  }

  /**
   * Génère un PDF de comparaison premium
   */
  generateComparisonPDF(simulations: any[]): void {
    const doc = new jsPDF();
    this.setupPDFDocument(doc);

    this.addComparisonCoverPage(doc, simulations);
    
    doc.addPage();
    this.addPremiumComparisonTable(doc, simulations);
    
    doc.addPage();
    this.addDetailedComparison(doc, simulations);

    this.addPremiumFooter(doc);
    
    const filename = `Comparaison-Premium-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  private addComparisonCoverPage(doc: jsPDF, simulations: any[]): void {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    this.addGradientBackground(doc, pageWidth, pageHeight);
    this.addBrandHeader(doc, pageWidth);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    this.setTextColorSafe(doc, 'white');
    this.centerText(doc, 'COMPARAISON D\'OFFRES', 80);

    doc.setFontSize(16);
    this.setTextColorSafe(doc, 'light');
    this.centerText(doc, 'Analyse Multi-Banques Premium', 95);

    const eligibleCount = simulations.filter(s => s.simulation.eligible).length;
    const bestRate = Math.min(...simulations.map(s => s.simulation.applied_rate));
    const bestPayment = Math.min(...simulations.map(s => s.simulation.monthly_payment));

    const stats = [
      { label: 'Offres Analysées', value: simulations.length.toString() },
      { label: 'Offres Éligibles', value: eligibleCount.toString() },
      { label: 'Meilleur Taux', value: `${bestRate}%` },
      { label: 'Mensualité Min.', value: this.formatCurrencyCompact(bestPayment) }
    ];

    this.addStatsGrid(doc, stats, pageWidth, pageHeight / 2);
  }

  private addStatsGrid(doc: jsPDF, stats: any[], pageWidth: number, startY: number): void {
    const cardWidth = 35;
    const cardHeight = 30;
    const spacing = 5;
    const totalWidth = (cardWidth * 4) + (spacing * 3);
    const startX = (pageWidth - totalWidth) / 2;

    stats.forEach((stat, index) => {
      const x = startX + (index * (cardWidth + spacing));
      const y = startY;

      doc.setFillColor(255, 255, 255, 0.95);
      doc.roundedRect(x, y, cardWidth, cardHeight, 6, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      this.setTextColorSafe(doc, 'primary');
      this.centerText(doc, stat.value, y + 15, x, x + cardWidth);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      this.setTextColorSafe(doc, 'medium');
      this.centerText(doc, stat.label, y + 23, x, x + cardWidth);
    });
  }

  private addDetailedComparison(doc: jsPDF, simulations: any[]): void {
    let yPos = 30;
    
    this.addSectionTitle(doc, 'ANALYSE COMPARATIVE APPROFONDIE', yPos);
    yPos += 30;

    const bestSim = simulations.filter(s => s.simulation.eligible)[0];
    if (bestSim) {
      this.addRecommendationCard(doc, bestSim, yPos);
      yPos += 60;
    }

    this.addVariationAnalysis(doc, simulations, yPos);
  }

  private addRecommendationCard(doc: jsPDF, bestSim: any, y: number): void {
    this.setFillColorSafe(doc, 'success');
    doc.roundedRect(20, y, 170, 50, 8, 8, 'F');
    
    this.setFillColorSafe(doc, 'white');
    doc.roundedRect(30, y + 8, 35, 12, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    this.setTextColorSafe(doc, 'success');
    doc.text('RECOMMANDÉ', 35, y + 16);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    this.setTextColorSafe(doc, 'white');
    doc.text(bestSim.product.bank.name, 30, y + 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${this.formatCurrency(bestSim.simulation.monthly_payment)}/mois à ${bestSim.simulation.applied_rate}%`, 30, y + 40);
    
    const advantages = ['Meilleur rapport qualité/prix', 'Traitement rapide', 'Conditions avantageuses'];
    
    doc.setFontSize(8);
    advantages.forEach((adv, index) => {
      doc.text(`✓ ${adv}`, 130, y + 20 + (index * 8));
    });
  }

  private addVariationAnalysis(doc: jsPDF, simulations: any[], y: number): void {
    this.addSubSectionTitle(doc, 'Écarts et Opportunités', y);
    
    const eligible = simulations.filter(s => s.simulation.eligible);
    if (eligible.length < 2) return;
    
    const rates = eligible.map(s => s.simulation.applied_rate);
    const payments = eligible.map(s => s.simulation.monthly_payment);
    
    const rateSpread = Math.max(...rates) - Math.min(...rates);
    const paymentSpread = Math.max(...payments) - Math.min(...payments);
    
    const insights = [
      `Écart de taux: ${rateSpread.toFixed(2)} points entre la meilleure et la moins bonne offre`,
      `Écart de mensualité: ${this.formatCurrency(paymentSpread)} entre les offres éligibles`,
      `Économie potentielle: ${this.formatCurrency(paymentSpread * (simulations[0].simulation.duration_months || 24))} sur la durée totale`
    ];
    
    insights.forEach((insight, index) => {
      const insightY = y + 15 + (index * 10);
      this.setFillColorSafe(doc, 'accent');
      doc.circle(25, insightY, 2, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      this.setTextColorSafe(doc, 'dark');
      doc.text(insight, 35, insightY + 1);
    });
  }

  /**
   * PDF synthèse express
   */
  generateQuickSummaryPDF(simulationData: SimulationData): void {
    const doc = new jsPDF();
    this.setupPDFDocument(doc);

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    this.setFillColorSafe(doc, 'light');
    doc.rect(0, 0, pageWidth, 60, 'F');

    this.addBrandHeader(doc, pageWidth);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    this.setTextColorSafe(doc, 'primary');
    this.centerText(doc, 'SYNTHÈSE CRÉDIT', 85);

    this.addCompactInfoCard(doc, simulationData, 100);
    this.addContactSection(doc, pageHeight - 60);
    this.addPremiumFooter(doc);

    const filename = `Synthese-Express-${simulationData.bank_name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    doc.save(filename);
  }

  private addCompactInfoCard(doc: jsPDF, data: SimulationData, y: number): void {
    const cardHeight = 120;
    
    doc.setFillColor(0, 0, 0, 0.05);
    doc.roundedRect(22, y + 2, 166, cardHeight, 10, 10, 'F');
    this.setFillColorSafe(doc, 'white');
    doc.roundedRect(20, y, 166, cardHeight, 10, 10, 'F');
    this.setDrawColorSafe(doc, 'light');
    doc.roundedRect(20, y, 166, cardHeight, 10, 10, 'D');

    const sections = [
      {
        title: 'FINANCEMENT',
        items: [
          { label: 'Banque', value: data.bank_name },
          { label: 'Montant', value: this.formatCurrency(data.requested_amount) },
          { label: 'Durée', value: `${data.duration_months} mois` }
        ]
      },
      {
        title: 'CONDITIONS',
        items: [
          { label: 'Taux', value: `${data.applied_rate}%` },
          { label: 'Mensualité', value: this.formatCurrency(data.monthly_payment) },
          { label: 'Coût total', value: this.formatCurrency(data.total_cost) }
        ]
      }
    ];

    sections.forEach((section, sectionIndex) => {
      const sectionX = 35 + (sectionIndex * 80);
      const sectionY = y + 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      this.setTextColorSafe(doc, 'primary');
      doc.text(section.title, sectionX, sectionY);

      section.items.forEach((item, itemIndex) => {
        const itemY = sectionY + 15 + (itemIndex * 15);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        this.setTextColorSafe(doc, 'medium');
        doc.text(item.label, sectionX, itemY);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        this.setTextColorSafe(doc, 'dark');
        doc.text(item.value, sectionX, itemY + 7, { maxWidth: 70 });
      });
    });

    const statusY = y + cardHeight - 20;
    const statusColorKey = data.eligible ? 'success' : 'danger';
    const statusText = data.eligible ? 'DOSSIER ÉLIGIBLE' : 'DOSSIER NON ÉLIGIBLE';
    
    this.setFillColorSafe(doc, statusColorKey);
    doc.roundedRect(35, statusY, 116, 12, 6, 6, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    this.setTextColorSafe(doc, 'white');
    this.centerText(doc, statusText, statusY + 8, 35, 151);
  }

  private addContactSection(doc: jsPDF, y: number): void {
    this.setDrawColorSafe(doc, 'light');
    doc.line(20, y - 10, 190, y - 10);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    this.setTextColorSafe(doc, 'primary');
    doc.text('PROCHAINE ÉTAPE', 30, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    this.setTextColorSafe(doc, 'dark');
    doc.text('Contactez votre conseiller pour finaliser votre dossier', 30, y + 12);
    
    // QR code simulé
    this.setFillColorSafe(doc, 'primary');
    doc.rect(150, y - 5, 20, 20, 'F');
    this.setFillColorSafe(doc, 'white');
    doc.rect(152, y - 3, 16, 16, 'F');
    this.setFillColorSafe(doc, 'primary');
    doc.rect(154, y - 1, 4, 4, 'F');
    doc.rect(160, y - 1, 4, 4, 'F');
    doc.rect(154, y + 9, 4, 4, 'F');
    doc.rect(160, y + 9, 4, 4, 'F');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    this.setTextColorSafe(doc, 'medium');
    doc.text('Scannez pour', 150, y + 28);
    doc.text('plus d\'infos', 150, y + 32);
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
      return `${(amount / 1000000).toFixed(1)}M FCFA`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K FCFA`;
    }
    return `${amount.toFixed(0)} FCFA`;
  }

  private getProcessingTime(hours: number): string {
    if (hours < 24) return `${hours}h`;
    const days = Math.ceil(hours / 24);
    return days === 1 ? '1 jour' : `${days} jours`;
  }

  private centerText(doc: jsPDF, text: string, y: number, startX?: number, endX?: number): void {
    const pageWidth = endX && startX ? endX - startX : doc.internal.pageSize.width;
    const textWidth = doc.getTextWidth(text);
    const x = startX ? startX + (pageWidth - textWidth) / 2 : (doc.internal.pageSize.width - textWidth) / 2;
    doc.text(text, x, y);
  }
}