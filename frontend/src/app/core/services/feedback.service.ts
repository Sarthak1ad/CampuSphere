import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Feedback, PlatformFeedback, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private apiUrl = `${environment.apiUrl}/feedback`;
  private platformUrl = `${environment.apiUrl}/platform-feedback`;

  constructor(private http: HttpClient) {}

  // Event feedback
  submitEventFeedback(feedbackData: any): Observable<ApiResponse<Feedback>> {
    return this.http.post<ApiResponse<Feedback>>(this.apiUrl, feedbackData);
  }

  getEventFeedbacks(eventId: string): Observable<ApiResponse<Feedback[]>> {
    return this.http.get<ApiResponse<Feedback[]>>(`${this.apiUrl}/events/${eventId}`);
  }

  replyToFeedback(feedbackId: string, reply: string): Observable<ApiResponse<Feedback>> {
    return this.http.post<ApiResponse<Feedback>>(`${this.apiUrl}/${feedbackId}/reply`, { reply });
  }

  // Platform bug reports & suggestions
  submitPlatformFeedback(feedbackData: any): Observable<ApiResponse<PlatformFeedback>> {
    return this.http.post<ApiResponse<PlatformFeedback>>(this.platformUrl, feedbackData);
  }

  getPlatformFeedbacks(status?: string): Observable<ApiResponse<PlatformFeedback[]>> {
    const url = status ? `${this.platformUrl}?status=${status}` : this.platformUrl;
    return this.http.get<ApiResponse<PlatformFeedback[]>>(url);
  }

  updatePlatformFeedbackStatus(id: string, status: string): Observable<ApiResponse<PlatformFeedback>> {
    return this.http.patch<ApiResponse<PlatformFeedback>>(`${this.platformUrl}/${id}/status`, { status });
  }
}
