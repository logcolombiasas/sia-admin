import { CommonModule } from '@angular/common';
import { Component, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { AdmToolbar } from './includes/adm-toolbar/adm-toolbar';
import { AdmSidebar } from './includes/adm-sidebar/adm-sidebar';

@Component({
  selector: 'log-admin',
  imports: [
    CommonModule,
    AmplifyAuthenticatorModule,
    RouterModule,
    AdmToolbar,
    AdmSidebar,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin {
  toggleSidenav$: EventEmitter<any> = new EventEmitter();
}
