import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CategorySummary } from '../budget-planner/budget-planner.component';

export interface ChartSlice {
  uid: string; name: string; pct: number; color: string;
  dashArray: string; offset: number; usedPct: number; barPct: number;
  status: 'ok' | 'warn' | 'over';
}

/** Komponen presentasi murni: donut alokasi + bar terpakai vs kuota (SVG/CSS, tanpa library). */
@Component({
  selector: 'app-budget-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="chart">
      <h2>Visualisasi Anggaran</h2>
      <ng-container *ngIf="hasData; then chartView; else noData"></ng-container>

      <ng-template #noData>
        <p class="hint">Isi total budget dan persen kategori untuk melihat grafik.</p>
      </ng-template>

      <ng-template #chartView>
        <div class="wrap">
          <svg viewBox="0 0 200 200" class="donut" role="img" aria-label="Donut alokasi anggaran">
            <circle cx="100" cy="100" r="70" fill="none" stroke="#e5e7eb" stroke-width="28"></circle>
            <circle *ngFor="let s of slices; trackBy: trackBySlice" cx="100" cy="100" r="70" fill="none"
                    stroke-width="28" transform="rotate(-90 100 100)"
                    [attr.stroke]="s.color" [attr.stroke-dasharray]="s.dashArray" [attr.stroke-dashoffset]="s.offset"></circle>
            <text x="100" y="98" text-anchor="middle" class="big">{{ usedPercent }}%</text>
            <text x="100" y="118" text-anchor="middle" class="small">dari kuota terpakai</text>
          </svg>
          <ul class="legend">
            <li *ngFor="let s of slices; trackBy: trackBySlice">
              <span class="dot" [style.background]="s.color"></span>{{ s.name }}: {{ s.pct | number:'1.0-1' }}%
            </li>
          </ul>
        </div>
        <h3>Terpakai vs Kuota</h3>
        <div class="bar-row" *ngFor="let s of slices; trackBy: trackBySlice">
          <span class="label">{{ s.name }}</span>
          <div class="track"><div class="fill" [ngClass]="s.status" [style.width.%]="s.barPct"></div></div>
          <span class="val">{{ s.usedPct | number:'1.0-0' }}%</span>
        </div>
      </ng-template>
    </section>`,
  styles: [`
    .chart { background:#fff; border-radius:10px; padding:12px 16px; margin:12px 0; box-shadow:0 1px 3px #0001; }
    .wrap { display:flex; gap:24px; align-items:center; flex-wrap:wrap; }
    .donut { width:200px; height:200px; } .big { font-size:30px; font-weight:700; fill:#1f2937; } .small { font-size:11px; fill:#64748b; }
    .legend { list-style:none; padding:0; margin:0; } .legend li { margin:4px 0; }
    .dot { display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:8px; }
    .bar-row { display:flex; align-items:center; gap:10px; margin:6px 0; }
    .label { width:130px; } .val { width:48px; text-align:right; }
    .track { flex:1; height:14px; background:#e5e7eb; border-radius:7px; overflow:hidden; }
    .fill { height:100%; transition:width .3s; } .fill.ok { background:#16a34a; } .fill.warn { background:#f59e0b; } .fill.over { background:#dc2626; }
  `],
})
export class BudgetChartComponent implements OnChanges {
  @Input() summary: CategorySummary[] = [];
  @Input() totalUsed = 0;

  readonly CIRCUMFERENCE = 2 * Math.PI * 70;
  private readonly PALETTE = ['#2563eb', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#64748b'];

  slices: ChartSlice[] = [];
  usedPercent = 0;

  get hasData(): boolean { return this.slices.length > 0; }

  ngOnChanges(): void { this.buildSlices(); }

  private buildSlices(): void {
    const totalQuota = this.summary.reduce((s, c) => s + c.quota, 0);
    if (totalQuota <= 0) { this.slices = []; this.usedPercent = 0; return; }
    let cumulative = 0;
    this.slices = this.summary.map((c, i) => {
      const pct = (c.quota / totalQuota) * 100;
      const len = Math.max((pct / 100) * this.CIRCUMFERENCE - 1.5, 0);
      const slice: ChartSlice = {
        uid: c.uid, name: c.name, pct, color: this.PALETTE[i % this.PALETTE.length],
        dashArray: `${len} ${this.CIRCUMFERENCE}`, offset: -(cumulative / 100) * this.CIRCUMFERENCE,
        usedPct: c.quota > 0 ? (c.used / c.quota) * 100 : 0, barPct: 0, status: c.status,
      };
      slice.barPct = Math.min(slice.usedPct, 100);
      cumulative += pct;
      return slice;
    });
    this.usedPercent = Math.round((this.totalUsed / totalQuota) * 100);
  }

  trackBySlice(_: number, s: ChartSlice): string { return s.uid; }
}
