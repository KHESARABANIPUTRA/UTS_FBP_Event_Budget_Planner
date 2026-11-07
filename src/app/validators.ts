import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Cross-row: jumlah baris kategori harus di antara min dan max. */
export function minMaxRows(min: number, max: number): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const n = (c as FormArray).length;
    return n < min || n > max ? { rowsOutOfRange: { min, max, n } } : null;
  };
}

/** Cross-row: nama kategori tidak boleh duplikat (trim + case-insensitive). */
export function uniqueName(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const names = (c as FormArray).controls
      .map((g) => String(g.get('name')?.value ?? '').trim().toLowerCase())
      .filter((n) => n !== '');
    return new Set(names).size !== names.length ? { duplicateName: true } : null;
  };
}

/** Cross-row: akumulasi persen seluruh kategori harus pas target (100). */
export function percentTotal(target: number): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const sum = (c as FormArray).controls.reduce((s, g) => s + (+g.get('percent')?.value || 0), 0);
    return Math.abs(sum - target) > 0.01 ? { percentNot100: { sum } } : null;
  };
}

/** Cross-row (nested): total item per kategori <= kuota (budget x persen). */
export function quotaWithinBudget(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const budget = +c.get('totalBudget')?.value || 0;
    const cats = (c.get('categories') as FormArray).controls;
    const bad = cats
      .filter((g) => {
        const quota = (budget * (+g.get('percent')?.value || 0)) / 100;
        const used = (g.get('items') as FormArray).controls.reduce(
          (s, i) => s + (+i.get('qty')?.value || 0) * (+i.get('price')?.value || 0), 0);
        return used > quota + 0.001;
      })
      .map((g) => String(g.get('name')?.value || '(tanpa nama)'));
    return bad.length ? { quotaExceeded: { categories: bad } } : null;
  };
}
