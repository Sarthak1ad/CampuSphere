import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Venue, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class VenueService {
  private apiUrl = `${environment.apiUrl}/venues`;

  constructor(private http: HttpClient) {}

  getVenues(paramsObj: any = {}): Observable<ApiResponse<Venue[]>> {
    let params = new HttpParams();
    Object.keys(paramsObj).forEach(key => {
      if (paramsObj[key] !== undefined && paramsObj[key] !== null && paramsObj[key] !== '') {
        params = params.set(key, paramsObj[key]);
      }
    });
    return this.http.get<ApiResponse<Venue[]>>(this.apiUrl, { params });
  }

  getVenueById(id: string): Observable<ApiResponse<Venue>> {
    return this.http.get<ApiResponse<Venue>>(`${this.apiUrl}/${id}`);
  }

  createVenue(venueData: any): Observable<ApiResponse<Venue>> {
    return this.http.post<ApiResponse<Venue>>(this.apiUrl, venueData);
  }

  updateVenue(id: string, venueData: any): Observable<ApiResponse<Venue>> {
    return this.http.put<ApiResponse<Venue>>(`${this.apiUrl}/${id}`, venueData);
  }

  deleteVenue(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
