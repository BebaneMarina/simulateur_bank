// ========================================================================================
// SIMULATOR-HOME.COMPONENT.TS - Version avec carrousel PNG
// ========================================================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';

interface QuickSimulationResult {
  estimatedCapacity: number;
  monthlyPayment: number;
  totalInterest: number;
  effectiveRate: number;
  recommendations: string[];
}

interface DailyRates {
  consommation: number;
  auto: number;
  immobilier: number;
  travaux: number;
  professionnel: number;
}

interface StatisticsData {
  satisfiedClients: number;
  financedCredits: string;
  clientRating: number;
  averageResponse: string;
}

interface AdvantageItem {
  svgIcon: SafeHtml;
  title: string;
  description: string;
  color: string;
}

interface ServiceCard {
  id: string;
  title: string;
  description: string;
  svgIcon: SafeHtml;
  color: string;
  features: string[];
  route: string;
  category: 'simulator' | 'tool' | 'service';
}

@Component({
  selector: 'app-simulator-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="simulator-home-container">
      <!-- Hero Section -->
      <section class="hero">
        <!-- Carrousel d'images PNG -->
        <div class="hero-carousel">
          <div class="carousel-track">
            <div *ngFor="let image of carouselImages" 
                 class="carousel-slide"
                 [style.background-image]="'url(' + image + ')'">
            </div>
          </div>
        </div>

        <div class="container">
          <div class="hero-content">
            <h1>
              Votre <span class="highlight">simulateur préféré</span> au Gabon
            </h1>
            <p class="subtitle">
              Simulez, comparez et trouvez les meilleures solutions de crédit, d'épargne et d'assurance. 
              Une plateforme complète pour tous vos besoins financiers.
            </p>
            <div class="cta-buttons">
              <button (click)="scrollToServices()" class="btn-primary">
                Explorer nos services
              </button>
              <button (click)="navigateToRates()" class="btn-secondary">
                Voir les taux du jour
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Taux du jour -->
      <section class="rates-section">
        <div class="container">
          <div class="rates-content">
            <h3>
              <div class="section-icon" [innerHTML]="trendingIcon"></div>
              Taux du jour
            </h3>
            <div class="rates-list">
              <div *ngFor="let rate of dailyRatesList" class="rate-item">
                <div class="rate-label">{{ rate.label }}</div>
                <div class="rate-value">À partir de {{ formatPercent(rate.rate) }}</div>
              </div>
            </div>
            <button (click)="navigateToRates()" class="btn-rates-detail">
              Voir tous les taux
            </button>
          </div>
        </div>
      </section>

      <!-- Services Section -->
      <section id="services" class="services-section">
        <div class="container">
          <div class="section-header">
            <h2>Nos services</h2>
            <p>Une gamme complète d'outils financiers à votre disposition</p>
          </div>

          <!-- Service Categories -->
          <div class="service-categories">
            <button 
              *ngFor="let category of serviceCategories"
              (click)="setActiveCategory(category.id)"
              [class.active]="activeCategory === category.id"
              class="category-button">
              <div class="category-icon" [innerHTML]="category.svgIcon"></div>
              <span class="category-name">{{ category.name }}</span>
            </button>
          </div>

          <!-- Services Grid -->
          <div class="services-grid">
            <div *ngFor="let service of getFilteredServices()" 
                 class="service-card" 
                 [class]="service.category"
                 (click)="navigateToService(service.route)">
              
              <div class="card-header">
                <div class="icon-wrapper" [class]="service.color">
                  <div class="service-svg" [innerHTML]="service.svgIcon"></div>
                </div>
                <svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
              
              <h3>{{ service.title }}</h3>
              <p class="card-description">{{ service.description }}</p>
              
              <div class="features-list">
                <div *ngFor="let feature of service.features" class="feature-item">
                  <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>{{ feature }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <h3>Actions rapides</h3>
            <div class="actions-grid">
              <button (click)="navigateToService('/bank-locator')" class="action-card">
                <div class="action-icon" [innerHTML]="quickActionsIcons['locator']"></div>
                <span class="action-text">Trouver une banque</span>
              </button>
              
              <button (click)="navigateToService('/bank-rates')" class="action-card">
                <div class="action-icon" [innerHTML]="quickActionsIcons['rates']"></div>
                <span class="action-text">Comparer les taux</span>
              </button>
              
              <button (click)="navigateToService('/guides')" class="action-card">
                <div class="action-icon" [innerHTML]="quickActionsIcons['guides']"></div>
                <span class="action-text">Guides & Conseils</span>
              </button>
            </div>
          </div>
        </div>
      </section>

    <!-- Section Bamboo Assur -->
<section class="bamboo-assur-section">
  <div class="container">
    <div class="assur-header">
      <div class="assur-logo">
        <div class="logo-svg" [innerHTML]="bambooAssurLogo"></div>
        <h2>nos partenaires</h2>
      </div>
      <p class="assur-description">
        Nos partenaires vous accompagnent dans tous vos projets avec des solutions 
        adaptées aux réalités gabonaises.
      </p>
      
      <div class="assur-products">
        <div class="product-item">
          <div class="product-icon" [innerHTML]="assuranceProductsIcons['home']"></div>
          <span>Assurance</span>
        </div>
        <div class="product-item">
          <div class="product-icon" [innerHTML]="assuranceProductsIcons['life']"></div>
          <span>Crédit</span>
        </div>
        <div class="product-item">
          <div class="product-icon" [innerHTML]="assuranceProductsIcons['health']"></div>
          <span>Épargne</span>
        </div>
      </div>
      
      <button (click)="navigateToService('/bamboo-assur')" class="btn-assur">
        Découvrir nos partenaires
      </button>
    </div>
    
    <!-- Carrousel pleine largeur -->
    <div class="partners-carousel-full">
      <div class="partners-track">
        <div *ngFor="let logo of partnerLogos" class="partner-logo-slide">
          <img [src]="logo" alt="Logo partenaire" class="partner-logo-img">
        </div>
        <!-- Duplication pour effet infini -->
        <div *ngFor="let logo of partnerLogos" class="partner-logo-slide">
          <img [src]="logo" alt="Logo partenaire" class="partner-logo-img">
        </div>
      </div>
    </div>
  </div>
</section>

      <!-- Avantages -->
      <section class="advantages-section">
        <div class="container">
          <div class="section-header">
            <h2>Pourquoi choisir SimBot Gab ?</h2>
          </div>

          <div class="advantages-grid">
            <div *ngFor="let advantage of advantages" class="advantage-item">
              <div class="advantage-icon" [ngClass]="getColorClass(advantage.color)">
                <div class="advantage-svg" [innerHTML]="advantage.svgIcon"></div>
              </div>
              <h3>{{ advantage.title }}</h3>
              <p>{{ advantage.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <h2>Prêt à optimiser vos finances ?</h2>
          <p>Commencez dès aujourd'hui avec nos outils gratuits et trouvez les meilleures solutions</p>
          <div class="cta-buttons">
            <button (click)="navigateToService('/simulator-saving')" class="btn-white">
              Simuler votre épargne
            </button>
            <button (click)="navigateToService('/insurance-comparator')" class="btn-outline">
              Comparer les assurances
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrls: ['./simulator-home.component.scss']
})
export class SimulatorHomeComponent implements OnInit, OnDestroy {
  quickSimForm!: FormGroup;
  newsletterForm!: FormGroup;
  quickResult: QuickSimulationResult | null = null;
  isQuickCalculating = false;
  activeCategory = 'all';

  // Images du carrousel - IMPORTANT: Placez vos images PNG dans assets/carousel/
  carouselImages: string[] = [
    'assets/caroussel/finance-hero-1.png',
    'assets/caroussel/finance-hero-2.png',
    'assets/caroussel/finance-hero-3.png',
    'assets/caroussel/finance-hero-4.png',
    'assets/caroussel/finance-hero-5.png'
  ];

  // Logos des partenaires - ajoutez après carouselImages
partnerLogos: string[] = [
  'assets/partners/bgfi-bank.png',
  'assets/partners/uba-bank.png',
  'assets/partners/orabank.png',
  'assets/partners/ecobank.png',
  'assets/partners/bamboo-assur.png',
  'assets/partners/nsia-logo.png',
  'assets/partners/ogar-logo.png',
  'assets/partners/axa-logo.png'
];

  // Données de l'interface
  dailyRates: DailyRates = {
    consommation: 8.5,
    auto: 6.9,
    immobilier: 5.2,
    travaux: 7.1,
    professionnel: 9.2
  };

  statistics: StatisticsData = {
    satisfiedClients: 75000,
    financedCredits: '15M FCFA',
    clientRating: 4.8,
    averageResponse: '24h'
  };

  // ICÔNES SVG sécurisés
  trendingIcon: SafeHtml = '';
  shieldLargeIcon: SafeHtml = '';
  bambooAssurLogo: SafeHtml = '';

  serviceCategories: Array<{id: string, name: string, svgIcon: SafeHtml}> = [];
  services: ServiceCard[] = [];
  advantages: AdvantageItem[] = [];
  quickActionsIcons: {[key: string]: SafeHtml} = {};
  assuranceProductsIcons: {[key: string]: SafeHtml} = {};

  testimonials = [
    {
      content: 'Grâce à Bamboo, j\'ai trouvé le meilleur taux pour mon crédit immobilier. Le gain représente plus de 2 millions de FCFA !',
      name: 'Marie NGOUA',
      title: 'Architecte, Libreville',
      initials: 'MN',
      rating: 5
    },
    {
      content: 'L\'interface est très intuitive. J\'ai pu comparer toutes les assurances auto en moins de 10 minutes.',
      name: 'Jean-Claude MBOMA',
      title: 'Entrepreneur, Port-Gentil',
      initials: 'JM',
      rating: 5
    },
    {
      content: 'Le simulateur d\'épargne m\'a aidé à planifier ma retraite. Les projections sont très réalistes.',
      name: 'Sylvie EYENE',
      title: 'Fonctionnaire, Franceville',
      initials: 'SE',
      rating: 4
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService
  ) {
    this.initializeSafeIcons();
  }

  ngOnInit(): void {
    this.initializeForms();
    this.trackPageView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSafeIcons(): void {
    // Trending Icon
    this.trendingIcon = this.sanitizer.bypassSecurityTrustHtml(`
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 17L9 11L13 15L21 7" stroke="#1a4d3a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 7H21V14" stroke="#1a4d3a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `);

    // Shield Large Icon
    this.shieldLargeIcon = this.sanitizer.bypassSecurityTrustHtml(`
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10L80 25V55C80 75 50 90 50 90C50 90 20 75 20 55V25L50 10Z" fill="white" opacity="0.9"/>
        <path d="M50 10L80 25V55C80 75 50 90 50 90C50 90 20 75 20 55V25L50 10Z" stroke="white" stroke-width="3"/>
        <path d="M40 50L47 57L65 39" stroke="#1a4d3a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `);

    // Bamboo Assur Logo
    this.bambooAssurLogo = this.sanitizer.bypassSecurityTrustHtml(`
      <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="28" fill="#eab308" opacity="0.1"/>
        <path d="M30 8L50 18V38C50 48 30 58 30 58C30 58 10 48 10 38V18L30 8Z" fill="#eab308" opacity="0.3"/>
        <path d="M30 8L50 18V38C50 48 30 58 30 58C30 58 10 48 10 38V18L30 8Z" stroke="#eab308" stroke-width="2"/>
        <rect x="20" y="12" width="3" height="12" fill="#eab308"/>
        <rect x="25" y="10" width="3" height="14" fill="#eab308"/>
        <rect x="30" y="8" width="3" height="16" fill="#eab308"/>
        <rect x="35" y="10" width="3" height="14" fill="#eab308"/>
        <rect x="40" y="12" width="3" height="12" fill="#eab308"/>
        <text x="30" y="35" text-anchor="middle" fill="#eab308" font-size="10" font-weight="bold">B</text>
        <text x="30" y="45" text-anchor="middle" fill="#eab308" font-size="6" font-weight="bold">ASSUR</text>
      </svg>
    `);

    // Service Categories
    this.serviceCategories = [
      { 
        id: 'all', 
        name: 'Tous', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
            <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
          </svg>
        `)
      },
      { 
        id: 'simulator', 
        name: 'Simulateurs', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M8 12H16M8 16H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="2"/>
          </svg>
        `)
      },
      { 
        id: 'tool', 
        name: 'Outils', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2"/>
          </svg>
        `)
      },
      { 
        id: 'service', 
        name: 'Services', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/>
          </svg>
        `)
      }
    ];

    // Services
    this.services = [
      {
        id: 'comparator',
        title: 'Comparateur multi-banques',
        description: 'Comparez les offres de crédit de toutes les banques',
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
          </svg>
        `),
        color: 'orange',
        features: ['Comparaison instantanée', 'Offres personnalisées', 'Suivi'],
        route: '/multi-bank-comparator',
        category: 'tool'
      },
      {
        id: 'insurance',
        title: 'Comparateur d\'assurances',
        description: 'Trouvez la meilleure assurance pour vos besoins',
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        `),
        color: 'red',
        features: ['Tous types d\'assurance', 'Devis gratuits', 'Conseils experts'],
        route: '/insurance-comparator',
        category: 'tool'
      },
      {
        id: 'savings',
        title: 'Simulateur d\'épargne',
        description: 'Planifiez votre épargne et découvrez son potentiel',
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        `),
        color: 'purple',
        features: ['Projections', 'Diversification', 'Objectifs personnalisés'],
        route: '/savings-simulator',
        category: 'simulator'
      },
      {
        id: 'rates',
        title: 'Tarifs bancaires',
        description: 'Consultez les taux d\'intérêt de toutes les banques',
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        `),
        color: 'indigo',
        features: ['Taux en temps réel', 'Historique', 'Alertes personnalisées'],
        route: '/bank-rates',
        category: 'tool'
      },
      {
        id: 'locator',
        title: 'Localiser une banque',
        description: 'Trouvez l\'agence bancaire la plus proche',
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        `),
        color: 'teal',
        features: ['Géolocalisation', 'Horaires', 'Services disponibles'],
        route: '/bank-locator',
        category: 'service'
      },
    ];

    // Advantages
    this.advantages = [
      {
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        `),
        title: 'Sécurisé et confidentiel',
        description: 'Vos données sont protégées par un cryptage de niveau bancaire',
        color: 'blue'
      },
      {
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        `),
        title: 'Rapide et efficace',
        description: 'Obtenez vos résultats en quelques secondes seulement',
        color: 'green'
      },
      {
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        `),
        title: 'Personnalisé',
        description: 'Des recommandations adaptées à votre profil et vos objectifs',
        color: 'purple'
      },
      {
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        `),
        title: 'Accompagnement expert',
        description: 'Nos conseillers vous guident dans toutes vos démarches',
        color: 'orange'
      },
      {
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        `),
        title: 'Gratuit et sans engagement',
        description: 'Tous nos simulateurs sont entièrement gratuits',
        color: 'red'
      },
      {
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        `),
        title: 'Couverture nationale',
        description: 'Tous les établissements financiers du Gabon référencés',
        color: 'teal'
      }
    ];

    // Quick Actions Icons
    this.quickActionsIcons = {
      'locator': this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      `),
      'rates': this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      `),
      'guides': this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
      `)
    };

    // Assurance Products Icons
    this.assuranceProductsIcons = {
      'home': this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
      `),
      'life': this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
      `),
      'health': this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
      `)
    };
  }

  private initializeForms(): void {
    this.quickSimForm = this.fb.group({
      creditType: ['immobilier', Validators.required],
      amount: [10000000, [Validators.required, Validators.min(100000)]],
      duration: [240, [Validators.required, Validators.min(12), Validators.max(360)]],
      monthlyIncome: [750000, [Validators.required, Validators.min(200000)]],
      currentDebts: [0, [Validators.min(0)]]
    });

    this.newsletterForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // MÉTHODES DE NAVIGATION
  scrollToServices(): void {
    const element = document.getElementById('services');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  navigateToService(route: string): void {
    this.trackServiceNavigation(route);
    this.router.navigate([route]);
  }

  navigateToRates(): void {
    this.trackServiceNavigation('/bank-rates');
    this.router.navigate(['/bank-rates']);
  }

  // MÉTHODES DE FILTRAGE
  setActiveCategory(categoryId: string): void {
    this.activeCategory = categoryId;
  }

  getFilteredServices(): ServiceCard[] {
    if (this.activeCategory === 'all') {
      return this.services;
    }
    return this.services.filter(service => service.category === this.activeCategory);
  }

  // MÉTHODES UTILITAIRES
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  }

  getColorClass(color: string): string {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100',
      red: 'text-red-600 bg-red-100',
      teal: 'text-teal-600 bg-teal-100',
      indigo: 'text-indigo-600 bg-indigo-100',
      gold: 'text-yellow-600 bg-yellow-100'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  }

  // GETTERS POUR LE TEMPLATE
  get dailyRatesList(): Array<{key: string, label: string, rate: number, color: string}> {
    return [
      { key: 'immobilier', label: 'Crédit Immo', rate: this.dailyRates.immobilier, color: 'blue' },
      { key: 'consommation', label: 'Crédit Conso', rate: this.dailyRates.consommation, color: 'green' },
      { key: 'auto', label: 'Crédit Auto', rate: this.dailyRates.auto, color: 'purple' },
      { key: 'travaux', label: 'Crédit Travaux', rate: this.dailyRates.travaux, color: 'orange' }
    ];
  }

  // MÉTHODES D'ANALYSE ET TRACKING
  private trackPageView(): void {
    this.analyticsService.trackPageView('simulator_home', {
      page_title: 'Accueil - SimBot Gab Financial Services',
      available_services: this.services.length
    });
  }

  private trackServiceNavigation(route: string): void {
    this.analyticsService.trackEvent('service_navigation', {
      destination: route,
      source: 'home_page',
      category: this.activeCategory
    });
  }
}