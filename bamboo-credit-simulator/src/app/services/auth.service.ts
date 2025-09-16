// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  assigned_bank?: {
    id: string;
    name: string;
    full_name: string;
  };
  assigned_insurance_company?: {
    id: string;
    name: string;
    full_name: string;
  };
  permissions: any;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  admin_user: AdminUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/admin`;
  private currentUserSubject = new BehaviorSubject<AdminUser | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Charger le token et l'utilisateur du localStorage au démarrage
    this.loadFromStorage();
  }

  /**
   * Connexion d'un administrateur
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // Stocker le token et l'utilisateur
        this.setToken(response.access_token);
        this.setCurrentUser(response.admin_user);
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('bamboo_token', response.access_token);
        localStorage.setItem('bamboo_user', JSON.stringify(response.admin_user));
      }),
      catchError(error => {
        console.error('Erreur de connexion:', error);
        throw error;
      })
    );
  }

  /**
   * Déconnexion
   */
  logout(): void {
    // Nettoyer le localStorage
    localStorage.removeItem('bamboo_token');
    localStorage.removeItem('bamboo_user');
    
    // Réinitialiser les subjects
    this.setToken(null);
    this.setCurrentUser(null);
    
    // Rediriger vers la page de connexion
    this.router.navigate(['/auth/login']);
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Obtenir l'utilisateur actuel (observable)
   */
  getCurrentUser(): Observable<AdminUser | null> {
    return this.currentUser$;
  }

  /**
   * Obtenir l'utilisateur actuel (synchrone)
   */
  getCurrentUserSync(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Obtenir le token actuel
   */
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUserSync();
    return user?.role === role;
  }

  /**
   * Vérifier si l'utilisateur est super admin
   */
  isSuperAdmin(): boolean {
    return this.hasRole('super_admin');
  }

  /**
   * Vérifier si l'utilisateur peut gérer les admins
   */
  canManageAdmins(): boolean {
    return this.isSuperAdmin();
  }

  /**
   * Vérifier si l'utilisateur peut accéder à une institution
   */
  canAccessInstitution(institutionId: string, institutionType: 'bank' | 'insurance'): boolean {
    const user = this.getCurrentUserSync();
    if (user?.role === 'super_admin') return true;
    
    if (user?.role === 'bank_admin') {
      return user.assigned_bank?.id === institutionId;
    }
    
    if (user?.role === 'insurance_admin') {
      return user.assigned_insurance_company?.id === institutionId;
    }
    
    return false;
  }

  /**
   * Vérifier les permissions d'un utilisateur
   */
  hasPermission(entity: string, action: string): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    
    // Super admin a tous les droits
    if (user.role === 'super_admin') return true;
    
    const permissions = user.permissions || {};
    
    // Pour les super admins (format array)
    if (permissions[entity] && Array.isArray(permissions[entity])) {
      return permissions[entity].includes(action);
    }
    
    // Pour les autres rôles (format object)
    if (permissions[entity] && typeof permissions[entity] === 'object') {
      return permissions[entity][action] === true;
    }
    
    return false;
  }

  /**
   * Rafraîchir les informations de l'utilisateur
   */
  refreshUser(): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${this.apiUrl}/profile`).pipe(
      tap(user => {
        this.setCurrentUser(user);
        localStorage.setItem('bamboo_user', JSON.stringify(user));
      })
    );
  }

  /**
   * Vérifier si le token est valide
   */
  verifyToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) return of(false);

    return this.http.get(`${this.apiUrl}/verify-token`).pipe(
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  /**
   * Obtenir le nom d'affichage de l'utilisateur
   */
  getUserDisplayName(): string {
    const user = this.getCurrentUserSync();
    if (!user) return '';
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    
    return user.username;
  }

  /**
   * Obtenir le label du rôle
   */
  getRoleLabel(): string {
    const user = this.getCurrentUserSync();
    if (!user) return '';
    
    const roleLabels: { [key: string]: string } = {
      'super_admin': 'Super Administrateur',
      'bank_admin': 'Administrateur Bancaire',
      'insurance_admin': 'Administrateur Assurance',
      'moderator': 'Modérateur',
      'readonly': 'Lecture seule'
    };
    
    return roleLabels[user.role] || user.role;
  }

  /**
   * Obtenir l'institution assignée
   */
  getAssignedInstitution(): { name: string; type: string } | null {
    const user = this.getCurrentUserSync();
    if (!user) return null;
    
    if (user.assigned_bank) {
      return {
        name: user.assigned_bank.name,
        type: 'banque'
      };
    }
    
    if (user.assigned_insurance_company) {
      return {
        name: user.assigned_insurance_company.name,
        type: 'assurance'
      };
    }
    
    return null;
  }

  /**
   * Changer le mot de passe
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  /**
   * Mettre à jour le profil
   */
  updateProfile(profileData: Partial<AdminUser>): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/profile`, profileData).pipe(
      tap(user => {
        this.setCurrentUser(user);
        localStorage.setItem('bamboo_user', JSON.stringify(user));
      })
    );
  }

  // Méthodes privées
  private setToken(token: string | null): void {
    this.tokenSubject.next(token);
  }

  private setCurrentUser(user: AdminUser | null): void {
    this.currentUserSubject.next(user);
  }

  private loadFromStorage(): void {
    try {
      const token = localStorage.getItem('bamboo_token');
      const userJson = localStorage.getItem('bamboo_user');
      
      if (token) {
        this.setToken(token);
      }
      
      if (userJson) {
        const user = JSON.parse(userJson);
        this.setCurrentUser(user);
      }
    } catch (error) {
      console.error('Erreur lors du chargement depuis le localStorage:', error);
      this.logout();
    }
  }
}

