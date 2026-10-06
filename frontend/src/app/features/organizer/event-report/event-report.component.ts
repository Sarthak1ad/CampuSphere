import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AnalyticsService } from '../../../core/services/analytics.service';

Chart.register(...registerables);

@Component({
  selector: 'app-event-report',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fade-in">
      <a routerLink="/organizer/events" class="back-link"><i class="fa-solid fa-arrow-left"></i> My Events</a>
      <div *ngIf="isLoading" class="loading-state"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p>Preparing event report...</p></div>
      <div *ngIf="errorMessage" class="error-state"><i class="fa-solid fa-circle-exclamation"></i><p>{{ errorMessage }}</p></div>

      <ng-container *ngIf="!isLoading && report">
        <div class="page-header-row">
          <div>
            <div class="eyebrow">COMPLETED EVENT REPORT</div>
            <h2 class="font-heading">{{ report.event.title }}</h2>
            <p>Participants and task completion summary.</p>
          </div>
          <span class="badge badge-info">{{ report.event.status }}</span>
        </div>

        <div class="report-grid">
          <div class="card chart-card">
            <h3 class="font-heading">Participants & Tasks</h3>
            <div class="chart-wrap"><canvas #participantChart></canvas></div>
          </div>
          <div class="card tasks-card">
            <h3 class="font-heading">Event Tasks</h3>
            <div *ngIf="report.tasks.length === 0" class="empty-state">No tasks were added for this event.</div>
            <div *ngFor="let task of report.tasks" class="task-item">
              <i class="fa-solid" [class.fa-circle-check]="task.completed" [class.fa-circle]="!task.completed"></i>
              <span>{{ task.title }}</span>
            </div>
            <div class="task-total">{{ completedTasks }} of {{ report.tasks.length }} tasks completed</div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .back-link { display:inline-block;color:var(--primary);font-weight:600;text-decoration:none;margin-bottom:1.25rem; }
    .page-header-row { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem; }
    .page-header-row h2 { margin:.3rem 0; }
    .eyebrow { color:var(--primary);font-size:.78rem;font-weight:800;letter-spacing:.1em; }
    .page-header-row p { color:var(--text-muted);margin:0; }
    .report-grid { display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:1.5rem; }
    .chart-card,.tasks-card { padding:1.5rem; }
    .chart-card h3,.tasks-card h3 { margin:0 0 1rem; }
    .chart-wrap { position:relative;height:320px; }
    .task-item { display:flex;align-items:center;gap:.75rem;padding:.8rem 0;border-bottom:1px solid var(--border-light); }
    .task-item i { color:var(--primary); }
    .task-total { color:var(--text-muted);font-size:.85rem;margin-top:1rem; }
    .loading-state,.error-state,.empty-state { color:var(--text-muted);text-align:center;padding:3rem; }
    .error-state i { color:#DC2626;font-size:2rem; }
    @media (max-width:800px) { .report-grid { grid-template-columns:1fr; } .page-header-row { gap:1rem; } }
  `]
})
export class EventReportComponent implements AfterViewChecked, OnInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);
  private route = inject(ActivatedRoute);
  @ViewChild('participantChart') participantChart?: ElementRef<HTMLCanvasElement>;

  report: any = null;
  isLoading = true;
  errorMessage = '';
  private chart?: Chart;

  get completedTasks(): number {
    return this.report?.tasks?.filter((task: any) => task.completed).length || 0;
  }

  ngAfterViewChecked(): void {
    this.renderChart();
  }

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (!eventId) {
      this.isLoading = false;
      this.errorMessage = 'Event report not found.';
      return;
    }
    this.analyticsService.getCompletedEventReport(eventId).subscribe({
      next: response => {
        this.isLoading = false;
        this.report = response.data;
      },
      error: error => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Unable to load this event report.';
      }
    });
  }

  private renderChart(): void {
    const canvas = this.participantChart?.nativeElement;
    if (!canvas || !this.report || this.chart) return;
    const participantLabels = ['Registered', 'Checked in', 'Waitlisted', 'Cancelled', 'No-show'];
    const participantCounts = participantLabels.map(label => {
      const status = label.toLowerCase().replace(' ', '-');
      return this.report.participants.find((item: any) => item.status === status)?.count || 0;
    });
    const labels = [...participantLabels, 'Tasks total', 'Tasks completed'];
    const counts = [...participantCounts, this.report.tasks.length, this.completedTasks];
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Count', data: counts, backgroundColor: ['#E05A1A', '#10B981', '#F59E0B', '#9CA3AF', '#EF4444', '#3B82F6', '#8B5CF6'], borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } }
    };
    this.chart = new Chart(canvas, config);
  }

  ngOnDestroy(): void { this.chart?.destroy(); }
}