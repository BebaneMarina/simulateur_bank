import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Application {
  id: string;
  type: string;
  status: string;
  client_name: string;
  amount: number;
  created_at: string;
  product_name: string;
  institution_name: string;
}

@Component({
  selector: 'app-application-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="application-details-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Détails de la demande</h1>
      </div>

      <div *ngIf="loading" class="loading">
        <mat-spinner></mat-spinner>
        <p>Chargement des détails...</p>
      </div>

      <mat-card *ngIf="!loading && application" class="application-card">
        <mat-card-header>
          <mat-card-title>{{ application.client_name }}</mat-card-title>
          <mat-card-subtitle>{{ application.product_name }} - {{ application.institution_name }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="details-grid">
            <div class="detail-item">
              <label>ID Demande:</label>
              <span>{{ application.id }}</span>
            </div>
            <div class="detail-item">
              <label>Type:</label>
              <span>{{ application.type }}</span>
            </div>
            <div class="detail-item">
              <label>Montant:</label>
              <span>{{ application.amount | currency:'XAF':'symbol':'1.0-0' }}</span>
            </div>
            <div class="detail-item">
              <label>Statut:</label>
              <mat-chip [class]="'status-' + application.status">
                {{ getStatusLabel(application.status) }}
              </mat-chip>
            </div>
            <div class="detail-item">
              <label>Date de création:</label>
              <span>{{ application.created_at | date:'medium' }}</span>
            </div>
          </div>
        </mat-card-content>

        <mat-card-actions>
          <button mat-raised-button color="primary">
            <mat-icon>edit</mat-icon>
            Modifier
          </button>
          <button mat-button>
            <mat-icon>download</mat-icon>
            Télécharger
          </button>
        </mat-card-actions>
      </mat-card>

      <div *ngIf="!loading && !application" class="not-found">
        <mat-icon>error</mat-icon>
        <h3>Demande non trouvée</h3>
        <p>La demande demandée n'existe pas ou a été supprimée.</p>
      </div>
    </div>
  `,
  styles: [`
    .application-details-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .loading {
      text-align: center;
      padding: 48px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .detail-item label {
      font-weight: 500;
      color: #666;
      font-size: 0.9rem;
    }
    .detail-item span {
      font-size: 1rem;
      color: #333;
    }
    .not-found {
      text-align: center;
      padding: 48px;
      color: #666;
    }
    .status-pending { background-color: #fff3cd; color: #856404; }
    .status-approved { background-color: #d4edda; color: #155724; }
    .status-rejected { background-color: #f8d7da; color: #721c24; }
  `]
})
export class ApplicationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  application: Application | null = null;
  loading = false;

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('id');
    if (applicationId) {
      this.loadApplication(applicationId);
    }
  }

  loadApplication(id: string): void {
    this.loading = true;
    // Simulation de chargement
    setTimeout(() => {
      this.application = {
        id: id,
        type: 'Crédit immobilier',
        status: 'pending',
        client_name: 'Jean Dupont',
        amount: 25000000,
        created_at: new Date().toISOString(),
        product_name: 'BGFI Habitat Plus',
        institution_name: 'BGFI Bank'
      };
      this.loading = false;
    }, 1000);
  }

  getStatusLabel(status: string): string {
    const labels = {
      'pending': 'En attente',
      'approved': 'Approuvé',
      'rejected': 'Rejeté'
    };
    return labels[status as keyof typeof labels] || status;
  }

  goBack(): void {
    this.router.navigate(['/admin/applications']);
  }
}