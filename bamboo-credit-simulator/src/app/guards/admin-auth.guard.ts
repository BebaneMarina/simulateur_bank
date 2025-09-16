// src/app/guards/admin-auth.guard.ts - Version corrigée
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.services';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthGuard implements CanActivate {

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    
    console.log('AdminAuthGuard: Vérification pour URL:', state.url);

    // ⚠️ IMPORTANT: Ce guard ne s'active QUE pour les routes qui commencent par /admin
    if (!state.url.startsWith('/admin')) {
      console.log('AdminAuthGuard: Route publique autorisée:', state.url);
      return true; // Toujours autoriser les routes non-admin
    }

    console.log('AdminAuthGuard: Vérification authentification pour route admin:', state.url);

    // Vérifier l'authentification SEULEMENT pour les routes admin
    if (this.checkAuthentication()) {
      console.log('AdminAuthGuard: Authentifié, accès autorisé');
      return true;
    }

    // Redirection vers login SEULEMENT si route admin et non authentifié
    console.log('AdminAuthGuard: Non authentifié, redirection vers login');
    this.router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  private checkAuthentication(): boolean {
    try {
      // Vérifier d'abord si une session existe dans le localStorage
      const token = localStorage.getItem('admin_token');
      const userString = localStorage.getItem('admin_user');
      
      if (!token || !userString) {
        console.log('AdminAuthGuard: Aucune session admin trouvée');
        return false;
      }

      const user = JSON.parse(userString);
      
      // Vérifier que l'utilisateur est actif
      if (!user.is_active) {
        console.log('AdminAuthGuard: Utilisateur admin inactif');
        this.clearSession();
        return false;
      }

      // Vérifier l'expiration du token
      const tokenExpiration = localStorage.getItem('token_expiration');
      if (tokenExpiration) {
        const expirationTime = parseInt(tokenExpiration);
        if (new Date().getTime() > expirationTime) {
          console.log('AdminAuthGuard: Token admin expiré');
          this.clearSession();
          return false;
        }
      }

      // Si le service n'a pas encore les données, les charger
      if (!this.adminAuth.isAuthenticated) {
        console.log('AdminAuthGuard: Restauration session admin depuis localStorage');
        this.restoreSession(user, token);
      }

      return this.adminAuth.isAuthenticated;

    } catch (error) {
      console.error('AdminAuthGuard: Erreur vérification session:', error);
      this.clearSession();
      return false;
    }
  }

  private restoreSession(user: any, token: string): void {
    try {
      (this.adminAuth as any).currentUserSubject?.next(user);
      (this.adminAuth as any).tokenSubject?.next(token);
    } catch (error) {
      console.error('Erreur restauration session admin:', error);
    }
  }

  private clearSession(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('token_expiration');
    localStorage.removeItem('last_activity');
  }
}