import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterModule],
  template: `
    <div class="forbidden-container">
      <mat-card class="forbidden-card">
        <mat-card-header>
          <mat-icon class="forbidden-icon">block</mat-icon>
          <mat-card-title>Accès Interdit</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          <p>Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" routerLink="/admin/dashboard">
            Retour au tableau de bord
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .forbidden-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      padding: 20px;
    }
    .forbidden-card {
      max-width: 500px;
      text-align: center;
    }
    .forbidden-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #f44336;
      margin: 0 auto 16px;
    }
  `]
})
export class ForbiddenComponent {}