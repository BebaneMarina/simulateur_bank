// src/app/components/header/header.component.ts - Version corrigée
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import conditionnel - seulement si vous voulez la fonctionnalité d'auth utilisateur
// import { AuthService, User } from '../../services/user-auth.service';

// Interface temporaire pour éviter les erreurs
interface User {
  first_name?: string;
  last_name?: string;
  email?: string;
  id?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header">
      <nav class="nav-container">
        <div class="nav-brand">
          <a routerLink="/simulator-home" class="brand-link">
            <span class="brand-text">SimBot Gab</span>
          </a>
        </div>

        <div class="nav-menu">
          <a routerLink="/simulator-home" routerLinkActive="active" class="nav-link">Accueil</a>
          <a routerLink="/multi-bank-comparator" routerLinkActive="active" class="nav-link">Comparateur</a>
          
          <!-- Dropdown Simulateurs -->
          <div class="nav-dropdown">
            <button class="nav-dropdown-toggle">
              Simulateurs
              <svg class="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div class="nav-dropdown-menu">
              <a routerLink="/savings-simulator" class="dropdown-item">Simulateur d'épargne</a>
              <a routerLink="/insurance-comparator" class="dropdown-item">Comparateur d'assurances</a>
            </div>
          </div>

          <!-- Dropdown Services -->
          <div class="nav-dropdown">
            <button class="nav-dropdown-toggle">
              Services
              <svg class="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div class="nav-dropdown-menu">
              <a routerLink="/bank-rates" class="dropdown-item">Tarifs bancaires</a>
              <a routerLink="/bank-locator" class="dropdown-item">Localiser une banque</a>
            </div>
          </div>

          <!-- Menu utilisateur connecté - DÉSACTIVÉ temporairement -->
          <div *ngIf="isAuthenticated" class="user-menu">
            <div class="user-dropdown" [class.show]="showUserMenu">
              <button class="user-toggle" (click)="toggleUserMenu()">
                <div class="user-avatar">{{ getUserInitials() }}</div>
                <span class="user-name">{{ getFirstName() }}</span>
                <svg class="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <div class="dropdown-menu" [class.show]="showUserMenu">
                <a routerLink="/dashboard" (click)="closeUserMenu()" class="dropdown-item">Mon Espace</a>
                <a routerLink="/simulations" (click)="closeUserMenu()" class="dropdown-item">Mes Simulations</a>
                <a routerLink="/applications" (click)="closeUserMenu()" class="dropdown-item">Mes Demandes</a>
                <a routerLink="/profile" (click)="closeUserMenu()" class="dropdown-item">Mon Profil</a>
                <div class="dropdown-divider"></div>
                <button (click)="logout()" class="dropdown-item logout">Se déconnecter</button>
              </div>
            </div>
          </div>

        </div>

        <!-- Menu mobile -->
        <button class="mobile-menu-toggle" (click)="toggleMobileMenu()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </nav>

      <!-- Menu mobile overlay -->
      <div *ngIf="showMobileMenu" class="mobile-menu-overlay" (click)="closeMobileMenu()">
        <div class="mobile-menu">
          <div class="mobile-menu-header">
            <span class="brand-text">SimBot Gab</span>
            <button (click)="closeMobileMenu()" class="close-button">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="mobile-menu-content">
            <a routerLink="/simulator-home" (click)="closeMobileMenu()" class="mobile-nav-link">Accueil</a>
            <a routerLink="/multi-bank-comparator" (click)="closeMobileMenu()" class="mobile-nav-link">Comparateur</a>
            <a routerLink="/tracking" (click)="closeMobileMenu()" class="mobile-nav-link">Suivi</a>
            
            <!-- Simulateurs mobiles -->
            <div class="mobile-section-title">Simulateurs</div>
            <a routerLink="/borrowing-capacity" (click)="closeMobileMenu()" class="mobile-nav-link">Capacité d'emprunt</a>
            <a routerLink="/payment-calculator" (click)="closeMobileMenu()" class="mobile-nav-link">Calculateur de mensualités</a>
            <a routerLink="/savings-simulator" (click)="closeMobileMenu()" class="mobile-nav-link">Simulateur d'épargne</a>
            <a routerLink="/insurance-comparator" (click)="closeMobileMenu()" class="mobile-nav-link">Comparateur d'assurances</a>
            
            <!-- Services mobiles -->
            <div class="mobile-section-title">Services</div>
            <a routerLink="/bank-rates" (click)="closeMobileMenu()" class="mobile-nav-link">Tarifs bancaires</a>
            <a routerLink="/bank-locator" (click)="closeMobileMenu()" class="mobile-nav-link">Localiser une banque</a>

            <!-- Section authentification mobile -->
            <div *ngIf="!isAuthenticated" class="mobile-auth-section">
              <a routerLink="/user/login" (click)="closeMobileMenu()" class="mobile-nav-link">Connexion</a>
              <a routerLink="/user/register" (click)="closeMobileMenu()" class="mobile-register-btn">Inscription</a>
            </div>

            <!-- Section utilisateur connecté mobile -->
            <div *ngIf="isAuthenticated" class="mobile-user-section">
              <div class="mobile-user-info">
                <div class="user-avatar">{{ getUserInitials() }}</div>
                <span class="user-name">{{ getFullName() }}</span>
              </div>
              
              <a routerLink="/dashboard" (click)="closeMobileMenu()" class="mobile-nav-link">Mon Espace</a>
              <a routerLink="/simulations" (click)="closeMobileMenu()" class="mobile-nav-link">Mes Simulations</a>
              <a routerLink="/applications" (click)="closeMobileMenu()" class="mobile-nav-link">Mes Demandes</a>
              <a routerLink="/profile" (click)="closeMobileMenu()" class="mobile-nav-link">Mon Profil</a>
              
              <button (click)="logout(); closeMobileMenu()" class="mobile-nav-link logout">Se déconnecter</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Overlay pour fermer les menus -->
      <div *ngIf="showUserMenu || showMobileMenu" class="overlay" (click)="closeAllMenus()"></div>
    </header>
  `,
  styles: [`
    .header {
      background: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .nav-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 70px;
    }

    .brand-link {
      text-decoration: none;
    }

    .brand-text {
      font-size: 1.5rem;
      font-weight: 800;
      color: #1a4d3a;
      background: linear-gradient(135deg, #1a4d3a 0%, #2d5e4f 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nav-menu {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .nav-link {
      color: #6b7280;
      text-decoration: none;
      font-weight: 500;
      padding: 0.5rem 0;
      transition: color 0.3s ease;
      position: relative;
    }

    .nav-link:hover,
    .nav-link.active {
      color: #1a4d3a;
    }

    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(135deg, #1a4d3a 0%, #2d5e4f 100%);
      border-radius: 1px;
    }

    /* Dropdown Navigation */
    .nav-dropdown {
      position: relative;
    }

    .nav-dropdown-toggle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: none;
      border: none;
      color: #6b7280;
      font-weight: 500;
      cursor: pointer;
      padding: 0.5rem 0;
      transition: color 0.3s ease;
    }

    .nav-dropdown:hover .nav-dropdown-toggle {
      color: #1a4d3a;
    }

    .nav-dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      min-width: 200px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
      z-index: 50;
    }

    .nav-dropdown:hover .nav-dropdown-menu {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-arrow {
      width: 1rem;
      height: 1rem;
      transition: transform 0.2s ease;
    }

    .nav-dropdown:hover .dropdown-arrow {
      transform: rotate(180deg);
    }

    .dropdown-item {
      display: block;
      padding: 0.75rem 1rem;
      color: #374151;
      text-decoration: none;
      transition: background 0.2s ease;
      border-radius: 0.25rem;
      margin: 0.25rem;
    }

    .dropdown-item:hover {
      background: #f3f4f6;
      color: #1a4d3a;
    }

    /* Auth Menu */
    .auth-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .auth-link {
      color: #1a4d3a;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .auth-link:hover {
      color: #2d5e4f;
    }

    .btn-register {
      background: linear-gradient(135deg, #1a4d3a 0%, #2d5e4f 100%);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .btn-register:hover {
      background: linear-gradient(135deg, #2d5e4f 0%, #1a4d3a 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(26, 77, 58, 0.3);
    }

    /* User Menu Styles */
    .user-menu {
      position: relative;
    }

    .user-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.5rem;
      transition: background 0.2s ease;
    }

    .user-toggle:hover {
      background: #f3f4f6;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #1a4d3a 0%, #2d5e4f 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .user-name {
      color: #374151;
      font-weight: 500;
    }

    .user-dropdown.show .dropdown-arrow {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      min-width: 200px;
      z-index: 50;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
    }

    .dropdown-menu.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-menu .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      color: #374151;
      text-decoration: none;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .dropdown-menu .dropdown-item:hover {
      background: #f3f4f6;
    }

    .dropdown-menu .dropdown-item.logout {
      color: #dc2626;
    }

    .dropdown-menu .dropdown-item.logout:hover {
      background: #fef2f2;
    }

    .dropdown-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 0.5rem 0;
    }

    /* Mobile Menu */
    .mobile-menu-toggle {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
    }

    .mobile-menu-toggle svg {
      width: 1.5rem;
      height: 1.5rem;
      color: #374151;
    }

    .mobile-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1001;
      display: none;
    }

    .mobile-menu {
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      height: 100vh;
      background: white;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .mobile-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
    }

    .close-button svg {
      width: 1.5rem;
      height: 1.5rem;
      color: #6b7280;
    }

    .mobile-menu-content {
      flex: 1;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .mobile-section-title {
      font-weight: 600;
      color: #1a4d3a;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .mobile-nav-link {
      padding: 0.75rem;
      color: #374151;
      text-decoration: none;
      border-radius: 0.5rem;
      transition: background 0.2s ease;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
      width: 100%;
    }

    .mobile-nav-link:hover {
      background: #f3f4f6;
    }

    .mobile-nav-link.logout {
      color: #dc2626;
    }

    .mobile-auth-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border-top: 1px solid #e5e7eb;
      padding-top: 1rem;
      margin-top: 1rem;
    }

    .mobile-register-btn {
      background: linear-gradient(135deg, #1a4d3a 0%, #2d5e4f 100%);
      color: white;
      padding: 0.75rem;
      border-radius: 0.5rem;
      text-decoration: none;
      text-align: center;
      font-weight: 600;
    }

    .mobile-user-section {
      border-top: 1px solid #e5e7eb;
      padding-top: 1rem;
      margin-top: 1rem;
    }

    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      background: #f9fafb;
      border-radius: 0.5rem;
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999;
    }

    @media (max-width: 768px) {
      .nav-menu {
        display: none;
      }

      .mobile-menu-toggle {
        display: block;
      }

      .mobile-menu-overlay {
        display: block;
      }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isAuthenticated = false; // Pour l'instant, toujours false
  showUserMenu = false;
  showMobileMenu = false;

  private destroy$ = new Subject<void>();

  constructor(
    // private authService: AuthService,  // Désactivé temporairement
    private router: Router
  ) {}

  ngOnInit(): void {
    // ⚠️ CRUCIAL: Ne PAS faire d'appels d'authentification automatiques !
    // Cela cause la redirection vers la page de connexion
    
    // Version temporaire sans appels auth
    this.currentUser = null;
    this.isAuthenticated = false;
    
    console.log('HeaderComponent: Initialisé sans appels auth automatiques');
    
    // Si vous voulez activer l'authentification plus tard, décommentez ceci :
    /*
    this.authService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user: User | null) => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
      },
      error: (error) => {
        console.log('Pas d\'utilisateur connecté:', error);
        this.currentUser = null;
        this.isAuthenticated = false;
      }
    });
    */
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showMobileMenu = false;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    this.showUserMenu = false;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
  }

  closeAllMenus(): void {
    this.showUserMenu = false;
    this.showMobileMenu = false;
  }

  logout(): void {
    console.log('Logout demandé');
    // Version temporaire sans service auth
    this.currentUser = null;
    this.isAuthenticated = false;
    this.router.navigate(['/simulator-home']);
    
    // Si vous voulez activer l'authentification plus tard :
    /*
    this.authService.logout().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.router.navigate(['/simulator-home']);
      },
      error: (error: any) => {
        console.error('Erreur lors de la déconnexion:', error);
        this.router.navigate(['/simulator-home']);
      }
    });
    */
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'U';
    
    const firstInitial = this.currentUser.first_name?.charAt(0).toUpperCase() || '';
    const lastInitial = this.currentUser.last_name?.charAt(0).toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || 'U';
  }

  getFirstName(): string {
    return this.currentUser?.first_name || 'Utilisateur';
  }

  getFullName(): string {
    if (!this.currentUser) return 'Utilisateur';
    return `${this.currentUser.first_name} ${this.currentUser.last_name}`;
  }
}