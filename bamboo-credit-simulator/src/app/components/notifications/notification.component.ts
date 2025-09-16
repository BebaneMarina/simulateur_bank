import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationMessage } from '../../services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div
        *ngFor="let notification of notifications; trackBy: trackByNotificationId"
        class="notification"
        [class]="'notification-' + notification.type"
        [class.persistent]="notification.persistent"
      >
        <div class="notification-icon">
          <i [class]="getIconClass(notification.type)"></i>
        </div>
        
        <div class="notification-content">
          <div class="notification-title" *ngIf="notification.title">
            {{ notification.title }}
          </div>
          <div class="notification-message" [innerHTML]="formatMessage(notification.message)">
          </div>
          
          <div class="notification-actions" *ngIf="notification.actions && notification.actions.length > 0">
            <button
              *ngFor="let action of notification.actions"
              class="notification-action"
              [class]="'btn-' + (action.style || 'secondary')"
              (click)="executeAction(action, notification.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        
        <button
          class="notification-close"
          (click)="closeNotification(notification.id)"
          *ngIf="!notification.actions || notification.actions.length === 0"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      pointer-events: none;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      position: relative;
      overflow: hidden;
    }

    .notification::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: currentColor;
    }

    .notification-success {
      background: #f0f9ff;
      border-left: 4px solid #10b981;
      color: #065f46;
    }

    .notification-error {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }

    .notification-warning {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }

    .notification-info {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }

    .notification-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .notification-message {
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-line;
    }

    .notification-actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .notification-action {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .notification-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: transparent;
      border: none;
      color: inherit;
      opacity: 0.6;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: opacity 0.2s ease;
    }

    .notification-close:hover {
      opacity: 1;
    }

    .persistent {
      border-left-width: 6px;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 640px) {
      .notification-container {
        left: 12px;
        right: 12px;
        max-width: none;
      }
    }
  `]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: NotificationMessage[] = [];
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByNotificationId(index: number, notification: NotificationMessage): string {
    return notification.id;
  }

  getIconClass(type: NotificationMessage['type']): string {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-triangle',
      warning: 'fas fa-exclamation-circle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  formatMessage(message: string): string {
    return message.replace(/\n/g, '<br>');
  }

  executeAction(action: any, notificationId: string): void {
    action.action();
    this.notificationService.removeNotification(notificationId);
  }

  closeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }
}