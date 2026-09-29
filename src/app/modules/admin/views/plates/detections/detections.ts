import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { DataService } from '../../../../../services/data/data.service';
import { formatPlate } from '../../../../../utils/plate';

export const DETECTION_STATUS: Record<string, { label: string; css: string } | undefined> = {
  alerta: { label: 'Alerta', css: 'bg-danger' },
  en_gestion: { label: 'En gestión', css: 'bg-warning text-dark' },
  capturado: { label: 'Capturado', css: 'bg-success' },
  falso_positivo: { label: 'Falso positivo', css: 'bg-secondary' },
};

@Component({
  selector: 'log-detections',
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './detections.html',
  styleUrl: '../plates.scss'
})
export class Detections implements OnDestroy {

  loading = signal(true);
  statusFilter = 'todas';
  displayedColumns = ['detectedAt', 'plate', 'vehicle', 'status', 'detectedBy', 'location', 'actions'];
  dataSource = new MatTableDataSource<any>();
  statuses = DETECTION_STATUS;
  statusKeys = Object.keys(DETECTION_STATUS);
  formatPlate = formatPlate;

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  private _data = inject(DataService);
  private _snack = inject(MatSnackBar);
  private plates = new Map<string, any>();
  private sub?: Subscription;

  constructor() {
    this.dataSource.filterPredicate = (row, filter) => filter === 'todas' || row.status === filter;
    this.loadData();
    this.sub = this._data.onCreate('PlateDetection').subscribe({
      // El aviso (sonido/notificación) lo muestra PlateAlertsService en todo el panel
      next: (detection: any) => {
        this.dataSource.data = [this.enrich(detection), ...this.dataSource.data];
      },
      error: (e: any) => console.log('Error suscripción detecciones', e)
    });
  }

  async loadData() {
    this.loading.set(true);
    try {
      const [detections, plates] = await Promise.all([
        this._data.getAll('PlateDetection'),
        this._data.getAll('WantedPlate'),
      ]);
      plates.forEach(p => this.plates.set(p.id, p));
      detections.sort((a, b) => (b.detectedAt || b.createdAt || '').localeCompare(a.detectedAt || a.createdAt || ''));
      this.dataSource.data = detections.map(d => this.enrich(d));
    } catch (error) {
      console.log(error);
      this._snack.open('No fue posible cargar las detecciones', 'Cerrar', { duration: 4000 });
    }
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.applyFilter();
    this.loading.set(false);
  }

  private enrich(detection: any) {
    return { ...detection, wanted: this.plates.get(detection.wantedPlateId) };
  }

  applyFilter() {
    this.dataSource.filter = this.statusFilter;
    this.dataSource.paginator?.firstPage();
  }

  count(status: string) {
    return this.dataSource.data.filter(d => d.status === status).length;
  }

  async setStatus(row: any, status: string) {
    const { errors } = await this._data.updateData('PlateDetection', row.id, { status });
    if (errors?.length) {
      this._snack.open('No fue posible actualizar el estado', 'Cerrar', { duration: 4000 });
      return;
    }
    row.status = status;
    this.applyFilter();
  }

  mapUrl(row: any) {
    return `https://www.google.com/maps?q=${row.latitude},${row.longitude}`;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

}
