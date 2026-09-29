import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import * as L from 'leaflet';

export interface MapPoint {
  latitude: number;
  longitude: number;
  /** Texto principal del popup (ej. placa u hora) */
  title: string;
  /** Detalle del popup: dirección, fuente, fecha… */
  lines?: string[];
  /** Precisión del GPS en metros: se dibuja un círculo con ese radio */
  accuracy?: number | null;
  /** Resaltar en rojo (ej. la placa estaba en el listado) */
  highlight?: boolean;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/**
 * Mapa (OpenStreetMap + Leaflet, sin API key) con los puntos exactos donde se leyeron placas.
 */
@Component({
  selector: 'log-sightings-map',
  template: `<div #map class="map" [style.height.px]="height"></div>
             @if(!points.length){ <div class="empty">Sin lecturas con ubicación</div> }`,
  styles: [`
    :host { display: block; position: relative; }
    .map { width: 100%; border-radius: 12px; border: 1px solid #ececee; z-index: 0; }
    .empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
             color: #6b7280; background: rgba(255,255,255,.7); border-radius: 12px; }
  `],
})
export class SightingsMap implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: MapPoint[] = [];
  @Input() height = 360;
  @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private layer = L.layerGroup();

  ngAfterViewInit() {
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true, attributionControl: true })
      .setView([4.65, -74.1], 11); // Bogotá por defecto
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);
    this.layer.addTo(this.map);
    this.render();
    // El contenedor puede cambiar de tamaño al cargar la vista
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  ngOnChanges() {
    this.render();
  }

  private render() {
    if (!this.map) return;
    this.layer.clearLayers();
    const bounds: L.LatLngTuple[] = [];
    for (const p of this.points) {
      const center: L.LatLngTuple = [p.latitude, p.longitude];
      bounds.push(center);
      const color = p.highlight ? '#ED1C24' : '#050707';
      if (p.accuracy && p.accuracy > 5 && p.accuracy < 500) {
        L.circle(center, { radius: p.accuracy, color, weight: 1, opacity: .4, fillOpacity: .08 }).addTo(this.layer);
      }
      const popup = `<b>${escapeHtml(p.title)}</b>` +
        (p.lines ?? []).filter(Boolean).map(l => `<br>${escapeHtml(l)}`).join('') +
        `<br><a href="https://www.google.com/maps?q=${p.latitude},${p.longitude}" target="_blank" rel="noopener">Abrir en Google Maps</a>`;
      L.circleMarker(center, { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: .95 })
        .bindPopup(popup)
        .addTo(this.layer);
    }
    if (bounds.length === 1) this.map.setView(bounds[0], 17);
    else if (bounds.length > 1) this.map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 17 });
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}
