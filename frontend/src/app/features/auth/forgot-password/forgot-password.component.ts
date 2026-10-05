import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
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
            <i class="fa-solid fa-shield-halved"></i> Account Security
          </div>
          <h1 class="visual-title font-heading">
            Secure Account Recovery & Verification.
          </h1>
          <p class="visual-subtitle">
            Instantly recover your CampuSphere account using one-time verification codes sent directly to your registered college email.
          </p>
          <div class="db-tech-badges">
            <span class="tech-pill"><i class="fa-solid fa-envelope-circle-check"></i> OTP Verification</span>
            <span class="tech-pill"><i class="fa-solid fa-lock"></i> Encrypted Passwords</span>
            <span class="tech-pill"><i class="fa-solid fa-shield"></i> Timed Tokens</span>
          </div>
        </div>
      </div>

      <!-- Right Form Pane -->
      <div class="auth-form-pane">
        <div class="auth-header-bar">
          <div class="brand-logo-small">
            <i class="fa-solid fa-shapes"></i> CampuSphere
          </div>
          <a routerLink="/auth/login" class="btn btn-sm btn-outline">
            <i class="fa-solid fa-arrow-left"></i> Back to Login
          </a>
        </div>

        <div class="auth-form-wrapper">
          <!-- Step Indicator -->
          <div class="step-indicator" *ngIf="currentStep < 4">
            <div class="step-dot" [class.active]="currentStep >= 1" [class.current]="currentStep === 1">
              <span>1</span>
              <label>Email</label>
            </div>
            <div class="step-line" [class.active]="currentStep >= 2"></div>
            <div class="step-dot" [class.active]="currentStep >= 2" [class.current]="currentStep === 2">
              <span>2</span>
              <label>OTP</label>
            </div>
            <div class="step-line" [class.active]="currentStep >= 3"></div>
            <div class="step-dot" [class.active]="currentStep >= 3" [class.current]="currentStep === 3">
              <span>3</span>
              <label>New Password</label>
            </div>
          </div>

          <!-- STEP 1: Enter Email -->
          <div *ngIf="currentStep === 1" class="step-container fade-in">
            <div class="form-eyebrow">RESET PASSWORD</div>
            <h2 class="form-heading font-heading">Forgot Your Password?</h2>
            <p class="form-subtext">Enter your registered email address and we will send you a 6-digit verification code.</p>

            <form [formGroup]="emailForm" (ngSubmit)="sendOtp()" class="recovery-form">
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <div class="input-icon-wrap">
                  <i class="fa-regular fa-envelope input-icon"></i>
                  <input
                    type="email"
                    class="form-control with-icon"
                    formControlName="email"
                    placeholder="name@college.edu"
                    [class.is-invalid]="emailF['email'].touched && emailF['email'].invalid"
                  />
                </div>
                <div class="form-error" *ngIf="emailF['email'].touched && emailF['email'].errors?.['required']">
                  Email address is required
                </div>
                <div class="form-error" *ngIf="emailF['email'].touched && emailF['email'].errors?.['email']">
                  Please enter a valid email address
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="emailForm.invalid || isLoading">
                <span *ngIf="isLoading"><i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...</span>
                <span *ngIf="!isLoading">Send Verification Code <i class="fa-solid fa-paper-plane"></i></span>
              </button>
            </form>
          </div>

          <!-- STEP 2: Enter OTP -->
          <div *ngIf="currentStep === 2" class="step-container fade-in">
            <div class="form-eyebrow">VERIFICATION CODE</div>
            <h2 class="form-heading font-heading">Check Your Inbox</h2>
            <p class="form-subtext">
              We sent a 6-digit OTP code to <strong class="highlight-email">{{ targetEmail }}</strong>.
              <button type="button" class="btn-link-edit" (click)="currentStep = 1">(Edit)</button>
            </p>

            <!-- Dev mode OTP preview helper -->
            <div *ngIf="devOtp" class="dev-otp-banner">
              <i class="fa-solid fa-terminal"></i>
              <span>Test OTP Code: <strong>{{ devOtp }}</strong></span>
            </div>

            <form [formGroup]="otpForm" (ngSubmit)="verifyOtp()" class="recovery-form">
              <div class="form-group">
                <label class="form-label">6-Digit Verification Code</label>
                <div class="otp-input-wrap">
                  <input
                    type="text"
                    maxlength="6"
                    class="form-control otp-input"
                    formControlName="otp"
                    placeholder="• • • • • •"
                    [class.is-invalid]="otpF['otp'].touched && otpF['otp'].invalid"
                    autocomplete="one-time-code"
                  />
                </div>
                <div class="form-error" *ngIf="otpF['otp'].touched && otpF['otp'].errors?.['required']">
                  Verification code is required
                </div>
                <div class="form-error" *ngIf="otpF['otp'].touched && otpF['otp'].errors?.['pattern']">
                  Please enter the 6-digit numeric code
                </div>
              </div>

              <div class="resend-row">
                <span class="timer-text" *ngIf="resendCountdown > 0">
                  <i class="fa-regular fa-clock"></i> Resend code in <strong>{{ resendCountdown }}s</strong>
                </span>
                <button
                  type="button"
                  class="btn-resend"
                  *ngIf="resendCountdown === 0"
                  (click)="resendOtp()"
                  [disabled]="isLoading">
                  <i class="fa-solid fa-rotate-right"></i> Resend OTP Code
                </button>
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="otpForm.invalid || isLoading">
                <span *ngIf="isLoading"><i class="fa-solid fa-spinner fa-spin"></i> Verifying...</span>
                <span *ngIf="!isLoading">Verify & Continue <i class="fa-solid fa-arrow-right"></i></span>
              </button>
            </form>
          </div>

          <!-- STEP 3: Enter New Password -->
          <div *ngIf="currentStep === 3" class="step-container fade-in">
            <div class="form-eyebrow">NEW PASSWORD</div>
            <h2 class="form-heading font-heading">Set New Password</h2>
            <p class="form-subtext">Choose a strong password with at least 6 characters.</p>

            <form [formGroup]="passwordForm" (ngSubmit)="resetPassword()" class="recovery-form">
              <div class="form-group">
                <label class="form-label">New Password</label>
                <div class="input-password-wrap">
                  <input
                    [type]="showPassword ? 'text' : 'password'"
                    class="form-control"
                    formControlName="newPassword"
                    placeholder="Enter new password"
                    [class.is-invalid]="passF['newPassword'].touched && passF['newPassword'].invalid"
                  />
                  <button type="button" class="btn-toggle-eye" (click)="showPassword = !showPassword">
                    <i class="fa-solid" [ngClass]="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                  </button>
                </div>
                <div class="form-error" *ngIf="passF['newPassword'].touched && passF['newPassword'].errors?.['required']">
                  New password is required
                </div>
                <div class="form-error" *ngIf="passF['newPassword'].touched && passF['newPassword'].errors?.['minlength']">
                  Password must be at least 6 characters
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <div class="input-password-wrap">
                  <input
                    [type]="showConfirmPassword ? 'text' : 'password'"
                    class="form-control"
                    formControlName="confirmPassword"
                    placeholder="Confirm new password"
                    [class.is-invalid]="passF['confirmPassword'].touched && (passF['confirmPassword'].invalid || passwordMismatch)"
                  />
                  <button type="button" class="btn-toggle-eye" (click)="showConfirmPassword = !showConfirmPassword">
                    <i class="fa-solid" [ngClass]="showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                  </button>
                </div>
                <div class="form-error" *ngIf="passF['confirmPassword'].touched && passF['confirmPassword'].errors?.['required']">
                  Please confirm your password
                </div>
                <div class="form-error" *ngIf="passF['confirmPassword'].touched && passwordMismatch">
                  Passwords do not match
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="passwordForm.invalid || passwordMismatch || isLoading">
                <span *ngIf="isLoading"><i class="fa-solid fa-spinner fa-spin"></i> Resetting Password...</span>
                <span *ngIf="!isLoading">Save New Password <i class="fa-solid fa-check"></i></span>
              </button>
            </form>
          </div>

          <!-- STEP 4: Success Screen -->
          <div *ngIf="currentStep === 4" class="step-container success-container fade-in">
            <div class="success-icon-wrap">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <h2 class="form-heading font-heading">Password Reset Complete!</h2>
            <p class="form-subtext">
              Your password has been successfully updated. You can now use your new password to sign in.
            </p>
            <a routerLink="/auth/login" class="btn btn-primary btn-block btn-lg">
              Sign In Now <i class="fa-solid fa-arrow-right"></i>
            </a>
          </div>

          <div class="auth-footer" *ngIf="currentStep < 4">
            <p>Remembered your password? <a routerLink="/auth/login">Back to Sign In</a></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      display: flex;
      min-height: 100vh;
      background: var(--bg-page, #f8fafc);
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
      filter: brightness(0.72) saturate(1.1);
      transition: transform 8s ease;
      z-index: 0;
    }
    .auth-visual:hover .visual-bg-img { transform: scale(1.04); }
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
    }
    .college-top-label i { color: #FFB38A; }
    .visual-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%);
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
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
    }
    .visual-title {
      font-size: 2.8rem;
      line-height: 1.15;
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
      border-radius: 6px;
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
    .brand-logo-small i { color: var(--primary, #E05A1A); }
    .auth-form-wrapper {
      max-width: 480px;
      width: 100%;
      margin: auto;
      padding: 2rem 0;
    }
    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      padding: 0.5rem 0.25rem;
    }
    .step-dot {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      position: relative;
    }
    .step-dot span {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #F3F4F6;
      color: #9CA3AF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 700;
      border: 2px solid #E5E7EB;
      transition: all 0.3s ease;
    }
    .step-dot label {
      font-size: 0.75rem;
      color: #9CA3AF;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .step-dot.active span {
      background: #FFF7ED;
      border-color: var(--primary, #E05A1A);
      color: var(--primary, #E05A1A);
    }
    .step-dot.current span {
      background: var(--primary, #E05A1A);
      border-color: var(--primary, #E05A1A);
      color: #FFFFFF;
      box-shadow: 0 0 0 4px rgba(224, 90, 26, 0.18);
    }
    .step-dot.current label {
      color: var(--text-main, #1F2937);
      font-weight: 700;
    }
    .step-line {
      flex: 1;
      height: 2px;
      background: #E5E7EB;
      margin: 0 0.5rem;
      margin-bottom: 1.25rem;
      transition: all 0.3s ease;
    }
    .step-line.active { background: var(--primary, #E05A1A); }

    .form-eyebrow {
      font-size: 0.82rem;
      font-weight: 800;
      color: var(--primary, #E05A1A);
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }
    .form-heading {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.2;
      margin-bottom: 0.6rem;
    }
    .form-subtext {
      font-size: 1rem;
      color: var(--text-muted, #6B7280);
      margin-bottom: 1.75rem;
      line-height: 1.5;
    }
    .highlight-email {
      color: var(--text-main, #1F2937);
      word-break: break-all;
    }
    .btn-link-edit {
      background: none;
      border: none;
      color: var(--primary, #E05A1A);
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      padding: 0 0.25rem;
    }
    .dev-otp-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #FEF3C7;
      border: 1px solid #FCD34D;
      color: #92400E;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
    }
    .form-group { margin-bottom: 1.35rem; }
    .form-label {
      font-size: 0.92rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      display: block;
    }
    .input-icon-wrap {
      position: relative;
    }
    .input-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #9CA3AF;
      font-size: 1.05rem;
    }
    .form-control.with-icon {
      padding-left: 2.75rem;
    }
    .otp-input-wrap {
      display: flex;
      justify-content: center;
    }
    .otp-input {
      text-align: center;
      font-family: monospace;
      font-size: 1.75rem;
      letter-spacing: 0.75rem;
      font-weight: 800;
      color: var(--primary, #E05A1A);
      padding: 0.85rem 1rem;
      background: #FFF7ED;
      border: 2px solid #FED7AA;
    }
    .otp-input:focus {
      border-color: var(--primary, #E05A1A);
      box-shadow: 0 0 0 4px rgba(224, 90, 26, 0.15);
    }
    .resend-row {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .timer-text {
      font-size: 0.85rem;
      color: #6B7280;
    }
    .btn-resend {
      background: none;
      border: none;
      color: var(--primary, #E05A1A);
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-resend:hover { text-decoration: underline; }
    .input-password-wrap {
      position: relative;
    }
    .btn-toggle-eye {
      position: absolute;
      right: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #9CA3AF;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.25rem;
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
    .form-error {
      color: var(--danger, #EF4444);
      font-size: 0.82rem;
      margin-top: 0.35rem;
    }
    .success-container {
      text-align: center;
      padding: 2rem 0;
    }
    .success-icon-wrap {
      font-size: 4rem;
      color: #10B981;
      margin-bottom: 1.25rem;
      animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popIn {
      0% { transform: scale(0.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .auth-footer {
      margin-top: 1.75rem;
      text-align: center;
      font-size: 0.95rem;
      color: var(--text-muted, #6B7280);
    }
    .auth-footer a {
      color: var(--primary, #E05A1A);
      font-weight: 600;
      text-decoration: underline;
    }
  `]
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  currentStep = 1; // 1: Email, 2: OTP, 3: Password, 4: Success
  isLoading = false;
  targetEmail = '';
  devOtp = '';
  showPassword = false;
  showConfirmPassword = false;

  resendCountdown = 60;
  private timerInterval: any = null;

  emailForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  otpForm: FormGroup = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
  });

  passwordForm: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  get emailF() { return this.emailForm.controls; }
  get otpF() { return this.otpForm.controls; }
  get passF() { return this.passwordForm.controls; }

  get passwordMismatch(): boolean {
    const p1 = this.passwordForm.get('newPassword')?.value;
    const p2 = this.passwordForm.get('confirmPassword')?.value;
    return !!p2 && p1 !== p2;
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  startResendTimer(): void {
    this.resendCountdown = 60;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.resendCountdown > 0) {
        this.resendCountdown--;
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  sendOtp(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.targetEmail = this.emailForm.get('email')?.value.trim();

    this.authService.forgotPassword(this.targetEmail).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.devOtp = res.devOtp || '';
        this.currentStep = 2;
        this.startResendTimer();
        this.toastService.success(res.message || 'OTP code sent to your email.');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.error(err.error?.message || 'Failed to send OTP. Please check your email.');
      }
    });
  }

  resendOtp(): void {
    if (!this.targetEmail) return;
    this.isLoading = true;
    this.authService.forgotPassword(this.targetEmail).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.devOtp = res.devOtp || '';
        this.startResendTimer();
        this.toastService.success('New OTP verification code sent!');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.error(err.error?.message || 'Failed to resend OTP.');
      }
    });
  }

  verifyOtp(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const otp = this.otpForm.get('otp')?.value.trim();

    this.authService.verifyOtp(this.targetEmail, otp).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.currentStep = 3;
        this.toastService.success('Code verified! Please choose your new password.');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.error(err.error?.message || 'Invalid or expired OTP code.');
      }
    });
  }

  resetPassword(): void {
    if (this.passwordForm.invalid || this.passwordMismatch) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const otp = this.otpForm.get('otp')?.value.trim();
    const newPassword = this.passwordForm.get('newPassword')?.value;

    this.authService.resetPassword({
      email: this.targetEmail,
      otp,
      newPassword
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.currentStep = 4;
        this.toastService.success(res.message || 'Password reset successfully!');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.error(err.error?.message || 'Failed to reset password. Please try again.');
      }
    });
  }
}
