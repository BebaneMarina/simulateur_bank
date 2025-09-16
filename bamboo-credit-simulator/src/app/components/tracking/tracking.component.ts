// src/app/features/tracking/tracking.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="tracking-container">
      <h1>Suivi de Demande</h1>
      <p>Entrez votre numéro de suivi pour consulter l'état de votre demande de crédit.</p>
      
      <div class="tracking-form">
        <input 
          type="text" 
          placeholder="Numéro de suivi"
          class="tracking-input">
        <button class="btn btn-primary">Rechercher</button>
      </div>
    </div>
  `,
  styles: [`
    .tracking-container {
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .tracking-form {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }
    
    .tracking-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
    }
    
    .btn {
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }
  `]
})
export class TrackingComponent { }