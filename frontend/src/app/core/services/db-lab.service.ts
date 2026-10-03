import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DbLabService {
  private apiUrl = `${environment.apiUrl}/db-lab`;

  constructor(private http: HttpClient) {}

  getCollectionsInfo(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/collections`);
  }

  explainQuery(queryType: string = 'emailLookup'): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('queryType', queryType);
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/explain`, { params });
  }

  runAggregation(pipelineId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/aggregate/${pipelineId}`);
  }

  getConcurrencyStats(eventId: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('eventId', eventId);
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/concurrency`, { params });
  }
}
