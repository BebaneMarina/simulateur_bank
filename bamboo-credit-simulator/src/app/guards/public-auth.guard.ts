// src/app/guards/public-auth.guard.ts - Guard pour l'authentification utilisateur public
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PublicAuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | Observable<boolean> {
    
    console.log('PublicAuthGuard: Vérification pour URL:', state.url);

    // Pour l'instant, autoriser toutes les routes publiques
    // Plus tard, vous pourrez ajouter une logique d'authentification utilisateur si nécessaire
    
    // Exemple de routes qui pourraient nécessiter une authentification utilisateur :
    const protectedPublicRoutes = [
      '/user/profile',
      '/user/applications', 
      '/user/simulations'
      // Ajoutez ici les routes qui nécessitent une connexion utilisateur
    ];

    const isProtectedRoute = protectedPublicRoutes.some(route => state.url.startsWith(route));
    
    if (isProtectedRoute) {
      // Vérifier si l'utilisateur est connecté
      const userToken = localStorage.getItem('user_token');
      if (!userToken) {
        console.log('PublicAuthGuard: Route protégée, redirection vers connexion utilisateur');
        // Rediriger vers une page de connexion utilisateur (à créer)
        this.router.navigate(['/user/login'], { 
          queryParams: { returnUrl: state.url }
        });
        return false;
      }
    }

    // Toujours autoriser l'accès aux routes publiques
    console.log('PublicAuthGuard: Accès autorisé pour route publique');
    return true;
  }
}