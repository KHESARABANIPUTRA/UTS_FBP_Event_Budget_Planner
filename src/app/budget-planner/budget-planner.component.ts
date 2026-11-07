import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryRowComponent } from '../category-row/category-row.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SummaryPanelComponent } from '../summary-panel/summary-panel.component';
import { BudgetChartComponent } from '../budget-chart/budget-chart.component';
import { BudgetPlan, ExportService } from '../export.service';
import { minMaxRows, percentTotal, quotaWithinBudget, uniqueName } from '../validators';

export interface CategorySummary {
  uid: string; name: string; quota: number; used: number; remaining: number;
  status: 'ok' | 'warn' | 'over';
}

@Component({
  selector: 'app-budget-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CategoryRowComponent, EmptyStateComponent, SummaryPanelComponent, BudgetChartComponent],
  templateUrl: './budget-planner.component.html',
})
export class BudgetPlannerComponent implements OnInit {
  readonly MAX_CATEGORIES = 8;
  readonly MIN_CATEGORIES = 1;
  readonly MAX_ITEMS = 10;

  summary: CategorySummary[] = [];
  totalUsed = 0;
  submitted = false;
  private uidSeq = 0;
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private exporter = inject(ExportService);

  form: FormGroup = this.fb.group(
    {
      eventName: ['', Validators.required],
      totalBudget: [0, [Validators.required, Validators.min(1)]],
      categories: this.fb.array([], [
        minMaxRows(this.MIN_CATEGORIES, this.MAX_CATEGORIES),
        uniqueName(),
        percentTotal(100),
      ]),
    },
    { validators: [quotaWithinBudget()] },
  );

  ngOnInit(): void {
    // Event binding reaktif: setiap perubahan form -> kalkulasi real-time
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.submitted = false; // data berubah -> status "tersimpan" tidak berlaku lagi
      this.calculateSummary();
    });
    this.calculateSummary();
  }

  // ---------- Getter (semua logika boolean kompleks ada di sini) ----------
  get categories(): FormArray { return this.form.get('categories') as FormArray; }
  get hasCategories(): boolean { return this.categories.length > 0; }
  get canAddCategory(): boolean { return this.categories.length < this.MAX_CATEGORIES; }
  get canRemoveCategory(): boolean { return this.categories.length > this.MIN_CATEGORIES; }
  get hasPercentError(): boolean { return this.hasCategories && this.categories.hasError('percentNot100'); }
  get hasDuplicateError(): boolean { return this.categories.hasError('duplicateName'); }
  get hasQuotaError(): boolean { return this.form.hasError('quotaExceeded'); }
  get hasAnyError(): boolean { return this.hasPercentError || this.hasDuplicateError || this.hasQuotaError; }
  get quotaErrorNames(): string { return (this.form.getError('quotaExceeded')?.categories ?? []).join(', '); }
  get totalPercent(): number {
    return this.categories.controls.reduce((s, g) => s + (+g.get('percent')?.value || 0), 0);
  }
  get remainingBudget(): number { return (+this.form.get('totalBudget')?.value || 0) - this.totalUsed; }
  get isOverBudget(): boolean { return this.remainingBudget < 0; }
  get canSubmit(): boolean { return this.form.valid && !this.isOverBudget; }
  /** Daftar alasan tombol Simpan/Ekspor nonaktif (ditampilkan ke pengguna). */
  get submitBlockers(): string[] {
    const out: string[] = [];
    if (this.form.get('eventName')?.invalid) { out.push('Nama Acara wajib diisi.'); }
    if (this.form.get('totalBudget')?.invalid) { out.push('Total Budget harus lebih dari 0.'); }
    if (!this.hasCategories) { out.push('Minimal harus ada 1 kategori.'); }
    if (this.categories.controls.some((g) => g.invalid && !g.get('items')?.invalid && this.hasCategoryFieldError(g))) {
      out.push('Ada nama/persen kategori yang belum valid.');
    }
    if (this.categories.controls.some((g) => (g.get('items') as FormArray).controls.some((i) => i.invalid))) {
      out.push('Ada item biaya yang belum lengkap (nama, qty ≥ 1, harga ≥ 0).');
    }
    if (this.hasPercentError) { out.push('Total persen harus tepat 100%.'); }
    if (this.hasDuplicateError) { out.push('Nama kategori tidak boleh duplikat.'); }
    if (this.hasQuotaError) { out.push('Total item melebihi kuota: ' + this.quotaErrorNames + '.'); }
    return out;
  }
  get hasBlockers(): boolean { return this.submitBlockers.length > 0; }
  get canExport(): boolean { return this.canSubmit; }
  get canDuplicate(): boolean { return this.canAddCategory; }

  // ---------- Handler: kategori ----------
  addCategory(): void {
    if (!this.canAddCategory) { return; }
    this.categories.push(this.createCategoryGroup());
  }

  removeCategory(index: number): void {
    if (!this.canRemoveCategory) { return; }
    this.categories.removeAt(index);
  }

  moveCategory(index: number, to: number): void {
    if (to < 0 || to >= this.categories.length) { return; }
    const ctrl = this.categories.at(index);
    this.categories.removeAt(index);
    this.categories.insert(to, ctrl);
  }

  // ---------- Handler: item (nested FormArray) ----------
  canAddItemAt(catIndex: number): boolean { return this.getItems(catIndex).length < this.MAX_ITEMS; }
  addItem(catIndex: number): void {
    if (!this.canAddItemAt(catIndex)) { return; }
    this.getItems(catIndex).push(this.createItemGroup());
  }
  removeItem(catIndex: number, itemIndex: number): void { this.getItems(catIndex).removeAt(itemIndex); }
  getItems(catIndex: number): FormArray {
    return this.categories.at(catIndex).get('items') as FormArray;
  }

  moveItem(catIndex: number, from: number, to: number): void {
    const items = this.getItems(catIndex);
    if (to < 0 || to >= items.length) { return; }
    const ctrl = items.at(from);
    items.removeAt(from);
    items.insert(to, ctrl);
  }

  duplicateCategory(index: number): void {
    if (!this.canDuplicate) { return; }
    const src = this.categories.at(index);
    const copy = this.createCategoryGroup(`${src.get('name')?.value} (salinan)`, 0);
    (src.get('items') as FormArray).controls.forEach((i) =>
      (copy.get('items') as FormArray).push(
        this.createItemGroup(i.get('name')?.value, i.get('qty')?.value, i.get('price')?.value)));
    this.categories.insert(index + 1, copy);
  }

  /** Bagi persen sama rata; selisih pembulatan masuk ke baris terakhir agar pas 100. */
  distributeEqually(): void {
    const n = this.categories.length;
    if (n === 0) { return; }
    const base = Math.floor(10000 / n) / 100;
    this.categories.controls.forEach((g, i) => {
      const v = i === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base;
      g.get('percent')?.setValue(v);
    });
  }

  // ---------- Ekspor hasil perhitungan menjadi file ----------
  buildPlan(): BudgetPlan {
    return {
      eventName: String(this.form.get('eventName')?.value ?? ''),
      totalBudget: +this.form.get('totalBudget')?.value || 0,
      totalUsed: this.totalUsed,
      remaining: this.remainingBudget,
      generatedAt: new Date().toLocaleString('id-ID'),
      categories: this.categories.controls.map((g, i) => ({
        name: this.summary[i].name,
        percent: +g.get('percent')?.value || 0,
        quota: this.summary[i].quota,
        used: this.summary[i].used,
        remaining: this.summary[i].remaining,
        status: this.summary[i].status,
        items: (g.get('items') as FormArray).controls.map((it) => {
          const qty = +it.get('qty')?.value || 0;
          const price = +it.get('price')?.value || 0;
          return { name: String(it.get('name')?.value ?? ''), qty, price, subtotal: qty * price };
        }),
      })),
    };
  }

  exportCsv(): void {
    if (!this.canExport) { return; }
    const plan = this.buildPlan();
    this.exporter.download(`${this.exporter.safeName(plan.eventName)}.csv`,
      this.exporter.buildCsv(plan), 'text/csv;charset=utf-8');
  }

  exportJson(): void {
    if (!this.canExport) { return; }
    const plan = this.buildPlan();
    this.exporter.download(`${this.exporter.safeName(plan.eventName)}.json`,
      this.exporter.buildJson(plan), 'application/json');
  }

  printReport(): void {
    if (!this.canExport) { return; }
    window.print();
  }

  // ---------- Template & reset ----------
  loadTemplate(): void {
    this.categories.clear();
    const tpl: [string, number, [string, number, number][]][] = [
      ['Konsumsi', 40, [['Snack box', 100, 15000], ['Makan siang', 100, 25000]]],
      ['Dekorasi', 25, [['Backdrop', 1, 1500000]]],
      ['Dokumentasi', 20, []],
      ['Lain-lain', 15, []],
    ];
    tpl.forEach(([name, percent, items]) => {
      const g = this.createCategoryGroup(name, percent);
      items.forEach(([n, q, p]) => (g.get('items') as FormArray).push(this.createItemGroup(n, q, p)));
      this.categories.push(g);
    });
    if (!(+this.form.get('totalBudget')?.value > 0)) { this.form.get('totalBudget')?.setValue(10000000); }
  }

  resetAll(): void {
    this.categories.clear();
    this.form.reset({ eventName: '', totalBudget: 0 });
    this.submitted = false;
  }

  submit(): void { this.submitted = this.canSubmit; }

  // ---------- Kalkulasi real-time ----------
  calculateSummary(): void {
    const budget = +this.form.get('totalBudget')?.value || 0;
    this.summary = this.categories.controls.map((g) => {
      const quota = (budget * (+g.get('percent')?.value || 0)) / 100;
      const used = (g.get('items') as FormArray).controls.reduce(
        (s, i) => s + (+i.get('qty')?.value || 0) * (+i.get('price')?.value || 0), 0);
      const status = used > quota ? 'over' : quota > 0 && used >= quota * 0.9 ? 'warn' : 'ok';
      return { uid: g.get('uid')?.value, name: g.get('name')?.value || '(tanpa nama)',
               quota, used, remaining: quota - used, status } as CategorySummary;
    });
    this.totalUsed = this.summary.reduce((s, c) => s + c.used, 0);
  }

  // ---------- trackBy ----------
  trackByCategory(_: number, ctrl: AbstractControl): string { return ctrl.get('uid')?.value; }
  trackBySummary(_: number, s: CategorySummary): string { return s.uid; }

  private hasCategoryFieldError(g: AbstractControl): boolean {
    return !!(g.get('name')?.invalid || g.get('percent')?.invalid);
  }

  asGroup(c: AbstractControl): FormGroup { return c as FormGroup; }

  // ---------- Factory ----------
  private createCategoryGroup(name = '', percent = 0): FormGroup {
    return this.fb.group({
      uid: ['c' + ++this.uidSeq],
      name: [name, Validators.required],
      percent: [percent, [Validators.required, Validators.min(0), Validators.max(100)]],
      items: this.fb.array([], [minMaxRows(0, this.MAX_ITEMS), uniqueName()]),
    });
  }

  private createItemGroup(name = '', qty = 1, price = 0): FormGroup {
    return this.fb.group({
      uid: ['i' + ++this.uidSeq],
      name: [name, Validators.required],
      qty: [qty, [Validators.required, Validators.min(1)]],
      price: [price, [Validators.required, Validators.min(0)]],
    });
  }
}
