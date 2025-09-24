// google-maps.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare var google: any;

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
  mapTypeId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private map: any;
  private markers: any[] = [];
  private infoWindow: any;
  private markersSubject = new BehaviorSubject<MapMarker[]>([]);
  private isMapLoaded = false;

  // Configuration par défaut pour le Gabon
  private defaultConfig: MapConfig = {
    center: { lat: 0.4162, lng: 9.4673 }, // Libreville
    zoom: 10
  };

  // Couleurs pour différents types
  private markerColors = {
    bank: '#1e40af', // Bleu
    insurance: '#059669' // Vert
  };

  constructor() {
    this.loadGoogleMapsScript();
  }

  private async loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        this.isMapLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.getApiKey()}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isMapLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  }

  private getApiKey(): string {
    // Récupérer la clé API depuis l'environnement ou la configuration
    return 'VOTRE_CLE_API_GOOGLE_MAPS'; // À remplacer par votre vraie clé
  }

  async initializeMap(container: HTMLElement, config?: Partial<MapConfig>): Promise<void> {
    if (!this.isMapLoaded) {
      await this.loadGoogleMapsScript();
    }

    const mapConfig = { ...this.defaultConfig, ...config };

    this.map = new google.maps.Map(container, {
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: this.getMapStyles(),
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true
    });

    this.infoWindow = new google.maps.InfoWindow();
  }

  addMarkers(locations: MapMarker[]): void {
    // Nettoyer les anciens marqueurs
    this.clearMarkers();

    locations.forEach(location => {
      const marker = new google.maps.Marker({
        position: location.position,
        map: this.map,
        title: location.title,
        icon: this.createCustomMarker(location.type),
        animation: google.maps.Animation.DROP
      });

      // Ajouter l'événement click pour afficher les informations
      marker.addListener('click', () => {
        this.showInfoWindow(marker, location);
      });

      this.markers.push(marker);
    });

    // Ajuster la vue pour inclure tous les marqueurs
    if (locations.length > 0) {
      this.fitMapToMarkers();
    }

    this.markersSubject.next(locations);
  }

  private createCustomMarker(type: 'bank' | 'insurance'): any {
    const color = this.markerColors[type];
    const icon = type === 'bank' ? '🏦' : '🏢';
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.7 0 0 6.7 0 15c0 15 15 25 15 25s15-10 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>
          <circle cx="15" cy="15" r="8" fill="white"/>
          <text x="15" y="20" font-family="Arial" font-size="12" text-anchor="middle" fill="${color}">${icon}</text>
        </svg>`
      )}`,
      scaledSize: new google.maps.Size(30, 40),
      anchor: new google.maps.Point(15, 40)
    };
  }

  private showInfoWindow(marker: any, location: MapMarker): void {
    const content = this.generateInfoWindowContent(location);
    this.infoWindow.setContent(content);
    this.infoWindow.open(this.map, marker);
  }

  private generateInfoWindowContent(location: MapMarker): string {
    const { info } = location;
    const stars = info.rating ? '⭐'.repeat(Math.floor(info.rating)) : '';
    
    return `
      <div class="map-info-window">
        <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">
          ${info.name}
        </h3>
        
        <div style="margin-bottom: 8px;">
          <strong>📍 Adresse:</strong><br>
          <span style="color: #6b7280;">${info.address}</span>
        </div>
        
        ${info.phone ? `
          <div style="margin-bottom: 8px;">
            <strong>📞 Téléphone:</strong><br>
            <a href="tel:${info.phone}" style="color: #3b82f6; text-decoration: none;">
              ${info.phone}
            </a>
          </div>
        ` : ''}
        
        ${info.email ? `
          <div style="margin-bottom: 8px;">
            <strong>📧 Email:</strong><br>
            <a href="mailto:${info.email}" style="color: #3b82f6; text-decoration: none;">
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
            <strong>🛎️ Services:</strong><br>
            <div style="margin-top: 4px;">
              ${info.services.map(service => 
                `<span style="background: #e5f3ff; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${service}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${location.position.lat},${location.position.lng}', '_blank')" 
                  style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
            🗺️ Itinéraire
          </button>
          
          ${info.phone ? `
            <button onclick="window.location.href='tel:${info.phone}'" 
                    style="background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              📞 Appeler
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private fitMapToMarkers(): void {
    if (this.markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach(marker => {
      bounds.extend(marker.getPosition());
    });

    this.map.fitBounds(bounds);
    
    // Ajuster le zoom si nécessaire
    google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
      if (this.map.getZoom() > 15) {
        this.map.setZoom(15);
      }
    });
  }

  clearMarkers(): void {
    this.markers.forEach(marker => {
      marker.setMap(null);
    });
    this.markers = [];
  }

  centerMapOnLocation(lat: number, lng: number, zoom: number = 14): void {
    if (this.map) {
      this.map.setCenter({ lat, lng });
      this.map.setZoom(zoom);
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
    const marker = new google.maps.Marker({
      position,
      map: this.map,
      title: 'Votre position',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="#4285f4" stroke="white" stroke-width="2"/>
            <circle cx="10" cy="10" r="3" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(20, 20)
      }
    });

    this.markers.push(marker);
  }

  calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    if (!this.isMapLoaded) return 0;
    
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(point1.lat, point1.lng),
      new google.maps.LatLng(point2.lat, point2.lng)
    );
    
    return Math.round(distance / 1000 * 100) / 100; // Distance en km avec 2 décimales
  }

  private getMapStyles(): any[] {
    // Style personnalisé pour la carte
    return [
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }]
      },
      {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }, { "lightness": 20 }]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#ffffff" }, { "lightness": 29 }, { "weight": 0.2 }]
      },
      {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }, { "lightness": 18 }]
      },
      {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }, { "lightness": 16 }]
      },
      {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }, { "lightness": 21 }]
      },
      {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#dedede" }, { "lightness": 21 }]
      },
      {
        "elementType": "labels.text.stroke",
        "stylers": [{ "visibility": "on" }, { "color": "#ffffff" }, { "lightness": 16 }]
      },
      {
        "elementType": "labels.text.fill",
        "stylers": [{ "saturation": 36 }, { "color": "#333333" }, { "lightness": 40 }]
      },
      {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
      },
      {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [{ "color": "#f2f2f2" }, { "lightness": 19 }]
      },
      {
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#fefefe" }, { "lightness": 20 }]
      },
      {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#fefefe" }, { "lightness": 17 }, { "weight": 1.2 }]
      }
    ];
  }

  getMarkersObservable(): Observable<MapMarker[]> {
    return this.markersSubject.asObservable();
  }

  destroy(): void {
    this.clearMarkers();
    if (this.infoWindow) {
      this.infoWindow.close();
    }
  }
}