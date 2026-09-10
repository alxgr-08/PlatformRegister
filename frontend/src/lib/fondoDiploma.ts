/**
 * Imagen de guia del diploma para la pantalla de calibracion.
 *
 * Es el arte del diploma (el que ya viene impreso en el papel) puesto de fondo
 * para poder arrastrar cada texto a su lugar exacto. Solo se ve en pantalla:
 * NUNCA se imprime, porque el papel ya trae el arte.
 *
 * Se guarda en este dispositivo (localStorage), no en la base de datos: es una
 * ayuda visual de quien calibra, mientras que la calibracion en si -que es lo
 * que importa para imprimir- si viaja al servidor y vale para todos.
 */
const CLAVE = 'evento.diplomaFondoGuia'

/** Ancho maximo al que se reduce la imagen antes de guardarla. */
const ANCHO_MAXIMO = 1600

export function leerFondoGuia(): string | null {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

export function guardarFondoGuia(dataUrl: string): void {
  try {
    localStorage.setItem(CLAVE, dataUrl)
  } catch {
    throw new Error(
      'La imagen es demasiado grande para guardarla en este dispositivo. Prueba con una mas liviana.',
    )
  }
}

export function olvidarFondoGuia(): void {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    /* sin espacio de almacenamiento: no hay nada que borrar */
  }
}

/**
 * Reduce la imagen y la convierte a JPEG para que entre sin problemas en el
 * almacenamiento del navegador. La calidad alcanza de sobra: solo se usa como
 * referencia visual para ubicar los textos.
 */
export function comprimirImagen(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no parece ser una imagen valida.'))
      img.onload = () => {
        const escala = Math.min(1, ANCHO_MAXIMO / img.width)
        const lienzo = document.createElement('canvas')
        lienzo.width = Math.round(img.width * escala)
        lienzo.height = Math.round(img.height * escala)
        const ctx = lienzo.getContext('2d')
        if (!ctx) {
          reject(new Error('El navegador no pudo procesar la imagen.'))
          return
        }
        ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height)
        resolve(lienzo.toDataURL('image/jpeg', 0.8))
      }
      img.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  })
}
