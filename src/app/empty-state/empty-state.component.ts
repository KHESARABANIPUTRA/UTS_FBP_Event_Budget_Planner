import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty">
      <h3>Belum ada kategori anggaran</h3>
      <p>Mulai dengan menambah kategori pertama atau pakai template.</p>
      <button type="button" class="primary" (click)="createFirst.emit()">+ Buat Kategori Pertama</button>
      <button type="button" (click)="useTemplate.emit()">Muat Template</button>
    </div>`,
})
export class EmptyStateComponent {
  @Output() createFirst = new EventEmitter<void>();
  @Output() useTemplate = new EventEmitter<void>();
}
