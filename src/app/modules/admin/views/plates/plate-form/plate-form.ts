import { Component, Inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DataService } from '../../../../../services/data/data.service';
import { isStandardPlate, isValidPlate, normalizePlate } from '../../../../../utils/plate';

export const VEHICLE_TYPES = ['Automóvil', 'Camioneta', 'Campero', 'Motocicleta', 'Camión', 'Bus', 'Tractocamión', 'Otro'];
export const PRIORITIES = ['Alta', 'Media', 'Baja'];

@Component({
  selector: 'log-plate-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './plate-form.html',
})
export class PlateForm {

  oldItem: any;
  vehicleTypes = VEHICLE_TYPES;
  priorities = PRIORITIES;
  saving = signal(false);
  error = signal('');

  itemForm = new FormGroup({
    plate: new FormControl<string>('', [Validators.required, (c: AbstractControl): ValidationErrors | null =>
      c.value && !isValidPlate(normalizePlate(c.value)) ? { plate: true } : null]),
    vehicleType: new FormControl<string | null>(null),
    brand: new FormControl<string | null>(null),
    line: new FormControl<string | null>(null),
    color: new FormControl<string | null>(null),
    modelYear: new FormControl<string | null>(null),
    owner: new FormControl<string | null>(null),
    reason: new FormControl<string | null>(null),
    priority: new FormControl<string | null>('Media'),
    notes: new FormControl<string | null>(null),
    active: new FormControl<boolean>(true),
  });

  constructor(
    private _data: DataService,
    @Inject(MAT_DIALOG_DATA) readonly data: any,
    private _dialogRef: MatDialogRef<PlateForm>
  ) {
    this.oldItem = data?.item;
    if (this.oldItem) {
      this.itemForm.patchValue({ ...this.oldItem, active: this.oldItem.active !== false });
    }
  }

  get nonStandard() {
    const plate = normalizePlate(this.itemForm.value.plate);
    return isValidPlate(plate) && !isStandardPlate(plate);
  }

  async submit() {
    if (!this.itemForm.valid || this.saving()) return;
    this.error.set('');
    const body: any = { ...this.itemForm.value, plate: normalizePlate(this.itemForm.value.plate) };

    const duplicated = (this.data?.existing || []).find((p: any) => p.plate === body.plate && p.id !== this.oldItem?.id);
    if (duplicated) {
      this.error.set(`La placa ${body.plate} ya existe en el listado`);
      return;
    }

    this.saving.set(true);
    const { errors } = this.oldItem
      ? await this._data.updateData('WantedPlate', this.oldItem.id, body)
      : await this._data.createData('WantedPlate', body);
    this.saving.set(false);

    if (errors?.length) {
      this.error.set('No fue posible guardar la placa');
      return;
    }
    this._dialogRef.close({ plate: body.plate, created: !this.oldItem });
  }

}
