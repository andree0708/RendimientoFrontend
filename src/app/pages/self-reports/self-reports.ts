import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { SelfReportService } from '../../services/self-report.service';
import { EchartsDirective } from '../../shared/echarts.directive';
import { SelfReport } from '../../models';

@Component({
  selector: 'app-self-reports',
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSliderModule, MatSnackBarModule,
    EchartsDirective,
  ],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">How are you feeling?</h1>
      <p class="ws-page-subtitle">A quick check-in helps the system learn your wellbeing patterns.</p>

      <div [style.display]="'grid'" [style.gap]="'24px'"
        [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">

        <!-- Report form -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 20px;">Quick check-in</div>
          <form [formGroup]="reportForm" (ngSubmit)="submit()"
            style="display: flex; flex-direction: column; gap: 20px;">

            @for (field of scaleFields; track field.key) {
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 0.9rem; font-weight: 500;">{{ field.label }}</span>
                  <span style="font-size: 0.9rem; color: var(--ws-primary); font-weight: 600;">
                    {{ reportForm.get(field.key)?.value || 3 }} / 5
                  </span>
                </div>
                <!-- Angular Material 19: formControlName goes on the input, not the slider -->
                <mat-slider min="1" max="5" step="1" showTickMarks style="width: 100%;">
                  <input matSliderThumb [formControlName]="field.key">
                </mat-slider>
              </div>
            }

            <div>
              <div style="font-size: 0.9rem; font-weight: 500; margin-bottom: 8px;">
                Hours of sleep last night
              </div>
              <mat-form-field appearance="outline" style="width: 100%;">
                <input matInput type="number" formControlName="sleep_hours"
                  min="0" max="24" step="0.5" placeholder="e.g. 7.5">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Notes (optional)</mat-label>
              <textarea matInput formControlName="notes" rows="2"
                placeholder="Anything you'd like to add..."></textarea>
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit"
              style="border-radius: 12px; height: 48px;">
              <mat-icon>favorite</mat-icon> Submit
            </button>
          </form>
        </div>

        <!-- History chart + recent list -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px;">
            Your fatigue & stress over time
          </div>
          <div class="ws-chart" [appEcharts]="chartOptions()"></div>

          <div style="margin-top: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">
              Recent check-ins
            </div>
            @for (r of reports(); track r.id) {
              <div style="display: flex; justify-content: space-between; padding: 8px 0;
                border-bottom: 1px solid var(--ws-border); font-size: 0.85rem;">
                <span style="color: var(--ws-text-muted);">
                  {{ r.reported_at | date: 'MMM d, h:mm a' }}
                </span>
                <span>
                  Fatigue: <strong>{{ r.fatigue_level }}/5</strong> &middot;
                  Stress: <strong>{{ r.stress_level }}/5</strong>
                </span>
              </div>
            }
            @if (reports().length === 0) {
              <div style="text-align: center; padding: 24px; color: var(--ws-text-muted); font-size: 0.88rem;">
                No check-ins yet. Submit your first one!
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SelfReportsComponent implements OnInit {
  private reportSvc = inject(SelfReportService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  reports = signal<SelfReport[]>([]);
  mobile = signal(window.innerWidth < 768);

  scaleFields = [
    { key: 'fatigue_level', label: 'Fatigue level' },
    { key: 'stress_level', label: 'Stress level' },
    { key: 'concentration_level', label: 'Concentration' },
    { key: 'task_difficulty', label: 'Task difficulty' },
    { key: 'perceived_effort', label: 'Perceived effort' },
    { key: 'need_for_break', label: 'Need for a break' },
  ];

  reportForm = this.fb.group({
    fatigue_level:        [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    stress_level:         [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    concentration_level:  [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    task_difficulty:      [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    perceived_effort:     [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    need_for_break:       [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    sleep_hours:          [null as number | null],
    notes:                [''],
  });

  ngOnInit() {
    this.loadReports();
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => this.mobile.set(window.innerWidth < 768);

  loadReports() {
    this.reportSvc.listReports(1, 20).subscribe({
      next: (page) => this.reports.set(page.items),
      error: () => {},
    });
  }

  submit() {
    if (this.reportForm.invalid) return;
    const v = this.reportForm.value;
    this.reportSvc.createReport({
      fatigue_level:       v.fatigue_level!,
      stress_level:        v.stress_level!,
      concentration_level: v.concentration_level!,
      task_difficulty:     v.task_difficulty!,
      perceived_effort:    v.perceived_effort!,
      need_for_break:      v.need_for_break!,
      sleep_hours:         v.sleep_hours ?? undefined,
      notes:               v.notes || undefined,
    }).subscribe({
      next: () => {
        this.reportForm.patchValue({
          fatigue_level: 3, stress_level: 3, concentration_level: 3,
          task_difficulty: 3, perceived_effort: 3, need_for_break: 3,
          sleep_hours: null, notes: '',
        });
        this.loadReports();
        this.snackBar.open('Check-in saved!', 'Close', { duration: 2500 });
      },
      error: (err) => {
        this.snackBar.open('Could not save. Try again.', 'Close', { duration: 3000 });
      },
    });
  }

  chartOptions() {
    const data = this.reports().slice().reverse();
    if (data.length === 0) {
      return {
        graphic: [{
          type: 'text',
          left: 'center', top: 'middle',
          style: { text: 'No data yet', fill: '#a1a1aa', fontSize: 14 },
        }],
      };
    }
    return {
      tooltip: { trigger: 'axis' as const },
      legend: {
        data: ['Fatigue', 'Stress', 'Concentration'], bottom: 0,
        textStyle: { fontSize: 11 },
      },
      grid: { left: 30, right: 20, top: 20, bottom: 50 },
      xAxis: {
        type: 'category' as const,
        data: data.map((r) => new Date(r.reported_at).toLocaleDateString()),
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: 'value' as const, min: 1, max: 5 },
      series: [
        {
          name: 'Fatigue', type: 'line' as const, smooth: true,
          data: data.map((r) => r.fatigue_level),
          lineStyle: { color: '#ec4899' }, itemStyle: { color: '#ec4899' },
        },
        {
          name: 'Stress', type: 'line' as const, smooth: true,
          data: data.map((r) => r.stress_level),
          lineStyle: { color: '#f59e0b' }, itemStyle: { color: '#f59e0b' },
        },
        {
          name: 'Concentration', type: 'line' as const, smooth: true,
          data: data.map((r) => r.concentration_level),
          lineStyle: { color: '#14b8a6' }, itemStyle: { color: '#14b8a6' },
        },
      ],
    };
  }
}
