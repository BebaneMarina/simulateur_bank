// src/app/admin/admin.config.ts
import { Routes } from '@angular/router';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

// Configuration des routes administrateur avec layout indépendant
export const ADMIN_ROUTES: Routes = [
  {
    path: 'admin',
    component: AdminLayoutComponent, // Layout avec sidebar et header
    canActivate: [AdminAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      
      // Dashboard principal
      {
        path: 'dashboard',
        loadComponent: () => import('../dashboard/dashboard.component').then(c => c.DashboardComponent),
        data: { 
          title: 'Tableau de Bord',
          breadcrumb: ['Admin', 'Dashboard'],
          icon: 'fas fa-tachometer-alt'
        }
      },

      // Gestion des banques
      {
        path: 'banks',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'banks', action: 'read' },
          title: 'Banques',
          breadcrumb: ['Admin', 'Banques'],
          icon: 'fas fa-university'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./bank-list.component').then(c => c.BanksListComponent)
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'banks', action: 'create' } },
            loadComponent: () => import('./bank-form.component').then(c => c.BankFormComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'banks', action: 'update' } },
            loadComponent: () => import('./bank-form.component').then(c => c.BankFormComponent)
          }
        ]
      },

      // Gestion des produits de crédit
      {
        path: 'credit-products',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'credit_products', action: 'read' },
          title: 'Produits de Crédit',
          breadcrumb: ['Admin', 'Produits de Crédit'],
          icon: 'fas fa-coins'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./credit-products-list.component').then(c => c.CreditProductsListComponent)
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'credit_products', action: 'create' } },
            loadComponent: () => import('./credit-products-form.component').then(c => c.CreditProductFormComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'credit_products', action: 'update' } },
            loadComponent: () => import('./credit-products-form.component').then(c => c.CreditProductFormComponent)
          }
        ]
      },

      // Gestion des produits d'épargne
      {
        path: 'savings-products',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'savings_products', action: 'read' },
          title: 'Produits d\'Épargne',
          breadcrumb: ['Admin', 'Produits d\'Épargne'],
          icon: 'fas fa-piggy-bank'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./savings-products-list.component').then(c => c.SavingsProductsListComponent)
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'savings_products', action: 'create' } },
            loadComponent: () => import('./savings-products-form.component').then(c => c.SavingsProductFormComponent)
          }
        ]
      },

      // Gestion des produits d'assurance
      {
        path: 'insurance-products',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'insurance_products', action: 'read' },
          title: 'Produits d\'Assurance',
          breadcrumb: ['Admin', 'Produits d\'Assurance'],
          icon: 'fas fa-shield-alt'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./insurance-products-list.component').then(c => c.InsuranceProductsListComponent)
          },
          {
            path: 'create',
            canActivate: [PermissionGuard],
            data: { requiredPermission: { entity: 'insurance_products', action: 'create' } },
            loadComponent: () => import('./insurance-products-form.component').then(c => c.InsuranceProductFormComponent)
          }
        ]
      },

      // Simulations
      {
        path: 'simulations',
        canActivate: [PermissionGuard],
        data: { 
          requiredPermission: { entity: 'simulations', action: 'read' },
          title: 'Simulations',
          breadcrumb: ['Admin', 'Simulations'],
          icon: 'fas fa-calculator'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./simulation-list.component').then(c => c.SimulationsListComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./simulation-details.component').then(c => c.SimulationDetailComponent)
          }
        ]
      },


    ]
  }
];

// Configuration du menu de navigation
export const ADMIN_MENU = [
  {
    label: 'Tableau de Bord',
    route: '/admin/dashboard',
    icon: 'fas fa-tachometer-alt',
    permission: null
  },
  {
    label: 'Banques',
    route: '/admin/banks',
    icon: 'fas fa-university',
    permission: { entity: 'banks', action: 'read' },
    children: [
      {
        label: 'Liste des banques',
        route: '/admin/banks',
        icon: 'fas fa-list'
      },
      {
        label: 'Ajouter une banque',
        route: '/admin/banks/create',
        icon: 'fas fa-plus',
        permission: { entity: 'banks', action: 'create' }
      }
    ]
  },
  {
    label: 'Produits',
    icon: 'fas fa-box',
    children: [
      {
        label: 'Produits de crédit',
        route: '/admin/credit-products',
        icon: 'fas fa-coins',
        permission: { entity: 'credit_products', action: 'read' }
      },
      {
        label: 'Produits d\'épargne',
        route: '/admin/savings-products',
        icon: 'fas fa-piggy-bank',
        permission: { entity: 'savings_products', action: 'read' }
      },
      {
        label: 'Produits d\'assurance',
        route: '/admin/insurance-products',
        icon: 'fas fa-shield-alt',
        permission: { entity: 'insurance_products', action: 'read' }
      }
    ]
  },
  {
    label: 'Simulations',
    route: '/admin/simulations',
    icon: 'fas fa-calculator',
    permission: { entity: 'simulations', action: 'read' }
  },
  {
    label: 'Demandes Clients',
    route: '/admin/applications',
    icon: 'fas fa-file-alt',
    permission: { entity: 'applications', action: 'read' }
  },
  {
    label: 'Audit & Logs',
    route: '/admin/audit',
    icon: 'fas fa-history',
    permission: { entity: 'audit', action: 'read' }
  },
  {
    label: 'Paramètres',
    route: '/admin/settings',
    icon: 'fas fa-cog',
    permission: { entity: 'system_settings', action: 'read' }
  }
];

export interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  permission?: { entity: string; action: string } | null;
  children?: MenuItem[];
}