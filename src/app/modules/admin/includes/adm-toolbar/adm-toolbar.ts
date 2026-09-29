import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { PlateAlertsService } from '../../../../services/plates/plate-alerts.service';
import { AuthzService } from '../../../../services/auth/authz.service';

@Component({
  selector: 'log-adm-toolbar',
  imports: [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatButtonModule,
    MatBadgeModule,
    MatInputModule,
    RouterModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  templateUrl: './adm-toolbar.html',
  styleUrl: './adm-toolbar.scss'
})
export class AdmToolbar {

  @Input('snav') snav:any;
  @Input('signOut') signOut:any;
  @Output() toggleSidenav$: EventEmitter<any> = new EventEmitter();

  private _alerts = inject(PlateAlertsService);
  notifications = this._alerts.unread;
  email = inject(AuthzService).email;

  constructor() {
    // Alertas en tiempo real de placas del listado detectadas (solo admin)
    this._alerts.start();
  }

  openAlerts() {
    this._alerts.openDetections();
  }

  logout() {
    this._alerts.stop();
    this.signOut();
  }

}
