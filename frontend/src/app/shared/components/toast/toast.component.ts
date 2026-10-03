import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" *ngIf="toastService.toasts().length > 0">
      <div *ngFor="let toast of toastService.toasts()" 
           class="toast-item alert alert-{{toast.type}} fade-in">
        <div class="toast-icon">
          <i class="fa-solid fa-circle-check" *ngIf="toast.type === 'success'"></i>
          <i class="fa-solid fa-circle-exclamation" *ngIf="toast.type === 'danger'"></i>
          <i class="fa-solid fa-triangle-exclamation" *ngIf="toast.type === 'warning'"></i>
          <i class="fa-solid fa-circle-info" *ngIf="toast.type === 'info'"></i>
        </div>
        <div class="toast-content">
          <strong *ngIf="toast.title" class="toast-title">{{ toast.title }}</strong>
          <p class="toast-msg">{{ toast.message }}</p>
        </div>
        <button class="toast-close" (click)="toastService.remove(toast.id)">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 380px;
      width: calc(100% - 3rem);
    }
    .toast-item {
      box-shadow: 0 10px 25px rgba(0,0,0,0.12);
      border-radius: 10px;
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      padding: 0.85rem 1rem;
      margin: 0;
    }
    .toast-icon {
      font-size: 1.25rem;
      margin-top: 0.1rem;
    }
    .toast-content {
      flex: 1;
    }
    .toast-title {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 0.15rem;
    }
    .toast-msg {
      font-size: 0.85rem;
      margin: 0;
      color: inherit;
    }
    .toast-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: inherit;
      opacity: 0.6;
      line-height: 1;
    }
    .toast-close:hover {
      opacity: 1;
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
