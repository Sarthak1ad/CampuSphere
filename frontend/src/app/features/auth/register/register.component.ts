import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-visual">
        <div class="visual-content">
          <div class="visual-badge">
            <i class="fa-solid fa-user-plus"></i> Join CampuSphere
          </div>
          <h1 class="visual-title font-heading">
            Create Your Campus Account.
          </h1>
          <p class="visual-subtitle">
            Students get real-time seat alerts and instant QR passes. Organizers publish campus events with automated capacity control.
          </p>
        </div>
      </div>

      <div class="auth-form-pane">
        <div class="auth-header-bar">
          <div class="brand-logo-small">
            <i class="fa-solid fa-shapes"></i> CampuSphere
          </div>
          <a routerLink="/auth/login" class="btn btn-sm btn-outline">
            Sign In Instead
          </a>
        </div>

        <div class="auth-form-wrapper">
          <div class="form-eyebrow">GET STARTED</div>
          <h2 class="form-heading font-heading">Create New Account</h2>

          <!-- Role Toggle Tabs -->
          <div class="role-selector">
            <button 
              type="button" 
              class="role-tab" 
              [class.active]="selectedRole === 'student'"
              (click)="selectRole('student')">
              <i class="fa-solid fa-graduation-cap"></i> Student
            </button>
            <button 
              type="button" 
              class="role-tab" 
              [class.active]="selectedRole === 'organizer'"
              (click)="selectRole('organizer')">
              <i class="fa-solid fa-users"></i> Club Organizer
            </button>
          </div>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input 
                type="text" 
                class="form-control" 
                formControlName="name" 
                placeholder="John Doe"
                [class.is-invalid]="f['name'].touched && f['name'].invalid"
              />
              <div class="form-error" *ngIf="f['name'].touched && f['name'].errors?.['required']">
                Name is required
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address (College Domain)</label>
              <input 
                type="email" 
                class="form-control" 
                formControlName="email" 
                placeholder="name@college.edu"
                [class.is-invalid]="f['email'].touched && f['email'].invalid"
              />
              <div class="form-error" *ngIf="f['email'].touched && f['email'].errors?.['required']">
                Email is required
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number (10-15 digits)</label>
              <input 
                type="text" 
                class="form-control" 
                formControlName="phone" 
                placeholder="+919876543210"
              />
            </div>

            <!-- Organizer Specific Fields -->
            <ng-container *ngIf="selectedRole === 'organizer'">
              <div class="form-group">
                <label class="form-label">Club / Organization Name</label>
                <input 
                  type="text" 
                  class="form-control" 
                  formControlName="orgName" 
                  placeholder="e.g. ACM Student Chapter"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Official Registration Number</label>
                <input 
                  type="text" 
                  class="form-control" 
                  formControlName="registrationNumber" 
                  placeholder="e.g. REG-2024-ACM-01"
                />
              </div>
            </ng-container>

            <div class="form-group">
              <label class="form-label">Password (Min 8 chars, uppercase, lowercase, digit, special)</label>
              <input 
                type="password" 
                class="form-control" 
                formControlName="password" 
                placeholder="••••••••"
                [class.is-invalid]="f['password'].touched && f['password'].invalid"
              />
              <div class="form-error" *ngIf="f['password'].touched && f['password'].errors?.['required']">
                Password is required
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="registerForm.invalid || isLoading">
              <span *ngIf="isLoading"><i class="fa-solid fa-spinner fa-spin"></i> Creating Account...</span>
              <span *ngIf="!isLoading">Register Account <i class="fa-solid fa-arrow-right"></i></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display: flex; min-height: 100vh; background: var(--bg-page); }
    .auth-visual {
      flex: 1.1;
      background: linear-gradient(145deg, #1A1A1A 0%, #2D1A10 100%);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 4rem;
      color: #FFFFFF;
    }
    @media (max-width: 960px) { .auth-visual { display: none; } }
    .visual-content { max-width: 580px; }
    .visual-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(224, 90, 26, 0.25);
      border: 1px solid rgba(224, 90, 26, 0.5);
      color: #FFB38A;
      padding: 0.4rem 0.9rem;
      border-radius: var(--radius-full);
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
    }
    .visual-title { font-size: 3rem; line-height: 1.1; margin-bottom: 1.25rem; }
    .visual-subtitle { font-size: 1.1rem; line-height: 1.6; color: #D1D5DB; }
    .auth-form-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #FFFFFF;
      padding: 2.5rem 3.5rem;
      justify-content: space-between;
      overflow-y: auto;
    }
    @media (max-width: 600px) { .auth-form-pane { padding: 1.5rem; } }
    .auth-header-bar { display: flex; justify-content: space-between; align-items: center; }
    .brand-logo-small { font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
    .brand-logo-small i { color: var(--primary); }
    .auth-form-wrapper { max-width: 440px; width: 100%; margin: auto; padding: 1.5rem 0; }
    .form-eyebrow { font-size: 0.75rem; font-weight: 800; color: var(--primary); letter-spacing: 0.08em; margin-bottom: 0.4rem; }
    .form-heading { font-size: 1.85rem; margin-bottom: 1.25rem; }
    .role-selector {
      display: flex;
      background: #F3F4F6;
      padding: 0.25rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1.5rem;
      gap: 0.25rem;
    }
    .role-tab {
      flex: 1;
      padding: 0.6rem;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
    }
    .role-tab.active {
      background: #FFFFFF;
      color: var(--primary);
      box-shadow: var(--shadow-sm);
      font-weight: 700;
    }
    .btn-block { width: 100%; margin-top: 1rem; }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  selectedRole: 'student' | 'organizer' = 'student';
  isLoading = false;

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    orgName: [''],
    registrationNumber: ['']
  });

  get f() { return this.registerForm.controls; }

  selectRole(role: 'student' | 'organizer'): void {
    this.selectedRole = role;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    const val = this.registerForm.value;
    const payload: any = {
      name: val.name,
      email: val.email,
      phone: val.phone,
      password: val.password,
      role: this.selectedRole
    };

    if (this.selectedRole === 'organizer') {
      payload.organizerProfile = {
        orgName: val.orgName || val.name,
        registrationNumber: val.registrationNumber || 'REG-PENDING'
      };
    }

    this.authService.register(payload).subscribe({
      next: res => {
        this.isLoading = false;
        const user = res.data?.user || res.user;
        this.toastService.success(`Welcome to CampuSphere, ${user?.name || 'Student'}!`);
        if (this.selectedRole === 'organizer') {
          this.router.navigate(['/organizer/dashboard']);
        } else {
          this.router.navigate(['/student/dashboard']);
        }
      },
      error: err => {
        this.isLoading = false;
        this.toastService.error(err.error?.message || 'Registration failed.');
      }
    });
  }
}
