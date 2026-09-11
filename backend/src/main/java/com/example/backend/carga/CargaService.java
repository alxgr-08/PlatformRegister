package com.example.backend.carga;

import com.example.backend.common.ApiException;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.util.XMLHelper;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler.SheetContentsHandler;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Carga y descarga masiva de la base de asistentes.
 *  - Importa desde Excel (.xlsx) o CSV, procesando por lotes (sin limite de filas).
 *  - Exporta toda la base a un Excel con el mismo formato del archivo de origen.
 */
@Service
public class CargaService {

    private static final int TAMANO_LOTE = 1000;
    private static final int MAX_ERRORES = 50;
    private static final char BOM = (char) 0xFEFF;
    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("d/MM/yyyy HH:mm");

    /** UPSERT del Excel: inserta o actualiza por DNI sin registrar ingreso al evento. */
    private static final String UPSERT_EXCEL_SQL = """
            insert into asistente
                (dni, nombre_completo, nombre, apellidos, celular, correo, tipo_documento,
                 terminos_cmr, terminos_condiciones, fecha_registro_origen, tipo_registro,
                 fecha_ingreso_evento, creado_en)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, now())
            on conflict (dni) do update set
                nombre_completo       = excluded.nombre_completo,
                nombre                = excluded.nombre,
                apellidos             = excluded.apellidos,
                celular               = excluded.celular,
                correo                = excluded.correo,
                tipo_documento        = excluded.tipo_documento,
                terminos_cmr          = excluded.terminos_cmr,
                terminos_condiciones  = excluded.terminos_condiciones,
                fecha_registro_origen = excluded.fecha_registro_origen,
                tipo_registro         = excluded.tipo_registro
            """;

    /** UPSERT del CSV (formato simple). */
    private static final String UPSERT_CSV_SQL = """
            insert into asistente
                (dni, nombre_completo, nombre, celular, correo, especialidad, tipo_registro, creado_en)
            values (?, ?, ?, ?, ?, ?, ?, now())
            on conflict (dni) do update set
                nombre_completo = excluded.nombre_completo,
                nombre          = excluded.nombre,
                celular         = excluded.celular,
                correo          = excluded.correo,
                especialidad    = excluded.especialidad,
                tipo_registro   = excluded.tipo_registro
            """;

    private static final String SELECT_EXPORT_SQL = """
            select dni, nombre_completo, celular, correo, especialidad,
                   fecha_ingreso_evento as hora
            from asistente
            where fecha_ingreso_evento is not null
            order by fecha_ingreso_evento, id
            """;

    private static final String SELECT_EXPORT_POR_CHARLA_SQL = """
            select a.dni, a.nombre_completo, a.celular, a.correo, a.especialidad,
                   rc.registrado_en as hora
            from asistente a
            join registro_charla rc on rc.asistente_id = a.id
            where rc.charla_id = ?
            order by rc.registrado_en
            """;

    private static final String[] CABECERAS_EXPORT = {
            "DNI", "NOMBRE", "CELULAR", "CORREO", "ESPECIALIDAD", "HORA DE REGISTRO"
    };

    private final JdbcTemplate jdbcTemplate;

    public CargaService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Resumen del resultado de una importacion. */
    public record Resultado(int filasLeidas, int filasProcesadas, int filasOmitidas, List<String> errores) {
    }

    // ============================================================ IMPORTAR EXCEL

    @Transactional
    public Resultado importarAsistentesExcel(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debe adjuntar un archivo Excel (.xlsx) no vacio.");
        }
        // Modo REEMPLAZO: la nueva base sustituye por completo a la anterior.
        // Al ir dentro de una transaccion, si la carga falla se restaura el estado previo.
        jdbcTemplate.update("delete from registro_charla");
        jdbcTemplate.update("delete from asistente");
        // Al borrar las inscripciones hay que dejar en cero el contador de cada
        // charla; si no, las salas siguen apareciendo llenas sin nadie dentro.
        jdbcTemplate.update("update charla set registrados = 0");
        LectorExcel lector = new LectorExcel();
        try (OPCPackage pkg = OPCPackage.open(archivo.getInputStream())) {
            ReadOnlySharedStringsTable strings = new ReadOnlySharedStringsTable(pkg);
            XSSFReader xssfReader = new XSSFReader(pkg);
            StylesTable styles = xssfReader.getStylesTable();
            XMLReader parser = XMLHelper.newXMLReader();
            parser.setContentHandler(new XSSFSheetXMLHandler(styles, strings, lector, false));
            Iterator<InputStream> hojas = xssfReader.getSheetsData();
            if (hojas.hasNext()) {
                try (InputStream hoja = hojas.next()) {
                    parser.parse(new InputSource(hoja));
                }
            }
            lector.flush();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "No se pudo leer el archivo Excel: " + e.getMessage());
        }
        if (lector.columnas.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El archivo no tiene una fila de cabecera valida.");
        }
        return new Resultado(lector.leidas, lector.procesadas, lector.omitidas, lector.errores);
    }

    /** Handler de streaming SAX: procesa el Excel fila por fila, sin cargarlo entero en memoria. */
    private final class LectorExcel implements SheetContentsHandler {

        private final Map<String, Integer> columnas = new HashMap<>();
        private final Map<Integer, String> filaActual = new HashMap<>();
        private final List<Object[]> lote = new ArrayList<>(TAMANO_LOTE);
        private final List<String> errores = new ArrayList<>();
        private int leidas = 0;
        private int procesadas = 0;
        private int omitidas = 0;

        @Override
        public void startRow(int rowNum) {
            filaActual.clear();
        }

        @Override
        public void cell(String cellReference, String formattedValue, XSSFComment comment) {
            if (cellReference == null || formattedValue == null) {
                return;
            }
            filaActual.put((int) new CellReference(cellReference).getCol(), formattedValue);
        }

        @Override
        public void endRow(int rowNum) {
            if (rowNum == 0) {
                for (Map.Entry<Integer, String> e : filaActual.entrySet()) {
                    String h = normalizarCabecera(e.getValue());
                    if (!h.isEmpty()) {
                        columnas.putIfAbsent(h, e.getKey());
                    }
                }
                if (!columnas.containsKey("numero_documento") && !columnas.containsKey("dni")) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "El Excel debe incluir una columna NUMERO_DOCUMENTO (o DNI) en la cabecera.");
                }
                return;
            }
            if (filaActual.isEmpty()) {
                return;
            }
            leidas++;
            String dni = normalizarNumero(primerNoNulo(valor("numero_documento"), valor("dni")));
            if (dni == null) {
                omitidas++;
                agregarError("Fila " + (rowNum + 1) + ": NUMERO_DOCUMENTO vacio, fila omitida.");
                return;
            }
            String nombre = primerValor("nombres", "nombre");
            String apellidos = primerValor("apellidos", "apellido");
            String nombreCompleto = primerValor("nombre_completo", "nombrecompleto");
            if (nombreCompleto == null) {
                nombreCompleto = ((nombre == null ? "" : nombre) + " "
                        + (apellidos == null ? "" : apellidos)).trim();
            }
            if (nombreCompleto.isEmpty()) {
                nombreCompleto = "(Sin nombre)";
            }
            lote.add(new Object[]{
                    dni,
                    nombreCompleto,
                    nombre,
                    apellidos,
                    normalizarNumero(valor("celular")),
                    primerNoNulo(valor("emailaddress"), valor("correo")),
                    normalizarNumero(valor("tipo_documento")),
                    parseBool(valor("terminos_cmr")),
                    parseBool(valor("terminos_condiciones")),
                    valor("fecha_registro"),
                    "PRE-REGISTRADO"
            });
            if (lote.size() >= TAMANO_LOTE) {
                procesadas += ejecutarLoteExcel(lote);
                lote.clear();
            }
        }

        void flush() {
            if (!lote.isEmpty()) {
                procesadas += ejecutarLoteExcel(lote);
                lote.clear();
            }
        }

        private String valor(String cabeceraNormalizada) {
            Integer idx = columnas.get(cabeceraNormalizada);
            if (idx == null) {
                return null;
            }
            String v = filaActual.get(idx);
            if (v == null) {
                return null;
            }
            v = v.trim();
            return v.isEmpty() ? null : v;
        }

        private String primerValor(String... cabecerasNormalizadas) {
            for (String cabecera : cabecerasNormalizadas) {
                String v = valor(cabecera);
                if (v != null) {
                    return v;
                }
            }
            return null;
        }

        private void agregarError(String mensaje) {
            if (errores.size() < MAX_ERRORES) {
                errores.add(mensaje);
            }
        }
    }

    private int ejecutarLoteExcel(List<Object[]> lote) {
        jdbcTemplate.batchUpdate(UPSERT_EXCEL_SQL, lote, lote.size(), (ps, fila) -> {
            ps.setString(1, (String) fila[0]);
            ps.setString(2, (String) fila[1]);
            ps.setString(3, (String) fila[2]);
            ps.setString(4, (String) fila[3]);
            ps.setString(5, (String) fila[4]);
            ps.setString(6, (String) fila[5]);
            ps.setString(7, (String) fila[6]);
            setBooleanNullable(ps, 8, (Boolean) fila[7]);
            setBooleanNullable(ps, 9, (Boolean) fila[8]);
            ps.setString(10, (String) fila[9]);
            ps.setString(11, (String) fila[10]);
        });
        return lote.size();
    }

    private void setBooleanNullable(PreparedStatement ps, int idx, Boolean valor) throws SQLException {
        if (valor == null) {
            ps.setNull(idx, Types.BOOLEAN);
        } else {
            ps.setBoolean(idx, valor);
        }
    }

    // ============================================================ EXPORTAR EXCEL

    @Transactional(readOnly = true)
    public void exportarAsistentesExcel(OutputStream out) throws IOException {
        escribirExportacion(SELECT_EXPORT_SQL, new Object[0], out);
    }

    /** Descarga solo los asistentes inscritos en una charla especifica. */
    @Transactional(readOnly = true)
    public void exportarAsistentesDeCharlaExcel(long charlaId, OutputStream out) throws IOException {
        escribirExportacion(SELECT_EXPORT_POR_CHARLA_SQL, new Object[]{charlaId}, out);
    }

    /** Genera un Excel con las 6 columnas de CABECERAS_EXPORT segun el SQL indicado (streaming). */
    private void escribirExportacion(String sql, Object[] params, OutputStream out) throws IOException {
        try (SXSSFWorkbook wb = new SXSSFWorkbook(100)) {
            Sheet sheet = wb.createSheet("Asistentes");
            Row cab = sheet.createRow(0);
            for (int i = 0; i < CABECERAS_EXPORT.length; i++) {
                cab.createCell(i).setCellValue(CABECERAS_EXPORT[i]);
            }
            int[] fila = {1};
            jdbcTemplate.query(
                    con -> {
                        PreparedStatement ps = con.prepareStatement(sql,
                                ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
                        for (int i = 0; i < params.length; i++) {
                            ps.setObject(i + 1, params[i]);
                        }
                        ps.setFetchSize(1000);
                        return ps;
                    },
                    (ResultSet rs) -> {
                        Row r = sheet.createRow(fila[0]++);
                        Timestamp hora = rs.getTimestamp("hora");

                        escribirNumeroOTexto(r.createCell(0), rs.getString("dni"));
                        r.createCell(1).setCellValue(valorSeguro(rs.getString("nombre_completo")));
                        escribirNumeroOTexto(r.createCell(2), rs.getString("celular"));
                        r.createCell(3).setCellValue(valorSeguro(rs.getString("correo")));
                        r.createCell(4).setCellValue(valorSeguro(rs.getString("especialidad")));
                        r.createCell(5).setCellValue(hora == null ? ""
                                : FORMATO_FECHA.format(hora.toLocalDateTime()));
                    });
            wb.write(out);
        }
    }

    private String valorSeguro(String valor) {
        return valor == null ? "" : valor;
    }

    private void escribirNumeroOTexto(Cell celda, String valor) {
        if (valor == null || valor.isBlank()) {
            celda.setCellValue("");
            return;
        }
        if (valor.matches("\\d{1,18}")) {
            try {
                celda.setCellValue(Long.parseLong(valor));
                return;
            } catch (NumberFormatException ignored) {
                // cae a texto
            }
        }
        celda.setCellValue(valor);
    }

    // ============================================================ IMPORTAR CSV

    public Resultado importarAsistentes(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debe adjuntar un archivo CSV no vacio.");
        }
        int leidas = 0;
        int procesadas = 0;
        int omitidas = 0;
        List<String> errores = new ArrayList<>();
        List<Object[]> lote = new ArrayList<>(TAMANO_LOTE);

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8))) {

            String cabecera = br.readLine();
            if (cabecera == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El archivo esta vacio.");
            }
            cabecera = quitarBom(cabecera);
            char delim = detectarDelimitador(cabecera);
            Map<String, Integer> columnas = mapearColumnas(parsearLinea(cabecera, delim));
            if (!columnas.containsKey("dni")) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "El CSV debe incluir una columna 'dni' en la primera fila (cabecera).");
            }

            String linea;
            int numLinea = 1;
            while ((linea = br.readLine()) != null) {
                numLinea++;
                if (linea.isBlank()) {
                    continue;
                }
                leidas++;
                List<String> campos = parsearLinea(linea, delim);
                String dni = valorCsv(campos, columnas, "dni");
                if (dni == null) {
                    omitidas++;
                    agregarError(errores, "Fila " + numLinea + ": DNI vacio, fila omitida.");
                    continue;
                }
                String nombre = primerValorCsv(campos, columnas,
                        "nombre_completo", "nombrecompleto", "nombres", "nombre");
                if (nombre == null) {
                    omitidas++;
                    agregarError(errores, "Fila " + numLinea + ": nombre vacio (DNI " + dni + ").");
                    continue;
                }
                String tipo = primerNoNulo(
                        valorCsv(campos, columnas, "tipo_registro"),
                        valorCsv(campos, columnas, "tipo"));
                if (tipo == null) {
                    tipo = "PRE-REGISTRADO";
                }
                lote.add(new Object[]{
                        dni, nombre, nombre,
                        valorCsv(campos, columnas, "celular"),
                        valorCsv(campos, columnas, "correo"),
                        valorCsv(campos, columnas, "especialidad"),
                        tipo
                });
                if (lote.size() >= TAMANO_LOTE) {
                    procesadas += ejecutarLoteCsv(lote);
                    lote.clear();
                }
            }
            if (!lote.isEmpty()) {
                procesadas += ejecutarLoteCsv(lote);
            }
        } catch (ApiException e) {
            throw e;
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No se pudo leer el archivo: " + e.getMessage());
        }
        return new Resultado(leidas, procesadas, omitidas, errores);
    }

    private int ejecutarLoteCsv(List<Object[]> lote) {
        jdbcTemplate.batchUpdate(UPSERT_CSV_SQL, lote, lote.size(), (ps, fila) -> {
            for (int i = 0; i < 7; i++) {
                ps.setString(i + 1, (String) fila[i]);
            }
        });
        return lote.size();
    }

    // ============================================================ HELPERS

    private Boolean parseBool(String s) {
        if (s == null) {
            return null;
        }
        String v = s.trim().toLowerCase();
        if (v.equals("true") || v.equals("1") || v.equals("verdadero") || v.equals("si") || v.equals("x")) {
            return Boolean.TRUE;
        }
        if (v.equals("false") || v.equals("0") || v.equals("no")) {
            return Boolean.FALSE;
        }
        return null;
    }

    private String normalizarNumero(String s) {
        if (s == null) {
            return null;
        }
        String v = s.trim();
        if (v.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(v).toBigInteger().toString();
        } catch (NumberFormatException e) {
            return v;
        }
    }

    private String quitarBom(String s) {
        if (s != null && !s.isEmpty() && s.charAt(0) == BOM) {
            return s.substring(1);
        }
        return s;
    }

    private char detectarDelimitador(String cabecera) {
        int comas = contar(cabecera, ',');
        int puntoComa = contar(cabecera, ';');
        int tabs = contar(cabecera, '\t');
        if (puntoComa > comas && puntoComa >= tabs) {
            return ';';
        }
        if (tabs > comas && tabs > puntoComa) {
            return '\t';
        }
        return ',';
    }

    private int contar(String s, char c) {
        int n = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == c) {
                n++;
            }
        }
        return n;
    }

    private List<String> parsearLinea(String linea, char delim) {
        List<String> salida = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean enComillas = false;
        for (int i = 0; i < linea.length(); i++) {
            char ch = linea.charAt(i);
            if (enComillas) {
                if (ch == '"') {
                    if (i + 1 < linea.length() && linea.charAt(i + 1) == '"') {
                        sb.append('"');
                        i++;
                    } else {
                        enComillas = false;
                    }
                } else {
                    sb.append(ch);
                }
            } else if (ch == '"') {
                enComillas = true;
            } else if (ch == delim) {
                salida.add(sb.toString());
                sb.setLength(0);
            } else {
                sb.append(ch);
            }
        }
        salida.add(sb.toString());
        return salida;
    }

    private Map<String, Integer> mapearColumnas(List<String> cabeceras) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < cabeceras.size(); i++) {
            String h = normalizarCabecera(cabeceras.get(i));
            if (!h.isEmpty()) {
                map.putIfAbsent(h, i);
            }
        }
        return map;
    }

    private String normalizarCabecera(String s) {
        if (s == null) {
            return "";
        }
        return s.trim().toLowerCase()
                .replace('á', 'a').replace('é', 'e').replace('í', 'i')
                .replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n')
                .replace(' ', '_').replace('-', '_');
    }

    private String valorCsv(List<String> campos, Map<String, Integer> columnas, String nombre) {
        Integer idx = columnas.get(nombre);
        if (idx == null || idx >= campos.size()) {
            return null;
        }
        String v = campos.get(idx);
        if (v == null) {
            return null;
        }
        v = v.trim();
        return v.isEmpty() ? null : v;
    }

    private String primerValorCsv(List<String> campos, Map<String, Integer> columnas, String... nombres) {
        for (String nombre : nombres) {
            String v = valorCsv(campos, columnas, nombre);
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    private String primerNoNulo(String a, String b) {
        return a != null ? a : b;
    }

    private void agregarError(List<String> errores, String mensaje) {
        if (errores.size() < MAX_ERRORES) {
            errores.add(mensaje);
        }
    }
}
