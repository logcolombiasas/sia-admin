import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, signal, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Event, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, shareReplay, Subscription } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { HasRoleDirective } from '../../../../directives/has-role.directive';
import { MatMenuModule } from '@angular/material/menu';

type NavItem = {
  label: string;
  path: string;
  icon: string;
  roles: string[];
  menu?: NavItem[];
  iconImage?: boolean;
};

@Component({
  selector: 'log-adm-sidebar',
  imports: [
    CommonModule,
    MatSidenavModule,
    RouterModule,
    MatIconModule,
    MatListModule,
    HasRoleDirective,
    MatMenuModule,
  ],
  templateUrl: './adm-sidebar.html',
  styleUrl: './adm-sidebar.scss'
})
export class AdmSidebar {

  @Input('toggleSidenav$') toggleSidenav$!: EventEmitter<any>;
  private bp = inject(BreakpointObserver);
  subscribeToggle!: Subscription;

  sidenavOpened = signal(true);
  toggleSidenav() {
    this.sidenavOpened.update(v => !v);
  }

  // responsive
  readonly isHandset$ = this.bp.observe(Breakpoints.Handset).pipe(
    map(r => r.matches),
    shareReplay(1)
  );

  // navegación
  readonly nav: NavItem[] = [
    {
      label: 'Inicio',
      path: '/',
      icon: 'space_dashboard',
      roles: ['*']
    },
    {
      label: 'Listado de placas',
      path: '/plates',
      icon: 'directions_car',
      roles: ['admin']
    },
    {
      label: 'Detecciones',
      path: '/plates/detections',
      icon: 'notifications_active',
      roles: ['admin']
    },
    {
      label: 'Historial de placas',
      path: '/plates/sightings',
      icon: 'manage_search',
      roles: ['admin']
    },
  ];

  constructor(
    private _router: Router
  ) {
    this.bp.observe(Breakpoints.Handset).pipe(
      map(r => r.matches),
      shareReplay(1)
    ).subscribe((open) => {
      this.sidenavOpened.update(u => !open)
    });
    this._router.events.pipe(
      filter((event: Event) => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.bp.observe(Breakpoints.Handset).pipe(
        map(r => r.matches),
        shareReplay(1)
      ).subscribe(open => {
        this.sidenavOpened.update(u => !open);
      })
    })
  }

  ngOnChanges(changes: SimpleChanges) {
    const { toggleSidenav$ } = changes;
    if (toggleSidenav$.currentValue && !this.subscribeToggle) {
      this.subscribeToggle = this.toggleSidenav$.subscribe(() => this.toggleSidenav())
    }
  }

  ngOnDestroy() {
    if (this.subscribeToggle) {
      this.subscribeToggle.unsubscribe();;
    }
  }

}
