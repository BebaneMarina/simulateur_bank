// src/app/guards/permission.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.services';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredPermission = route.data['requiredPermission'];
    const requiredRole = route.data['requiredRole'];
    
    // Vérifier si l'utilisateur est connecté
    if (!this.adminAuth.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Vérifier le rôle si spécifié
    if (requiredRole && !this.adminAuth.hasRole(requiredRole)) {
      this.redirectToUnauthorized();
      return false;
    }

    // Vérifier les permissions si spécifiées
    if (requiredPermission) {
      const hasPermission = this.adminAuth.hasPermission(
        requiredPermission.entity, 
        requiredPermission.action
      );

      if (!hasPermission) {
        this.redirectToUnauthorized();
        return false;
      }
    }

    return true;
  }

  private redirectToUnauthorized(): void {
    // Rediriger vers le dashboard avec un message d'erreur
    this.router.navigate(['/admin/dashboard'], {
      queryParams: { error: 'access_denied' }
    });
  }
}