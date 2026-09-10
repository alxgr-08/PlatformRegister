import type { CSSProperties } from 'react'
import type { CalibracionDiploma, CampoDiploma, CampoDiplomaId, Diploma } from '../api'
import { formatoFechaLarga } from './formato'

/** Pixeles por milimetro a 96 dpi: es la referencia que usa el navegador. */
export const PX_POR_MM = 96 / 25.4

/**
 * Posiciones sugeridas para el arte del diploma de la feria: hoja A4
 * horizontal, con la foto en el tercio izquierdo y los textos centrados en la
 * columna de la derecha (de 131 a 293 mm).
 *
 * Cada texto cae en el espacio en blanco que sigue a su rotulo ya impreso:
 *   titulo -> nombre -> "especializacion en:" -> charla ->
 *   "Brindada por:" -> marca -> "CAPACITADOR:" -> capacitador ->
 *   "Fecha:" -> fecha.
 *
 * Es el mismo valor por defecto del backend (ConfiguracionDto.porDefecto):
 * si se cambia alla, cambiar tambien aca.
 */
export const CALIBRACION_SUGERIDA: CalibracionDiploma = {
  tamanoHoja: 'A4',
  anchoHoja: 297,
  altoHoja: 210,
  orientacion: 'horizontal',
  desplazamientoX: 0,
  desplazamientoY: 0,
  fuente: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  nombre: { visible: true, x: 131, y: 58.8, ancho: 162, tamano: 17, alineacion: 'centro', negrita: true, mayusculas: true },
  charla: { visible: true, x: 131, y: 76, ancho: 162, tamano: 17, alineacion: 'centro', negrita: true, mayusculas: false },
  marca: { visible: true, x: 131, y: 103, ancho: 162, tamano: 14, alineacion: 'centro', negrita: false, mayusculas: false },
  capacitador: { visible: true, x: 131, y: 127, ancho: 162, tamano: 14, alineacion: 'centro', negrita: false, mayusculas: false },
  fecha: { visible: true, x: 131, y: 151, ancho: 162, tamano: 13, alineacion: 'centro', negrita: false, mayusculas: false },
}

const ALINEACION: Record<string, CSSProperties['textAlign']> = {
  izquierda: 'left',
  centro: 'center',
  derecha: 'right',
}

/** Campos que se imprimen en el diploma, en el orden en que se listan en pantalla. */
export const CAMPOS: { id: CampoDiplomaId; etiqueta: string }[] = [
  { id: 'charla', etiqueta: 'Charla' },
  { id: 'marca', etiqueta: 'Marca' },
  { id: 'capacitador', etiqueta: 'Capacitador' },
  { id: 'nombre', etiqueta: 'Nombre de la persona' },
  { id: 'fecha', etiqueta: 'Fecha' },
]

/** Texto que corresponde a cada campo del diploma. */
export function textoDelCampo(campo: CampoDiplomaId, diploma: Diploma): string {
  switch (campo) {
    case 'nombre':
      return diploma.nombreCompleto
    case 'charla':
      return diploma.charla
    case 'marca':
      return diploma.marca ?? ''
    case 'capacitador':
      return diploma.capacitador ?? ''
    case 'fecha':
      return formatoFechaLarga(diploma.horaInicio)
  }
}

/** Estilo absoluto de un campo dentro de la hoja, en milimetros. */
export function estiloCampo(
  campo: CampoDiploma,
  calibracion: CalibracionDiploma,
): CSSProperties {
  return {
    position: 'absolute',
    left: `${campo.x + calibracion.desplazamientoX}mm`,
    top: `${campo.y + calibracion.desplazamientoY}mm`,
    width: `${campo.ancho}mm`,
    fontSize: `${campo.tamano}pt`,
    fontFamily: calibracion.fuente,
    fontWeight: campo.negrita ? 700 : 400,
    textAlign: ALINEACION[campo.alineacion] ?? 'center',
    textTransform: campo.mayusculas ? 'uppercase' : 'none',
    lineHeight: 1.15,
    color: '#000',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  }
}
