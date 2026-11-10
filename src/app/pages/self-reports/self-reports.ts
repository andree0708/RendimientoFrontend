import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SelfReportService } from '../../services/self-report.service';
import { EchartsDirective } from '../../shared/echarts.directive';
import { SelfReport } from '../../models';

@Component({
  selector: 'app-self-reports',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSliderModule, EchartsDirective],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">How are you feeling?</h1>
      <p class="ws-page-subtitle">A quick check-in helps the system understand your wellbeing patterns.</p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
        <!-- Report form -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 20px;">Quick check-in</div>
          <form [formGroup]="reportForm" (ngSubmit)="submit()" style="display: flex; flex-direction: column; gap: 20px;">
            @for (field of scaleFields; track field.key) {
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 0.9rem; font-weight: 500;">{{ field.label }}</span>
                  <span style="font-size: 0.9rem; color: var(--ws-primary); font-weight: 600;">
                    {{ reportForm.get(field.key)?.value || 3 }} / 5
                  </span>
                </div>
                <mat-slider [formControlName]="field.key" min="1" max="5" step="1" showTickMarks>
                  <input matSliderThumb>
                </mat-slider>
              </div>
            }

            <div>
              <div style="font-size: 0.9rem; font-weight: 500; margin-bottom: 8px;">Hours of sleep last night</div>
              <mat-form-field appearance="outline" style="width: 100%;">
                <input matInput type="number" formControlName="sleep_hours" min="0" max="24" step="0.5" placeholder="e.g. 7.5">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Notes (optional)</mat-label>
              <textarea matInput formControlName="notes" rows="2" placeholder="Anything you'd like to add..."></textarea>
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" style="border-radius: 12px; height: 48px;">
              <mat-icon>favorite</mat-icon> Submit
            </button>
          </form>
        </div>

        <!-- History chart -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px;">Your fatigue & stress over time</div>
          <div class="ws-chart" [appEcharts]="chartOptions()"></div>

          <div style="margin-top: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">Recent reports</div>
            @for (r of reports(); track r.id) {
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--ws-border); font-size: 0.85rem;">
                <span>{{ r.reported_at | date: 'MMM d, h:mm a' }}</span>
                <span>Fatigue: {{ r.fatigue_level }}/5 &middot; Stress: {{ r.stress_level }}/5</span>
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
    fatigue_level: [3, [Validators.required]],
    stress_level: [3, [Validators.required]],
    concentration_level: [3, [Validators.required]],
    task_difficulty: [3, [Validators.required]],
    perceived_effort: [3, [Validators.required]],
    need_for_break: [3, [Validators.required]],
    sleep_hours: [null],
    notes: [''],
  });

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.reportSvc.listReports(1, 20).subscribe((page) => {
      this.reports.set(page.items);
    });
  }

  submit() {
    if (this.reportForm.invalid) return;
    this.reportSvc.createReport(this.reportForm.value as any).subscribe(() => {
      this.reportForm.reset({ fatigue_level: 3, stress_level: 3, concentration_level: 3, task_difficulty: 3, perceived_effort: 3, need_for_break: 3 });
      this.loadReports();
      this.snackBar.open('Thanks for checking in!', 'Close', { duration: 2500 });
    });
  }

  chartOptions() {
    const data = this.reports().slice().reverse();
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Fatigue', 'Stress', 'Concentration'], bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 30, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.map((r) => new Date(r.reported_at).toLocaleDateString()) },
      yAxis: { type: 'value', max: 5 },
      series: [
        { name: 'Fatigue', type: 'line', smooth: true, data: data.map((r) => r.fatigue_level), lineStyle: { color: '#ec4899' }, itemStyle: { color: '#ec4899' } },
        { name: 'Stress', type: 'line', smooth: true, data: data.map((r) => r.stress_level), lineStyle: { color: '#f59e0b' }, itemStyle: { color: '#f59e0b' } },
        { name: 'Concentration', type: 'line', smooth: true, data: data.map((r) => r.concentration_level), lineStyle: { color: '#14b8a6' }, itemStyle: { color: '#14b8a6' } },
      ],
    };
  }
}
