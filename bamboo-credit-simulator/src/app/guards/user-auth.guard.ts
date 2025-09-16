// src/app/guards/user-auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AuthService } from '../services/user-auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserAuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.getCurrentUser().pipe(
      map(user => {
        if (user) {
          return true;
        } else {
          // Rediriger vers la page de connexion si non authentifié
          this.router.navigate(['/auth/login'], {
            queryParams: { 
              returnUrl: this.router.url,
              message: 'Veuillez vous connecter pour accéder à cette page'
            }
          });
          return false;
        }
      }),
      catchError(() => {
        // En cas d'erreur, rediriger vers la connexion
        this.router.navigate(['/auth/login'], {
          queryParams: { 
            returnUrl: this.router.url,
            message: 'Session expirée, veuillez vous reconnecter'
          }
        });
        return of(false);
      })
    );
  }
}