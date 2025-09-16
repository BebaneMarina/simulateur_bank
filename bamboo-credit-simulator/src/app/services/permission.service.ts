// src/app/services/permission.service.ts
import { Injectable } from '@angular/core';

export interface UserPermissions {
  products?: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  simulations?: {
    read?: boolean;
  };
  applications?: {
    manage?: boolean;
  };
  admin_management?: string[];
  banks?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private currentUser: any = null;

  setCurrentUser(user: any) {
    this.currentUser = user;
  }

  hasPermission(resource: string, action: string): boolean {
    if (!this.currentUser || !this.currentUser.permissions) {
      return false;
    }

    // Super admin a tous les droits
    if (this.currentUser.role === 'super_admin') {
      return true;
    }

    const permissions = this.currentUser.permissions;
    
    // Vérifier les permissions spécifiques
    if (permissions[resource]) {
      if (Array.isArray(permissions[resource])) {
        return permissions[resource].includes(action);
      } else if (typeof permissions[resource] === 'object') {
        return permissions[resource][action] === true;
      }
    }

    return false;
  }

  canAccessAdminManagement(): boolean {
    return this.currentUser?.role === 'super_admin';
  }

  canManageProducts(): boolean {
    return this.hasPermission('products', 'create') || 
           this.hasPermission('products', 'update') || 
           this.hasPermission('products', 'delete');
  }

  canViewSimulations(): boolean {
    return this.hasPermission('simulations', 'read');
  }

  canManageApplications(): boolean {
    return this.hasPermission('applications', 'manage');
  }

  getCurrentUser() {
    return this.currentUser;
  }
}