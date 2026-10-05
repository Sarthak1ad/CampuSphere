import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  // Admin Reports
  getAdminDashboard(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/admin/dashboard`);
  }

  getEventStatistics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/admin/dashboard`);
  }

  getAttendanceAnalytics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/admin/attendance`);
  }

  getOrganizerPerformance(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/admin/organizers`);
  }

  getVenueUtilization(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/admin/venues`);
  }

  exportCsv(type: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/admin/export/${type}`, {
      responseType: 'blob'
    });
  }

  // Organizer Reports
  getOrganizerEventAnalytics(eventId?: string): Observable<ApiResponse<any>> {
    const params = eventId ? new HttpParams().set('eventId', eventId) : undefined;
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/organizer/events`, { params });
  }

  getCompletedEventReport(eventId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/organizer/events/${eventId}/report`);
  }

  getOrganizerFeedbackAnalysis(eventId?: string): Observable<ApiResponse<any>> {
    const params = eventId ? new HttpParams().set('eventId', eventId) : undefined;
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/organizer/feedback`, { params });
  }

  getOrganizerPromotionReport(eventId?: string): Observable<ApiResponse<any>> {
    const params = eventId ? new HttpParams().set('eventId', eventId) : undefined;
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/organizer/promotions`, { params });
  }

  // Student Recommendations
  getStudentRecommendations(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/student/recommendations`);
  }
}
