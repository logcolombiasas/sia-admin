import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../../../services/data/data.service';
import { formatPlate, isValidPlate, normalizePlate } from '../../../../../utils/plate';
import { SightingsMap, MapPoint } from '../../../../../shared/sightings-map/sightings-map';
import { describeLocation, summarizeSectors, SectorSummary } from './sectors';

@Component({
  selector: 'log-sightings',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    SightingsMap,
  ],
  templateUrl: './sightings.html',
  styleUrl: '../plates.scss'
})
export class Sightings {

  private _data = inject(DataService);
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);

  search = '';
  plate = signal('');
  loading = signal(false);
  error = signal('');
  sightings = signal<any[]>([]);
  sectors = signal<SectorSummary[]>([]);
  wanted = signal<any | null>(null);
  displayedColumns = ['seenAt', 'place', 'address', 'source', 'wanted', 'map'];
  formatPlate = formatPlate;
  describeLocation = describeLocation;
  points = signal<MapPoint[]>([]);

  constructor() {
    this._route.queryParamMap.subscribe(params => {
      const plate = params.get('plate');
      if (plate) {
        this.search = formatPlate(plate);
        this.load(normalizePlate(plate));
      }
    });
  }

  submit() {
    const plate = normalizePlate(this.search);
    if (!isValidPlate(plate)) {
      this.error.set('Escribe una placa válida (ej. ABC123)');
      return;
    }
    this._router.navigate([], { queryParams: { plate }, replaceUrl: true });
  }

  private async load(plate: string) {
    this.plate.set(plate);
    this.error.set('');
    this.loading.set(true);
    try {
      const [sightings, check] = await Promise.all([
        this._data.sightingsByPlate(plate),
        this._data.query('checkPlate', { plate }).catch(() => null),
      ]);
      this.sightings.set(sightings);
      this.sectors.set(summarizeSectors(sightings));
      this.points.set(sightings
        .filter((s: any) => s.latitude != null && s.longitude != null)
        .map((s: any) => ({
          latitude: s.latitude,
          longitude: s.longitude,
          accuracy: s.accuracy,
          highlight: !!s.wanted,
          title: `${formatPlate(s.plate)} · ${new Date(s.seenAt).toLocaleString('es-CO')}`,
          lines: [s.locationName, s.address, `${s.sourceType === 'fija' ? 'Cámara' : 'Operario'}: ${s.sourceName || '—'}`],
        })));
      this.wanted.set(check?.data?.found ? check.data : null);
    } catch (error) {
      console.log(error);
      this.error.set('No fue posible consultar el historial');
      this.sightings.set([]);
      this.sectors.set([]);
      this.points.set([]);
    }
    this.loading.set(false);
  }

  mapUrl(row: { latitude?: number; longitude?: number }) {
    return `https://www.google.com/maps?q=${row.latitude},${row.longitude}`;
  }

}
