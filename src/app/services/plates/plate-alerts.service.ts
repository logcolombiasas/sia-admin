import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthzService } from '../auth/authz.service';
import { DataService } from '../data/data.service';
import { formatPlate } from '../../utils/plate';

/**
 * Notifica al administrador, en cualquier pantalla del panel, cuando la app
 * móvil o una cámara fija detecta una placa del listado:
 * contador en la campana, aviso en pantalla, sonido y notificación del navegador.
 */
@Injectable({ providedIn: 'root' })
export class PlateAlertsService {

  private _data = inject(DataService);
  private _authz = inject(AuthzService);
  private _snack = inject(MatSnackBar);
  private _router = inject(Router);

  unread = signal(0);
  private sub?: Subscription;

  async start() {
    if (this.sub) return;
    await this._authz.refresh();
    if (!this._authz.has('admin')) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    this.sub = this._data.onCreate('PlateDetection').subscribe({
      next: (detection: any) => this.notify(detection),
      error: (e: any) => console.log('Error suscripción alertas de placas', e)
    });
  }

  private notify(detection: any) {
    this.unread.update(n => n + 1);
    const where = detection.locationName || detection.detectedBy || 'app móvil';
    const message = `🚨 Placa ${formatPlate(detection.plate)} detectada en ${where}`;

    this.beep();
    this._snack.open(message, 'Ver', { duration: 15000 })
      .onAction().subscribe(() => this.openDetections());

    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification('Vehículo del listado detectado', { body: message, tag: detection.id });
      n.onclick = () => { window.focus(); this.openDetections(); };
    }
  }

  openDetections() {
    this.unread.set(0);
    this._router.navigate(['/plates/detections']);
  }

  /** Tono corto con Web Audio (no requiere archivos de sonido) */
  private beep() {
    try {
      const ctx = new AudioContext();
      [0, 0.25, 0.5].forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = i % 2 ? 1320 : 880;
        gain.gain.value = 0.2;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.18);
      });
      setTimeout(() => ctx.close(), 1500);
    } catch { }
  }

  stop() {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }
}
