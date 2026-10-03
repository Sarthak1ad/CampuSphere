import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <!-- Left Visual Hero Pane -->
      <div class="auth-visual">
        <div class="visual-overlay"></div>
        <div class="visual-content">
          <div class="visual-badge">
            <i class="fa-solid fa-graduation-cap"></i> CampuSphere Portal
          </div>
          <h1 class="visual-title font-heading">
            Seamless Campus Events & Smart Ticketing.
          </h1>
          <p class="visual-subtitle">
            Experience high-concurrency event bookings, dynamic waitlists, QR passes, and comprehensive analytics built on MongoDB Atlas.
          </p>

          <div class="db-tech-badges">
            <span class="tech-pill"><i class="fa-solid fa-leaf"></i> MongoDB Atlas</span>
            <span class="tech-pill"><i class="fa-brands fa-angular"></i> Angular 18</span>
            <span class="tech-pill"><i class="fa-brands fa-node-js"></i> Node.js 20</span>
            <span class="tech-pill"><i class="fa-solid fa-shield-halved"></i> JWT + RBAC</span>
          </div>
        </div>
      </div>

      <!-- Right Login Form Pane -->
      <div class="auth-form-pane">
        <div class="auth-header-bar">
          <div class="brand-logo-small">
            <i class="fa-solid fa-shapes"></i> CampuSphere
          </div>
          <a routerLink="/auth/register" class="btn btn-sm btn-outline">
            Register Account
          </a>
        </div>

        <div class="auth-form-wrapper">
          <div class="form-eyebrow">WELCOME BACK</div>
          <h2 class="form-heading font-heading">Sign In to Your Account</h2>
          <p class="form-subtext">Access your tickets, event schedules, and analytics.</p>

          <!-- Quick Demo Login Presets -->
          <div class="demo-login-box">
            <span class="demo-label"><i class="fa-solid fa-bolt"></i> Quick Demo Login:</span>
            <div class="demo-buttons">
              <button type="button" class="btn-demo admin" (click)="fillDemo('admin@college.edu', 'Password123!')">
                Admin
              </button>
              <button type="button" class="btn-demo organizer" (click)="fillDemo('acm@college.edu', 'Password123!')">
                Organizer (ACM)
              </button>
              <button type="button" class="btn-demo student" (click)="fillDemo('student1@college.edu', 'Password123!')">
                Student
              </button>
            </div>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <div class="form-group">
              <label class="form-label">Email Address</label>
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
              <div class="form-error" *ngIf="f['email'].touched && f['email'].errors?.['email']">
                Enter a valid email
              </div>
            </div>

            <div class="form-group">
              <div class="form-label-row">
                <label class="form-label">Password</label>
              </div>
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

            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loginForm.invalid || isLoading">
              <span *ngIf="isLoading"><i class="fa-solid fa-spinner fa-spin"></i> Signing In...</span>
              <span *ngIf="!isLoading">Sign In <i class="fa-solid fa-arrow-right"></i></span>
            </button>
          </form>

          <div class="auth-footer">
            <p>Don't have an account? <a routerLink="/auth/register">Create one here</a></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      display: flex;
      min-height: 100vh;
      background: var(--bg-page);
    }
    .auth-visual {
      flex: 1.1;
      background: linear-gradient(145deg, #1A1A1A 0%, #2D1A10 100%), 
                  radial-gradient(circle at top left, rgba(224,90,26,0.35) 0%, transparent 60%);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 4rem;
      position: relative;
      color: #FFFFFF;
    }
    @media (max-width: 960px) {
      .auth-visual { display: none; }
    }
    .visual-content {
      position: relative;
      z-index: 2;
      max-width: 580px;
    }
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
    .visual-title {
      font-size: 3rem;
      line-height: 1.1;
      margin-bottom: 1.25rem;
      color: #FFFFFF;
    }
    .visual-subtitle {
      font-size: 1.1rem;
      line-height: 1.6;
      color: #D1D5DB;
      margin-bottom: 2.5rem;
    }
    .db-tech-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
    .tech-pill {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      color: #F3F4F6;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .auth-form-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #FFFFFF;
      padding: 2.5rem 3.5rem;
      justify-content: space-between;
    }
    @media (max-width: 600px) {
      .auth-form-pane { padding: 1.5rem; }
    }
    .auth-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-logo-small {
      font-family: var(--font-heading);
      font-weight: 800;
      font-size: 1.25rem;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .brand-logo-small i { color: var(--primary); }
    .auth-form-wrapper {
      max-width: 440px;
      width: 100%;
      margin: auto;
      padding: 2rem 0;
    }
    .form-eyebrow {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: 0.08em;
      margin-bottom: 0.4rem;
    }
    .form-heading {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .form-subtext {
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
    }
    .demo-login-box {
      background: #FFF7ED;
      border: 1px dashed #FDBA74;
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
    }
    .demo-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #9A3412;
      margin-bottom: 0.5rem;
    }
    .demo-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .btn-demo {
      flex: 1;
      padding: 0.35rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: var(--radius-sm);
      border: 1px solid #FED7AA;
      background: #FFFFFF;
      cursor: pointer;
      color: #7C2D12;
      transition: all 0.15s ease;
    }
    .btn-demo:hover {
      background: var(--primary);
      color: #FFFFFF;
      border-color: var(--primary);
    }
    .btn-block {
      width: 100%;
      margin-top: 1rem;
    }
    .auth-footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.9rem;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = false;

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  get f() {
    return this.loginForm.controls;
  }

  fillDemo(email: string, pass: string): void {
    this.loginForm.patchValue({ email, password: pass });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: res => {
        this.isLoading = false;
        this.toastService.success(`Welcome back, ${res.data?.user.name}!`);
        
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }

        const role = res.data?.user.role;
        if (role === 'admin') this.router.navigate(['/admin/dashboard']);
        else if (role === 'organizer') this.router.navigate(['/organizer/dashboard']);
        else this.router.navigate(['/student/dashboard']);
      },
      error: err => {
        this.isLoading = false;
        this.toastService.error(err.error?.message || 'Login failed. Please check credentials.');
      }
    });
  }
}
