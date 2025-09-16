// src/app/features/not-found/not-found.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Page non trouvée</h2>
        <p class="error-message">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        
        <div class="error-actions">
          <a routerLink="/home" class="btn btn-primary">
            Retour à l'accueil
          </a>
          <a routerLink="/simulator-home" class="btn btn-outline">
            Simulateurs
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 70vh;
      padding: 2rem;
    }
    
    .not-found-content {
      text-align: center;
      max-width: 500px;
    }
    
    .error-code {
      font-size: 6rem;
      font-weight: bold;
      color: #3b82f6;
      margin: 0;
    }
    
    .error-title {
      font-size: 2rem;
      margin: 1rem 0;
      color: #1e293b;
    }
    
    .error-message {
      color: #64748b;
      margin-bottom: 2rem;
    }
    
    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
    }
    
    .btn-outline {
      background: transparent;
      color: #3b82f6;
      border: 1px solid #3b82f6;
    }
    
    .btn:hover {
      transform: translateY(-1px);
    }
  `]
})
export class NotFoundComponent { }