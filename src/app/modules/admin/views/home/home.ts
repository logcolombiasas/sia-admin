import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { AuthzService } from '../../../../services/auth/authz.service';
import { DataService } from '../../../../services/data/data.service';
import { formatPlate } from '../../../../utils/plate';

type Shortcut = { label: string; description: string; path: string; icon: string; roles: string[] };

@Component({
  selector: 'log-home',
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {

  private _authz = inject(AuthzService);
  private _data = inject(DataService);

  loading = signal(true);
  email = this._authz.email;
  kpis = signal<{ label: string; value: number; icon: string; path: string; tone: string }[]>([]);
  recentDetections = signal<any[]>([]);
  formatPlate = formatPlate;

  private readonly shortcuts: Shortcut[] = [
    { label: 'Placas buscadas', description: 'Listado que validan la app y el monitor', path: '/plates', icon: 'directions_car', roles: ['admin'] },
    { label: 'Detecciones', description: 'Vehículos del listado identificados', path: '/plates/detections', icon: 'notifications_active', roles: ['admin'] },
    { label: 'Lecturas por día', description: 'Placas leídas por cada cámara y operario', path: '/plates/readings', icon: 'videocam', roles: ['admin'] },
    { label: 'Historial de placas', description: 'Dónde se ha visto cada placa', path: '/plates/sightings', icon: 'manage_search', roles: ['admin'] },
  ];

  visibleShortcuts = computed(() => this.shortcuts.filter(s => this._authz.any(...s.roles)));
  greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  constructor() {
    this.load();
  }

  private async load() {
    await this._authz.refresh();
    try {
      if (this._authz.has('admin')) {
        await this.loadAdminKpis();
      }
    } catch (error) {
      console.log('Error cargando indicadores', error);
    }
    this.loading.set(false);
  }

  private async loadAdminKpis() {
    const [plates, detections] = await Promise.all([
      this._data.getAll('WantedPlate', { selectionSet: ['id', 'active'] }),
      this._data.getAll('PlateDetection'),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const openDetections = detections.filter((d: any) => d.status === 'alerta' || d.status === 'en_gestion');

    this.kpis.set([
      { label: 'Placas activas', value: plates.filter((p: any) => p.active !== false).length, icon: 'directions_car', path: '/plates', tone: 'gray' },
      { label: 'Detecciones abiertas', value: openDetections.length, icon: 'notifications_active', path: '/plates/detections', tone: 'red' },
      { label: 'Detecciones hoy', value: detections.filter((d: any) => (d.detectedAt || d.createdAt || '').startsWith(today)).length, icon: 'today', path: '/plates/detections', tone: 'black' },
      { label: 'Capturados', value: detections.filter((d: any) => d.status === 'capturado').length, icon: 'verified', path: '/plates/detections', tone: 'green' },
    ]);

    this.recentDetections.set(
      detections
        .sort((a: any, b: any) => (b.detectedAt || b.createdAt || '').localeCompare(a.detectedAt || a.createdAt || ''))
        .slice(0, 5)
    );
  }

}
