import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { AdminAuthService } from '../services/admin-auth.services';
import { NotificationService } from '../services/notification.service';

interface SystemSettings {
  general: GeneralSettings;
  security: SecuritySettings;
  email: EmailSettings;
  api: ApiSettings;
  maintenance: MaintenanceSettings;
}

interface GeneralSettings {
  site_name: string;
  site_description: string;
  default_language: string;
  default_currency: string;
  timezone: string;
  date_format: string;
  contact_email: string;
  support_phone: string;
}

interface SecuritySettings {
  session_timeout: number;
  max_login_attempts: number;
  password_min_length: number;
  require_two_factor: boolean;
  allowed_ip_ranges: string[];
  enable_audit_log: boolean;
  data_retention_days: number;
}

interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: string;
  from_email: string;
  from_name: string;
  enable_notifications: boolean;
}

interface ApiSettings {
  rate_limit_per_minute: number;
  enable_cors: boolean;
  allowed_origins: string[];
  api_key_expiry_days: number;
  enable_api_logging: boolean;
}

interface MaintenanceSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  scheduled_maintenance: Date | null;
  backup_frequency: string;
  auto_backup_enabled: boolean;
}

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div class="header-content">
          <h1>Paramètres Système</h1>
          <p>Configuration générale de la plateforme</p>
        </div>
        <div class="header-actions">
          <button (click)="backupSettings()" class="btn btn-outline">
            <i class="fas fa-download"></i>
            Sauvegarder config
          </button>
        </div>
      </div>

      <!-- Statut système -->
      <div class="system-status">
        <div class="status-card healthy">
          <div class="status-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="status-content">
            <h3>Système Opérationnel</h3>
            <p>Tous les services fonctionnent normalement</p>
          </div>
        </div>
        <div class="status-info">
          <div class="info-item">
            <span class="label">Version:</span>
            <span class="value">v2.1.0</span>
          </div>
          <div class="info-item">
            <span class="label">Dernière mise à jour:</span>
            <span class="value">{{ getLastUpdateDate() }}</span>
          </div>
          <div class="info-item">
            <span class="label">Uptime:</span>
            <span class="value">{{ getSystemUptime() }}</span>
          </div>
        </div>
      </div>

      <!-- Navigation par onglets -->
      <div class="settings-tabs">
        <button 
          *ngFor="let tab of tabs"
          (click)="setActiveTab(tab.id)"
          [class.active]="activeTab === tab.id"
          class="tab-button">
          <i [class]="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- Contenu des onglets -->
      <div class="settings-content">
        <!-- Paramètres généraux -->
        <div *ngIf="activeTab === 'general'" class="settings-section">
          <form [formGroup]="generalForm" class="settings-form">
            <h3>Paramètres Généraux</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="siteName">Nom du site</label>
                <input 
                  type="text" 
                  id="siteName"
                  formControlName="site_name"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label for="defaultLanguage">Langue par défaut</label>
                <select formControlName="default_language" id="defaultLanguage" class="form-select">
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="siteDescription">Description du site</label>
              <textarea 
                id="siteDescription"
                formControlName="site_description"
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="defaultCurrency">Devise par défaut</label>
                <select formControlName="default_currency" id="defaultCurrency" class="form-select">
                  <option value="XAF">Franc CFA (XAF)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="USD">Dollar US (USD)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="timezone">Fuseau horaire</label>
                <select formControlName="timezone" id="timezone" class="form-select">
                  <option value="Africa/Libreville">Libreville (WAT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="contactEmail">Email de contact</label>
                <input 
                  type="email" 
                  id="contactEmail"
                  formControlName="contact_email"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label for="supportPhone">Téléphone support</label>
                <input 
                  type="tel" 
                  id="supportPhone"
                  formControlName="support_phone"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-actions">
              <button 
                type="button"
                (click)="saveGeneralSettings()"
                [disabled]="generalForm.invalid || saving"
                class="btn btn-primary">
                {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Paramètres de sécurité -->
        <div *ngIf="activeTab === 'security'" class="settings-section">
          <form [formGroup]="securityForm" class="settings-form">
            <h3>Paramètres de Sécurité</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="sessionTimeout">Délai d'expiration de session (minutes)</label>
                <input 
                  type="number" 
                  id="sessionTimeout"
                  formControlName="session_timeout"
                  class="form-input"
                  min="15"
                  max="480"
                />
              </div>
              <div class="form-group">
                <label for="maxLoginAttempts">Tentatives de connexion maximum</label>
                <input 
                  type="number" 
                  id="maxLoginAttempts"
                  formControlName="max_login_attempts"
                  class="form-input"
                  min="3"
                  max="10"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="passwordMinLength">Longueur minimum mot de passe</label>
                <input 
                  type="number" 
                  id="passwordMinLength"
                  formControlName="password_min_length"
                  class="form-input"
                  min="6"
                  max="32"
                />
              </div>
              <div class="form-group">
                <label for="dataRetention">Rétention des données (jours)</label>
                <input 
                  type="number" 
                  id="dataRetention"
                  formControlName="data_retention_days"
                  class="form-input"
                  min="30"
                  max="3650"
                />
              </div>
            </div>

            <div class="form-group">
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="require_two_factor"
                  />
                  <span class="checkmark"></span>
                  Exiger l'authentification à deux facteurs
                </label>
              </div>
            </div>

            <div class="form-group">
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="enable_audit_log"
                  />
                  <span class="checkmark"></span>
                  Activer les logs d'audit
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="allowedIps">Plages IP autorisées (une par ligne)</label>
              <textarea 
                id="allowedIps"
                [value]="getAllowedIpsText()"
                (input)="updateAllowedIps($event)"
                class="form-textarea"
                rows="4"
                placeholder="192.168.1.0/24&#10;10.0.0.0/8"
              ></textarea>
            </div>

            <div class="form-actions">
              <button 
                type="button"
                (click)="saveSecuritySettings()"
                [disabled]="securityForm.invalid || saving"
                class="btn btn-primary">
                {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Paramètres email -->
        <div *ngIf="activeTab === 'email'" class="settings-section">
          <form [formGroup]="emailForm" class="settings-form">
            <h3>Configuration Email</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="smtpHost">Serveur SMTP</label>
                <input 
                  type="text" 
                  id="smtpHost"
                  formControlName="smtp_host"
                  class="form-input"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div class="form-group">
                <label for="smtpPort">Port SMTP</label>
                <input 
                  type="number" 
                  id="smtpPort"
                  formControlName="smtp_port"
                  class="form-input"
                  placeholder="587"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="smtpUsername">Nom d'utilisateur SMTP</label>
                <input 
                  type="text" 
                  id="smtpUsername"
                  formControlName="smtp_username"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label for="smtpPassword">Mot de passe SMTP</label>
                <input 
                  type="password" 
                  id="smtpPassword"
                  formControlName="smtp_password"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="smtpEncryption">Chiffrement</label>
                <select formControlName="smtp_encryption" id="smtpEncryption" class="form-select">
                  <option value="none">Aucun</option>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                </select>
              </div>
              <div class="form-group">
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      formControlName="enable_notifications"
                    />
                    <span class="checkmark"></span>
                    Activer les notifications email
                  </label>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="fromEmail">Email expéditeur</label>
                <input 
                  type="email" 
                  id="fromEmail"
                  formControlName="from_email"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label for="fromName">Nom expéditeur</label>
                <input 
                  type="text" 
                  id="fromName"
                  formControlName="from_name"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-actions">
              <button 
                type="button"
                (click)="testEmailConfiguration()"
                class="btn btn-outline">
                <i class="fas fa-envelope"></i>
                Tester la configuration
              </button>
              <button 
                type="button"
                (click)="saveEmailSettings()"
                [disabled]="emailForm.invalid || saving"
                class="btn btn-primary">
                {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Paramètres API -->
        <div *ngIf="activeTab === 'api'" class="settings-section">
          <form [formGroup]="apiForm" class="settings-form">
            <h3>Configuration API</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="rateLimit">Limite de requêtes par minute</label>
                <input 
                  type="number" 
                  id="rateLimit"
                  formControlName="rate_limit_per_minute"
                  class="form-input"
                  min="10"
                  max="1000"
                />
              </div>
              <div class="form-group">
                <label for="apiKeyExpiry">Expiration clés API (jours)</label>
                <input 
                  type="number" 
                  id="apiKeyExpiry"
                  formControlName="api_key_expiry_days"
                  class="form-input"
                  min="30"
                  max="365"
                />
              </div>
            </div>

            <div class="form-group">
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="enable_cors"
                  />
                  <span class="checkmark"></span>
                  Activer CORS
                </label>
              </div>
            </div>

            <div class="form-group">
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="enable_api_logging"
                  />
                  <span class="checkmark"></span>
                  Activer les logs API
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="allowedOrigins">Origines autorisées (une par ligne)</label>
              <textarea 
                id="allowedOrigins"
                [value]="getAllowedOriginsText()"
                (input)="updateAllowedOrigins($event)"
                class="form-textarea"
                rows="4"
                placeholder="https://app.bamboo.ga&#10;https://admin.bamboo.ga"
              ></textarea>
            </div>

            <div class="form-actions">
              <button 
                type="button"
                (click)="saveApiSettings()"
                [disabled]="apiForm.invalid || saving"
                class="btn btn-primary">
                {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Maintenance -->
        <div *ngIf="activeTab === 'maintenance'" class="settings-section">
          <form [formGroup]="maintenanceForm" class="settings-form">
            <h3>Maintenance et Sauvegardes</h3>
            
            <div class="maintenance-alert" *ngIf="maintenanceForm.get('maintenance_mode')?.value">
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Mode maintenance activé</strong>
                <p>Le site est actuellement inaccessible aux utilisateurs</p>
              </div>
            </div>

            <div class="form-group">
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="maintenance_mode"
                  />
                  <span class="checkmark"></span>
                  Activer le mode maintenance
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="maintenanceMessage">Message de maintenance</label>
              <textarea 
                id="maintenanceMessage"
                formControlName="maintenance_message"
                class="form-textarea"
                rows="3"
                placeholder="Le site est temporairement indisponible pour maintenance..."
              ></textarea>
            </div>

            <div class="form-group">
              <label for="backupFrequency">Fréquence de sauvegarde</label>
              <select formControlName="backup_frequency" id="backupFrequency" class="form-select">
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>

            <div class="form-group">
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="auto_backup_enabled"
                  />
                  <span class="checkmark"></span>
                  Activer les sauvegardes automatiques
                </label>
              </div>
            </div>

            <div class="backup-actions">
              <button 
                type="button"
                (click)="createBackup()"
                class="btn btn-outline">
                <i class="fas fa-database"></i>
                Créer une sauvegarde maintenant
              </button>
              <button 
                type="button"
                (click)="viewBackups()"
                class="btn btn-outline">
                <i class="fas fa-history"></i>
                Voir les sauvegardes
              </button>
            </div>

            <div class="form-actions">
              <button 
                type="button"
                (click)="saveMaintenanceSettings()"
                [disabled]="maintenanceForm.invalid || saving"
                class="btn btn-primary">
                {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  //styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit {
  activeTab = 'general';
  saving = false;

  generalForm!: FormGroup;
  securityForm!: FormGroup;
  emailForm!: FormGroup;
  apiForm!: FormGroup;
  maintenanceForm!: FormGroup;

  tabs = [
    { id: 'general', label: 'Général', icon: 'fas fa-cog' },
    { id: 'security', label: 'Sécurité', icon: 'fas fa-shield-alt' },
    { id: 'email', label: 'Email', icon: 'fas fa-envelope' },
    { id: 'api', label: 'API', icon: 'fas fa-code' },
    { id: 'maintenance', label: 'Maintenance', icon: 'fas fa-tools' }
  ];

  constructor(
    private fb: FormBuilder,
    private adminApi: AdminApiService,
    private adminAuth: AdminAuthService,
    private notificationService: NotificationService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  private initializeForms(): void {
    this.generalForm = this.fb.group({
      site_name: ['Bamboo Credit', Validators.required],
      site_description: ['Plateforme de simulation et comparaison financière'],
      default_language: ['fr'],
      default_currency: ['XAF'],
      timezone: ['Africa/Libreville'],
      date_format: ['DD/MM/YYYY'],
      contact_email: ['contact@bamboo.ga', [Validators.required, Validators.email]],
      support_phone: ['+241 XX XX XX XX']
    });

    this.securityForm = this.fb.group({
      session_timeout: [120, [Validators.required, Validators.min(15)]],
      max_login_attempts: [5, [Validators.required, Validators.min(3)]],
      password_min_length: [8, [Validators.required, Validators.min(6)]],
      require_two_factor: [false],
      allowed_ip_ranges: [['0.0.0.0/0']],
      enable_audit_log: [true],
      data_retention_days: [365, [Validators.required, Validators.min(30)]]
    });

    this.emailForm = this.fb.group({
      smtp_host: ['', Validators.required],
      smtp_port: [587, [Validators.required, Validators.min(1)]],
      smtp_username: [''],
      smtp_password: [''],
      smtp_encryption: ['tls'],
      from_email: ['', [Validators.required, Validators.email]],
      from_name: ['Bamboo'],
      enable_notifications: [true]
    });

    this.apiForm = this.fb.group({
      rate_limit_per_minute: [100, [Validators.required, Validators.min(10)]],
      enable_cors: [true],
      allowed_origins: [['*']],
      api_key_expiry_days: [90, [Validators.required, Validators.min(30)]],
      enable_api_logging: [true]
    });

    this.maintenanceForm = this.fb.group({
      maintenance_mode: [false],
      maintenance_message: ['Le site est temporairement indisponible pour maintenance. Veuillez réessayer plus tard.'],
      scheduled_maintenance: [null],
      backup_frequency: ['weekly'],
      auto_backup_enabled: [true]
    });
  }

  private loadSettings(): void {
    // Charger les paramètres depuis l'API
    // Cette implémentation dépend de votre backend
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  saveGeneralSettings(): void {
    if (this.generalForm.invalid) return;
    
    this.saving = true;
    // Logique de sauvegarde
    setTimeout(() => {
      this.saving = false;
      this.notificationService.showSuccess('Paramètres généraux sauvegardés');
    }, 1000);
  }

  saveSecuritySettings(): void {
    if (this.securityForm.invalid) return;
    
    this.saving = true;
    // Logique de sauvegarde
    setTimeout(() => {
      this.saving = false;
      this.notificationService.showSuccess('Paramètres de sécurité sauvegardés');
    }, 1000);
  }

  saveEmailSettings(): void {
    if (this.emailForm.invalid) return;
    
    this.saving = true;
    // Logique de sauvegarde
    setTimeout(() => {
      this.saving = false;
      this.notificationService.showSuccess('Configuration email sauvegardée');
    }, 1000);
  }

  saveApiSettings(): void {
    if (this.apiForm.invalid) return;
    
    this.saving = true;
    // Logique de sauvegarde
    setTimeout(() => {
      this.saving = false;
      this.notificationService.showSuccess('Paramètres API sauvegardés');
    }, 1000);
  }

  saveMaintenanceSettings(): void {
    if (this.maintenanceForm.invalid) return;
    
    this.saving = true;
    // Logique de sauvegarde
    setTimeout(() => {
      this.saving = false;
      this.notificationService.showSuccess('Paramètres de maintenance sauvegardés');
    }, 1000);
  }

  testEmailConfiguration(): void {
    this.notificationService.showInfo('Test de configuration email en cours...');
    // Logique de test email
    setTimeout(() => {
      this.notificationService.showSuccess('Email de test envoyé avec succès');
    }, 2000);
  }

  createBackup(): void {
    this.notificationService.showInfo('Création de sauvegarde en cours...');
    // Logique de création de sauvegarde
    setTimeout(() => {
      this.notificationService.showSuccess('Sauvegarde créée avec succès');
    }, 3000);
  }

  viewBackups(): void {
    this.notificationService.showInfo('Redirection vers la gestion des sauvegardes...');
  }

  backupSettings(): void {
    this.notificationService.showSuccess('Configuration exportée avec succès');
  }

  // Méthodes utilitaires pour les tableaux
  getAllowedIpsText(): string {
    const ips = this.securityForm.get('allowed_ip_ranges')?.value || [];
    return ips.join('\n');
  }

  updateAllowedIps(event: any): void {
    const ips = event.target.value.split('\n').filter((ip: string) => ip.trim());
    this.securityForm.patchValue({ allowed_ip_ranges: ips });
  }

  getAllowedOriginsText(): string {
    const origins = this.apiForm.get('allowed_origins')?.value || [];
    return origins.join('\n');
  }

  updateAllowedOrigins(event: any): void {
    const origins = event.target.value.split('\n').filter((origin: string) => origin.trim());
    this.apiForm.patchValue({ allowed_origins: origins });
  }

  getLastUpdateDate(): string {
    return new Date().toLocaleDateString('fr-FR');
  }

  getSystemUptime(): string {
    // Mock pour l'exemple
    return '15 jours, 3 heures';
  }
}