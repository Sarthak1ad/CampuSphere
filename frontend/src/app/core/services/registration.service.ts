import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Registration, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private apiUrl = `${environment.apiUrl}/registrations`;

  constructor(private http: HttpClient) {}

  registerForEvent(eventId: string): Observable<ApiResponse<Registration>> {
    return this.http.post<ApiResponse<Registration>>(`${this.apiUrl}/events/${eventId}`, {});
  }

  cancelRegistration(registrationId: string): Observable<ApiResponse<{ cancelled: Registration; promotedStudent?: any }>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${registrationId}`);
  }

  getMyRegistrations(): Observable<ApiResponse<Registration[]>> {
    return this.http.get<ApiResponse<Registration[]>>(`${this.apiUrl}/my`);
  }

  getEventAttendees(eventId: string): Observable<ApiResponse<Registration[]>> {
    return this.http.get<ApiResponse<Registration[]>>(`${this.apiUrl}/events/${eventId}/attendees`);
  }

  checkIn(eventId: string, qrToken?: string, studentId?: string): Observable<ApiResponse<Registration>> {
    return this.http.post<ApiResponse<Registration>>(`${this.apiUrl}/events/${eventId}/check-in`, {
      qrToken,
      studentId
    });
  }
}
