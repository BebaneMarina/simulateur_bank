// src/app/admin/layout/admin-layout.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.services';
import { filter } from 'rxjs/operators';
import e from 'express';

@Component({
  selector: 'admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-layout">
      <!-- Sidebar -->
      <aside class="admin-sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <div class="logo">
            <i class="fas fa-cog"></i>
            <span *ngIf="!sidebarCollapsed">espace admin</span>
          </div>
          <button class="collapse-btn" (click)="toggleSidebar()">
            <i class="fas" [class.fa-chevron-left]="!sidebarCollapsed" [class.fa-chevron-right]="sidebarCollapsed"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          <!-- Dashboard - Toujours visible -->
          <a routerLink="/admin/dashboard" 
             routerLinkActive="active" 
             class="nav-item">
            <i class="fas fa-tachometer-alt"></i>
            <span *ngIf="!sidebarCollapsed">Tableau de Bord</span>
          </a>

          <!-- Gestion des administrateurs - Super Admin seulement -->
          <div class="nav-section" *ngIf="canManageAdmins">
            <div class="nav-section-title" *ngIf="!sidebarCollapsed" (click)="toggleAdminSection()">
              <i class="fas fa-users-cog"></i>
              <span>Administrateurs</span>
              <i class="fas fa-chevron-down toggle-icon" [class.rotated]="adminSectionExpanded"></i>
            </div>
            
            <div class="nav-section-title collapsed-title" *ngIf="sidebarCollapsed">
              <i class="fas fa-users-cog" title="Administrateurs"></i>
            </div>
            
            <div class="nav-subsection" [class.expanded]="adminSectionExpanded || sidebarCollapsed">
              <a routerLink="/admin/management" 
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="nav-item sub-item"
                 [title]="listAdminsTitle">
                <i class="fas fa-users"></i>
                <span *ngIf="!sidebarCollapsed">Liste des admins</span>
              </a>
              
              <a routerLink="/admin/management/create" 
                 routerLinkActive="active"
                 class="nav-item sub-item"
                 [title]="createAdminTitle">
                <i class="fas fa-user-plus"></i>
                <span *ngIf="!sidebarCollapsed">Créer un admin</span>
              </a>
            </div>
          </div>

          <!-- Gestion des banques -->
          <div class="nav-section" *ngIf="canManageBanks">
            <div class="nav-section-title" *ngIf="!sidebarCollapsed" (click)="toggleBankSection()">
              <i class="fas fa-university"></i>
              <span>Banques</span>
              <i class="fas fa-chevron-down toggle-icon" [class.rotated]="bankSectionExpanded"></i>
            </div>
            
            <div class="nav-section-title collapsed-title" *ngIf="sidebarCollapsed">
              <i class="fas fa-university" title="Banques"></i>
            </div>
            
            <div class="nav-subsection" [class.expanded]="bankSectionExpanded || sidebarCollapsed">
              <a routerLink="/admin/banks" 
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="nav-item sub-item"
                 [title]="listBanksTitle">
                <i class="fas fa-list"></i>
                <span *ngIf="!sidebarCollapsed">Liste des banques</span>
              </a>
              
              <a routerLink="/admin/banks/create" 
                 routerLinkActive="active"
                 class="nav-item sub-item"
                 *ngIf="canCreateBanks"
                 [title]="addBankTitle">
                <i class="fas fa-plus"></i>
                <span *ngIf="!sidebarCollapsed">Ajouter une banque</span>
              </a>
            </div>
          </div>

          <!-- Gestion des compagnies d'assurance -->
          <div class="nav-section" *ngIf="canManageInsuranceCompanies">
            <div class="nav-section-title" *ngIf="!sidebarCollapsed" (click)="toggleInsuranceCompaniesSection()">
              <i class="fas fa-building"></i>
              <span>Compagnies d'Assurance</span>
              <i class="fas fa-chevron-down toggle-icon" [class.rotated]="insuranceCompaniesSectionExpanded"></i>
            </div>
            <div class="nav-section-title collapsed-title" *ngIf="sidebarCollapsed">
              <i class="fas fa-building" title="Compagnies d'Assurance"></i>
            </div>
            <div class="nav-subsection" [class.expanded]="insuranceCompaniesSectionExpanded || sidebarCollapsed">
              <a routerLink="/admin/insurance-companies" 
                 routerLinkActive="active"
                  [routerLinkActiveOptions]="{exact: true}"
                  class="nav-item sub-item"
                  [title]="sidebarCollapsed ? 'Liste des compagnies' : ''">
                <i class="fas fa-list"></i>
                <span *ngIf="!sidebarCollapsed">Liste des compagnies</span>
              </a>
              <a routerLink="/admin/insurance-companies/create" 
                 routerLinkActive="active"
                 class="nav-item sub-item"
                  *ngIf="canCreateInsuranceCompanies"
                  [title]="sidebarCollapsed ? 'Créer une compagnie' : ''">
                <i class="fas fa-plus"></i>
                <span *ngIf="!sidebarCollapsed">Créer une compagnie</span>
              </a>
            </div>
          </div>



          <!-- Gestion des produits de crédit -->
          <div class="nav-section" *ngIf="canManageCreditProducts">
            <div class="nav-section-title" *ngIf="!sidebarCollapsed" (click)="toggleCreditSection()">
              <i class="fas fa-credit-card"></i>
              <span>Produits de Crédit</span>
              <i class="fas fa-chevron-down toggle-icon" [class.rotated]="creditSectionExpanded"></i>
            </div>
            
            <div class="nav-section-title collapsed-title" *ngIf="sidebarCollapsed">
              <i class="fas fa-credit-card" title="Produits de Crédit"></i>
            </div>
            
            <div class="nav-subsection" [class.expanded]="creditSectionExpanded || sidebarCollapsed">
              <a routerLink="/admin/credit-products" 
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="nav-item sub-item"
                 [title]="sidebarCollapsed ? 'Liste des produits' : ''">
                <i class="fas fa-list"></i>
                <span *ngIf="!sidebarCollapsed">Liste des produits</span>
              </a>
              
              <a routerLink="/admin/credit-products/create" 
                 routerLinkActive="active"
                 class="nav-item sub-item"
                 *ngIf="canCreateCreditProducts"
                 [title]="sidebarCollapsed ? 'Créer un produit' : ''">
                <i class="fas fa-plus"></i>
                <span *ngIf="!sidebarCollapsed">Créer un produit</span>
              </a>
            </div>
          </div>

          <!-- Gestion des produits d'épargne -->
          <div class="nav-section" *ngIf="canManageSavingsProducts">
            <div class="nav-section-title" *ngIf="!sidebarCollapsed" (click)="toggleSavingsSection()">
              <i class="fas fa-piggy-bank"></i>
              <span>Produits d'Épargne</span>
              <i class="fas fa-chevron-down toggle-icon" [class.rotated]="savingsSectionExpanded"></i>
            </div>
            
            <div class="nav-section-title collapsed-title" *ngIf="sidebarCollapsed">
              <i class="fas fa-piggy-bank" title="Produits d'Épargne"></i>
            </div>
            
            <div class="nav-subsection" [class.expanded]="savingsSectionExpanded || sidebarCollapsed">
              <a routerLink="/admin/savings-products" 
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="nav-item sub-item"
                 [title]="sidebarCollapsed ? 'Liste des produits' : ''">
                <i class="fas fa-list"></i>
                <span *ngIf="!sidebarCollapsed">Liste des produits</span>
              </a>
              
              <a routerLink="/admin/savings-products/create" 
                 routerLinkActive="active"
                 class="nav-item sub-item"
                 *ngIf="canCreateSavingsProducts"
                 [title]="sidebarCollapsed ? 'Créer un produit' : ''">
                <i class="fas fa-plus"></i>
                <span *ngIf="!sidebarCollapsed">Créer un produit</span>
              </a>
            </div>
          </div>

          <!-- Gestion des produits d'assurance -->
          <div class="nav-section" *ngIf="canManageInsuranceProducts">
            <div class="nav-section-title" *ngIf="!sidebarCollapsed" (click)="toggleInsuranceSection()">
              <i class="fas fa-shield-alt"></i>
              <span>Produits d'Assurance</span>
              <i class="fas fa-chevron-down toggle-icon" [class.rotated]="insuranceSectionExpanded"></i>
            </div>
            
            <div class="nav-section-title collapsed-title" *ngIf="sidebarCollapsed">
              <i class="fas fa-shield-alt" title="Produits d'Assurance"></i>
            </div>
            
            <div class="nav-subsection" [class.expanded]="insuranceSectionExpanded || sidebarCollapsed">
              <a routerLink="/admin/insurance-products" 
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="nav-item sub-item"
                 [title]="sidebarCollapsed ? 'Liste des produits' : ''">
                <i class="fas fa-list"></i>
                <span *ngIf="!sidebarCollapsed">Liste des produits</span>
              </a>
              
              <a routerLink="/admin/insurance-products/create" 
                 routerLinkActive="active"
                 class="nav-item sub-item"
                 *ngIf="canCreateInsuranceProducts"
                 [title]="sidebarCollapsed ? 'Créer un produit' : ''">
                <i class="fas fa-plus"></i>
                <span *ngIf="!sidebarCollapsed">Créer un produit</span>
              </a>
            </div>
          </div>

          <!-- Simulations -->
          <a routerLink="/admin/simulations" 
             routerLinkActive="active"
             class="nav-item"
             *ngIf="canViewSimulations">
            <i class="fas fa-calculator"></i>
            <span *ngIf="!sidebarCollapsed">Simulations</span>
          </a>

          <!-- Demandes clients -->
          <a routerLink="/admin/applications" 
             routerLinkActive="active"
             class="nav-item"
             *ngIf="canViewApplications">
            <i class="fas fa-file-alt"></i>
            <span *ngIf="!sidebarCollapsed">Demandes clients</span>
          </a>

          <!-- Paramètres - Super Admin seulement -->
          <a routerLink="/admin/settings" 
             routerLinkActive="active"
             class="nav-item"
             *ngIf="canManageSettings">
            <i class="fas fa-cog"></i>
            <span *ngIf="!sidebarCollapsed">Paramètres</span>
          </a>
        </nav>

        <!-- User info at bottom -->
        <div class="sidebar-footer" *ngIf="!sidebarCollapsed">
          <div class="user-info">
            <div class="user-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="user-details">
              <div class="user-name">{{ adminAuth.getUserDisplayName() }}</div>
              <div class="user-role">{{ adminAuth.getRoleLabel() }}</div>
              <div class="user-institution" *ngIf="getAssignedInstitution()">
                {{ getAssignedInstitution() }}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <div class="admin-main" [class.sidebar-collapsed]="sidebarCollapsed">
        <!-- Header -->
        <header class="admin-header">
          <div class="header-left">
            <button class="menu-toggle" (click)="toggleSidebar()">
              <i class="fas fa-bars"></i>
            </button>
            <div class="breadcrumb">
              <ng-container *ngFor="let crumb of breadcrumbs; let last = last">
                <span class="breadcrumb-item" [class.active]="last">{{ crumb }}</span>
                <i class="fas fa-chevron-right" *ngIf="!last"></i>
              </ng-container>
            </div>
          </div>

          <div class="header-right">
            <div class="header-actions">
              <!-- Notifications -->
              <button class="action-btn" title="Notifications">
                <i class="fas fa-bell"></i>
                <span class="badge" *ngIf="notificationCount > 0">{{ notificationCount }}</span>
              </button>

              <!-- User menu -->
              <div class="user-menu" (click)="toggleUserMenu()" [class.open]="userMenuOpen">
                <div class="user-avatar">
                  <i class="fas fa-user"></i>
                </div>
                <span class="user-name">{{ adminAuth.getUserDisplayName() }}</span>
                <i class="fas fa-chevron-down"></i>

                <div class="user-dropdown" *ngIf="userMenuOpen">
                  <a href="#" class="dropdown-item" (click)="$event.preventDefault()">
                    <i class="fas fa-user"></i>
                    Mon profil
                  </a>
                  <a href="#" class="dropdown-item" (click)="$event.preventDefault()">
                    <i class="fas fa-cog"></i>
                    Paramètres
                  </a>
                  <div class="dropdown-divider"></div>
                  <a href="#" class="dropdown-item" (click)="logout(); $event.preventDefault()">
                    <i class="fas fa-sign-out-alt"></i>
                    Déconnexion
                  </a>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Content area -->
        <main class="admin-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Overlay pour fermer le user menu -->
      <div class="overlay" *ngIf="userMenuOpen" (click)="toggleUserMenu()"></div>
    </div>
  `,
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  userMenuOpen = false;
  notificationCount = 3;
  breadcrumbs: string[] = [];
  
  // Variables pour l'expansion des sections
  adminSectionExpanded = false;
  bankSectionExpanded = false;
  creditSectionExpanded = false;
  savingsSectionExpanded = false;
  insuranceSectionExpanded = false;
  insuranceCompaniesSectionExpanded = false;

  // Titres pour les tooltips
  get createAdminTitle(): string {
    return this.sidebarCollapsed ? 'Créer un admin' : '';
  }

  get listAdminsTitle(): string {
    return this.sidebarCollapsed ? 'Liste des admins' : '';
  }

  get listBanksTitle(): string {
    return this.sidebarCollapsed ? 'Liste des banques' : '';
  }

  get addBankTitle(): string {
    return this.sidebarCollapsed ? 'Ajouter une banque' : '';
  }
  get listInsuranceCompaniesTitle(): string {
    return this.sidebarCollapsed ? 'Liste des compagnies' : '';
  }
  get addInsuranceCompanyTitle(): string {
    return this.sidebarCollapsed ? 'Créer une compagnie' : '';
  }

  constructor(
    public adminAuth: AdminAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Écouter les changements de route pour mettre à jour le breadcrumb
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateBreadcrumbs(event.url);
        this.updateSectionExpansion(event.url);
      });

    // Initialiser avec la route actuelle
    this.updateBreadcrumbs(this.router.url);
    this.updateSectionExpansion(this.router.url);

    // Debug permissions - logs détaillés pour le débogage
    console.log('=== DEBUG PERMISSIONS ===');
    console.log('Current user:', this.adminAuth.currentUser);
    console.log('User role:', this.adminAuth.currentUser?.role);
    console.log('User permissions:', this.adminAuth.currentUser?.permissions);
    console.log('Can manage admins:', this.canManageAdmins);
    console.log('Can manage banks:', this.canManageBanks);
    console.log('Can create banks:', this.canCreateBanks);
    console.log('Can manage insurance companies:', this.canManageInsuranceCompanies);
    console.log('Can create insurance companies:', this.canCreateInsuranceCompanies);
    console.log('Can manage credit products:', this.canManageCreditProducts);
    console.log('Can manage savings products:', this.canManageSavingsProducts);
    console.log('Can manage insurance products:', this.canManageInsuranceProducts);
    console.log('Can view simulations:', this.canViewSimulations);
    console.log('Can view applications:', this.canViewApplications);
    console.log('========================');
  }

  // Permissions getters corrigés - utilisant les méthodes du service
  get canManageAdmins(): boolean {
    return this.adminAuth.canManageAdmins();
  }

  get canManageBanks(): boolean {
    return this.adminAuth.canManageBanks();
  }

  get canCreateBanks(): boolean {
    return this.adminAuth.canCreateBanks();
  }

  get canManageInsuranceCompanies(): boolean {
    return this.adminAuth.canManageInsuranceCompanies();
  }

  get canCreateInsuranceCompanies(): boolean {
    return this.adminAuth.isSuperAdmin() || this.adminAuth.hasPermission('insurance_companies', 'create');
  }

  get canManageCreditProducts(): boolean {
    return this.adminAuth.canManageCreditProducts();
  }

  get canCreateCreditProducts(): boolean {
    return this.adminAuth.canCreateCreditProducts();
  }

  get canManageSavingsProducts(): boolean {
    return this.adminAuth.canManageSavingsProducts();
  }

  get canCreateSavingsProducts(): boolean {
    return this.adminAuth.canCreateSavingsProducts();
  }

  get canManageInsuranceProducts(): boolean {
    return this.adminAuth.canManageInsuranceProducts();
  }

  get canCreateInsuranceProducts(): boolean {
    return this.adminAuth.canCreateInsuranceProducts();
  }

  get canViewSimulations(): boolean {
    return this.adminAuth.canViewSimulations();
  }

  get canViewApplications(): boolean {
    return this.adminAuth.canViewApplications();
  }

  get canViewAudit(): boolean {
    return this.adminAuth.isSuperAdmin() || this.adminAuth.hasPermission('audit', 'read');
  }

  get canManageSettings(): boolean {
    return this.adminAuth.canManageSettings();
  }

  // Méthodes pour toggle les sections
  toggleAdminSection(): void {
    this.adminSectionExpanded = !this.adminSectionExpanded;
  }

  toggleBankSection(): void {
    this.bankSectionExpanded = !this.bankSectionExpanded;
  }

  toggleCreditSection(): void {
    this.creditSectionExpanded = !this.creditSectionExpanded;
  }

  toggleSavingsSection(): void {
    this.savingsSectionExpanded = !this.savingsSectionExpanded;
  }

  toggleInsuranceSection(): void {
    this.insuranceSectionExpanded = !this.insuranceSectionExpanded;
  }

  toggleInsuranceCompaniesSection(): void {
    this.insuranceCompaniesSectionExpanded = !this.insuranceCompaniesSectionExpanded;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  getAssignedInstitution(): string | null {
    const user = this.adminAuth.currentUser;
    if (!user) return null;
    
    if (user.assigned_bank) {
      return user.assigned_bank.name;
    }
    
    if (user.assigned_insurance_company) {
      return user.assigned_insurance_company.name;
    }
    
    return null;
  }

  updateBreadcrumbs(url: string): void {
    if (url.includes('/dashboard')) {
      this.breadcrumbs = ['Admin', 'Tableau de Bord'];
    } else if (url.includes('/management/create')) {
      this.breadcrumbs = ['Admin', 'Administrateurs', 'Créer'];
    } else if (url.includes('/management/edit')) {
      this.breadcrumbs = ['Admin', 'Administrateurs', 'Modifier'];
    } else if (url.includes('/management')) {
      this.breadcrumbs = ['Admin', 'Administrateurs'];
    } else if (url.includes('/banks/create')) {
      this.breadcrumbs = ['Admin', 'Banques', 'Créer'];
    } else if (url.includes('/banks/edit')) {
      this.breadcrumbs = ['Admin', 'Banques', 'Modifier'];
    } else if (url.includes('/banks')) {
      this.breadcrumbs = ['Admin', 'Banques'];
    }else if (url.includes('/insurance-companies/create')) {
      this.breadcrumbs = ['Admin', 'Compagnies d\'Assurance', 'Créer'];
    } else if (url.includes('/insurance-companies/edit')) {
      this.breadcrumbs = ['Admin', 'Compagnies d\'Assurance', 'Modifier'];
    } else if (url.includes('/insurance-companies')) {
      this.breadcrumbs = ['Admin', 'Compagnies d\'Assurance'];
    } else if (url.includes('/insurance-products/create')) {
      this.breadcrumbs = ['Admin', 'products', 'Créer'];
    } else if (url.includes('/insurance-products/edit')) {
      this.breadcrumbs = ['Admin', 'products', 'Modifier'];
    } else if (url.includes('/insurance-products')) {
      this.breadcrumbs = ['Admin', 'products d\'Assurance'];
    } else if (url.includes('/credit-products/create')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Crédits', 'Créer'];
    } else if (url.includes('/credit-products/edit')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Crédits', 'Modifier'];
    } else if (url.includes('/credit-products')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Crédits'];
    } else if (url.includes('/savings-products/create')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Épargne', 'Créer'];
    } else if (url.includes('/savings-products/edit')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Épargne', 'Modifier'];
    } else if (url.includes('/savings-products')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Épargne'];
    } else if (url.includes('/insurance-products/create')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Assurance', 'Créer'];
    } else if (url.includes('/insurance-products/edit')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Assurance', 'Modifier'];
    } else if (url.includes('/insurance-products')) {
      this.breadcrumbs = ['Admin', 'Produits', 'Assurance'];
    } else if (url.includes('/simulations')) {
      this.breadcrumbs = ['Admin', 'Simulations'];
    } else if (url.includes('/applications')) {
      this.breadcrumbs = ['Admin', 'Demandes'];
    } else if (url.includes('/audit')) {
      this.breadcrumbs = ['Admin', 'Audit'];
    } else if (url.includes('/settings')) {
      this.breadcrumbs = ['Admin', 'Paramètres'];
    } else {
      this.breadcrumbs = ['Admin'];
    }
  }

  updateSectionExpansion(url: string): void {
    // Expand sections based on current route
    this.adminSectionExpanded = url.includes('/management');
    this.bankSectionExpanded = url.includes('/banks');
    this.insuranceCompaniesSectionExpanded = url.includes('/insurance-products');
    this.creditSectionExpanded = url.includes('/credit-products');
    this.savingsSectionExpanded = url.includes('/savings-products');
    this.insuranceSectionExpanded = url.includes('/insurance-products');
  }

  logout(): void {
    this.adminAuth.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }
}