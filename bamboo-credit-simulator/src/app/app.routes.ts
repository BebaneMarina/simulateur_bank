// src/app/app.routes.ts - Routes corrigées pour éviter les conflits d'authentification
import { Routes } from '@angular/router';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { PublicAuthGuard } from './guards/public-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { PermissionGuard } from './guards/permission.guard';

export const routes: Routes = [
  // ============= ROUTES PUBLIQUES (SANS ADMIN GUARD) =============
  
  // Redirection par défaut vers la page d'accueil PUBLIQUE
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },

  // Page d'accueil publique (AUCUN guard admin ici !)
  {
    path: 'home',
    loadComponent: () => import('./components/simulator-home/simulator-home.component').then(c => c.SimulatorHomeComponent),
    // canActivate: [PublicAuthGuard], // Optionnel, seulement si vous voulez une logique d'auth utilisateur
    data: { title: 'Accueil - Bamboo Financial Services' }
  },

  // Alias pour compatibilité
  {
    path: 'simulator-home',
    redirectTo: '/home',
    pathMatch: 'full'
  },

  // ============= SIMULATEURS PUBLICS (SANS ADMIN GUARD) =============
  {
    path: 'borrowing-capacity',
    loadComponent: () => import('./components/capacite-emprunt/boworing-capacity.component').then(c => c.BorrowingCapacityComponent),
    data: { title: 'Simulateur Capacité d\'Emprunt' }
  },
  {
    path: 'payment-calculator',
    loadComponent: () => import('./components/payment-calculator/payment-calculator.component').then(c => c.PaymentCalculatorComponent),
    data: { title: 'Calculateur de Mensualités' }
  },
  {
    path: 'multi-bank-comparator',
    loadComponent: () => import('./components/multi-bank-comparator.component/multi-bank-comparator.component').then(c => c.MultiBankComparatorComponent),
    data: { title: 'Comparateur Multi-Banques' }
  },
  {
    path: 'savings-simulator',
    loadComponent: () => import('./components/saving-simulator/saving-simulator.component').then(c => c.SavingsSimulatorComponent),
    data: { title: 'Simulateur d\'Épargne' }
  },
  {
    path: 'insurance-comparator',
    loadComponent: () => import('./components/insurance-comparator/insurance-comparator.component').then(c => c.InsuranceComparatorComponent),
    data: { title: 'Comparateur d\'Assurances' }
  },

  // ============= OUTILS PUBLICS (SANS ADMIN GUARD) =============
  {
    path: 'bank-rates',
    loadComponent: () => import('./components/bank-rates/bank-rates.component').then(c => c.BankRatesComponent),
    data: { title: 'Tarifs Bancaires' }
  },
  {
    path: 'bank-locator',
    loadComponent: () => import('./components/bank-locator/bank-locator.component').then(c => c.BankLocatorComponent),
    data: { title: 'Localiser une Banque' }
  },

  // ============= SERVICES PUBLICS (SANS ADMIN GUARD) =============
  {
    path: 'tracking',
    loadComponent: () => import('./components/tracking/tracking.component').then(c => c.TrackingComponent),
    data: { title: 'Suivi des Demandes' }
  },
  {
    path: 'tracking/:id',
    loadComponent: () => import('./components/tracking/tracking-details.component').then(c => c.TrackingDetailComponent),
    data: { title: 'Détails du Suivi' }
  },

  // ============= AUTHENTIFICATION ADMIN (SANS ADMIN GUARD) =============
  {
    path: 'auth',
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        loadComponent: () => import('./auth/login.component').then(c => c.LoginComponent),
        data: { title: 'Connexion Administrateur' }
      }
    ]
  },


  // ============= BACKOFFICE ADMINISTRATEUR (AVEC ADMIN GUARD) =============
  {
    path: 'admin',
    loadComponent: () => import('./admin/layout/admin-layout.component').then(c => c.AdminLayoutComponent),
    canActivate: [AdminAuthGuard], // ⚠️ GUARD ADMIN SEULEMENT ICI
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(c => c.DashboardComponent),
        data: { 
          title: 'Tableau de Bord Administrateur',
          breadcrumb: ['Admin', 'Dashboard']
        }
      },

      // Gestion des administrateurs (Super Admin uniquement)
      {
        path: 'management',
        canActivate: [PermissionGuard],
        data: {
          requiredPermission: { entity: 'administrateur', action: 'read' },
          title: 'Gestion des Administrateurs',
          breadcrumb: ['Admin', 'Gestion Admins']
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./admin/admin-management.component').then(c => c.AdminManagementComponent),
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'administrateur', action: 'create' } },
            loadComponent: () => import('./admin/admin-form.component').then(c => c.AdminFormComponent),
          },
          {
            path: 'edit/:id',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'administrateur', action: 'update' } },
            loadComponent: () => import('./admin/admin-form.component').then(c => c.AdminFormComponent),
          }
        ]
      },

      // Gestion des banques
      {
        path: 'banks',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'banks', action: 'read' },
          title: 'Gestion des Banques',
          breadcrumb: ['Admin', 'Banques']
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./admin/bank-list.component').then(c => c.BanksListComponent)
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'banks', action: 'create' } },
            loadComponent: () => import('./admin/bank-form.component').then(c => c.BankFormComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'banks', action: 'update' } },
            loadComponent: () => import('./admin/bank-form.component').then(c => c.BankFormComponent)
          }
        ]
      },

      // Produits de crédit
      {
        path: 'credit-products',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'products', action: 'read' },
          title: 'Produits de Crédit',
          breadcrumb: ['Admin', 'Produits de Crédit']
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./admin/credit-products-list.component').then(c => c.CreditProductsListComponent)
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'products', action: 'create' } },
            loadComponent: () => import('./admin/credit-products-form.component').then(c => c.CreditProductFormComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'products', action: 'update' } },
            loadComponent: () => import('./admin/credit-products-form.component').then(c => c.CreditProductFormComponent)
          }
        ]
      },

      // Produits d'épargne
      {
        path: 'savings-products',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'products', action: 'read' },
          title: 'Produits d\'Épargne',
          breadcrumb: ['Admin', 'Produits d\'Épargne']
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./admin/savings-products-list.component').then(c => c.SavingsProductsListComponent)
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'products', action: 'create' } },
            loadComponent: () => import('./admin/savings-products-form.component').then(c => c.SavingsProductFormComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'products', action: 'update' } },
            loadComponent: () => import('./admin/savings-products-form.component').then(c => c.SavingsProductFormComponent)
          }
        ]
      },

      // Produits d'assurance
      {
        path: 'insurance-products',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'products', action: 'read' },
          title: 'Produits d\'Assurance',
          breadcrumb: ['Admin', 'Produits d\'Assurance']
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./admin/insurance-products-list.component').then(c => c.InsuranceProductsListComponent)
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'products', action: 'create' } },
            loadComponent: () => import('./admin/insurance-products-form.component').then(c => c.InsuranceProductFormComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'products', action: 'update' } },
            loadComponent: () => import('./admin/insurance-products-form.component').then(c => c.InsuranceProductFormComponent)
          }
        ]
      },

      // Simulations (admin)
      {
        path: 'simulations',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'simulations', action: 'read' },
          title: 'Simulations',
          breadcrumb: ['Admin', 'Simulations']
        },
        loadComponent: () => import('./admin/simulation-list.component').then(c => c.SimulationsListComponent)
      },

      // Demandes clients (admin)
      {
        path: 'applications',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'applications', action: 'manage' },
          title: 'Demandes Clients',
          breadcrumb: ['Admin', 'Demandes']
        },
        loadComponent: () => import('./admin/application-list.component').then(c => c.ApplicationsListComponent)
      },

      // Audit et logs (Super Admin uniquement)
      {
        path: 'audit',
        canActivate: [SuperAdminGuard],
        data: { 
          title: 'Audit et Logs',
          breadcrumb: ['Admin', 'Audit']
        },
        loadComponent: () => import('./admin/audit-log.component').then(c => c.AuditLogsComponent)
      },

      // Paramètres système (Super Admin uniquement)
      {
        path: 'settings',
        canActivate: [SuperAdminGuard],
        data: { 
          title: 'Paramètres Système',
          breadcrumb: ['Admin', 'Paramètres']
        },
        loadComponent: () => import('./admin/system-settings.component').then(c => c.SystemSettingsComponent)
      }
    ]
  },

  // ============= PAGES D'ERREURS (SANS ADMIN GUARD) =============
  {
    path: '404',
    loadComponent: () => import('./components/not-found/not-found.component').then(c => c.NotFoundComponent),
    data: { title: 'Page Non Trouvée' }
  },
  {
    path: '403',
    loadComponent: () => import('./components/forbidden/forbidden.component').then(c => c.ForbiddenComponent),
    data: { title: 'Accès Interdit' }
  },

  // Redirection pour toutes les autres URLs vers 404
  {
    path: '**',
    redirectTo: '/404'
  }
];

// Types pour les données de route
export interface RouteData {
  title: string;
  description?: string;
  keywords?: string[];
  breadcrumb?: string[];
  requiredPermission?: {
    entity: string;
    action: string;
  };
  hideFromMenu?: boolean;
  icon?: string;
  order?: number;
}