// src/app/admin/services/admin-management.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

export interface AdminStats {
  total_admins: number;
  active_admins: number;
  inactive_admins: number;
  by_role: {
    bank_admins: number;
    insurance_admins: number;
    moderators: number;
  };
  recent_admins: number;
}

export interface AdminListResponse {
  admins: AdminUser[];
  total: number;
  skip: number;
  limit: number;
}

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  assigned_bank_id?: string;
  assigned_insurance_company_id?: string;
  permissions?: any;
  is_active?: boolean;
}

export interface Institution {
  id: string;
  name: string;
  full_name: string;
}

export interface InstitutionsResponse {
  banks: Institution[];
  insurance_companies: Institution[];
  total_banks: number;
  total_insurance: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminManagementService {
  private apiUrl = `${environment.apiUrl}/admin/management`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer la liste des administrateurs
   */
  getAdmins(params: {
    skip?: number;
    limit?: number;
    search?: string;
    role?: string;
    is_active?: boolean;
  }): Observable<AdminListResponse> {
    // Nettoyer les paramètres undefined/null
    const cleanParams: any = {};
    
    if (params.skip !== undefined) cleanParams.skip = params.skip;
    if (params.limit !== undefined) cleanParams.limit = params.limit;
    if (params.search && params.search !== 'undefined') cleanParams.search = params.search;
    if (params.role && params.role !== 'undefined') cleanParams.role = params.role;
    if (params.is_active !== undefined && params.is_active !== null) cleanParams.is_active = params.is_active;
    
    return this.http.get<AdminListResponse>(`${this.apiUrl}/admins`, { params: cleanParams });
  }

  /**
   * Créer un nouvel administrateur
   */
  createAdmin(adminData: CreateAdminRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins`, adminData);
  }

  /**
   * Récupérer un administrateur par ID
   */
  getAdminById(id: string): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${this.apiUrl}/admins/${id}`);
  }

  /**
   * Alias pour getAdminById (compatibilité)
   */
  getAdmin(id: string): Observable<AdminUser> {
    return this.getAdminById(id);
  }

  /**
   * Mettre à jour un administrateur
   */
  updateAdmin(id: string, adminData: Partial<CreateAdminRequest>): Observable<any> {
    return this.http.put(`${this.apiUrl}/admins/${id}`, adminData);
  }

  /**
   * Supprimer un administrateur
   */
  deleteAdmin(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admins/${id}`);
  }

  /**
   * Activer/Désactiver un administrateur
   */
  toggleAdminStatus(id: string): Observable<{ is_active: boolean; message: string }> {
    return this.http.patch<{ is_active: boolean; message: string }>(`${this.apiUrl}/admins/${id}/toggle-status`, {});
  }

  /**
   * Obtenir les statistiques des administrateurs
   */
  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Récupérer la liste des institutions (banques et assurances)
   */
  getInstitutions(): Observable<InstitutionsResponse> {
    return this.http.get<InstitutionsResponse>(`${this.apiUrl}/institutions`);
  }

  /**
   * Vérifier si un username est disponible
   */
  checkUsernameAvailability(username: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(`${this.apiUrl}/check-username/${username}`);
  }

  /**
   * Vérifier si un email est disponible
   */
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(`${this.apiUrl}/check-email/${email}`);
  }

  /**
   * Réinitialiser le mot de passe d'un administrateur
   */
  resetAdminPassword(id: string): Observable<{ temporary_password: string; message: string }> {
    return this.http.post<{ temporary_password: string; message: string }>(`${this.apiUrl}/admins/${id}/reset-password`, {});
  }
}