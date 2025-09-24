// bank-locator.component.ts - Version mise à jour avec Leaflet Maps
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { AnalyticsService } from '../../services/analytics.service';
import { LeafletMapsService, MapMarker } from '../../services/leaflet-maps.service'; // Nouveau service

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
  waitTime: number;
  rating: number;
  photos: string[];
  distance?: number;
}

interface InsuranceBranch {
  id: string;
  companyId: string;
  companyName: string;
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
  services: string[];
  specialties: string[];
  rating: number;
  distance?: number;
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
          <h1>Localiser Banques & Assurances</h1>
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
                <label for="type">Type</label>
                <select formControlName="selectedType" id="type" class="form-select">
                  <option value="">Banques et Assurances</option>
                  <option value="bank">Banques uniquement</option>
                  <option value="insurance">Assurances uniquement</option>
                </select>
              </div>

              <div class="form-group">
                <label for="institution">Institution</label>
                <select formControlName="selectedInstitution" id="institution" class="form-select">
                  <option value="">Toutes les institutions</option>
                  <optgroup label="Banques" *ngIf="searchForm.value.selectedType !== 'insurance'">
                    <option *ngFor="let bank of availableBanks" [value]="'bank_' + bank.id">
                      {{ bank.name }}
                    </option>
                  </optgroup>
                  <optgroup label="Assurances" *ngIf="searchForm.value.selectedType !== 'bank'">
                    <option *ngFor="let insurance of availableInsurances" [value]="'insurance_' + insurance.id">
                      {{ insurance.name }}
                    </option>
                  </optgroup>
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
                  <option value="assurance_auto">Assurance Auto</option>
                  <option value="assurance_habitation">Assurance Habitation</option>
                  <option value="assurance_vie">Assurance Vie</option>
                </select>
              </div>
            </div>

            <div class="search-actions">
              <button type="button" (click)="getCurrentLocation()" class="btn-location" [disabled]="locatingUser">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                {{ locatingUser ? 'Localisation...' : 'Me localiser' }}
              </button>
              <button type="button" (click)="searchInstitutions()" class="btn-primary">
                Rechercher
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Results Section -->
      <div class="results-section">
        <div class="container">
          <div class="results-layout" [class.list-view]="showList">
            <!-- Map Area -->
            <div class="map-container" [hidden]="showList">
              <div class="map-header">
                <h3>Carte des agences</h3>
                <div class="map-controls">
                  <button (click)="toggleMapView()" class="btn-map-toggle">
                    {{ showList ? 'Vue carte' : 'Vue liste' }}
                  </button>
                  <button (click)="centerOnUser()" class="btn-center-user" *ngIf="userLocation">
                    Ma position
                  </button>
                  <!-- Nouveau sélecteur de type de carte -->
                  <select (change)="changeMapTileLayer($event)" class="tile-selector">
                    <option value="openstreetmap">Plan</option>
                    <option value="satellite">Satellite</option>
                    <option value="terrain">Relief</option>
                  </select>
                </div>
              </div>
              
              <div class="map-wrapper">
                <!-- Conteneur Leaflet au lieu de Google Maps -->
                <div #mapContainer class="leaflet-map" id="leaflet-map"></div>
                
                <!-- Map Legend -->
                <div class="map-legend">
                  <div class="legend-header">Légende</div>
                  <div class="legend-item">
                    <div class="legend-marker bank-marker">🏦</div>
                    <span>Banques ({{ filteredBankBranches.length }})</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-marker insurance-marker">🏢</div>
                    <span>Assurances ({{ filteredInsuranceBranches.length }})</span>
                  </div>
                  <div class="legend-item" *ngIf="userLocation">
                    <div class="legend-marker user-marker">📍</div>
                    <span>Votre position</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Results List (reste identique) -->
            <div class="institutions-list" [class.full-width]="showList">
              <div class="list-header">
                <h3>{{ getTotalResults() }} agence(s) trouvée(s)</h3>
                <div class="sort-controls">
                  <select (change)="sortInstitutions($event)" class="sort-select">
                    <option value="distance" *ngIf="userLocation">Par distance</option>
                    <option value="rating">Par note</option>
                    <option value="name">Par nom</option>
                    <option value="type">Par type</option>
                  </select>
                </div>
              </div>

              <div class="institutions-grid">
                <!-- Banques -->
                <div *ngFor="let branch of filteredBankBranches" class="institution-card bank-card">
                  <div class="institution-header">
                    <div class="institution-info">
                      <div class="institution-logo bank-logo">
                        <img [src]="getBankLogo(branch.bankId)" [alt]="branch.bankName" />
                      </div>
                      <div class="institution-details">
                        <span class="institution-type">BANQUE</span>
                        <h4>{{ branch.branchName }}</h4>
                        <p class="institution-name">{{ branch.bankName }}</p>
                      </div>
                    </div>
                    <div class="institution-rating">
                      <div class="stars">
                        <span *ngFor="let star of getStars(branch.rating)" 
                              class="star" [class.filled]="star">⭐</span>
                      </div>
                      <span class="rating-value">{{ branch.rating }}/5</span>
                    </div>
                  </div>

                  <div class="institution-address">
                    <svg class="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <div class="address-details">
                      <p class="street">{{ branch.address }}</p>
                      <p class="city">{{ branch.district }}, {{ branch.city }}</p>
                      <p class="distance" *ngIf="branch.distance">
                        📍 {{ branch.distance }} km
                      </p>
                    </div>
                  </div>

                  <div class="institution-actions">
                    <button (click)="getDirections(branch.coordinates)" class="btn-directions">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"></path>
                      </svg>
                      Itinéraire
                    </button>
                    <button (click)="callInstitution(branch.phone)" class="btn-call">
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
                </div>

                <!-- Assurances -->
                <div *ngFor="let branch of filteredInsuranceBranches" class="institution-card insurance-card">
                  <div class="institution-header">
                    <div class="institution-info">
                      <div class="institution-logo insurance-logo">
                        <img [src]="getInsuranceLogo(branch.companyId)" [alt]="branch.companyName" />
                      </div>
                      <div class="institution-details">
                        <span class="institution-type">ASSURANCE</span>
                        <h4>{{ branch.branchName }}</h4>
                        <p class="institution-name">{{ branch.companyName }}</p>
                      </div>
                    </div>
                    <div class="institution-rating">
                      <div class="stars">
                        <span *ngFor="let star of getStars(branch.rating)" 
                              class="star" [class.filled]="star">⭐</span>
                      </div>
                      <span class="rating-value">{{ branch.rating }}/5</span>
                    </div>
                  </div>

                  <div class="institution-address">
                    <svg class="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <div class="address-details">
                      <p class="street">{{ branch.address }}</p>
                      <p class="city">{{ branch.district }}, {{ branch.city }}</p>
                      <p class="distance" *ngIf="branch.distance">
                        📍 {{ branch.distance }} km
                      </p>
                    </div>
                  </div>

                  <div class="institution-actions">
                    <button (click)="getDirections(branch.coordinates)" class="btn-directions">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"></path>
                      </svg>
                      Itinéraire
                    </button>
                    <button (click)="callInstitution(branch.phone)" class="btn-call">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      Appeler
                    </button>
                    <button (click)="requestQuote(branch)" class="btn-meeting">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      Devis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loader -->
      <div class="loader-overlay" *ngIf="isLoading">
        <div class="loader">
          <div class="spinner"></div>
          <p>Chargement de la carte...</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./bank-locator.component.scss']
})
export class BankLocatorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  searchForm!: FormGroup;
  bankBranches: BankBranch[] = [];
  insuranceBranches: InsuranceBranch[] = [];
  filteredBankBranches: BankBranch[] = [];
  filteredInsuranceBranches: InsuranceBranch[] = [];
  expandedHours = new Set<string>();
  showList = false;
  userLocation: { lat: number; lng: number } | null = null;
  isLoading = false;
  locatingUser = false;

  cities: City[] = [
    {
      name: 'Libreville',
      districts: ['Centre-ville', 'Akanda', 'Glass', 'Nombakélé', 'Lalala', 'Nzeng-Ayong', 'Oloumi', 'PK5', 'PK8']
    },
    {
      name: 'Port-Gentil',
      districts: ['Centre', 'Bord de mer', 'Baudin', 'Polytechnique', 'Récréation']
    },
    {
      name: 'Franceville',
      districts: ['Centre', 'Potos', 'Bangou', 'Ndéné']
    },
    {
      name: 'Oyem',
      districts: ['Centre', 'Adjap', 'Efoulan']
    },
    {
      name: 'Lambaréné',
      districts: ['Centre', 'Islande', 'Mission']
    }
  ];

  availableBanks = [
    { id: 'bgfi', name: 'BGFI Bank', color: '#1e40af' },
    { id: 'ugb', name: 'UGB', color: '#dc2626' },
    { id: 'bicig', name: 'BICIG', color: '#059669' },
    { id: 'ecobank', name: 'Ecobank', color: '#d97706' },
    { id: 'cbao', name: 'CBAO', color: '#7c3aed' },
    { id: 'orabank', name: 'Orabank', color: '#ea580c' }
  ];

  availableInsurances = [
    { id: 'saham', name: 'Saham Assurance', color: '#dc2626' },
    { id: 'nsia', name: 'NSIA Assurance', color: '#059669' },
    { id: 'colina', name: 'Colina Assurance', color: '#7c3aed' },
    { id: 'sanlam', name: 'Sanlam', color: '#ea580c' },
    { id: 'gras_savoye', name: 'Gras Savoye', color: '#1e40af' }
  ];

  availableDistricts: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private leafletMapsService: LeafletMapsService, // Service Leaflet au lieu de Google Maps
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
    this.loadInstitutions();
    this.trackPageView();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.leafletMapsService.destroy(); // Utilisation du service Leaflet
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      city: ['Libreville'],
      district: [''],
      selectedType: [''],
      selectedInstitution: [''],
      serviceType: ['']
    });
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapContainer) return;

    try {
      this.isLoading = true;
      await this.leafletMapsService.initializeMap(
        this.mapContainer.nativeElement,
        {
          center: { lat: 0.4162, lng: 9.4673 }, // Centre sur Libreville
          zoom: 11
        }
      );
      this.updateMapMarkers();
      this.isLoading = false;
    } catch (error) {
      console.error('Erreur initialisation carte:', error);
      this.notificationService.showError('Impossible de charger la carte');
      this.isLoading = false;
    }
  }

  private setupFormListeners(): void {
    this.searchForm.get('city')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(city => {
        const selectedCity = this.cities.find(c => c.name === city);
        this.availableDistricts = selectedCity?.districts || [];
        this.searchForm.patchValue({ district: '' });
      });

    this.searchForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.searchInstitutions();
      });
  }

  private loadInstitutions(): void {
    this.loadInstitutionsFromAPI().catch(() => {
      this.loadMockData();
    });
  }

  private loadMockData(): void {
    this.bankBranches = [
      {
        id: 'bgfi-centre-libreville',
        bankId: 'bgfi',
        bankName: 'BGFI Bank',
        branchName: 'BGFI Centre-ville Libreville',
        address: 'Boulevard de l\'Indépendance',
        city: 'Libreville',
        district: 'Centre-ville',
        coordinates: { lat: 0.3948, lng: 9.4537 },
        phone: '+241 01 76 20 00',
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
        specialties: ['Crédit immobilier', 'Épargne', 'Change', 'Transferts internationaux'],
        waitTime: 15,
        rating: 4.2,
        photos: []
      }
      // ... autres données mockées
    ];

    this.insuranceBranches = [
      {
        id: 'saham-centre-libreville',
        companyId: 'saham',
        companyName: 'Saham Assurance',
        branchName: 'Saham Centre-ville',
        address: 'Avenue du Colonel Parant',
        city: 'Libreville',
        district: 'Centre-ville',
        coordinates: { lat: 0.3920, lng: 9.4580 },
        phone: '+241 01 76 56 00',
        email: 'libreville@saham.ga',
        openingHours: {
          monday: '8h00 - 17h00',
          tuesday: '8h00 - 17h00',
          wednesday: '8h00 - 17h00',
          thursday: '8h00 - 17h00',
          friday: '8h00 - 17h00',
          saturday: '8h00 - 12h00',
          sunday: 'Fermé'
        },
        services: ['Assurance Auto', 'Assurance Habitation', 'Assurance Vie', 'Assurance Santé'],
        specialties: ['Assurance véhicules', 'Assurance habitation'],
        rating: 4.3
      }
      // ... autres données mockées
    ];

    this.searchInstitutions();
  }

  getCurrentLocation(): void {
    if (this.locatingUser) return;

    this.locatingUser = true;
    this.notificationService.showInfo('Localisation en cours...');
    
    this.leafletMapsService.getCurrentLocation()
      .then((position) => {
        this.userLocation = position;
        
        this.leafletMapsService.addUserLocationMarker(this.userLocation);
        this.leafletMapsService.centerMapOnLocation(this.userLocation.lat, this.userLocation.lng, 14);
        
        this.calculateDistances();
        this.sortInstitutionsByDistance();
        
        this.locatingUser = false;
        this.notificationService.showSuccess('Position détectée!');
      })
      .catch((error) => {
        console.error('Erreur géolocalisation:', error);
        this.locatingUser = false;
        this.notificationService.showError('Impossible de vous localiser');
      });
  }

  private calculateDistances(): void {
    if (!this.userLocation) return;

    this.bankBranches.forEach(branch => {
      branch.distance = this.leafletMapsService.calculateDistance(
        this.userLocation!,
        branch.coordinates
      );
    });

    this.insuranceBranches.forEach(branch => {
      branch.distance = this.leafletMapsService.calculateDistance(
        this.userLocation!,
        branch.coordinates
      );
    });

    this.searchInstitutions();
  }

  searchInstitutions(): void {
    const { city, district, selectedType, selectedInstitution, serviceType } = this.searchForm.value;
    
    let filteredBanks = [...this.bankBranches];
    
    if (selectedType === 'insurance') {
      filteredBanks = [];
    } else {
      if (city) {
        filteredBanks = filteredBanks.filter(branch => branch.city === city);
      }
      
      if (district) {
        filteredBanks = filteredBanks.filter(branch => branch.district === district);
      }
      
      if (selectedInstitution && selectedInstitution.startsWith('bank_')) {
        const bankId = selectedInstitution.replace('bank_', '');
        filteredBanks = filteredBanks.filter(branch => branch.bankId === bankId);
      }
      
      if (serviceType) {
        filteredBanks = filteredBanks.filter(branch => 
          branch.specialties.some(s => 
            s.toLowerCase().includes(serviceType.toLowerCase())
          )
        );
      }
    }

    let filteredInsurances = [...this.insuranceBranches];
    
    if (selectedType === 'bank') {
      filteredInsurances = [];
    } else {
      if (city) {
        filteredInsurances = filteredInsurances.filter(branch => branch.city === city);
      }
      
      if (district) {
        filteredInsurances = filteredInsurances.filter(branch => branch.district === district);
      }
      
      if (selectedInstitution && selectedInstitution.startsWith('insurance_')) {
        const insuranceId = selectedInstitution.replace('insurance_', '');
        filteredInsurances = filteredInsurances.filter(branch => branch.companyId === insuranceId);
      }
    }

    this.filteredBankBranches = filteredBanks;
    this.filteredInsuranceBranches = filteredInsurances;
    
    this.updateMapMarkers();
  }

  private updateMapMarkers(): void {
    const markers: MapMarker[] = [];

    this.filteredBankBranches.forEach(branch => {
      markers.push({
        id: branch.id,
        position: branch.coordinates,
        title: branch.branchName,
        type: 'bank',
        info: {
          name: `${branch.branchName} - ${branch.bankName}`,
          address: `${branch.address}, ${branch.district}, ${branch.city}`,
          phone: branch.phone,
          email: branch.email,
          services: branch.specialties,
          openingHours: branch.openingHours,
          rating: branch.rating,
          photos: branch.photos
        }
      });
    });

    this.filteredInsuranceBranches.forEach(branch => {
      markers.push({
        id: branch.id,
        position: branch.coordinates,
        title: branch.branchName,
        type: 'insurance',
        info: {
          name: `${branch.branchName} - ${branch.companyName}`,
          address: `${branch.address}, ${branch.district}, ${branch.city}`,
          phone: branch.phone,
          email: branch.email,
          services: branch.services,
          rating: branch.rating
        }
      });
    });

    this.leafletMapsService.addMarkers(markers);
  }

  // Nouvelle méthode pour changer le type de carte
  changeMapTileLayer(event: any): void {
    const tileType = event.target.value;
    const tileLayers = this.leafletMapsService.getAvailableTileLayers();
    
    if (tileLayers[tileType]) {
      // Ici vous pourriez implémenter la logique pour changer la couche de tuiles
      // Cela nécessiterait une modification du service Leaflet pour supporter le changement de couches
      console.log('Changement de couche vers:', tileType);
    }
  }

  sortInstitutions(event: any): void {
    const sortBy = event.target.value;
    
    switch (sortBy) {
      case 'distance':
        this.sortInstitutionsByDistance();
        break;
      case 'rating':
        this.filteredBankBranches.sort((a, b) => b.rating - a.rating);
        this.filteredInsuranceBranches.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        this.filteredBankBranches.sort((a, b) => a.branchName.localeCompare(b.branchName));
        this.filteredInsuranceBranches.sort((a, b) => a.branchName.localeCompare(b.branchName));
        break;
    }
  }

  private sortInstitutionsByDistance(): void {
    if (!this.userLocation) return;

    this.filteredBankBranches.sort((a, b) => {
      const distanceA = a.distance || 0;
      const distanceB = b.distance || 0;
      return distanceA - distanceB;
    });

    this.filteredInsuranceBranches.sort((a, b) => {
      const distanceA = a.distance || 0;
      const distanceB = b.distance || 0;
      return distanceA - distanceB;
    });
  }

  toggleMapView(): void {
    this.showList = !this.showList;
  }

  centerOnUser(): void {
    if (this.userLocation) {
      this.leafletMapsService.centerMapOnLocation(this.userLocation.lat, this.userLocation.lng, 14);
    }
  }

  getDirections(coordinates: { lat: number; lng: number }): void {
    // Utiliser OpenStreetMap pour les directions au lieu de Google Maps
    const url = `https://www.openstreetmap.org/directions?from=&to=${coordinates.lat},${coordinates.lng}`;
    window.open(url, '_blank');
    
    this.analyticsService.trackEvent('directions_requested', {
      coordinates: coordinates
    });
  }

  callInstitution(phone: string): void {
    window.location.href = `tel:${phone}`;
    
    this.analyticsService.trackEvent('institution_called', {
      phone: phone
    });
  }

  scheduleMeeting(branch: BankBranch): void {
    this.notificationService.showInfo(`Redirection vers la prise de RDV avec ${branch.branchName}`);
    
    this.analyticsService.trackEvent('meeting_scheduled', {
      branch_id: branch.id,
      bank_name: branch.bankName
    });
  }

  requestQuote(branch: InsuranceBranch): void {
    this.notificationService.showInfo(`Demande de devis pour ${branch.branchName}`);
    
    this.analyticsService.trackEvent('quote_requested', {
      branch_id: branch.id,
      company_name: branch.companyName
    });
  }

  getBankLogo(bankId: string): string {
    return `/assets/banks/${bankId}-logo.png`;
  }

  getInsuranceLogo(companyId: string): string {
    return `/assets/insurance/${companyId}-logo.png`;
  }

  getStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  getTotalResults(): number {
    return this.filteredBankBranches.length + this.filteredInsuranceBranches.length;
  }

  private trackPageView(): void {
    this.analyticsService.trackPageView('institutions_locator', {
      page_title: 'Localiser Banques & Assurances'
    });
  }

  private async loadInstitutionsFromAPI(): Promise<void> {
    try {
      const response = await this.http.get<any>('/api/institutions/all').toPromise();
      if (response) {
        this.bankBranches = response.banks.map((bank: any) => this.mapBankToInterface(bank));
        this.insuranceBranches = response.insurance_companies.map((insurance: any) => this.mapInsuranceToInterface(insurance));
        this.searchInstitutions();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des institutions:', error);
      throw error;
    }
  }

  private mapBankToInterface(apiBank: any): BankBranch {
    return {
      id: apiBank.id,
      bankId: apiBank.bank_id || apiBank.id,
      bankName: apiBank.bank_name,
      branchName: apiBank.branch_name,
      address: apiBank.address || '',
      city: apiBank.city || 'Libreville',
      district: apiBank.district || '',
      coordinates: {
        lat: parseFloat(apiBank.coordinates?.lat || 0),
        lng: parseFloat(apiBank.coordinates?.lng || 0)
      },
      phone: apiBank.phone || '',
      email: apiBank.email || '',
      openingHours: apiBank.opening_hours || {
        monday: '8h00 - 16h00',
        tuesday: '8h00 - 16h00',
        wednesday: '8h00 - 16h00',
        thursday: '8h00 - 16h00',
        friday: '8h00 - 16h00',
        saturday: '8h00 - 12h00',
        sunday: 'Fermé'
      },
      services: apiBank.services || [],
      hasAtm: apiBank.has_atm || false,
      hasParking: apiBank.has_parking || false,
      isAccessible: apiBank.is_accessible || false,
      managerName: apiBank.manager_name || '',
      specialties: apiBank.specialties || [],
      waitTime: apiBank.wait_time || 0,
      rating: parseFloat(apiBank.rating || 0),
      photos: apiBank.photos || [],
      distance: apiBank.distance
    };
  }

  private mapInsuranceToInterface(apiInsurance: any): InsuranceBranch {
    return {
      id: apiInsurance.id,
      companyId: apiInsurance.company_id || apiInsurance.id,
      companyName: apiInsurance.company_name,
      branchName: apiInsurance.branch_name,
      address: apiInsurance.address || '',
      city: apiInsurance.city || 'Libreville',
      district: apiInsurance.district || '',
      coordinates: {
        lat: parseFloat(apiInsurance.coordinates?.lat || 0),
        lng: parseFloat(apiInsurance.coordinates?.lng || 0)
      },
      phone: apiInsurance.phone || '',
      email: apiInsurance.email || '',
      openingHours: apiInsurance.opening_hours || {
        monday: '8h00 - 17h00',
        tuesday: '8h00 - 17h00',
        wednesday: '8h00 - 17h00',
        thursday: '8h00 - 17h00',
        friday: '8h00 - 17h00',
        saturday: '8h00 - 12h00',
        sunday: 'Fermé'
      },
      services: apiInsurance.services || [],
      specialties: apiInsurance.specialties || [],
      rating: parseFloat(apiInsurance.rating || 0),
      distance: apiInsurance.distance
    };
  }
}