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
        <img src="assets/images/college-building.png" alt="Sanjivani Group of Institutes" class="visual-bg-img" />
        <div class="visual-overlay"></div>
        <div class="college-top-label">
          <i class="fa-solid fa-university"></i>
          <span>Sanjivani Group of Institutes</span>
        </div>
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
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 4rem;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      background: #111;
    }
    .visual-bg-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      filter: brightness(0.75) saturate(1.1);
      transition: transform 8s ease;
      z-index: 0;
    }
    .auth-visual:hover .visual-bg-img {
      transform: scale(1.05);
    }
    .college-top-label {
      position: absolute;
      top: 2rem;
      left: 2.5rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,0.3);
      color: #ffffff;
      padding: 0.5rem 1.1rem;
      border-radius: 50px;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      z-index: 3;
      animation: fadeSlideDown 0.8s ease;
    }
    .college-top-label i { color: #FFB38A; }
    @keyframes fadeSlideDown {
      from { opacity: 0; transform: translateY(-14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .visual-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.15) 100%);
      z-index: 1;
    }
    @media (max-width: 960px) { .auth-visual { display: none; } }
    .visual-content { position: relative; z-index: 2; max-width: 580px; }
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
    .visual-title { font-size: 2.8rem; line-height: 1.15; margin-bottom: 1.25rem; font-weight: 800; }
    .visual-subtitle { font-size: 1.05rem; line-height: 1.6; color: #D1D5DB; }
    .auth-form-pane {
      flex: 1.1;
      display: flex;
      flex-direction: column;
      background: #FFFFFF;
      padding: 3rem 4.5rem;
      justify-content: space-between;
      overflow-y: auto;
    }
    @media (max-width: 1100px) { .auth-form-pane { padding: 2.5rem 3rem; } }
    @media (max-width: 600px) { .auth-form-pane { padding: 1.5rem; } }
    .auth-header-bar { display: flex; justify-content: space-between; align-items: center; }
    .brand-logo-small { font-family: var(--font-heading); font-weight: 800; font-size: 1.35rem; display: flex; align-items: center; gap: 0.6rem; }
    .brand-logo-small i { color: var(--primary); }
    .auth-form-wrapper { max-width: 500px; width: 100%; margin: auto; padding: 2rem 0; }
    .form-eyebrow { font-size: 0.82rem; font-weight: 800; color: var(--primary); letter-spacing: 0.1em; margin-bottom: 0.5rem; }
    .form-heading { font-size: 2.3rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 1.25rem; }
    .role-selector {
      display: flex;
      background: #F3F4F6;
      padding: 0.35rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1.5rem;
      gap: 0.35rem;
    }
    .role-tab {
      flex: 1;
      padding: 0.7rem;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }
    .role-tab.active {
      background: #FFFFFF;
      color: var(--primary);
      box-shadow: var(--shadow-sm);
      font-weight: 700;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-group .form-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.45rem;
      display: block;
    }
    .form-group .form-control {
      padding: 0.8rem 1.1rem;
      font-size: 1rem;
      border-radius: 8px;
      border: 1.5px solid #E5E7EB;
      transition: all 0.2s ease;
    }
    .form-group .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 4px rgba(224, 90, 26, 0.12);
    }
    .btn-block {
      width: 100%;
      margin-top: 1.25rem;
      padding: 0.85rem 1.5rem;
      font-size: 1.05rem;
      font-weight: 700;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(224, 90, 26, 0.3);
      transition: all 0.2s ease;
    }
    .btn-block:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(224, 90, 26, 0.38);
    }
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
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const val = this.registerForm.value;
    const payload: any = {
      name: val.name.trim(),
      email: val.email.trim(),
      phone: val.phone?.trim() || undefined,
      password: val.password,
      role: this.selectedRole
    };

    if (this.selectedRole === 'organizer') {
      const org = val.orgName?.trim() || `${val.name} Club`;
      const regNo = val.registrationNumber?.trim() || `REG-${Date.now().toString().slice(-6)}`;
      payload.orgName = org;
      payload.registrationNumber = regNo;
      payload.organizerProfile = {
        orgName: org,
        registrationNumber: regNo
      };
    }

    this.authService.register(payload).subscribe({
      next: res => {
        this.isLoading = false;
        const user = res.data?.user || res.user;
        this.toastService.success(`Welcome to CampuSphere, ${user?.name || 'Organizer'}!`);
        if (this.selectedRole === 'organizer') {
          this.router.navigate(['/organizer/dashboard']);
        } else {
          this.router.navigate(['/student/dashboard']);
        }
      },
      error: err => {
        this.isLoading = false;
        const msg = err.error?.message || (err.error?.errors ? err.error.errors[0]?.msg : null) || 'Registration failed. Email may already be registered.';
        this.toastService.error(msg);
      }
    });
  }
}

