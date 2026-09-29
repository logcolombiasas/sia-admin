import { defineAuth } from "@aws-amplify/backend"

/**
 * Usuarios de SIA (no hay registro público: los crea el administrador en Cognito).
 *  - admin:    panel web (listado de placas, detecciones, historial)
 *  - operario: app móvil de escaneo
 *  - camara:   monitor de cámaras fijas (SIA Monitor)
 */
export const auth = defineAuth({
  loginWith: {
    email: true
  },
  groups: ['admin', 'operario', 'camara'],
})
