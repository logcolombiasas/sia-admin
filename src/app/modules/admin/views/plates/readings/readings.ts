import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { DataService } from '../../../../../services/data/data.service';
import { formatPlate } from '../../../../../utils/plate';
import { sourceKey, summarizeSources } from './sources';
import { SightingsMap, MapPoint } from '../../../../../shared/sightings-map/sightings-map';

function todayInBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

/**
 * Lecturas por día: todas las placas que leyeron las cámaras (📹) y los operarios (📱)
 * en una fecha, con resumen y filtro por cada cámara/operario.
 */
@Component({
  selector: 'log-readings',
  imports: [
    CommonModule, FormsModule, RouterModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSlideToggleModule, MatTableModule, MatTooltipModule,
    SightingsMap,
  ],
  templateUrl: './readings.html',
  styleUrl: '../plates.scss'
})
export class Readings implements OnDestroy {

  private _data = inject(DataService);

  day = todayInBogota();
  loading = signal(false);
  error = signal('');
  sightings = signal<any[]>([]);
  selected = signal<string | null>(null);
  onlyWanted = signal(false);
  autoRefresh = true;
  displayedColumns = ['seenAt', 'plate', 'source', 'place', 'wanted', 'map'];
  formatPlate = formatPlate;

  sources = computed(() => summarizeSources(this.sightings()));
  filtered = computed(() => this.sightings().filter(s =>
    (!this.selected() || sourceKey(s) === this.selected()) && (!this.onlyWanted() || s.wanted)));
  uniquePlates = computed(() => new Set(this.filtered().map(s => s.plate)).size);
  showMap = false;
  points = computed<MapPoint[]>(() => this.filtered()
    .filter(s => s.latitude != null && s.longitude != null)
    .map(s => ({
      latitude: s.latitude,
      longitude: s.longitude,
      accuracy: s.accuracy,
      highlight: !!s.wanted,
      title: `${formatPlate(s.plate)} · ${new Date(s.seenAt).toLocaleTimeString('es-CO')}`,
      lines: [s.locationName, s.address, `${s.sourceType === 'fija' ? 'Cámara' : 'Operario'}: ${s.sourceName || '—'}`],
    })));

  private timer = setInterval(() => {
    if (this.autoRefresh && this.day === todayInBogota() && !this.loading()) this.load(true);
  }, 30_000);

  constructor() {
    this.load();
  }

  async load(silent = false) {
    if (!silent) this.loading.set(true);
    this.error.set('');
    try {
      this.sightings.set(await this._data.sightingsByDay(this.day));
    } catch (error) {
      console.log(error);
      this.error.set('No fue posible cargar las lecturas');
    }
    this.loading.set(false);
  }

  select(key: string | null) {
    this.selected.set(this.selected() === key ? null : key);
  }

  mapUrl(row: any) {
    return `https://www.google.com/maps?q=${row.latitude},${row.longitude}`;
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
