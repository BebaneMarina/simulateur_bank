// leaflet-maps.service.ts - Version corrigée
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as L from 'leaflet';

// Fix pour les icônes par défaut de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  type: 'bank' | 'insurance';
  info: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    services?: string[];
    openingHours?: any;
    rating?: number;
    photos?: string[];
  };
}

export interface MapConfig {
  center: { lat: number; lng: number };
  zoom: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeafletMapsService {
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private markersGroup: L.LayerGroup = L.layerGroup();
  private userLocationMarker: L.Marker | null = null;
  private markersSubject = new BehaviorSubject<MapMarker[]>([]);

  // Configuration par défaut pour le Gabon
  private defaultConfig: MapConfig = {
    center: { lat: 0.4162, lng: 9.4673 }, // Libreville
    zoom: 11
  };

  // Couleurs pour différents types d'institutions
  private markerColors = {
    bank: '#1e40af', // Bleu
    insurance: '#059669' // Vert
  };

  constructor() {}

  async initializeMap(container: HTMLElement, config?: Partial<MapConfig>): Promise<void> {
    const mapConfig = { ...this.defaultConfig, ...config };

    // Initialiser la carte Leaflet
    this.map = L.map(container, {
      center: [mapConfig.center.lat, mapConfig.center.lng],
      zoom: mapConfig.zoom,
      zoomControl: true,
      attributionControl: true
    });

    // Ajouter les tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Ajouter le groupe de marqueurs à la carte
    this.markersGroup.addTo(this.map);

    // Ajouter contrôles personnalisés
    this.addCustomControls();
  }

  private addCustomControls(): void {
    if (!this.map) return;

    // Contrôle de localisation utilisateur
    const locationControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        
        container.style.backgroundColor = 'white';
        container.style.backgroundImage = `url('data:image/svg+xml;base64,${this.encodeToBase64(`
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        `)}')`;
        container.style.backgroundSize = '20px 20px';
        container.style.backgroundRepeat = 'no-repeat';
        container.style.backgroundPosition = 'center';
        container.style.width = '34px';
        container.style.height = '34px';
        container.style.cursor = 'pointer';
        container.title = 'Me localiser';

        container.onclick = () => {
          this.getCurrentLocationAndCenter();
        };

        return container;
      }
    });

    new locationControl({ position: 'topleft' }).addTo(this.map);
  }

  private async getCurrentLocationAndCenter(): Promise<void> {
    try {
      const position = await this.getCurrentLocation();
      this.addUserLocationMarker(position);
      this.centerMapOnLocation(position.lat, position.lng, 14);
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
    }
  }

  addMarkers(locations: MapMarker[]): void {
    // Nettoyer les anciens marqueurs
    this.clearMarkers();

    locations.forEach(location => {
      const marker = this.createMarker(location);
      this.markers.push(marker);
      this.markersGroup.addLayer(marker);
    });

    // Ajuster la vue pour inclure tous les marqueurs
    if (locations.length > 0) {
      this.fitMapToMarkers();
    }

    this.markersSubject.next(locations);
  }

  private createMarker(location: MapMarker): L.Marker {
    const icon = this.createCustomIcon(location.type);
    const marker = L.marker([location.position.lat, location.position.lng], { icon })
      .bindPopup(this.generatePopupContent(location));

    // Événement au clic pour ouvrir le popup
    marker.on('click', () => {
      marker.openPopup();
    });

    return marker;
  }

  // Solution principale : Fonction d'encodage sécurisée pour Unicode
  private encodeToBase64(str: string): string {
    try {
      // Encoder les caractères Unicode en UTF-8 puis en Base64
      return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
      console.error('Erreur encodage Base64:', error);
      // Fallback : retourner une chaîne vide ou une valeur par défaut
      return '';
    }
  }

  private createCustomIcon(type: 'bank' | 'insurance'): L.Icon {
    const color = this.markerColors[type];
    
    // Solution : Utiliser des lettres au lieu d'emojis
    const symbol = type === 'bank' ? 'B' : 'A';
    
    const svgIcon = `
      <svg width="32" height="45" viewBox="0 0 32 45" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 16 16 29 16 29s16-13 16-29C32 7.2 24.8 0 16 0z" fill="${color}"/>
        <circle cx="16" cy="16" r="10" fill="white"/>
        <text x="16" y="22" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="${color}">${symbol}</text>
      </svg>
    `;

    return L.icon({
      iconUrl: `data:image/svg+xml;base64,${this.encodeToBase64(svgIcon)}`,
      iconSize: [32, 45],
      iconAnchor: [16, 45],
      popupAnchor: [0, -45]
    });
  }

  // Alternative : Utiliser des icônes préfabriquées
  private createAlternativeCustomIcon(type: 'bank' | 'insurance'): L.Icon {
    const color = this.markerColors[type];
    
    // Utiliser des icônes SVG simples sans caractères Unicode
    const iconPath = type === 'bank' 
      ? 'M3 9a2 2 0 012-2h.93l.94-2.94a2 2 0 013.6 0L11.07 7H12a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' 
      : 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z';
    
    const svgIcon = `
      <svg width="32" height="45" viewBox="0 0 32 45" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 16 16 29 16 29s16-13 16-29C32 7.2 24.8 0 16 0z" fill="${color}"/>
        <circle cx="16" cy="16" r="10" fill="white"/>
        <g transform="translate(8, 8)">
          <path d="${iconPath}" fill="${color}" stroke="none"/>
        </g>
      </svg>
    `;

    return L.icon({
      iconUrl: `data:image/svg+xml;base64,${this.encodeToBase64(svgIcon)}`,
      iconSize: [32, 45],
      iconAnchor: [16, 45],
      popupAnchor: [0, -45]
    });
  }

  private generatePopupContent(location: MapMarker): string {
    const { info } = location;
    const stars = info.rating ? '★'.repeat(Math.floor(info.rating)) : '';
    
    return `
      <div class="map-popup" style="max-width: 300px; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
          ${info.name}
        </h3>
        
        <div style="margin-bottom: 8px;">
          <strong>📍 Adresse:</strong><br>
          <span style="color: #6b7280; font-size: 14px;">${info.address}</span>
        </div>
        
        ${info.phone ? `
          <div style="margin-bottom: 8px;">
            <strong>📞 Téléphone:</strong><br>
            <a href="tel:${info.phone}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">
              ${info.phone}
            </a>
          </div>
        ` : ''}
        
        ${info.email ? `
          <div style="margin-bottom: 8px;">
            <strong>📧 Email:</strong><br>
            <a href="mailto:${info.email}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">
              ${info.email}
            </a>
          </div>
        ` : ''}
        
        ${info.rating ? `
          <div style="margin-bottom: 8px;">
            <strong>⭐ Note:</strong> ${stars} (${info.rating}/5)
          </div>
        ` : ''}
        
        ${info.services && info.services.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <strong>🛠️ Services:</strong><br>
            <div style="margin-top: 4px;">
              ${info.services.map(service => 
                `<span style="background: #e5f3ff; color: #1e40af; padding: 2px 6px; border-radius: 12px; font-size: 11px; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${service}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="window.open('https://www.openstreetmap.org/directions?from=&to=${location.position.lat},${location.position.lng}', '_blank')" 
                  style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1; min-width: 80px;">
            🗺️ Itinéraire
          </button>
          
          ${info.phone ? `
            <button onclick="window.location.href='tel:${info.phone}'" 
                    style="background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1; min-width: 80px;">
              📞 Appeler
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private fitMapToMarkers(): void {
    if (this.markers.length === 0 || !this.map) return;

    const group = new L.FeatureGroup(this.markers);
    this.map.fitBounds(group.getBounds(), {
      padding: [20, 20],
      maxZoom: 15
    });
  }

  clearMarkers(): void {
    this.markersGroup.clearLayers();
    this.markers = [];
  }

  centerMapOnLocation(lat: number, lng: number, zoom: number = 14): void {
    if (this.map) {
      this.map.setView([lat, lng], zoom);
    }
  }

  getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  addUserLocationMarker(position: { lat: number; lng: number }): void {
    if (!this.map) return;

    // Supprimer le marqueur précédent s'il existe
    if (this.userLocationMarker) {
      this.map.removeLayer(this.userLocationMarker);
    }

    const userIcon = L.icon({
      iconUrl: `data:image/svg+xml;base64,${this.encodeToBase64(`
        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" fill="#4285f4" stroke="white" stroke-width="2"/>
          <circle cx="10" cy="10" r="3" fill="white"/>
        </svg>
      `)}`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    this.userLocationMarker = L.marker([position.lat, position.lng], { icon: userIcon })
      .bindPopup('Votre position')
      .addTo(this.map);
  }

  calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Arrondir à 2 décimales
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  getMarkersObservable(): Observable<MapMarker[]> {
    return this.markersSubject.asObservable();
  }

  // Méthodes pour la compatibilité avec l'ancien service Google Maps
  addUserLocationMarkerCompat(position: { lat: number; lng: number }): void {
    this.addUserLocationMarker(position);
  }

  initializeMapCompat(container: HTMLElement, config?: { center: { lat: number; lng: number }; zoom: number }): Promise<void> {
    return this.initializeMap(container, config);
  }

  destroy(): void {
    this.clearMarkers();
    if (this.userLocationMarker && this.map) {
      this.map.removeLayer(this.userLocationMarker);
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // Méthode pour ajouter des couches de cartes alternatives
  addTileLayer(url: string, options: any = {}): void {
    if (!this.map) return;

    L.tileLayer(url, {
      attribution: options.attribution || '&copy; OpenStreetMap contributors',
      maxZoom: options.maxZoom || 19,
      ...options
    }).addTo(this.map);
  }

  // Couches de cartes alternatives disponibles
  getAvailableTileLayers(): { [key: string]: { url: string; attribution: string } } {
    return {
      openstreetmap: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      },
      terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      }
    };
  }
}