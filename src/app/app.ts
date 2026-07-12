import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './core/components/toast-outlet/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ToastOutletComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
