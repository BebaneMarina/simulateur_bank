// src/app/auth/login.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.services';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface LoginRequest {
  username: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <img src="/assets/bamboo-logo.png" alt="Bamboo" class="logo" 
               onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiM2NjdlZWEiLz4KPHRleHQgeD0iMzAiIHk9IjM1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9ImJvbGQiPkI8L3RleHQ+Cjwvc3ZnPg=='">
          <h1>simbot gab Admin</h1>
          <p>Connectez-vous à votre espace administrateur</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form" novalidate>
          <div class="form-group">
            <label for="username">Nom d'utilisateur</label>
            <input 
              type="text" 
              id="username"
              formControlName="username"
              class="form-control"
              [class.error]="hasError('username')"
              placeholder="Entrez votre nom d'utilisateur"
              autocomplete="username"
              spellcheck="false">
            <div *ngIf="hasError('username')" class="error-message">
              {{ getErrorMessage('username') }}
            </div>
          </div>

          <div class="form-group">
            <label for="password">Mot de passe</label>
            <div class="password-input-container">
              <input 
                [type]="showPassword ? 'text' : 'password'"
                id="password"
                formControlName="password"
                class="form-control"
                [class.error]="hasError('password')"
                placeholder="Entrez votre mot de passe"
                autocomplete="current-password">
              <button 
                type="button" 
                class="password-toggle"
                (click)="togglePasswordVisibility()"
                tabindex="-1"
                [attr.aria-label]="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                <span class="password-icon">{{ showPassword ? '' : '' }}</span>
              </button>
            </div>
            <div *ngIf="hasError('password')" class="error-message">
              {{ getErrorMessage('password') }}
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-error" role="alert">
            <strong>Erreur:</strong> {{ errorMessage }}
          </div>

          <div *ngIf="successMessage" class="alert alert-success" role="alert">
            <strong>Succès:</strong> {{ successMessage }}
          </div>

          <button 
            type="submit" 
            [disabled]="loginForm.invalid || isLoading"
            class="btn btn-primary btn-full"
            [attr.aria-busy]="isLoading">
            <span *ngIf="isLoading" class="spinner" aria-hidden="true"></span>
            {{ isLoading ? 'Connexion en cours...' : 'Se connecter' }}
          </button>
        </form>

        <div class="login-footer">
          <p>
            <a href="#" (click)="forgotPassword($event)" class="forgot-link">
              Mot de passe oublié ?
            </a>
          </p>
          
          <!-- Section de test pour le développement -->
          <div class="demo-credentials" *ngIf="isDevelopment">
            <h4>Comptes de démonstration :</h4>
            
            <div class="demo-account">
              <div class="demo-info">
                <strong>Super Admin:</strong> superadmin / admin
              </div>
              <button 
                type="button" 
                (click)="fillDemoCredentials('superadmin', 'admin')" 
                class="btn-demo"
                [disabled]="isLoading">
                Utiliser
              </button>
            </div>
            
            <div class="demo-account">
              <div class="demo-info">
                <strong>Admin:</strong> admin / admin
              </div>
              <button 
                type="button" 
                (click)="fillDemoCredentials('admin', 'admin')" 
                class="btn-demo"
                [disabled]="isLoading">
                Utiliser
              </button>
            </div>
            
            <div class="demo-account">
              <div class="demo-info">
                <strong>Test rapide:</strong>
              </div>
              <button 
                type="button" 
                (click)="mockLogin()" 
                class="btn-demo btn-mock"
                [disabled]="isLoading">
                Connexion de test
              </button>
            </div>
          </div>

          <!-- Information de session pour le debug -->
          <div class="debug-info" *ngIf="isDevelopment && showDebugInfo">
            <h5>Informations de debug :</h5>
            <p><strong>Session active:</strong> {{ debugInfo.hasSession ? 'Oui' : 'Non' }}</p>
            <p><strong>Token présent:</strong> {{ debugInfo.hasToken ? 'Oui' : 'Non' }}</p>
            <p><strong>Utilisateur:</strong> {{ debugInfo.username || 'Aucun' }}</p>
            <button type="button" (click)="clearSession()" class="btn-debug">
              Vider la session
            </button>
          </div>
          
          <button 
            type="button" 
            (click)="toggleDebugInfo()" 
            class="debug-toggle"
            *ngIf="isDevelopment">
            {{ showDebugInfo ? 'Masquer' : 'Afficher' }} les infos de debug
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  returnUrl = '';
  showPassword = false;
  isDevelopment = !this.isProduction();
  showDebugInfo = false;
  
  debugInfo = {
    hasSession: false,
    hasToken: false,
    username: ''
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private adminAuth: AdminAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.handleRouteParams();
    this.checkExistingSession();
    this.updateDebugInfo();
    
    // Écouter les changements d'état d'authentification
    this.adminAuth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDebugInfo();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isProduction(): boolean {
    // Vérifier si on est en mode production
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('127.0.0.1');
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      username: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(50)
      ]],
      password: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(100)
      ]]
    });

    // Écouter les changements pour nettoyer les messages d'erreur
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.errorMessage) {
          this.errorMessage = '';
        }
      });
  }

  private handleRouteParams(): void {
    const queryParams = this.route.snapshot.queryParams;
    this.returnUrl = queryParams['returnUrl'] || '/admin/dashboard';
    
    // Afficher un message selon la raison de la redirection
    const reason = queryParams['reason'];
    switch (reason) {
      case 'session_expired':
        this.errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
        break;
      case 'unauthorized':
        this.errorMessage = 'Accès non autorisé. Veuillez vous connecter.';
        break;
      case 'logout':
        this.successMessage = 'Vous avez été déconnecté avec succès.';
        break;
    }
  }

  private checkExistingSession(): void {
    // Si déjà connecté, rediriger immédiatement
    if (this.adminAuth.isAuthenticated) {
      console.log('Utilisateur déjà connecté, redirection vers:', this.returnUrl);
      this.router.navigate([this.returnUrl]);
      return;
    }

    // Vérifier s'il y a des données de session dans localStorage
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    
    if (token && user) {
      console.log('Session trouvée dans localStorage, tentative de restauration...');
      
      // Donner un peu de temps au service pour initialiser
      setTimeout(() => {
        if (this.adminAuth.isAuthenticated) {
          console.log('Session restaurée avec succès');
          this.router.navigate([this.returnUrl]);
        } else {
          console.log('Échec de la restauration de session');
          this.clearStoredSession();
        }
      }, 100);
    }
  }

  private clearStoredSession(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('token_expiration');
    localStorage.removeItem('last_activity');
  }

  private updateDebugInfo(): void {
    if (this.isDevelopment) {
      this.debugInfo = {
        hasSession: this.adminAuth.isAuthenticated,
        hasToken: !!localStorage.getItem('admin_token'),
        username: this.adminAuth.currentUser?.username || ''
      };
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.performLogin();
  }

  private performLogin(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const credentials: LoginRequest = {
      username: this.loginForm.value.username.trim(),
      password: this.loginForm.value.password
    };

    console.log('Tentative de connexion pour:', credentials.username);

    this.adminAuth.login(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleLoginSuccess(response);
        },
        error: (error) => {
          this.handleLoginError(error);
        }
      });
  }

  private handleLoginSuccess(response: any): void {
    this.isLoading = false;
    console.log('Connexion réussie:', response);
    
    this.successMessage = 'Connexion réussie ! Redirection en cours...';
    this.updateDebugInfo();
    
    // Redirection après un court délai
    setTimeout(() => {
      this.router.navigate([this.returnUrl]);
    }, 1500);
  }

  private handleLoginError(error: any): void {
    this.isLoading = false;
    console.error('Erreur de connexion:', error);
    
    // Déterminer le message d'erreur approprié
    if (error.status === 401) {
      this.errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect.';
    } else if (error.status === 403) {
      this.errorMessage = 'Compte désactivé ou accès refusé.';
    } else if (error.status === 0) {
      this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    } else {
      this.errorMessage = error.message || 'Erreur de connexion. Veuillez réessayer.';
    }
    
    // Réinitialiser le mot de passe pour la sécurité
    this.loginForm.patchValue({ password: '' });
    this.loginForm.get('password')?.markAsUntouched();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  hasError(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!(control?.errors && (control?.dirty || control?.touched));
  }

  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    if (!control?.errors) return '';

    const errors = control.errors;

    if (errors['required']) {
      return 'Ce champ est requis';
    }

    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `Minimum ${requiredLength} caractères requis`;
    }

    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      return `Maximum ${maxLength} caractères autorisés`;
    }

    return 'Valeur invalide';
  }

  forgotPassword(event: Event): void {
    event.preventDefault();
    
    const message = 'Pour récupérer votre mot de passe, veuillez contacter votre administrateur système à l\'adresse : admin@bamboo-credit.ga';
    
    if (confirm(message + '\n\nVoulez-vous ouvrir votre client de messagerie ?')) {
      window.location.href = 'mailto:admin@bamboo-credit.ga?subject=Récupération de mot de passe&body=Bonjour,%0D%0A%0D%0AJe souhaite récupérer mon mot de passe pour accéder à l\'interface d\'administration Bamboo.%0D%0A%0D%0ANom d\'utilisateur : [Votre nom d\'utilisateur]%0D%0A%0D%0AMerci.';
    }
  }

  // Méthodes de développement
  fillDemoCredentials(username: string, password: string): void {
    if (this.isDevelopment && !this.isLoading) {
      this.loginForm.patchValue({
        username: username,
        password: password
      });
      this.errorMessage = '';
      this.successMessage = '';
      
      // Optionnellement, se connecter automatiquement après un délai
      setTimeout(() => {
        if (confirm('Voulez-vous vous connecter automatiquement avec ces identifiants ?')) {
          this.performLogin();
        }
      }, 500);
    }
  }

  mockLogin(): void {
    if (this.isDevelopment && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = 'Activation de la connexion de test...';
      
      // Simuler un délai de connexion
      setTimeout(() => {
        try {
          this.adminAuth.mockLogin();
          this.isLoading = false;
          this.successMessage = 'Connexion de test activée ! Redirection...';
          this.updateDebugInfo();
          
          setTimeout(() => {
            this.router.navigate([this.returnUrl]);
          }, 1000);
        } catch (error) {
          this.isLoading = false;
          this.errorMessage = 'Erreur lors de la connexion de test.';
          console.error('Erreur mock login:', error);
        }
      }, 800);
    }
  }

  toggleDebugInfo(): void {
    this.showDebugInfo = !this.showDebugInfo;
    this.updateDebugInfo();
  }

  clearSession(): void {
    if (confirm('Êtes-vous sûr de vouloir vider la session ?')) {
      this.clearStoredSession();
      this.adminAuth.logout().subscribe();
      this.updateDebugInfo();
      this.successMessage = 'Session vidée avec succès.';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
      control?.markAsDirty();
    });
  }

  // Méthodes utilitaires pour le template
  get currentUsername(): string {
    return this.loginForm.get('username')?.value || '';
  }

  get formValid(): boolean {
    return this.loginForm.valid;
  }

  get canSubmit(): boolean {
    return this.formValid && !this.isLoading;
  }
}