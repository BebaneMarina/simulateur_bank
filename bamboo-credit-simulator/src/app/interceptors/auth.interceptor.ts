// src/app/interceptors/auth.interceptor.ts - Version complète corrigée
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.services';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private activeRequests = 0;

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.activeRequests++;

    console.log(`🔍 Intercepteur: ${req.method} ${req.url}`);

    // URLs qui ne nécessitent JAMAIS d'authentification
    const publicUrls = [
      '/admin/login',
      '/auth/login', 
      '/api/public',
      '/api/banks',
      '/api/credit-products',
      '/api/savings-products',
      '/api/insurance-products',
      '/api/simulations',
      '/api/quotes',
      '/api/health',
      '/api/stats',
      '/api/search',
      '/api/version',
      '/api/test-cors',
      // Ajoutez d'autres endpoints publics ici
    ];

    // URLs utilisateur (pas admin) - peuvent avoir leur propre token
    const userUrls = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/me',
      '/api/auth/verify',
      '/api/auth/resend-verification',
      '/api/auth/logout',
      '/api/auth/profile'
    ];

    // Vérifier si c'est une URL publique
    const isPublicUrl = publicUrls.some(url => req.url.includes(url));
    const isUserUrl = userUrls.some(url => req.url.includes(url));
    
    if (isPublicUrl) {
      console.log('📖 URL publique - pas d\'auth nécessaire');
      return next.handle(req).pipe(
        finalize(() => this.activeRequests--)
      );
    }

    // Gestion des URLs utilisateur (pas admin)
    if (isUserUrl) {
      console.log('👤 URL utilisateur détectée');
      const userToken = localStorage.getItem('user_token');
      let authReq = req;
      
      if (userToken) {
        console.log('🔐 Ajout token utilisateur');
        authReq = req.clone({
          setHeaders: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        console.log('⚠️ Pas de token utilisateur trouvé');
      }
      
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // Pour les endpoints utilisateur, ne pas rediriger automatiquement
          if (error.status === 401) {
            console.log('❌ Token utilisateur invalide ou expiré');
            // Nettoyer le token utilisateur invalide
            localStorage.removeItem('user_token');
            localStorage.removeItem('user_user');
          }
          return throwError(() => error);
        }),
        finalize(() => this.activeRequests--)
      );
    }

    // Gestion des URLs admin
    const isAdminUrl = req.url.includes('/api/admin/');
    
    if (isAdminUrl) {
      console.log('🔧 URL admin détectée');
      const adminToken = this.adminAuth.token;
      let authReq = req;
      
      if (adminToken) {
        console.log('🔐 Ajout token admin');
        authReq = req.clone({
          setHeaders: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        console.log('⚠️ Pas de token admin trouvé pour URL admin');
      }

      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleAdminHttpError(error);
          return throwError(() => error);
        }),
        finalize(() => this.activeRequests--)
      );
    }

    // Pour toutes les autres URLs, pas d'authentification
    console.log('🌐 URL standard - pas d\'auth');
    return next.handle(req).pipe(
      finalize(() => this.activeRequests--)
    );
  }

  private handleAdminHttpError(error: HttpErrorResponse): void {
    console.error('❌ Erreur HTTP Admin:', error);

    switch (error.status) {
      case 401:
        console.warn('🔒 Token admin non valide ou expiré. Déconnexion automatique.');
        this.adminAuth.logout().subscribe({
          complete: () => {
            // Seulement rediriger si on est actuellement sur une route admin
            if (this.router.url.startsWith('/admin')) {
              this.router.navigate(['/auth/login'], {
                queryParams: { 
                  returnUrl: this.router.url,
                  reason: 'session_expired' 
                }
              });
            }
          }
        });
        break;
        
      case 403:
        console.warn('🚫 Accès interdit pour cette ressource admin.');
        if (this.router.url.startsWith('/admin')) {
          this.router.navigate(['/403']);
        }
        break;
        
      case 404:
        console.warn('❓ Ressource admin non trouvée:', error.url);
        break;
        
      case 0:
        console.error('🔌 Erreur réseau: Impossible de contacter le serveur');
        break;
        
      case 500:
        console.error('💥 Erreur serveur interne');
        break;
        
      default:
        console.error(`⚠️ Erreur HTTP ${error.status}:`, error.message);
    }
  }

  // Méthode pour vérifier s'il y a des requêtes en cours
  get hasActiveRequests(): boolean {
    return this.activeRequests > 0;
  }
}