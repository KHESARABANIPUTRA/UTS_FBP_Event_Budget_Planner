import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CategorySummary } from '../budget-planner/budget-planner.component';

/** Komponen presentasi murni: menerima state lewat @Input, tanpa logika form. */
@Component({
  selector: 'app-summary-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="summary">
      <h2>Ringkasan Real-time</h2>
      <table>
        <tr><th>#</th><th>Kategori</th><th>Kuota</th><th>Terpakai</th><th>Sisa</th><th>Status</th></tr>
        <tr *ngFor="let s of summary; let i = index; trackBy: trackBySummary">
          <td>{{ i + 1 }}</td>
          <td>{{ s.name }}</td>
          <td>{{ s.quota | number:'1.0-0' }}</td>
          <td>{{ s.used | number:'1.0-0' }}</td>
          <td>{{ s.remaining | number:'1.0-0' }}</td>
          <td><span class="badge" [ngClass]="s.status">{{ s.status }}</span></td>
        </tr>
      </table>
      <p>Total terpakai: <b>{{ totalUsed | number:'1.0-0' }}</b> |
        Sisa budget: <b [class.neg]="isOverBudget">{{ remainingBudget | number:'1.0-0' }}</b></p>
    </section>`,
})
export class SummaryPanelComponent {
  @Input() summary: CategorySummary[] = [];
  @Input() totalUsed = 0;
  @Input() remainingBudget = 0;
  @Input() isOverBudget = false;

  trackBySummary(_: number, s: CategorySummary): string { return s.uid; }
}
