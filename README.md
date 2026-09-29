# SIA Admin · Placas

![SIA - Servicios Integrados Automotriz](public/images/logo.png)

Panel administrativo y backend (AWS Amplify Gen 2) del sistema de **placas buscadas** de
**SIA - Servicios Integrados Automotriz S.A.S.**

```
        📱 SIA Placas (app móvil)          🖥️ SIA Monitor (cámaras fijas)
         operarios · grupo operario         cuentas del grupo camara
                     └──────────────┬──────────────┘
                                    ▼
             Backend Amplify de SIA (este repositorio)
             Cognito + AppSync + DynamoDB
             reportSighting · checkPlate · detecciones · historial
                                    ▲
                     🧑‍💼 Panel web (este repositorio) · grupo admin
```

Repositorios relacionados:
- App móvil: [`logcolombiasas/mobile`](https://github.com/logcolombiasas/mobile)
- Monitor de cámaras: [`logcolombiasas/monitor`](https://github.com/logcolombiasas/monitor)

## Panel web (grupo `admin`)

- **Listado de placas**: agregar, editar, activar/desactivar y eliminar placas. **Carga desde Excel**
  con vista previa (nuevas / a actualizar / sin cambios / con errores), plantilla y exportación.
  Al agregar placas avisa cuáles **ya habían sido vistas** antes y dónde.
- **Detecciones**: vehículos del listado identificados por los operarios (📱) y las cámaras fijas (📹),
  con lugar, mapa y estado (`alerta`, `en_gestion`, `capturado`, `falso_positivo`). En tiempo real.
- **Historial de placas**: todas las lecturas de cualquier placa agrupadas por sector, con mapa.
- **Notificaciones**: en cualquier pantalla, al detectarse una placa del listado suena un aviso,
  aparece un mensaje, la campana muestra el contador y llega una notificación del navegador.

No hay registro público: los usuarios se crean en Cognito.

## Backend

| Recurso | Descripción | Acceso |
|---|---|---|
| Grupos `admin` / `operario` / `camara` | Panel web / app móvil / monitor de cámaras | — |
| Modelo `WantedPlate` | Listado de placas buscadas (índice `byPlate`) | `admin` |
| Modelo `PlateDetection` | Detecciones de placas del listado | `admin` total, `operario` crear/leer/actualizar, `camara` crear |
| Modelo `PlateSighting` | Historial de todas las lecturas (índice `byPlateAndDate`, se borra a los 180 días) | `admin` leer/eliminar |
| Mutation `reportSighting` | Verifica la placa y la guarda en el historial | `admin`, `operario`, `camara` |
| Query `checkPlate` | Solo verifica, sin guardar | `admin`, `operario`, `camara` |

Todo el acceso es con usuarios de Cognito (sin API key). La retención del historial se cambia en
`amplify/data/resolvers/saveSighting.js` (`RETENTION_DAYS`).

### Consumir el endpoint

```http
POST https://<appsync-id>.appsync-api.<region>.amazonaws.com/graphql
Authorization: <token de Cognito>
Content-Type: application/json

{
  "query": "mutation ($plate: String!, $place: String) { reportSighting(plate: $plate, locationName: $place, sourceType: \"fija\") { found plate id brand color reason priority } }",
  "variables": { "plate": "ABC123", "place": "Parqueadero Calle 80" }
}
```

## Despliegue (AWS Amplify)

1. En la consola de AWS Amplify: **Create new app → GitHub →** este repositorio, rama `main`.
   Amplify detecta `amplify.yml` y despliega backend + panel web.
2. Al terminar, en la app de Amplify → rama `main` → **Deployed backend resources** →
   **Download amplify_outputs.json**. Ese archivo es el que usan la app móvil y el monitor.
3. Crear usuarios en **Cognito** (User pool de esta app): *Create user* con contraseña temporal y
   agregarlo al grupo `admin`, `operario` o `camara`.

## Desarrollo local

```bash
npm install --legacy-peer-deps
npx ampx sandbox          # backend personal en tu cuenta AWS (genera amplify_outputs.json)
npm start                 # http://localhost:4200
```

`amplify_outputs.json` no se sube a git: lo genera el despliegue o `npx ampx sandbox`.
