import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';

interface BankBranch {
  id: string;
  bankId: string;
  bankName: string;
  branchName: string;
  address: string;
  city: string;
  district: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  email?: string;
  openingHours: OpeningHours;
  services: BankService[];
  hasAtm: boolean;
  hasParking: boolean;
  isAccessible: boolean;
  managerName?: string;
  specialties: string[];
  waitTime: number; // en minutes
  rating: number;
  photos: string[];
}

interface OpeningHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

interface BankService {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

interface City {
  name: string;
  districts: string[];
}

@Component({
  selector: 'bank-locator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="bank-locator-container">
      <div class="page-header">
        <div class="container">
          <h1>Localiser une Banque</h1>
          <p class="subtitle">Trouvez l'agence la plus proche de chez vous</p>
        </div>
      </div>

      <!-- Search Section -->
      <div class="search-section">
        <div class="container">
          <form [formGroup]="searchForm" class="search-form">
            <div class="search-row">
              <div class="form-group">
                <label for="city">Ville</label>
                <select formControlName="city" id="city" class="form-select">
                  <option value="">Sélectionner une ville</option>
                  <option *ngFor="let city of cities" [value]="city.name">
                    {{ city.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="district">Quartier</label>
                <select formControlName="district" id="district" class="form-select">
                  <option value="">Tous les quartiers</option>
                  <option *ngFor="let district of availableDistricts" [value]="district">
                    {{ district }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="bank">Banque</label>
                <select formControlName="selectedBank" id="bank" class="form-select">
                  <option value="">Toutes les banques</option>
                  <option *ngFor="let bank of availableBanks" [value]="bank.id">
                    {{ bank.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="service">Service recherché</label>
                <select formControlName="serviceType" id="service" class="form-select">
                  <option value="">Tous les services</option>
                  <option value="credit">Crédit</option>
                  <option value="compte">Ouverture de compte</option>
                  <option value="epargne">Épargne/Placement</option>
                  <option value="change">Change</option>
                  <option value="transfer">Transfert d'argent</option>
                </select>
              </div>
            </div>

            <div class="search-actions">
              <button type="button" (click)="getCurrentLocation()" class="btn-location">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Me localiser
              </button>
              <button type="button" (click)="searchBranches()" class="btn-primary">
                Rechercher
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Results Section -->
      <div class="results-section">
        <div class="container">
          <div class="results-layout">
            <!-- Map Area -->
            <div class="map-container">
              <div class="map-header">
                <h3>Carte des agences</h3>
                <div class="map-controls">
                  <button (click)="toggleMapView()" class="btn-map-toggle">
                    {{ showList ? 'Vue carte' : 'Vue liste' }}
                  </button>
                </div>
              </div>
              
              <div class="map-placeholder" [hidden]="showList">
                <!-- Ici intégrer Google Maps ou Leaflet -->
                <div class="map-content">
                  <p>Carte interactive des agences bancaires</p>
                  <div class="map-legend">
                    <div *ngFor="let bank of availableBanks" class="legend-item">
                      <div class="legend-color" [style.background-color]="bank.color"></div>
                      <span>{{ bank.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Results List -->
            <div class="branches-list" [class.full-width]="showList">
              <div class="list-header">
                <h3>{{ filteredBranches.length }} agence(s) trouvée(s)</h3>
                <div class="sort-controls">
                  <select (change)="sortBranches($event)" class="sort-select">
                    <option value="distance">Par distance</option>
                    <option value="rating">Par note</option>
                    <option value="name">Par nom</option>
                    <option value="waitTime">Par temps d'attente</option>
                  </select>
                </div>
              </div>

              <div class="branches-grid">
                <div *ngFor="let branch of filteredBranches" class="branch-card">
                  <div class="branch-header">
                    <div class="bank-info">
                      <div class="bank-logo">
                        <img [src]="getBankLogo(branch.bankId)" [alt]="branch.bankName" />
                      </div>
                      <div class="branch-details">
                        <h4>{{ branch.branchName }}</h4>
                        <p class="bank-name">{{ branch.bankName }}</p>
                      </div>
                    </div>
                    <div class="branch-rating">
                      <div class="stars">
                        <span *ngFor="let star of getStars(branch.rating)" 
                              class="star" [class.filled]="star">★</span>
                      </div>
                      <span class="rating-value">{{ branch.rating }}/5</span>
                    </div>
                  </div>

                  <div class="branch-address">
                    <svg class="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <div class="address-details">
                      <p class="street">{{ branch.address }}</p>
                      <p class="city">{{ branch.district }}, {{ branch.city }}</p>
                    </div>
                  </div>

                  <div class="branch-info">
                    <div class="info-row">
                      <div class="info-item">
                        <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                        <span>{{ branch.phone }}</span>
                      </div>
                      
                      <div class="info-item" *ngIf="branch.email">
                        <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        <span>{{ branch.email }}</span>
                      </div>
                    </div>

                    <div class="opening-hours">
                      <h5>Horaires d'ouverture</h5>
                      <div class="hours-grid">
                        <div class="hour-item" *ngIf="getCurrentDayHours(branch)">
                          <span class="day">Aujourd'hui</span>
                          <span class="hours" [class.closed]="getCurrentDayHours(branch) === 'Fermé'">
                            {{ getCurrentDayHours(branch) }}
                          </span>
                        </div>
                      </div>
                      <button (click)="toggleHours(branch.id)" class="toggle-hours">
                        {{ expandedHours.has(branch.id) ? 'Moins' : 'Plus' }} d'horaires
                      </button>
                      
                      <div *ngIf="expandedHours.has(branch.id)" class="full-hours">
                        <div class="hour-item">
                          <span class="day">Lundi</span>
                          <span class="hours">{{ branch.openingHours.monday }}</span>
                        </div>
                        <div class="hour-item">
                          <span class="day">Mardi</span>
                          <span class="hours">{{ branch.openingHours.tuesday }}</span>
                        </div>
                        <div class="hour-item">
                          <span class="day">Mercredi</span>
                          <span class="hours">{{ branch.openingHours.wednesday }}</span>
                        </div>
                        <div class="hour-item">
                          <span class="day">Jeudi</span>
                          <span class="hours">{{ branch.openingHours.thursday }}</span>
                        </div>
                        <div class="hour-item">
                          <span class="day">Vendredi</span>
                          <span class="hours">{{ branch.openingHours.friday }}</span>
                        </div>
                        <div class="hour-item">
                          <span class="day">Samedi</span>
                          <span class="hours">{{ branch.openingHours.saturday }}</span>
                        </div>
                        <div class="hour-item">
                          <span class="day">Dimanche</span>
                          <span class="hours">{{ branch.openingHours.sunday }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="services-icons">
                      <div class="service-icon" *ngIf="branch.hasAtm" title="Distributeur disponible">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                        </svg>
                      </div>
                      <div class="service-icon" *ngIf="branch.hasParking" title="Parking disponible">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </div>
                      <div class="service-icon" *ngIf="branch.isAccessible" title="Accessible PMR">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                      </div>
                    </div>

                    <div class="wait-time" *ngIf="branch.waitTime > 0">
                      <svg class="clock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>Temps d'attente estimé: {{ branch.waitTime }} min</span>
                    </div>

                    <div class="specialties" *ngIf="branch.specialties.length">
                      <h5>Spécialités</h5>
                      <div class="specialty-tags">
                        <span *ngFor="let specialty of branch.specialties" class="specialty-tag">
                          {{ specialty }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="branch-actions">
                    <button (click)="getDirections(branch)" class="btn-directions">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"></path>
                      </svg>
                      Itinéraire
                    </button>
                    <button (click)="callBranch(branch)" class="btn-call">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      Appeler
                    </button>
                    <button (click)="scheduleMeeting(branch)" class="btn-meeting">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      RDV
                    </button>
                  </div>

                  <div class="branch-manager" *ngIf="branch.managerName">
                    <p><strong>Directeur:</strong> {{ branch.managerName }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./bank-locator.component.scss']
})
export class BankLocatorComponent implements OnInit, OnDestroy {
  searchForm!: FormGroup;
  branches: BankBranch[] = [];
  filteredBranches: BankBranch[] = [];
  expandedHours = new Set<string>();
  showList = false;
  userLocation: { lat: number; lng: number } | null = null;

  cities: City[] = [
    {
      name: 'Libreville',
      districts: ['Centre-ville', 'Akanda', 'Glass', 'Nombakélé', 'Lalala', 'Nzeng-Ayong']
    },
    {
      name: 'Port-Gentil',
      districts: ['Centre', 'Bord de mer', 'Baudin', 'Polytechnique']
    },
    {
      name: 'Franceville',
      districts: ['Centre', 'Potos', 'Bangou']
    },
    {
      name: 'Oyem',
      districts: ['Centre', 'Adjap']
    }
  ];

  availableBanks = [
    { id: 'bgfi', name: 'BGFI Bank', color: '#1e40af' },
    { id: 'ugb', name: 'UGB', color: '#dc2626' },
    { id: 'bicig', name: 'BICIG', color: '#059669' },
    { id: 'ecobank', name: 'Ecobank', color: '#d97706' },
    { id: 'cbao', name: 'CBAO', color: '#7c3aed' }
  ];

  availableDistricts: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadBranches();
    this.setupFormListeners();
    this.trackPageView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      city: ['Libreville'],
      district: [''],
      selectedBank: [''],
      serviceType: ['']
    });
  }

  private setupFormListeners(): void {
    // Mettre à jour les quartiers quand la ville change
    this.searchForm.get('city')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(city => {
        const selectedCity = this.cities.find(c => c.name === city);
        this.availableDistricts = selectedCity?.districts || [];
        this.searchForm.patchValue({ district: '' });
      });

    // Recherche automatique lors des changements
    this.searchForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.searchBranches();
      });
  }

  private loadBranches(): void {
    // Simulation des données - remplacer par appel API
    this.branches = [
      {
        id: 'bgfi-centre',
        bankId: 'bgfi',
        bankName: 'BGFI Bank',
        branchName: 'BGFI Centre-ville',
        address: 'Boulevard de l\'Indépendance',
        city: 'Libreville',
        district: 'Centre-ville',
        coordinates: { lat: 0.3948, lng: 9.4537 },
        phone: '+241 01 23 45 67',
        email: 'centre@bgfibank.ga',
        openingHours: {
          monday: '8h00 - 16h00',
          tuesday: '8h00 - 16h00',
          wednesday: '8h00 - 16h00',
          thursday: '8h00 - 16h00',
          friday: '8h00 - 16h00',
          saturday: '8h00 - 12h00',
          sunday: 'Fermé'
        },
        services: [],
        hasAtm: true,
        hasParking: true,
        isAccessible: true,
        managerName: 'Jean-Pierre MBOMA',
        specialties: ['Crédit immobilier', 'Épargne', 'Change'],
        waitTime: 15,
        rating: 4.2,
        photos: []
      },
      {
        id: 'ugb-glass',
        bankId: 'ugb',
        bankName: 'UGB',
        branchName: 'UGB Glass',
        address: 'Quartier Glass, près du marché',
        city: 'Libreville',
        district: 'Glass',
        coordinates: { lat: 0.3856, lng: 9.4472 },
        phone: '+241 01 34 56 78',
        openingHours: {
          monday: '7h30 - 15h30',
          tuesday: '7h30 - 15h30',
          wednesday: '7h30 - 15h30',
          thursday: '7h30 - 15h30',
          friday: '7h30 - 15h30',
          saturday: '8h00 - 12h00',
          sunday: 'Fermé'
        },
        services: [],
        hasAtm: true,
        hasParking: false,
        isAccessible: false,
        managerName: 'Marie NGOUA',
        specialties: ['Crédit auto', 'Microfinance'],
        waitTime: 25,
        rating: 3.8,
        photos: []
      },
      {
        id: 'bicig-port-gentil',
        bankId: 'bicig',
        bankName: 'BICIG',
        branchName: 'BICIG Port-Gentil Centre',
        address: 'Avenue du Gouverneur Ballay',
        city: 'Port-Gentil',
        district: 'Centre',
        coordinates: { lat: -0.7193, lng: 8.7815 },
        phone: '+241 01 45 67 89',
        openingHours: {
          monday: '8h00 - 16h00',
          tuesday: '8h00 - 16h00',
          wednesday: '8h00 - 16h00',
          thursday: '8h00 - 16h00',
          friday: '8h00 - 16h00',
          saturday: 'Fermé',
          sunday: 'Fermé'
        },
        services: [],
        hasAtm: true,
        hasParking: true,
        isAccessible: true,
        specialties: ['Crédit professionnel', 'Transferts internationaux'],
        waitTime: 10,
        rating: 4.5,
        photos: []
      }
    ];

    this.searchBranches();
  }

  getCurrentLocation(): void {
    if ('geolocation' in navigator) {
      this.notificationService.showInfo('Localisation en cours...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.sortBranchesByDistance();
          this.notificationService.showSuccess('Position détectée!');
        },
        (error) => {
          console.error('Erreur géolocalisation:', error);
          this.notificationService.showError('Impossible de vous localiser');
        }
      );
    } else {
      this.notificationService.showError('Géolocalisation non supportée');
    }
  }

  searchBranches(): void {
    const { city, district, selectedBank, serviceType } = this.searchForm.value;
    
    let filtered = [...this.branches];

    if (city) {
      filtered = filtered.filter(branch => branch.city === city);
    }

    if (district) {
      filtered = filtered.filter(branch => branch.district === district);
    }

    if (selectedBank) {
      filtered = filtered.filter(branch => branch.bankId === selectedBank);
    }

    if (serviceType) {
      filtered = filtered.filter(branch => 
        branch.specialties.some(s => 
          s.toLowerCase().includes(serviceType.toLowerCase())
        )
      );
    }

    this.filteredBranches = filtered;
  }

  sortBranches(event: any): void {
    const sortBy = event.target.value;
    
    switch (sortBy) {
      case 'distance':
        this.sortBranchesByDistance();
        break;
      case 'rating':
        this.filteredBranches.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        this.filteredBranches.sort((a, b) => a.branchName.localeCompare(b.branchName));
        break;
      case 'waitTime':
        this.filteredBranches.sort((a, b) => a.waitTime - b.waitTime);
        break;
    }
  }

  private sortBranchesByDistance(): void {
    if (!this.userLocation) return;

    this.filteredBranches.sort((a, b) => {
      const distanceA = this.calculateDistance(this.userLocation!, a.coordinates);
      const distanceB = this.calculateDistance(this.userLocation!, b.coordinates);
      return distanceA - distanceB;
    });
  }

  private calculateDistance(pos1: {lat: number, lng: number}, pos2: {lat: number, lng: number}): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(pos2.lat - pos1.lat);
    const dLng = this.deg2rad(pos2.lng - pos1.lng);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(pos1.lat)) * Math.cos(this.deg2rad(pos2.lat)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  toggleMapView(): void {
    this.showList = !this.showList;
  }

  toggleHours(branchId: string): void {
    if (this.expandedHours.has(branchId)) {
      this.expandedHours.delete(branchId);
    } else {
      this.expandedHours.add(branchId);
    }
  }

  getDirections(branch: BankBranch): void {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${branch.coordinates.lat},${branch.coordinates.lng}`;
    window.open(url, '_blank');
    
    this.analyticsService.trackEvent('directions_requested', {
      branch_id: branch.id,
      bank_name: branch.bankName
    });
  }

  callBranch(branch: BankBranch): void {
    window.location.href = `tel:${branch.phone}`;
    
    this.analyticsService.trackEvent('branch_called', {
      branch_id: branch.id,
      bank_name: branch.bankName
    });
  }

  scheduleMeeting(branch: BankBranch): void {
    this.notificationService.showInfo(`Redirection vers la prise de RDV avec ${branch.branchName}`);
    
    this.analyticsService.trackEvent('meeting_scheduled', {
      branch_id: branch.id,
      bank_name: branch.bankName
    });
  }

  getCurrentDayHours(branch: BankBranch): string {
    const today = new Date().getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = days[today] as keyof OpeningHours;
    return branch.openingHours[dayKey];
  }

  getBankLogo(bankId: string): string {
    return `/assets/banks/${bankId}-logo.png`;
  }

  getStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  private trackPageView(): void {
    this.analyticsService.trackPageView('bank_locator', {
      page_title: 'Localiser une Banque'
    });
  }
}