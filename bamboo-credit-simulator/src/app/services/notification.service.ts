// services/notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  data?: any;
  timestamp: Date;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<NotificationMessage[]>([]);
  private notificationId = 0;

  constructor() {}

  // Observable pour les composants qui veulent écouter les notifications
  getNotifications(): Observable<NotificationMessage[]> {
    return this.notifications$.asObservable();
  }

  // Méthodes principales pour afficher les notifications
  showSuccess(message: string, title: string = 'Succès', duration: number = 5000): void {
    this.addNotification({
      type: 'success',
      title,
      message,
      duration
    });
  }

  showError(message: string, title: string = 'Erreur', persistent: boolean = false): void {
    this.addNotification({
      type: 'error',
      title,
      message,
      persistent,
      duration: persistent ? 0 : 8000
    });
  }

  showWarning(message: string, title: string = 'Attention', duration: number = 6000): void {
    this.addNotification({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  showInfo(message: string, title: string = 'Information', duration: number = 5000): void {
    this.addNotification({
      type: 'info',
      title,
      message,
      duration
    });
  }

  // Notification avec actions personnalisées
  showWithActions(
    message: string,
    actions: NotificationAction[],
    type: NotificationMessage['type'] = 'info',
    title: string = 'Action requise'
  ): void {
    this.addNotification({
      type,
      title,
      message,
      actions,
      persistent: true
    });
  }

  // Notification persistante (reste jusqu'à fermeture manuelle)
  showPersistent(
    message: string,
    type: NotificationMessage['type'] = 'info',
    title: string = 'Information'
  ): void {
    this.addNotification({
      type,
      title,
      message,
      persistent: true
    });
  }

  // Notification avec données personnalisées
  showCustom(notification: Partial<NotificationMessage>): void {
    this.addNotification(notification);
  }

  // Notifications spécifiques aux applications
  showApplicationSuccess(applicationNumber: string, bankName: string): void {
    this.addNotification({
      type: 'success',
      title: 'Demande envoyée !',
      message: `Votre demande a été transmise à ${bankName}. Numéro de dossier: ${applicationNumber}`,
      duration: 10000,
      actions: [
        {
          label: 'Copier le numéro',
          action: () => this.copyToClipboard(applicationNumber),
          style: 'secondary'
        }
      ],
      data: { applicationNumber, bankName }
    });
  }

  showSimulationSaved(simulationType: 'credit' | 'savings'): void {
    const typeLabel = simulationType === 'credit' ? 'crédit' : 'épargne';
    this.showSuccess(
      `Votre simulation ${typeLabel} a été sauvegardée et peut maintenant être utilisée pour une demande`,
      'Simulation sauvegardée'
    );
  }

  showValidationErrors(errors: string[]): void {
    const errorMessage = errors.length > 1 
      ? `${errors.length} erreurs détectées:\n${errors.map(e => `• ${e}`).join('\n')}`
      : errors[0];
      
    this.addNotification({
      type: 'error',
      title: 'Erreurs de validation',
      message: errorMessage,
      duration: 8000
    });
  }

  showConnectionError(): void {
    this.addNotification({
      type: 'error',
      title: 'Problème de connexion',
      message: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
      persistent: true,
      actions: [
        {
          label: 'Réessayer',
          action: () => window.location.reload(),
          style: 'primary'
        }
      ]
    });
  }

  // Gestion des notifications
  private addNotification(notification: Partial<NotificationMessage>): void {
    const id = `notification_${++this.notificationId}`;
    
    const fullNotification: NotificationMessage = {
      id,
      type: 'info',
      title: 'Information',
      message: '',
      duration: 5000,
      persistent: false,
      timestamp: new Date(),
      ...notification
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, fullNotification]);

    // Auto-suppression après duration (sauf si persistent)
    if (!fullNotification.persistent && fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, fullNotification.duration);
    }
  }

  removeNotification(id: string): void {
    const currentNotifications = this.notifications$.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notifications$.next(filteredNotifications);
  }

  clearAll(): void {
    this.notifications$.next([]);
  }

  clearByType(type: NotificationMessage['type']): void {
    const currentNotifications = this.notifications$.value;
    const filteredNotifications = currentNotifications.filter(n => n.type !== type);
    this.notifications$.next(filteredNotifications);
  }

  // Méthodes utilitaires
  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccess('Copié dans le presse-papier', '', 2000);
    }).catch(() => {
      this.showError('Impossible de copier dans le presse-papier');
    });
  }

  // Notifications Toast pour les événements système
  showToast(message: string, type: NotificationMessage['type'] = 'info'): void {
    this.addNotification({
      type,
      title: '',
      message,
      duration: 3000
    });
  }

  // Notification de confirmation avec callback
  showConfirmation(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    title: string = 'Confirmation'
  ): void {
    const actions: NotificationAction[] = [
      {
        label: 'Confirmer',
        action: () => {
          onConfirm();
        },
        style: 'primary'
      },
      {
        label: 'Annuler',
        action: () => {
          if (onCancel) onCancel();
        },
        style: 'secondary'
      }
    ];

    this.showWithActions(message, actions, 'warning', title);
  }

  // Notifications de progression
  showProgress(message: string, title: string = 'Traitement en cours'): string {
    const notification: NotificationMessage = {
      id: `progress_${++this.notificationId}`,
      type: 'info',
      title,
      message,
      persistent: true,
      timestamp: new Date()
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, notification]);

    return notification.id;
  }

  updateProgress(id: string, message: string, completed: boolean = false): void {
    const currentNotifications = this.notifications$.value;
    const notificationIndex = currentNotifications.findIndex(n => n.id === id);
    
    if (notificationIndex !== -1) {
      if (completed) {
        this.removeNotification(id);
        this.showSuccess(message, 'Terminé');
      } else {
        const updatedNotifications = [...currentNotifications];
        updatedNotifications[notificationIndex] = {
          ...updatedNotifications[notificationIndex],
          message
        };
        this.notifications$.next(updatedNotifications);
      }
    }
  }

  // Notifications spéciales pour les différentes étapes d'une demande
  showApplicationProgress(step: string, total: number, current: number): void {
    const progress = Math.round((current / total) * 100);
    this.showInfo(
      `${step} (${current}/${total}) - ${progress}% terminé`,
      'Traitement de votre demande'
    );
  }

  showFormValidationSummary(validFields: number, totalFields: number): void {
    if (validFields === totalFields) {
      this.showSuccess('Tous les champs sont correctement remplis', 'Formulaire valide');
    } else {
      const remaining = totalFields - validFields;
      this.showWarning(
        `${remaining} champ${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''} à compléter`,
        'Formulaire incomplet'
      );
    }
  }

  // Notification de maintenance ou d'information système
  showSystemNotification(message: string, severity: 'info' | 'warning' | 'error' = 'info'): void {
    this.addNotification({
      type: severity,
      title: 'Information système',
      message,
      persistent: true
    });
  }
}