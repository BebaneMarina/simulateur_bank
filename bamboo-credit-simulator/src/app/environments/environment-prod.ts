export const environmentProd = {
  production: true,
  apiUrl: 'https://api.bamboo-credit.ga/api',
  allowedOrigins: [
    'https://bamboo-credit.ga',
    'https://www.bamboo-credit.ga'
  ],
  enableMockLogin: false,
  tokenExpirationHours: 8,
  sessionTimeoutMinutes: 60, // 1 heure d'inactivité
  enableDebugLogs: false
};