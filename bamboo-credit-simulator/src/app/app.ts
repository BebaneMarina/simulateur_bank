// src/app/app.component.ts - Version finale avec header qui ne cause pas de redirection
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component'; // Utilisez le HeaderComponent corrigé
import { FooterComponent } from './components/footer/footer.component';
import { NotificationComponent } from './components/notifications/notification.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent, // Header corrigé sans appels auth automatiques
    FooterComponent,
    NotificationComponent,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="app-container">
      <app-header></app-header>
      
      <app-loading-spinner 
        *ngIf="isLoading$ | async"
        class="global-loading">
      </app-loading-spinner>

      <main class="main-content" [class.loading]="isLoading$ | async">
        <router-outlet></router-outlet>
      </main>

      <!-- <app-notification></app-notification> -->
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      flex: 1;
      position: relative;
      transition: opacity 0.3s ease;
    }

    .main-content.loading {
      opacity: 0.7;
    }

    .global-loading {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class AppComponent {
  isLoading$: typeof this.loadingService.loading$;

  constructor(private loadingService: LoadingService) {
    this.isLoading$ = this.loadingService.loading$;
    console.log('AppComponent: Démarrage avec header corrigé');
  }
}