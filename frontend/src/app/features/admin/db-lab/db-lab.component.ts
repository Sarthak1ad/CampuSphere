import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbLabService } from '../../../core/services/db-lab.service';
import { EventService } from '../../../core/services/event.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event } from '../../../core/models';

@Component({
  selector: 'app-db-lab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="db-lab-container">
      <!-- Top Banner / Hero -->
      <div class="header-hero">
        <div class="hero-content">
          <div class="badge-tag">
            <span class="pulse-dot"></span>
            ADBMS Interactive Laboratory
          </div>
          <h1>MongoDB Advanced Features & Query Analyzer</h1>
          <p>
            Explore live MongoDB collection architecture, index performance benchmarks using 
            <code>explain('executionStats')</code>, multi-stage aggregation pipelines, and atomic concurrency controls.
          </p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="nav-tabs">
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'collections'"
          (click)="activeTab.set('collections')">
          Collection Architecture & Indexes
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'explain'"
          (click)="activeTab.set('explain'); loadExplainPlan()">
          explain() Query Optimizer
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'aggregations'"
          (click)="activeTab.set('aggregations'); loadAggregation('eventsByCategory')">
          Aggregation Pipeline Engine
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'concurrency'"
          (click)="activeTab.set('concurrency'); loadEventsForConcurrency()">
          Concurrency & Atomicity
        </button>
      </div>

      <!-- Tab 1: Collection Architecture & Indexes -->
      <div *ngIf="activeTab() === 'collections'" class="tab-pane">
        <div class="pane-header">
          <div>
            <h2>Database Collections & Index Topology</h2>
            <p class="subtitle">Real-time stats from collStats and collection.indexes()</p>
          </div>
          <button class="btn btn-outline" (click)="loadCollections()" [disabled]="loading()">
            <span *ngIf="loading()" class="spinner"></span>
            Refresh Collections
          </button>
        </div>

        <div class="grid-collections">
          <div *ngFor="let col of collections()" class="col-card">
            <div class="col-card-header">
              <div class="col-title-group">
                <span class="col-badge">Collection</span>
                <h3>{{ col.name }}</h3>
              </div>
              <div class="doc-count">
                <span class="count-num">{{ col.count }}</span>
                <span class="count-lbl">documents</span>
              </div>
            </div>

            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">Storage Size</span>
                <span class="stat-val">{{ formatBytes(col.sizeBytes) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Avg Doc Size</span>
                <span class="stat-val">{{ formatBytes(col.avgDocSizeBytes) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Total Indexes</span>
                <span class="stat-val">{{ col.indexes?.length || 0 }}</span>
              </div>
            </div>

            <div class="indexes-section">
              <h4>Active Indexes</h4>
              <div class="index-list">
                <div *ngFor="let idx of col.indexes" class="index-item">
                  <div class="index-header">
                    <span class="index-name"><code>{{ idx.name }}</code></span>
                    <div class="index-flags">
                      <span *ngIf="idx.unique" class="flag-badge unique">Unique</span>
                      <span *ngIf="idx.sparse" class="flag-badge sparse">Sparse</span>
                      <span *ngIf="idx.expireAfterSeconds" class="flag-badge ttl">TTL: {{ idx.expireAfterSeconds }}s</span>
                      <span *ngIf="idx.textWeights" class="flag-badge text">Full-Text</span>
                      <span *ngIf="is2dsphere(idx.key)" class="flag-badge geo">2dsphere</span>
                    </div>
                  </div>
                  <pre class="index-keys">{{ idx.key | json }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: explain() Query Optimizer -->
      <div *ngIf="activeTab() === 'explain'" class="tab-pane">
        <div class="pane-header">
          <div>
            <h2>Query Execution Plan & Index Efficiency</h2>
            <p class="subtitle">Comparing indexed (IXSCAN) vs unindexed (COLLSCAN) query strategies</p>
          </div>
          <div class="control-select">
            <select [(ngModel)]="selectedExplainQuery" (change)="loadExplainPlan()" class="form-select">
              <option value="emailLookup">User Lookup: Unique Index on email vs Regex on name</option>
              <option value="categoryDate">Event Search: Compound Index (category, startDate) vs Unindexed</option>
              <option value="textSearch">Event Title: Text Index $search vs Unindexed Regex</option>
            </select>
          </div>
        </div>

        <div *ngIf="explainData()" class="explain-dashboard">
          <div class="concept-callout">
            <div class="callout-icon">💡</div>
            <div>
              <strong>MongoDB ADBMS Concept:</strong> {{ explainData().explanation }}
              <p>When an index is available, MongoDB navigates a B-tree (IXSCAN) with O(log N) complexity examining only matching keys. Without an index, MongoDB executes a Collection Scan (COLLSCAN), inspecting every document.</p>
            </div>
          </div>

          <div class="comparison-grid">
            <!-- Indexed Strategy -->
            <div class="plan-card indexed">
              <div class="card-status-bar good">
                <span>OPTIMIZED: INDEX SCAN (IXSCAN)</span>
              </div>
              <div class="card-inner">
                <div class="metric-row">
                  <div class="metric">
                    <span class="m-val highlight-good">{{ explainData().withIndex.executionTimeMs }} ms</span>
                    <span class="m-lbl">Execution Time</span>
                  </div>
                  <div class="metric">
                    <span class="m-val">{{ explainData().withIndex.docsExamined }}</span>
                    <span class="m-lbl">Docs Examined</span>
                  </div>
                  <div class="metric">
                    <span class="m-val">{{ explainData().withIndex.docsReturned }}</span>
                    <span class="m-lbl">Docs Returned</span>
                  </div>
                </div>

                <div class="plan-details">
                  <div class="detail-row">
                    <span class="d-lbl">Stage:</span>
                    <span class="d-val badge-stage">{{ explainData().withIndex.stage }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="d-lbl">Index Used:</span>
                    <span class="d-val code-val"><code>{{ explainData().withIndex.indexUsed }}</code></span>
                  </div>
                  <div class="detail-row">
                    <span class="d-lbl">Keys Examined:</span>
                    <span class="d-val">{{ explainData().withIndex.keysExamined }}</span>
                  </div>
                </div>

                <details class="json-tree">
                  <summary>View Complete Winning Plan (JSON)</summary>
                  <pre>{{ explainData().withIndex.fullPlan?.queryPlanner | json }}</pre>
                </details>
              </div>
            </div>

            <!-- Unindexed Strategy -->
            <div class="plan-card unindexed">
              <div class="card-status-bar warning">
                <span>SLOW: FULL COLLECTION SCAN (COLLSCAN)</span>
              </div>
              <div class="card-inner">
                <div class="metric-row">
                  <div class="metric">
                    <span class="m-val highlight-warn">{{ explainData().withoutIndex.executionTimeMs }} ms</span>
                    <span class="m-lbl">Execution Time</span>
                  </div>
                  <div class="metric">
                    <span class="m-val">{{ explainData().withoutIndex.docsExamined }}</span>
                    <span class="m-lbl">Docs Examined</span>
                  </div>
                  <div class="metric">
                    <span class="m-val">{{ explainData().withoutIndex.docsReturned }}</span>
                    <span class="m-lbl">Docs Returned</span>
                  </div>
                </div>

                <div class="plan-details">
                  <div class="detail-row">
                    <span class="d-lbl">Stage:</span>
                    <span class="d-val badge-stage warn">{{ explainData().withoutIndex.stage }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="d-lbl">Index Used:</span>
                    <span class="d-val code-val red"><code>{{ explainData().withoutIndex.indexUsed }}</code></span>
                  </div>
                  <div class="detail-row">
                    <span class="d-lbl">Keys Examined:</span>
                    <span class="d-val">{{ explainData().withoutIndex.keysExamined }}</span>
                  </div>
                </div>

                <details class="json-tree">
                  <summary>View Complete Winning Plan (JSON)</summary>
                  <pre>{{ explainData().withoutIndex.fullPlan?.queryPlanner | json }}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Aggregation Pipeline Engine -->
      <div *ngIf="activeTab() === 'aggregations'" class="tab-pane">
        <div class="pane-header">
          <div>
            <h2>Multi-Stage Aggregation Pipeline Engine</h2>
            <p class="subtitle">Demonstrates $match, $group, $lookup, $unwind, $facet, $bucket, $project and $sort</p>
          </div>
          <div class="pipeline-buttons">
            <button 
              *ngFor="let p of pipelinesList" 
              class="btn-pipe" 
              [class.active]="selectedPipeline === p.id"
              (click)="loadAggregation(p.id)">
              {{ p.label }}
            </button>
          </div>
        </div>

        <div *ngIf="aggregationResult()" class="aggregation-view">
          <div class="pipe-desc-bar">
            <div>
              <h3>{{ aggregationResult().description }}</h3>
              <p>Target Collection: <code>{{ aggregationResult().meta.collection }}</code> | Execution Time: <strong>{{ aggregationResult().meta.executionTimeMs }} ms</strong> | Result Count: <strong>{{ aggregationResult().meta.resultCount }}</strong></p>
            </div>
          </div>

          <div class="pipe-layout">
            <!-- Pipeline Stages Definition -->
            <div class="pipe-stages-col">
              <h4>Pipeline Definition (Stages)</h4>
              <div class="stage-accordion">
                <div *ngFor="let stage of aggregationResult().pipeline; let i = index" class="stage-box">
                  <div class="stage-num">Stage {{ i + 1 }}: <span class="stage-name">{{ getStageName(stage) }}</span></div>
                  <pre class="stage-json">{{ stage | json }}</pre>
                </div>
              </div>
            </div>

            <!-- Pipeline Output Results -->
            <div class="pipe-results-col">
              <h4>Pipeline Output Documents</h4>
              <div class="result-table-wrap" *ngIf="isArray(aggregationResult().result); else singleDoc">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th *ngFor="let key of getObjectKeys(aggregationResult().result[0])">{{ key }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of aggregationResult().result">
                      <td *ngFor="let key of getObjectKeys(aggregationResult().result[0])">
                        <ng-container *ngIf="isObject(row[key]); else rawVal">
                          <code>{{ row[key] | json }}</code>
                        </ng-container>
                        <ng-template #rawVal>{{ row[key] }}</ng-template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ng-template #singleDoc>
                <pre class="json-display">{{ aggregationResult().result | json }}</pre>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 4: Concurrency & Atomicity -->
      <div *ngIf="activeTab() === 'concurrency'" class="tab-pane">
        <div class="pane-header">
          <div>
            <h2>ACID & Atomic Operation Lab</h2>
            <p class="subtitle">Testing MongoDB atomic updates with conditional checks against race conditions</p>
          </div>
        </div>

        <div class="concurrency-lab">
          <div class="lab-intro-card">
            <h3>Race Condition Prevention via Document-Level Atomicity</h3>
            <p>
              In high-traffic ticketing scenarios, multiple users attempt to register simultaneously for the last few tickets. 
              The backend uses MongoDB's atomic operator:
            </p>
            <div class="code-snippet-box">
              <code>Event.findOneAndUpdate(&#123; _id: eventId, registeredCount: &#123; $lt: capacity &#125; &#125;, &#123; $inc: &#123; registeredCount: 1 &#125; &#125;)</code>
            </div>
            <p>
              This ensures <strong>ZERO OVERBOOKING</strong> even with hundreds of concurrent requests without locking the database table.
            </p>
          </div>

          <div class="event-selector-card">
            <label>Select Event to Inspect Atomicity Stats:</label>
            <div class="select-row">
              <select [(ngModel)]="selectedEventId" class="form-select">
                <option *ngFor="let ev of events()" [value]="ev._id">
                  {{ ev.title }} (Capacity: {{ ev.capacity }}, Registered: {{ ev.registeredCount }})
                </option>
              </select>
              <button class="btn btn-primary" (click)="checkConcurrencyStats()" [disabled]="!selectedEventId || loading()">
                Inspect Atomicity State
              </button>
            </div>
          </div>

          <div *ngIf="concurrencyData()" class="concurrency-results">
            <div class="stats-cards-grid">
              <div class="c-card">
                <span class="c-val">{{ concurrencyData().capacity }}</span>
                <span class="c-lbl">Maximum Capacity</span>
              </div>
              <div class="c-card highlight-good">
                <span class="c-val">{{ concurrencyData().registered }}</span>
                <span class="c-lbl">Confirmed Registered</span>
              </div>
              <div class="c-card highlight-warn">
                <span class="c-val">{{ concurrencyData().waitlisted }}</span>
                <span class="c-lbl">Auto-Waitlisted</span>
              </div>
              <div class="c-card">
                <span class="c-val">{{ concurrencyData().cancelled }}</span>
                <span class="c-lbl">Cancelled / Released</span>
              </div>
            </div>

            <div class="explanation-box">
              <h4>Atomicity Guarantee Result</h4>
              <p>{{ concurrencyData().explanation }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .db-lab-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .header-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%);
      border-radius: 16px;
      padding: 32px;
      color: #ffffff;
      margin-bottom: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .badge-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      color: #a5b4fc;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #34d399;
      border-radius: 50%;
      box-shadow: 0 0 8px #34d399;
    }

    .header-hero h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      background: linear-gradient(to right, #ffffff, #c7d2fe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header-hero p {
      font-size: 14px;
      color: #94a3b8;
      max-width: 800px;
      line-height: 1.6;
      margin: 0;
    }

    .header-hero code {
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      color: #38bdf8;
    }

    .nav-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .tab-btn {
      padding: 12px 20px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: #4f46e5;
    }

    .tab-btn.active {
      color: #4f46e5;
      border-bottom-color: #4f46e5;
    }

    .pane-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .pane-header h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 4px 0 0 0;
    }

    .grid-collections {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 20px;
    }

    .col-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .col-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }

    .col-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .col-badge {
      font-size: 10px;
      text-transform: uppercase;
      color: #4f46e5;
      font-weight: 700;
      letter-spacing: 0.05em;
      display: block;
    }

    .col-title-group h3 {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 2px 0 0 0;
    }

    .doc-count {
      text-align: right;
    }

    .count-num {
      display: block;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }

    .count-lbl {
      font-size: 11px;
      color: #64748b;
    }

    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-label {
      display: block;
      font-size: 11px;
      color: #64748b;
    }

    .stat-val {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }

    .indexes-section h4 {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      margin: 0 0 8px 0;
    }

    .index-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 240px;
      overflow-y: auto;
    }

    .index-item {
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      border-left: 3px solid #6366f1;
    }

    .index-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      flex-wrap: wrap;
      gap: 4px;
    }

    .index-name code {
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
    }

    .index-flags {
      display: flex;
      gap: 4px;
    }

    .flag-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .flag-badge.unique { background: #dcfce7; color: #166534; }
    .flag-badge.sparse { background: #fef9c3; color: #854d0e; }
    .flag-badge.ttl { background: #fee2e2; color: #991b1b; }
    .flag-badge.text { background: #e0e7ff; color: #3730a3; }
    .flag-badge.geo { background: #f3e8ff; color: #6b21a8; }

    .index-keys {
      margin: 0;
      font-size: 11px;
      background: #0f172a;
      color: #38bdf8;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: pre-wrap;
    }

    .concept-callout {
      display: flex;
      gap: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      color: #1e40af;
      font-size: 13px;
    }

    .concept-callout p {
      margin: 4px 0 0 0;
      color: #1e3a8a;
    }

    .callout-icon {
      font-size: 20px;
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .comparison-grid {
        grid-template-columns: 1fr;
      }
    }

    .plan-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }

    .card-status-bar {
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-align: center;
    }

    .card-status-bar.good {
      background: #dcfce7;
      color: #166534;
      border-bottom: 1px solid #bbf7d0;
    }

    .card-status-bar.warning {
      background: #fee2e2;
      color: #991b1b;
      border-bottom: 1px solid #fecaca;
    }

    .card-inner {
      padding: 20px;
    }

    .metric-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
      text-align: center;
    }

    .metric {
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
    }

    .m-val {
      display: block;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
    }

    .m-val.highlight-good {
      color: #16a34a;
    }

    .m-val.highlight-warn {
      color: #dc2626;
    }

    .m-lbl {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }

    .plan-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .d-lbl {
      color: #64748b;
      font-weight: 600;
    }

    .badge-stage {
      background: #e0e7ff;
      color: #3730a3;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
    }

    .badge-stage.warn {
      background: #fee2e2;
      color: #991b1b;
    }

    .code-val {
      font-family: monospace;
      font-size: 12px;
      color: #0f172a;
    }

    .code-val.red {
      color: #dc2626;
    }

    .json-tree summary {
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: #4f46e5;
      margin-top: 8px;
    }

    .json-tree pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px;
      border-radius: 6px;
      font-size: 11px;
      max-height: 240px;
      overflow: auto;
      margin-top: 8px;
    }

    .pipeline-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-pipe {
      padding: 8px 14px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-pipe:hover {
      background: #e2e8f0;
    }

    .btn-pipe.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }

    .pipe-desc-bar {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 20px;
      margin-bottom: 20px;
    }

    .pipe-desc-bar h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: #0f172a;
    }

    .pipe-desc-bar p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .pipe-layout {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .pipe-layout {
        grid-template-columns: 1fr;
      }
    }

    .stage-accordion {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stage-box {
      background: #0f172a;
      border-radius: 8px;
      padding: 12px;
      color: #f8fafc;
    }

    .stage-num {
      font-size: 12px;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 6px;
    }

    .stage-name {
      color: #a78bfa;
      font-family: monospace;
    }

    .stage-json {
      margin: 0;
      font-size: 11px;
      color: #e2e8f0;
      overflow-x: auto;
    }

    .result-table-wrap {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow-x: auto;
      max-height: 480px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .data-table th {
      background: #f8fafc;
      padding: 10px 14px;
      font-weight: 600;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
    }

    .data-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }

    .json-display {
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      font-size: 12px;
      max-height: 450px;
      overflow: auto;
    }

    .concurrency-lab {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .lab-intro-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
    }

    .lab-intro-card h3 {
      font-size: 16px;
      color: #0f172a;
      margin: 0 0 8px 0;
    }

    .lab-intro-card p {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 12px 0;
      line-height: 1.5;
    }

    .code-snippet-box {
      background: #0f172a;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .code-snippet-box code {
      color: #38bdf8;
      font-size: 12px;
    }

    .event-selector-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
    }

    .select-row {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .form-select {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      background: #ffffff;
    }

    .stats-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    @media (max-width: 800px) {
      .stats-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .c-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .c-card.highlight-good .c-val { color: #16a34a; }
    .c-card.highlight-warn .c-val { color: #ea580c; }

    .c-val {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      display: block;
    }

    .c-lbl {
      font-size: 12px;
      color: #64748b;
    }

    .explanation-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 16px;
      color: #065f46;
    }

    .explanation-box h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 700;
    }

    .explanation-box p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .btn {
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #4f46e5;
      color: #ffffff;
      border: 1px solid #4f46e5;
    }

    .btn-primary:hover {
      background: #4338ca;
    }

    .btn-outline {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    .btn-outline:hover {
      background: #f8fafc;
    }
  `]
})
export class DbLabComponent implements OnInit {
  private dbLabService = inject(DbLabService);
  private eventService = inject(EventService);
  private toast = inject(ToastService);

  activeTab = signal<'collections' | 'explain' | 'aggregations' | 'concurrency'>('collections');
  loading = signal(false);

  // Tab 1 state
  collections = signal<any[]>([]);

  // Tab 2 state
  selectedExplainQuery = 'emailLookup';
  explainData = signal<any>(null);

  // Tab 3 state
  pipelinesList = [
    { id: 'eventsByCategory', label: '1. Category Statistics ($group + $project)' },
    { id: 'monthlyTrend', label: '2. Monthly Trend ($match + $group + $dateToString)' },
    { id: 'topOrganizers', label: '3. Top Organizers ($group + $lookup + $unwind)' },
    { id: 'sentimentSummary', label: '4. Sentiment Analytics ($facet + $bucket)' },
    { id: 'venueUtilization', label: '5. Venue Utilization ($lookup + $group + $avg)' }
  ];
  selectedPipeline = 'eventsByCategory';
  aggregationResult = signal<any>(null);

  // Tab 4 state
  events = signal<Event[]>([]);
  selectedEventId = '';
  concurrencyData = signal<any>(null);

  ngOnInit() {
    this.loadCollections();
  }

  loadCollections() {
    this.loading.set(true);
    this.dbLabService.getCollectionsInfo().subscribe({
      next: (res) => {
        this.collections.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to load MongoDB collection data');
        this.loading.set(false);
      }
    });
  }

  loadExplainPlan() {
    this.loading.set(true);
    this.dbLabService.explainQuery(this.selectedExplainQuery).subscribe({
      next: (res) => {
        this.explainData.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to generate explain() plan');
        this.loading.set(false);
      }
    });
  }

  loadAggregation(pipelineId: string) {
    this.selectedPipeline = pipelineId;
    this.loading.set(true);
    this.dbLabService.runAggregation(pipelineId).subscribe({
      next: (res) => {
        this.aggregationResult.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to execute aggregation pipeline');
        this.loading.set(false);
      }
    });
  }

  loadEventsForConcurrency() {
    this.eventService.getEvents({ limit: 50 }).subscribe({
      next: (res) => {
        const eventList = Array.isArray(res.data) ? res.data : (res.data as any)?.events || [];
        this.events.set(eventList);
        if (eventList.length > 0 && !this.selectedEventId) {
          this.selectedEventId = eventList[0]._id;
          this.checkConcurrencyStats();
        }
      }
    });
  }

  checkConcurrencyStats() {
    if (!this.selectedEventId) return;
    this.loading.set(true);
    this.dbLabService.getConcurrencyStats(this.selectedEventId).subscribe({
      next: (res) => {
        this.concurrencyData.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to load concurrency stats');
        this.loading.set(false);
      }
    });
  }

  is2dsphere(keyObj: any): boolean {
    if (!keyObj) return false;
    return Object.values(keyObj).includes('2dsphere');
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStageName(stage: any): string {
    return Object.keys(stage)[0] || 'stage';
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  isObject(val: any): boolean {
    return val !== null && typeof val === 'object';
  }

  getObjectKeys(obj: any): string[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj);
  }
}
