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
        <img src="assets/images/college-building.png" alt="Sanjivani Group of Institutes" class="visual-bg-img" />
        <div class="visual-overlay"></div>
        <div class="college-top-label">
          <i class="fa-solid fa-university"></i>
          <span>Sanjivani Group of Institutes</span>
        </div>
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
              <button type="button" class="btn-demo admin" (click)="fillDemo('admin@campus.edu', 'Demo@1234')">
                Admin
              </button>
              <button type="button" class="btn-demo organizer" (click)="fillDemo('techclub@campus.edu', 'Demo@1234')">
                Organizer (Tech Club)
              </button>
              <button type="button" class="btn-demo student" (click)="fillDemo('student1@campus.edu', 'Demo@1234')">
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
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 4rem;
      position: relative;
      color: #FFFFFF;
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
      flex: 1.05;
      display: flex;
      flex-direction: column;
      background: #FFFFFF;
      padding: 3rem 4.5rem;
      justify-content: space-between;
    }
    @media (max-width: 1100px) {
      .auth-form-pane { padding: 2.5rem 3rem; }
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
      font-size: 1.35rem;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .brand-logo-small i { color: var(--primary); }
    .auth-form-wrapper {
      max-width: 500px;
      width: 100%;
      margin: auto;
      padding: 2.5rem 0;
    }
    .form-eyebrow {
      font-size: 0.82rem;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }
    .form-heading {
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin-bottom: 0.6rem;
    }
    .form-subtext {
      font-size: 1.05rem;
      color: var(--text-muted);
      margin-bottom: 1.75rem;
    }
    .demo-login-box {
      background: #FFF7ED;
      border: 1px dashed #FDBA74;
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      margin-bottom: 1.75rem;
      box-shadow: 0 2px 6px rgba(224, 90, 26, 0.05);
    }
    .demo-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: #9A3412;
      margin-bottom: 0.65rem;
    }
    .demo-buttons {
      display: flex;
      gap: 0.6rem;
    }
    .btn-demo {
      flex: 1;
      padding: 0.5rem 0.65rem;
      font-size: 0.82rem;
      font-weight: 700;
      border-radius: var(--radius-sm);
      border: 1px solid #FED7AA;
      background: #FFFFFF;
      cursor: pointer;
      color: #7C2D12;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .btn-demo:hover {
      background: var(--primary);
      color: #FFFFFF;
      border-color: var(--primary);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(224, 90, 26, 0.25);
    }
    .form-group {
      margin-bottom: 1.35rem;
    }
    .form-group .form-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      display: block;
    }
    .form-group .form-control {
      padding: 0.85rem 1.1rem;
      font-size: 1.02rem;
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
      padding: 0.9rem 1.5rem;
      font-size: 1.05rem;
      font-weight: 700;
      border-radius: 8px;
      letter-spacing: 0.01em;
      box-shadow: 0 4px 14px rgba(224, 90, 26, 0.3);
      transition: all 0.2s ease;
    }
    .btn-block:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(224, 90, 26, 0.38);
    }
    .auth-footer {
      margin-top: 1.75rem;
      text-align: center;
      font-size: 0.95rem;
      color: var(--text-muted);
    }
    .auth-footer a {
      color: var(--primary);
      font-weight: 600;
      text-decoration: underline;
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
        const user = res.data?.user || res.user;
        this.toastService.success(`Welcome back, ${user?.name || 'User'}!`);
        
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }

        const role = user?.role;
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
