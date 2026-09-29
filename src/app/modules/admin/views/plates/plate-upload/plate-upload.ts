import { CommonModule } from '@angular/common';
import { Component, computed, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import * as XLSX from 'xlsx';
import { DataService } from '../../../../../services/data/data.service';
import { formatPlate, isValidPlate, normalizePlate } from '../../../../../utils/plate';

/** Columnas de la plantilla. `aliases` permite reconocer encabezados escritos de otra forma. */
export const PLATE_COLUMNS = [
  { key: 'plate', label: 'Placa', aliases: ['placa', 'placas', 'plate'] },
  { key: 'vehicleType', label: 'Tipo', aliases: ['tipo', 'tipo vehiculo', 'tipo de vehiculo', 'clase'] },
  { key: 'brand', label: 'Marca', aliases: ['marca'] },
  { key: 'line', label: 'Línea', aliases: ['linea', 'referencia'] },
  { key: 'color', label: 'Color', aliases: ['color'] },
  { key: 'modelYear', label: 'Modelo', aliases: ['modelo', 'año', 'ano'] },
  { key: 'owner', label: 'Propietario', aliases: ['propietario', 'deudor', 'cliente'] },
  { key: 'reason', label: 'Motivo', aliases: ['motivo', 'razon', 'causa'] },
  { key: 'priority', label: 'Prioridad', aliases: ['prioridad'] },
  { key: 'notes', label: 'Observaciones', aliases: ['observaciones', 'observacion', 'notas', 'nota'] },
] as const;

type Action = 'create' | 'update' | 'same' | 'invalid' | 'duplicated';
interface Row { line: number; action: Action; body: any; id?: string; message?: string; }

const CONCURRENCY = 8;

function simplify(text: any): string {
  return `${text ?? ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

@Component({
  selector: 'log-plate-upload',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  templateUrl: './plate-upload.html',
})
export class PlateUpload {

  fileName = signal('');
  rows = signal<Row[]>([]);
  toDeactivate = signal<any[]>([]);
  deactivateMissing = false;
  processing = signal(false);
  done = signal(false);
  progress = signal(0);
  errors = signal<string[]>([]);
  formatPlate = formatPlate;

  summary = computed(() => {
    const count = (a: Action) => this.rows().filter(r => r.action === a).length;
    return {
      create: count('create'),
      update: count('update'),
      same: count('same'),
      invalid: count('invalid') + count('duplicated'),
    };
  });
  issues = computed(() => this.rows().filter(r => r.action === 'invalid' || r.action === 'duplicated'));
  pending = computed(() => this.rows().filter(r => r.action === 'create' || r.action === 'update'));

  private existingByPlate = new Map<string, any>();
  /** Placas creadas con éxito (para revisar si ya habían sido vistas antes) */
  private created: string[] = [];

  constructor(
    private _data: DataService,
    @Inject(MAT_DIALOG_DATA) readonly data: any,
    private _ref: MatDialogRef<PlateUpload>
  ) {
    (data?.existing || []).forEach((p: any) => this.existingByPlate.set(p.plate, p));
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.fileName.set(file.name);
    this.done.set(false);
    this.errors.set([]);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
      this.analyze(matrix);
    };
    reader.readAsArrayBuffer(file);
  }

  /** Clasifica cada fila del archivo en crear / actualizar / sin cambios / inválida */
  private analyze(matrix: any[][]) {
    const [header = [], ...lines] = matrix;
    const headerNames = header.map(simplify);
    // Si no se reconoce el encabezado se asume el orden de la plantilla
    const indexOf = (col: typeof PLATE_COLUMNS[number], position: number) => {
      const idx = headerNames.findIndex(h => (col.aliases as readonly string[]).includes(h));
      return idx >= 0 ? idx : (headerNames.some(h => h) ? -1 : position);
    };
    const indexes = PLATE_COLUMNS.map((c, i) => indexOf(c, i));
    if (indexes[0] < 0) {
      this.errors.set(['No se encontró la columna "Placa" en el archivo. Descarga la plantilla para ver el formato.']);
      this.rows.set([]);
      return;
    }

    const seen = new Set<string>();
    const rows: Row[] = [];
    lines.forEach((cells, i) => {
      if (!cells.some(c => `${c}`.trim())) return;
      const body: any = { active: true };
      PLATE_COLUMNS.forEach((c, ci) => {
        const value = indexes[ci] >= 0 ? `${cells[indexes[ci]] ?? ''}`.trim() : '';
        if (value) body[c.key] = value;
      });
      body.plate = normalizePlate(body.plate);
      const line = i + 2;

      if (!isValidPlate(body.plate)) {
        rows.push({ line, action: 'invalid', body, message: `Placa "${cells[indexes[0]] ?? ''}" inválida` });
        return;
      }
      if (seen.has(body.plate)) {
        rows.push({ line, action: 'duplicated', body, message: `Placa ${body.plate} repetida en el archivo` });
        return;
      }
      seen.add(body.plate);

      const old = this.existingByPlate.get(body.plate);
      if (!old) {
        rows.push({ line, action: 'create', body });
        return;
      }
      const changed = PLATE_COLUMNS.some(c => body[c.key] !== undefined && body[c.key] !== (old[c.key] ?? undefined))
        || old.active === false;
      rows.push({ line, action: changed ? 'update' : 'same', body, id: old.id });
    });

    this.rows.set(rows);
    this.toDeactivate.set([...this.existingByPlate.values()].filter(p => p.active !== false && !seen.has(p.plate)));
  }

  async upload() {
    if (this.processing()) return;
    this.processing.set(true);
    this.progress.set(0);

    const tasks: (() => Promise<any>)[] = this.pending().map(row => async () => {
      if (row.action !== 'create') return this._data.updateData('WantedPlate', row.id!, row.body);
      const res = await this._data.createData('WantedPlate', row.body);
      if (!res?.errors?.length) this.created.push(row.body.plate);
      return res;
    });
    if (this.deactivateMissing) {
      this.toDeactivate().forEach(p => tasks.push(() => this._data.updateData('WantedPlate', p.id, { active: false })));
    }

    let completed = 0;
    const errors: string[] = [];
    const queue = [...tasks];
    const worker = async () => {
      while (queue.length) {
        const task = queue.shift()!;
        try {
          const { errors: gqlErrors } = await task();
          if (gqlErrors?.length) errors.push(gqlErrors[0].message);
        } catch (error: any) {
          errors.push(error?.errors?.[0]?.message || error?.message || `${error}`);
        }
        completed++;
        this.progress.set(Math.round(completed * 100 / tasks.length));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker));

    this.errors.set(errors);
    this.processing.set(false);
    this.done.set(true);
  }

  close() {
    this._ref.close(this.done() ? { created: this.created } : null);
  }

}
