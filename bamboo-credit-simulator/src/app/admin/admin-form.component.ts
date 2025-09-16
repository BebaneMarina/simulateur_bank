import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminManagementService, AdminUser, Institution } from '../services/admin-management.service';

@Component({
  selector: 'app-admin-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="admin-form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{ isEditing ? 'edit' : 'person_add' }}</mat-icon>
            {{ isEditing ? 'Modifier' : 'Créer' }} un administrateur
          </mat-card-title>
          <mat-card-subtitle>
            {{ isEditing ? 'Modification des informations' : 'Nouvelle création d\'administrateur' }}
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="adminForm" class="admin-form" (ngSubmit)="onSubmit()">
            <!-- Informations personnelles -->
            <div class="form-section">
              <h3>Informations personnelles</h3>
              
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Nom d'utilisateur</mat-label>
                  <input matInput formControlName="username" [readonly]="isEditing">
                  <mat-error *ngIf="adminForm.get('username')?.hasError('required')">
                    Le nom d'utilisateur est requis
                  </mat-error>
                  <mat-error *ngIf="adminForm.get('username')?.hasError('minlength')">
                    Minimum 3 caractères
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email">
                  <mat-error *ngIf="adminForm.get('email')?.hasError('required')">
                    L'email est requis
                  </mat-error>
                  <mat-error *ngIf="adminForm.get('email')?.hasError('email')">
                    Email invalide
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Prénom</mat-label>
                  <input matInput formControlName="first_name">
                  <mat-error *ngIf="adminForm.get('first_name')?.hasError('required')">
                    Le prénom est requis
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Nom</mat-label>
                  <input matInput formControlName="last_name">
                  <mat-error *ngIf="adminForm.get('last_name')?.hasError('required')">
                    Le nom est requis
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="form-row" *ngIf="!isEditing">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Mot de passe</mat-label>
                  <input matInput formControlName="password" type="password">
                  <mat-error *ngIf="adminForm.get('password')?.hasError('minlength')">
                    Minimum 6 caractères
                  </mat-error>
                </mat-form-field>
              </div>
            </div>

            <!-- Assignation et rôle -->
            <div class="form-section">
              <h3>Rôle et assignation</h3>
              
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Rôle</mat-label>
                  <mat-select formControlName="role" (selectionChange)="onRoleChange()">
                    <mat-option value="bank_admin">Administrateur Bancaire</mat-option>
                    <mat-option value="insurance_admin">Administrateur Assurance</mat-option>
                    <mat-option value="moderator">Modérateur</mat-option>
                  </mat-select>
                  <mat-error *ngIf="adminForm.get('role')?.hasError('required')">
                    Le rôle est requis
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Assignation de banque -->
              <div class="form-row" *ngIf="adminForm.get('role')?.value === 'bank_admin'">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Banque assignée</mat-label>
                  <mat-select formControlName="assigned_bank_id">
                    <mat-option *ngFor="let bank of banks" [value]="bank.id">
                      {{ bank.full_name || bank.name }}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="adminForm.get('assigned_bank_id')?.hasError('required')">
                    Veuillez sélectionner une banque
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Assignation de compagnie d'assurance -->
              <div class="form-row" *ngIf="adminForm.get('role')?.value === 'insurance_admin'">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Compagnie d'assurance assignée</mat-label>
                  <mat-select formControlName="assigned_insurance_company_id">
                    <mat-option *ngFor="let company of insuranceCompanies" [value]="company.id">
                      {{ company.full_name || company.name }}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="adminForm.get('assigned_insurance_company_id')?.hasError('required')">
                    Veuillez sélectionner une compagnie d'assurance
                  </mat-error>
                </mat-form-field>
              </div>
            </div>

            <!-- Permissions -->
            <div class="form-section">
              <h3>Permissions</h3>
              <div class="permissions-grid">
                <mat-checkbox formControlName="can_create_products">
                  Créer des produits
                </mat-checkbox>
                <mat-checkbox formControlName="can_edit_products">
                  Modifier des produits
                </mat-checkbox>
                <mat-checkbox formControlName="can_delete_products">
                  Supprimer des produits
                </mat-checkbox>
                <mat-checkbox formControlName="can_view_simulations">
                  Voir les simulations
                </mat-checkbox>
                <mat-checkbox formControlName="can_manage_applications">
                  Gérer les demandes
                </mat-checkbox>
              </div>
            </div>

            <!-- Statut -->
            <div class="form-section">
              <mat-checkbox formControlName="is_active">
                Compte actif
              </mat-checkbox>
            </div>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button type="button" (click)="onCancel()">
            Annuler
          </button>
          <button 
            mat-raised-button 
            color="primary" 
            type="submit"
            [disabled]="!adminForm.valid || loading"
            (click)="onSubmit()">
            <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
            {{ isEditing ? 'Modifier' : 'Créer' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styleUrl: './admin-form.component.scss'
})
export class AdminFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private adminService = inject(AdminManagementService);
  private snackBar = inject(MatSnackBar);

  adminForm: FormGroup;
  isEditing = false;
  loading = false;
  adminId: string | null = null;
  banks: Institution[] = [];
  insuranceCompanies: Institution[] = [];

  constructor() {
    this.adminForm = this.createForm();
  }

  ngOnInit(): void {
    this.adminId = this.route.snapshot.paramMap.get('id');
    this.isEditing = !!this.adminId;

    this.loadInstitutions();
    
    if (this.isEditing) {
      this.loadAdmin();
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      role: ['', Validators.required],
      assigned_bank_id: [''],
      assigned_insurance_company_id: [''],
      can_create_products: [true],
      can_edit_products: [true],
      can_delete_products: [false],
      can_view_simulations: [true],
      can_manage_applications: [true],
      is_active: [true]
    });
  }

  loadInstitutions(): void {
    this.adminService.getInstitutions().subscribe({
      next: (response) => {
        this.banks = response.banks;
        this.insuranceCompanies = response.insurance_companies;
      },
      error: (error) => {
        console.error('Erreur chargement institutions:', error);
        this.snackBar.open('Erreur lors du chargement des institutions', 'Fermer', { duration: 3000 });
      }
    });
  }

  loadAdmin(): void {
    if (!this.adminId) return;

    this.loading = true;
    this.adminService.getAdmin(this.adminId).subscribe({
      next: (admin) => {
        // Extraire les permissions
        const permissions = admin.permissions || {};
        const products = permissions.products || {};
        const simulations = permissions.simulations || {};
        const applications = permissions.applications || {};

        this.adminForm.patchValue({
          username: admin.username,
          email: admin.email,
          first_name: admin.first_name,
          last_name: admin.last_name,
          role: admin.role,
          assigned_bank_id: admin.assigned_bank?.id || '',
          assigned_insurance_company_id: admin.assigned_insurance_company?.id || '',
          can_create_products: products.create || false,
          can_edit_products: products.update || false,
          can_delete_products: products.delete || false,
          can_view_simulations: simulations.read || false,
          can_manage_applications: applications.manage || false,
          is_active: admin.is_active
        });

        // Retirer la validation du mot de passe pour l'édition
        this.adminForm.get('password')?.clearValidators();
        this.adminForm.get('password')?.updateValueAndValidity();
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement admin:', error);
        this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onRoleChange(): void {
    const role = this.adminForm.get('role')?.value;
    const bankControl = this.adminForm.get('assigned_bank_id');
    const insuranceControl = this.adminForm.get('assigned_insurance_company_id');

    // Reset assignations
    bankControl?.setValue('');
    insuranceControl?.setValue('');

    // Ajouter/retirer validateurs selon le rôle
    if (role === 'bank_admin') {
      bankControl?.setValidators([Validators.required]);
      insuranceControl?.clearValidators();
    } else if (role === 'insurance_admin') {
      insuranceControl?.setValidators([Validators.required]);
      bankControl?.clearValidators();
    } else {
      bankControl?.clearValidators();
      insuranceControl?.clearValidators();
    }

    bankControl?.updateValueAndValidity();
    insuranceControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.adminForm.valid) {
      this.loading = true;
      const formData = this.adminForm.value;

      // Nettoyer les assignations selon le rôle
      if (formData.role !== 'bank_admin') {
        formData.assigned_bank_id = null;
      }
      if (formData.role !== 'insurance_admin') {
        formData.assigned_insurance_company_id = null;
      }

      const request = this.isEditing 
        ? this.adminService.updateAdmin(this.adminId!, formData)
        : this.adminService.createAdmin(formData);

      request.subscribe({
        next: (response) => {
          this.snackBar.open(
            this.isEditing ? 'Administrateur mis à jour' : 'Administrateur créé',
            'Fermer',
            { duration: 3000 }
          );
          this.router.navigate(['/admin/management']);
        },
        error: (error) => {
          console.error('Erreur sauvegarde:', error);
          this.snackBar.open(
            error.error?.detail || 'Erreur lors de la sauvegarde',
            'Fermer',
            { duration: 3000 }
          );
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/management']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.adminForm.controls).forEach(key => {
      this.adminForm.get(key)?.markAsTouched();
    });
  }
}