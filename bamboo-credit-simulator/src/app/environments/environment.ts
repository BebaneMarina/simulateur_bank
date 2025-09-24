export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  enableMockLogin: true,
  tokenExpirationHours: 24,
  sessionTimeoutMinutes: 120, // 2 heures d'inactivité
  enableDebugLogs: true,
googleMapsApiKey: 'VOTRE_CLE_API_GOOGLE_MAPS', // Remplacez par votre vraie clé
  mapConfig: {
    defaultCenter: {
      lat: 0.45,
      lng: 0.4
    },
    defaultZoom: 2
  }
};
