// src/app/features/tracking/tracking-detail.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tracking-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tracking-detail">
      <h1>Détail de la Demande</h1>
      <p>Numéro de suivi: {{ trackingId }}</p>
      
      <div class="status-card">
        <h3>Statut: En cours d'examen</h3>
        <p>Votre demande est actuellement en cours d'examen par nos équipes.</p>
      </div>
    </div>
  `,
  styles: [`
    .tracking-detail {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .status-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-top: 1rem;
    }
  `]
})
export class TrackingDetailComponent {
  trackingId: string;

  constructor(private route: ActivatedRoute) {
    this.trackingId = this.route.snapshot.paramMap.get('id') || '';
  }
}