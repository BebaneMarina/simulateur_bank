// src/main.ts - Point d'entrée corrigé
import 'zone.js'; // Doit être en premier

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';

// Démarrage de l'application avec gestion d'erreur
bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('✅ Application Bamboo Financial démarrée avec succès');
    console.log('🏠 Page d\'accueil: /home');
    console.log('🔐 Espace admin: /auth/login');
  })
  .catch(err => {
    console.error('❌ Erreur lors du démarrage de l\'application:', err);
  });