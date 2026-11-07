import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-category-row',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-row.component.html',
})
export class CategoryRowComponent {
  @Input({ required: true }) group!: FormGroup;
  @Input() index = 0;
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input() canRemove = true;
  @Input() canAddItem = true;
  @Input() canDuplicate = true;

  @Output() remove = new EventEmitter<number>();
  @Output() move = new EventEmitter<{ index: number; to: number }>();
  @Output() duplicate = new EventEmitter<number>();
  @Output() moveItem = new EventEmitter<{ catIndex: number; from: number; to: number }>();
  @Output() addItem = new EventEmitter<number>();
  @Output() removeItem = new EventEmitter<{ catIndex: number; itemIndex: number }>();

  get items(): FormArray { return this.group.get('items') as FormArray; }
  get hasItems(): boolean { return this.items.length > 0; }
  get canMoveUp(): boolean { return !this.isFirst; }
  get canMoveDown(): boolean { return !this.isLast; }
  get hasDuplicateItem(): boolean { return this.items.hasError('duplicateName'); }
  get categoryTotal(): number {
    return this.items.controls.reduce((s, i) => s + this.itemSubtotal(i), 0);
  }

  itemSubtotal(item: AbstractControl): number {
    return (+item.get('qty')?.value || 0) * (+item.get('price')?.value || 0);
  }

  trackByItem(_: number, ctrl: AbstractControl): string { return ctrl.get('uid')?.value; }
}
