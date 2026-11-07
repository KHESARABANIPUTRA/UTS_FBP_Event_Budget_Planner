import { Component } from '@angular/core';
import { BudgetPlannerComponent } from './budget-planner/budget-planner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [BudgetPlannerComponent],
  template: '<app-budget-planner></app-budget-planner>',
})
export class AppComponent {}
