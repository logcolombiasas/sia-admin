import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import { DataService } from '../../../../services/data/data.service';
import { formatPlate, normalizePlate } from '../../../../utils/plate';
import { PlateForm } from './plate-form/plate-form';
import { PlateUpload, PLATE_COLUMNS } from './plate-upload/plate-upload';

@Component({
  selector: 'log-plates',
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    RouterModule,
  ],
  templateUrl: './plates.html',
  styleUrl: './plates.scss'
})
export class Plates {

  loading = signal(true);
  filters: string[] = [];
  displayedColumns: string[] = ['plate', 'vehicle', 'color', 'reason', 'priority', 'active', 'updatedAt', 'actions'];
  dataSource = new MatTableDataSource<any>();
  stats = signal({ total: 0, active: 0, inactive: 0 });
  /** Placas recién agregadas que ya tenían lecturas en el historial */
  previouslySeen = signal<{ plate: string; count: number; last: any }[]>([]);
  formatPlate = formatPlate;

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  readonly addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  private _data = inject(DataService);
  private _dialog = inject(MatDialog);
  private _snack = inject(MatSnackBar);

  constructor() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const criteria = filter.split(',').map(c => c.trim().toLocaleLowerCase());
      return criteria.every(criterion => {
        const values = Object.values(data).map(v => typeof v === 'string' ? v.toLocaleLowerCase() : '');
        // Permite buscar "ABC-123" o "abc 123"
        const plateCriterion = normalizePlate(criterion).toLocaleLowerCase();
        return values.some(v => v.includes(criterion)) || (!!plateCriterion && data.plate?.toLocaleLowerCase().includes(plateCriterion));
      });
    };
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const plates = await this._data.getAll('WantedPlate');
      plates.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      this.dataSource.data = plates;
      const active = plates.filter(p => p.active !== false).length;
      this.stats.set({ total: plates.length, active, inactive: plates.length - active });
    } catch (error) {
      console.log(error);
      this._snack.open('No fue posible cargar el listado de placas', 'Cerrar', { duration: 4000 });
    }
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.loading.set(false);
  }

  applyFilter() {
    this.dataSource.filter = this.filters.join(',');
    this.dataSource.paginator?.firstPage();
  }

  add(event: MatChipInputEvent) {
    const value = (event.value || '').trim();
    if (value && !this.filters.includes(value)) {
      this.filters.push(value);
      this.applyFilter();
    }
    event.chipInput?.clear();
  }

  remove(filter: string): void {
    this.filters = this.filters.filter(b => b !== filter);
    this.applyFilter();
  }

  edit(filter: string, event: MatChipEditedEvent) {
    const value = event.value.trim();
    if (!value) {
      this.remove(filter);
      return;
    }
    this.filters = this.filters.map(b => (b === filter ? value : b));
    this.applyFilter();
  }

  openForm(item?: any) {
    this._dialog.open(PlateForm, {
      data: { item, existing: this.dataSource.data },
      width: '640px',
      maxWidth: '95vw'
    }).afterClosed().subscribe(result => {
      if (!result) return;
      this.loadData();
      if (result.created) this.checkPreviousSightings([result.plate]);
    });
  }

  openUpload() {
    this._dialog.open(PlateUpload, {
      data: { existing: this.dataSource.data },
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true
    }).afterClosed().subscribe(result => {
      if (!result) return;
      this.loadData();
      if (result.created?.length) this.checkPreviousSightings(result.created);
    });
  }

  /**
   * Revisa si las placas recién agregadas ya habían sido vistas por la app o las
   * cámaras antes de entrar al listado, para saber en qué sectores buscarlas.
   */
  async checkPreviousSightings(plates: string[]) {
    const found: { plate: string; count: number; last: any }[] = [];
    const queue = [...plates];
    const worker = async () => {
      while (queue.length) {
        const plate = queue.shift()!;
        try {
          const sightings = await this._data.sightingsByPlate(plate, 50);
          if (sightings.length) found.push({ plate, count: sightings.length, last: sightings[0] });
        } catch (error) {
          console.log('Error consultando historial', plate, error);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, plates.length) }, worker));
    found.sort((a, b) => (b.last.seenAt || '').localeCompare(a.last.seenAt || ''));
    this.previouslySeen.set(found);
  }

  async toggleActive(row: any) {
    const active = row.active === false;
    const { errors } = await this._data.updateData('WantedPlate', row.id, { active });
    if (errors?.length) {
      this._snack.open('No fue posible actualizar la placa', 'Cerrar', { duration: 4000 });
      return;
    }
    row.active = active;
    this.stats.update(s => ({ ...s, active: s.active + (active ? 1 : -1), inactive: s.inactive + (active ? -1 : 1) }));
  }

  async delete(row: any) {
    if (!confirm(`¿Eliminar la placa ${formatPlate(row.plate)} del listado?`)) return;
    await this._data.deleteData('WantedPlate', row.id);
    this._snack.open(`Placa ${formatPlate(row.plate)} eliminada`, 'Cerrar', { duration: 3000 });
    this.loadData();
  }

  downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      PLATE_COLUMNS.map(c => c.label),
      ['ABC123', 'Automóvil', 'Chevrolet', 'Spark GT', 'Blanco', '2018', 'Juan Pérez', 'Mora crédito', 'Alta', ''],
      ['XYZ12D', 'Motocicleta', 'Yamaha', 'NMAX', 'Negro', '2021', '', 'Reporte de hurto', 'Media', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Placas');
    XLSX.writeFile(wb, 'plantilla_placas.xlsx');
  }

  exportExcel() {
    const rows = this.dataSource.filteredData.map((p: any) => [
      ...PLATE_COLUMNS.map(c => c.key === 'plate' ? formatPlate(p.plate) : (p[c.key] ?? '')),
      p.active === false ? 'Inactiva' : 'Activa'
    ]);
    const ws = XLSX.utils.aoa_to_sheet([[...PLATE_COLUMNS.map(c => c.label), 'Estado'], ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Placas');
    XLSX.writeFile(wb, `placas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

}
