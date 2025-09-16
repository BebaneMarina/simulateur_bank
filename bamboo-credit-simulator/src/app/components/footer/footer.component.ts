
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-content">
          <div class="footer-section">
            <h3>SimBot Gab</h3>
            <p>Votre partenaire pour tous vos projets de crédit, épargne et bien d'autre au Gabon.</p>
          </div>
          
          <div class="footer-section">
            <h4>Simulateurs</h4>
            <ul>
              <li><a routerLink="/borrowing-capacity">Capacité d'Emprunt</a></li>
              <li><a routerLink="/payment-calculator">Calculateur de Mensualités</a></li>
              <li><a routerLink="/multi-bank-comparator">Comparateur Multi-Banques</a></li>
            </ul>
          </div>
          
          <div class="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a routerLink="/tracking">Suivi de Demande</a></li>
              <li><a href="mailto:contact@bamboo-credit.ga">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div class="footer-bottom">
          <p>&copy; 2025 SimBot Gab. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  `,
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent { }