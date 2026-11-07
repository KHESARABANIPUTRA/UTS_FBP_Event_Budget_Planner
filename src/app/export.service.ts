import { Injectable } from '@angular/core';

export interface PlanItem { name: string; qty: number; price: number; subtotal: number; }
export interface PlanCategory {
  name: string; percent: number; quota: number; used: number; remaining: number;
  status: 'ok' | 'warn' | 'over'; items: PlanItem[];
}
export interface BudgetPlan {
  eventName: string; totalBudget: number; totalUsed: number; remaining: number;
  generatedAt: string; categories: PlanCategory[];
}

/** Pembuat file di sisi klien (tanpa backend): CSV & JSON lalu diunduh lewat Blob. */
@Injectable({ providedIn: 'root' })
export class ExportService {
  /** CSV pemisah ';' + BOM UTF-8 agar langsung rapi di Excel (locale Indonesia). */
  buildCsv(plan: BudgetPlan): string {
    const e = (v: string | number) => {
      const s = String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows: (string | number)[][] = [
      ['LAPORAN ANGGARAN ACARA'],
      ['Nama Acara', plan.eventName],
      ['Total Budget', plan.totalBudget],
      ['Dibuat', plan.generatedAt],
      [],
      ['Kategori', 'Persen (%)', 'Kuota', 'Item', 'Qty', 'Harga Satuan', 'Subtotal'],
    ];
    plan.categories.forEach((c) => {
      if (c.items.length === 0) { rows.push([c.name, c.percent, c.quota, '-', 0, 0, 0]); }
      c.items.forEach((i) => rows.push([c.name, c.percent, c.quota, i.name, i.qty, i.price, i.subtotal]));
    });
    rows.push([], ['RINGKASAN'], ['Kategori', 'Kuota', 'Terpakai', 'Sisa', 'Status']);
    plan.categories.forEach((c) => rows.push([c.name, c.quota, c.used, c.remaining, c.status]));
    rows.push(['TOTAL', plan.totalBudget, plan.totalUsed, plan.remaining, '']);
    return '\uFEFF' + rows.map((r) => r.map(e).join(';')).join('\r\n');
  }

  buildJson(plan: BudgetPlan): string { return JSON.stringify(plan, null, 2); }

  download(filename: string, content: string, mime: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  safeName(name: string): string {
    return (name.trim() || 'anggaran-acara').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  }
}
