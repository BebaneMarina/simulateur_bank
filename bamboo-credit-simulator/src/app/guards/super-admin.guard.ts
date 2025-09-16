// src/app/guards/super-admin.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    return this.authService.getCurrentUser().pipe(
      map(user => {
        // Vérifier si l'utilisateur est connecté et est super admin
        if (user && user.role === 'super_admin') {
          return true;
        } else {
          // Rediriger vers le dashboard admin si connecté mais pas super admin
          if (user) {
            this.router.navigate(['/admin/dashboard']);
          } else {
            // Rediriger vers la page de connexion si pas connecté
            this.router.navigate(['/auth/login']);
          }
          return false;
        }
      }),
      catchError((error) => {
        console.error('Erreur dans SuperAdminGuard:', error);
        this.router.navigate(['/auth/login']);
        return of(false);
      })
    );
  }
}