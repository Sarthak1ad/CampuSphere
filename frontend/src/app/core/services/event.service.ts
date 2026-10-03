import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Event, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  getEvents(paramsObj: any = {}): Observable<ApiResponse<Event[]>> {
    let params = new HttpParams();
    Object.keys(paramsObj).forEach(key => {
      if (paramsObj[key] !== undefined && paramsObj[key] !== null && paramsObj[key] !== '') {
        params = params.set(key, paramsObj[key]);
      }
    });
    return this.http.get<ApiResponse<Event[]>>(this.apiUrl, { params });
  }

  getEventById(id: string, source: string = 'direct'): Observable<ApiResponse<Event>> {
    return this.http.get<ApiResponse<Event>>(`${this.apiUrl}/${id}?source=${source}`);
  }

  getNearbyEvents(lng: number, lat: number, distance: number = 10000): Observable<ApiResponse<Event[]>> {
    return this.http.get<ApiResponse<Event[]>>(`${this.apiUrl}/nearby?lng=${lng}&lat=${lat}&distance=${distance}`);
  }

  createEvent(formData: FormData): Observable<ApiResponse<Event>> {
    return this.http.post<ApiResponse<Event>>(this.apiUrl, formData);
  }

  updateEvent(id: string, formData: FormData): Observable<ApiResponse<Event>> {
    return this.http.put<ApiResponse<Event>>(`${this.apiUrl}/${id}`, formData);
  }

  updateStatus(id: string, status: string, rejectionReason?: string): Observable<ApiResponse<Event>> {
    return this.http.patch<ApiResponse<Event>>(`${this.apiUrl}/${id}/status`, { status, rejectionReason });
  }

  deleteEvent(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
