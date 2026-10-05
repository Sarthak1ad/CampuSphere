import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, ApiResponse, Role } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  
  // Modern Angular Signal for reactive user state
  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadInitialAuth();
  }

  private loadInitialAuth(): void {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        this.token.set(savedToken);
        this.currentUser.set(JSON.parse(savedUser));
      } catch (e) {
        this.logout();
      }
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        const token = res.data?.token || res.token;
        const user = res.data?.user || res.user;
        if (token && user) {
          this.setSession(token, user);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/forgot-password`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/verify-otp`, { email, otp });
  }

  resetPassword(data: { email: string; otp: string; newPassword: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/reset-password`, data);
  }

  private setSession(token: string, user: User): void {
    this.token.set(token);
    this.currentUser.set(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getMe(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/me`).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.currentUser.set(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      })
    );
  }

  updateProfile(profileData: any): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/profile`, profileData).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.currentUser.set(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      })
    );
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }

  hasRole(role: Role | Role[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }
}
