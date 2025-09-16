// src/app/services/admin-auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Router } from '@angular/router';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
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
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  success: boolean;
  user: AdminUser;
  token: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private baseUrl = environment.apiUrl || 'http://localhost:8000/api';
  private currentUserSubject = new BehaviorSubject<AdminUser | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  
  // Observables publics
  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeSession();
  }

  // Getters
  get currentUser(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    const user = this.currentUserSubject.value;
    const token = this.tokenSubject.value;
    return user !== null && token !== null && user.is_active;
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  // Méthodes d'authentification
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/admin/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.user && response.token) {
            this.setUserAndToken(response.user, response.token);
            console.log('Connexion réussie pour:', response.user.username);
            console.log('Permissions utilisateur:', response.user.permissions);
          }
        }),
        catchError(this.handleError)
      );
  }

  logout(): Observable<any> {
    const token = this.token;
    
    // Nettoyer immédiatement la session locale
    this.clearSession();
    
    // Tenter de notifier le serveur (optionnel)
    if (token) {
      return this.http.post(`${this.baseUrl}/admin/logout`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).pipe(
        catchError(() => {
          // Même si la requête échoue, considérer la déconnexion comme réussie
          return new Observable(observer => {
            observer.next({ success: true });
            observer.complete();
          });
        }),
        tap(() => {
          console.log('Déconnexion réussie');
          this.router.navigate(['/auth/login']);
        })
      );
    }
    
    // Si pas de token, rediriger directement
    this.router.navigate(['/auth/login']);
    return new Observable(observer => {
      observer.next({ success: true });
      observer.complete();
    });
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUser && this.currentUser.is_active;
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
    return this.isSuperAdmin() || this.hasPermission('admin_management', 'read');
  }

  /**
   * MÉTHODE CORRIGÉE : Vérifier si l'utilisateur a une permission spécifique
   * Gère le format array utilisé par le backend
   */
  hasPermission(entity: string, action: string): boolean {
    const user = this.currentUser;
    if (!user || !user.is_active) {
      console.log('Utilisateur non connecté ou inactif');
      return false;
    }

    // Super admin a tous les droits
    if (user.role === 'super_admin') {
      console.log('Super admin - Permission accordée');
      return true;
    }

    // Vérifier les permissions spécifiques
    if (user.permissions && user.permissions[entity]) {
      const entityPermissions = user.permissions[entity];
      
      console.log(`Vérification permission ${entity}.${action}:`, entityPermissions);
      
      // Format array : ["create", "read", "update", "delete"]
      if (Array.isArray(entityPermissions)) {
        const hasPermission = entityPermissions.includes(action);
        console.log(`Permission ${entity}.${action}:`, hasPermission);
        return hasPermission;
      }
      
      // Format object : {"create": true, "read": true, ...}
      if (typeof entityPermissions === 'object') {
        const hasPermission = entityPermissions[action] === true;
        console.log(`Permission ${entity}.${action}:`, hasPermission);
        return hasPermission;
      }
    }

    console.log(`Permission ${entity}.${action}: REFUSÉE - Pas de permissions trouvées`);
    return false;
  }

  /**
   * Vérifier si l'utilisateur peut gérer les banques
   */
  canManageBanks(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    
    const canManage = this.isSuperAdmin() || 
           this.hasPermission('banks', 'read') || 
           this.hasPermission('banks', 'create') || 
           this.hasPermission('banks', 'update');
           
    console.log('Can manage banks:', canManage);
    return canManage;
  }

  /**
   * Vérifier si l'utilisateur peut créer des banques
   */
  canCreateBanks(): boolean {
    return this.isSuperAdmin() || this.hasPermission('banks', 'create');
  }

  /**
   * Vérifier si l'utilisateur peut gérer les produits de crédit
   */
  canManageCreditProducts(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    
    const canManage = this.isSuperAdmin() || 
           this.hasPermission('credit_products', 'read') ||
           this.hasPermission('credit_products', 'create') ||
           this.hasPermission('credit_products', 'update');
           
    console.log('Can manage credit products:', canManage);
    return canManage;
  }

  /**
   * Vérifier si l'utilisateur peut créer des produits de crédit
   */
  canCreateCreditProducts(): boolean {
    return this.isSuperAdmin() || this.hasPermission('credit_products', 'create');
  }

  /**
   * Vérifier si l'utilisateur peut gérer les produits d'épargne
   */
  canManageSavingsProducts(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    
    const canManage = this.isSuperAdmin() || 
           this.hasPermission('savings_products', 'read') ||
           this.hasPermission('savings_products', 'create') ||
           this.hasPermission('savings_products', 'update');
           
    console.log('Can manage savings products:', canManage);
    return canManage;
  }

  /**
   * Vérifier si l'utilisateur peut créer des produits d'épargne
   */
  canCreateSavingsProducts(): boolean {
    return this.isSuperAdmin() || this.hasPermission('savings_products', 'create');
  }

  /**
   * Vérifier si l'utilisateur peut gérer les produits d'assurance
   */
  canManageInsuranceProducts(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    
    const canManage = this.isSuperAdmin() || 
           this.hasPermission('insurance_products', 'read') ||
           this.hasPermission('insurance_products', 'create') ||
           this.hasPermission('insurance_products', 'update');
           
    console.log('Can manage insurance products:', canManage);
    return canManage;
  }

  /**
   * Vérifier si l'utilisateur peut créer des produits d'assurance
   */
  canCreateInsuranceProducts(): boolean {
    return this.isSuperAdmin() || this.hasPermission('insurance_products', 'create');
  }

  /**
   * Vérifier si l'utilisateur peut gérer les compagnies d'assurance
   */
  canManageInsuranceCompanies(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    
    return this.isSuperAdmin() || 
           this.hasPermission('insurance_companies', 'read') || 
           this.hasPermission('insurance_companies', 'create') || 
           this.hasPermission('insurance_companies', 'update');
  }

  /**
   * Vérifier si l'utilisateur peut voir les simulations
   */
  canViewSimulations(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    
    const canView = this.isSuperAdmin() || this.hasPermission('simulations', 'read');
    console.log('Can view simulations:', canView);
    return canView;
  }

  /**
   * Vérifier si l'utilisateur peut voir les demandes
   */
  canViewApplications(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    
    const canView = this.isSuperAdmin() || this.hasPermission('applications', 'read');
    console.log('Can view applications:', canView);
    return canView;
  }

  /**
   * Vérifier si l'utilisateur peut gérer les paramètres
   */
  canManageSettings(): boolean {
    return this.isSuperAdmin() || this.hasPermission('system_settings', 'read');
  }

  /**
   * Obtenir l'utilisateur actuel (synchrone)
   */
  getCurrentUserSync(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  // Méthodes utilitaires
  getUserDisplayName(): string {
    const user = this.currentUser;
    if (!user) return '';
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username;
  }

  getRoleLabel(): string {
    const user = this.currentUser;
    if (!user) return '';

    const roleLabels: { [key: string]: string } = {
      'super_admin': 'Super Administrateur',
      'admin': 'Administrateur',
      'bank_admin': 'Administrateur Bancaire',
      'insurance_admin': 'Administrateur Assurance',
      'manager': 'Gestionnaire',
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

  // Méthodes de vérification de rôle (gardées pour compatibilité)
  canUpdateApplications(): boolean {
    return this.hasPermission('applications', 'update') || this.isSuperAdmin();
  }

  isAdmin(): boolean {
    return ['super_admin', 'admin'].includes(this.currentUser?.role || '');
  }

  // Vérification du token
  verifyToken(): Observable<boolean> {
    const token = this.token;
    if (!token) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    return this.http.get<unknown>(`${this.baseUrl}/admin/verify-token`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      map(() => true),
      catchError(() => {
        console.log('Token invalide, déconnexion');
        this.clearSession();
        return new Observable<boolean>(observer => {
          observer.next(false);
          observer.complete();
        });
      })
    );
  }

  /**
   * Rafraîchir les informations de l'utilisateur
   */
  refreshUser(): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${this.baseUrl}/admin/profile`).pipe(
      tap(user => {
        this.setCurrentUser(user);
        localStorage.setItem('admin_user', JSON.stringify(user));
      })
    );
  }

  /**
   * Changer le mot de passe
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/change-password`, {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  /**
   * Mettre à jour le profil
   */
  updateProfile(profileData: Partial<AdminUser>): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.baseUrl}/admin/profile`, profileData).pipe(
      tap(user => {
        this.setCurrentUser(user);
        localStorage.setItem('admin_user', JSON.stringify(user));
      })
    );
  }

  // Méthodes privées
  private initializeSession(): void {
    this.loadFromStorage();
    
    // Vérifier périodiquement le token si l'utilisateur est connecté
    setInterval(() => {
      if (this.isAuthenticated) {
        this.checkTokenValidity();
      }
    }, 5 * 60 * 1000); // Vérifier toutes les 5 minutes
  }

  private loadFromStorage(): void {
    try {
      const storedUser = localStorage.getItem('admin_user');
      const storedToken = localStorage.getItem('admin_token');
      const tokenExpiration = localStorage.getItem('token_expiration');
      
      if (storedUser && storedToken) {
        // Vérifier l'expiration
        if (tokenExpiration) {
          const expirationTime = parseInt(tokenExpiration);
          if (new Date().getTime() > expirationTime) {
            console.log('Token expiré, nettoyage de la session');
            this.clearSession();
            return;
          }
        }
        
        const user = JSON.parse(storedUser);
        if (user.is_active) {
          this.currentUserSubject.next(user);
          this.tokenSubject.next(storedToken);
          console.log('Session restaurée pour:', user.username);
          console.log('Permissions chargées:', user.permissions);
        } else {
          console.log('Utilisateur inactif, nettoyage de la session');
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la session:', error);
      this.clearSession();
    }
  }

  private setUserAndToken(user: AdminUser, token: string): void {
    // Mettre à jour les subjects
    this.currentUserSubject.next(user);
    this.tokenSubject.next(token);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('admin_user', JSON.stringify(user));
    localStorage.setItem('admin_token', token);
    
    // Définir une date d'expiration (24 heures)
    const expirationTime = new Date().getTime() + (24 * 60 * 60 * 1000);
    localStorage.setItem('token_expiration', expirationTime.toString());
    
    // Sauvegarder l'heure de dernière activité
    localStorage.setItem('last_activity', new Date().getTime().toString());
  }

  private setCurrentUser(user: AdminUser | null): void {
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    // Nettoyer localStorage
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('token_expiration');
    localStorage.removeItem('last_activity');
    
    // Réinitialiser les subjects
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
  }

  private checkTokenValidity(): void {
    const lastActivity = localStorage.getItem('last_activity');
    if (lastActivity) {
      const lastActivityTime = parseInt(lastActivity);
      const now = new Date().getTime();
      const inactivityTime = now - lastActivityTime;
      
      // Déconnecter après 2 heures d'inactivité
      if (inactivityTime > 2 * 60 * 60 * 1000) {
        console.log('Session expirée par inactivité');
        this.logout().subscribe();
        return;
      }
    }
    
    // Mettre à jour l'heure de dernière activité
    localStorage.setItem('last_activity', new Date().getTime().toString());
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'Erreur de connexion';
    
    if (error.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect';
    } else if (error.status === 403) {
      errorMessage = 'Compte désactivé ou accès refusé';
    } else if (error.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur';
    }
    
    console.error('Erreur d\'authentification:', error);
    return throwError(() => new Error(errorMessage));
  };

  // Méthode temporaire pour les tests
  mockLogin(): void {
    const mockUser: AdminUser = {
      id: 'admin_001',
      username: 'superadmin',
      email: 'admin@bamboo-credit.ga',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      permissions: {
        applications: ['read', 'update', 'delete'],
        banks: ['read', 'create', 'update', 'delete'],
        credit_products: ['read', 'create', 'update', 'delete']
      },
      is_active: true,
      last_login: new Date().toISOString()
    };
    
    this.setUserAndToken(mockUser, 'mock_token_123');
    console.log('Connexion de test activée');
  }
}