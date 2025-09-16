// src/app/admin/services/admin-navigation.service.ts
import { Injectable } from '@angular/core';
import { AdminAuthService } from '../services/admin-auth.services';
import { Router } from '@angular/router';

export interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  permission?: { entity: string; action: string } | null;
  children?: MenuItem[];
  badge?: string | number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminNavigationService {
  private menuItems: MenuItem[] = [
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
      permission: { entity: 'banks', action: 'read' }
    },
    {
      label: 'Produits de Crédit',
      route: '/admin/credit-products',
      icon: 'fas fa-coins',
      permission: { entity: 'credit_products', action: 'read' }
    },
    {
      label: 'Produits d\'Épargne',
      route: '/admin/savings-products',
      icon: 'fas fa-piggy-bank',
      permission: { entity: 'savings_products', action: 'read' }
    },
    {
      label: 'Produits d\'Assurance',
      route: '/admin/insurance-products',
      icon: 'fas fa-shield-alt',
      permission: { entity: 'insurance_products', action: 'read' }
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

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router
  ) {}

  getMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => this.hasPermission(item));
  }

  private hasPermission(item: MenuItem): boolean {
    if (!item.permission) {
      return true; // Pas de permission requise
    }

    return this.adminAuth.hasPermission(item.permission.entity, item.permission.action);
  }

  getCurrentRoute(): string {
    return this.router.url;
  }

  isRouteActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getBreadcrumbFromRoute(route: string): string[] {
    const segments = route.split('/').filter(segment => segment);
    const breadcrumbs: string[] = [];

    // Mapping des segments vers des labels lisibles
    const segmentLabels: { [key: string]: string } = {
      'admin': 'Administration',
      'dashboard': 'Tableau de Bord',
      'banks': 'Banques',
      'credit-products': 'Produits de Crédit',
      'savings-products': 'Produits d\'Épargne',
      'insurance-products': 'Produits d\'Assurance',
      'simulations': 'Simulations',
      'applications': 'Demandes Clients',
      'audit': 'Audit & Logs',
      'settings': 'Paramètres',
      'create': 'Créer',
      'edit': 'Modifier'
    };

    segments.forEach(segment => {
      if (segmentLabels[segment]) {
        breadcrumbs.push(segmentLabels[segment]);
      }
    });

    return breadcrumbs;
  }
}