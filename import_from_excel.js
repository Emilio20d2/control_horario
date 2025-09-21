
// ==============================================================================
// SCRIPT DE PRECARGA DE DATOS DE AUDITORÍA DESDE EXCEL (V6 - REVERTIDO)
// ==============================================================================
// Este script lee el archivo HORAS 2025.xlsx, extrae los datos de impacto
// esperado de HORAS TOTALES, FESTIVO y LIBRANZA de cada registro semanal
// y los guarda en prefilled_data.json.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { parse, startOfWeek, format } = require('date-fns');
const { es } = require('date-fns/locale');

// --- CONFIGURACIÓN ---
const EXCEL_FILE_PATH = path.join(__dirname, 'HORAS 2025.xlsx');
const OUTPUT_FILE_PATH = path.join(__dirname, 'src/lib/prefilled_data.json');
const YEAR = 2025; // Año de referencia para las fechas

// --- FUNCIÓN PRINCIPAL DEL SCRIPT ---
async function main() {
    console.log("Iniciando la extracción de datos de auditoría desde Excel...");

    if (!fs.existsSync(EXCEL_FILE_PATH)) {
        console.error(`\n[ERROR] No se encontró el archivo '${path.basename(EXCEL_FILE_PATH)}'. Asegúrate de que esté en la carpeta raíz.`);
        return;
    }

    const workbook = xlsx.readFile(EXCEL_FILE_PATH, { cellDates: true, codepage: 65001 });
    const finalJson = {};

    const weeklySheetNames = workbook.SheetNames.filter(name => name.trim().toUpperCase().startsWith('S '));

    for (const sheetName of weeklySheetNames) {
        const dateStringFromSheet = sheetName.trim().substring(2); // "30 DIC"
        if (!dateStringFromSheet) {
            console.warn(` -> Saltando hoja '${sheetName}' (formato de nombre de hoja no válido).`);
            continue;
        }

        // Parsear la fecha del nombre de la hoja, añadiendo el año.
        const dateFromSheetName = parse(`${dateStringFromSheet} ${YEAR}`, 'd MMM yyyy', new Date(), { locale: es });

        if (isNaN(dateFromSheetName.getTime())) {
             console.warn(` -> Saltando hoja '${sheetName}' (no se pudo interpretar la fecha '${dateStringFromSheet}').`);
             continue;
        }

        const weekStartDate = startOfWeek(dateFromSheetName, { weekStartsOn: 1 });
        const weekId = format(weekStartDate, 'yyyy-MM-dd');
        
        if (!finalJson[weekId]) {
            finalJson[weekId] = { weekData: {} };
        }

        const weeklySheet = workbook.Sheets[sheetName];
        if (!weeklySheet) continue;

        const weeklyData = xlsx.utils.sheet_to_json(weeklySheet, { header: 1, defval: null });
        if (weeklyData.length < 2) continue; // Necesita cabeceras y datos

        const headers = weeklyData[0].map(h => typeof h === 'string' ? h.trim().toUpperCase() : h);
        
        const employeeNameIndex = headers.findIndex(h => h === 'EMPLEADO');
        const ordinaryImpactIndex = headers.findIndex(h => h === 'HORAS TOTALES');
        const holidayImpactIndex = headers.findIndex(h => h === 'FESTIVO');
        const leaveImpactIndex = headers.findIndex(h => h === 'LIBRANZA');

        if ([employeeNameIndex, ordinaryImpactIndex, holidayImpactIndex, leaveImpactIndex].includes(-1)) {
            console.warn(` -> Saltando hoja '${sheetName}' (no se encontró una columna requerida: EMPLEADO, HORAS TOTALES, FESTIVO, LIBRANZA).`);
            continue;
        }
        
        const safeParseFloat = (value) => {
            if (value === null || value === undefined || value === '') return 0;
            const num = parseFloat(String(value).replace(',', '.'));
            return isNaN(num) ? 0 : num;
        };

        // Iterar sobre las filas de datos (a partir de la segunda fila)
        for (let i = 1; i < weeklyData.length; i++) {
            const row = weeklyData[i];
            const employeeName = row[employeeNameIndex];
            if (!employeeName || typeof employeeName !== 'string') continue;
            
            const employeeNameTrimmed = employeeName.trim();

            const prefilledEmployeeData = {
                expectedOrdinaryImpact: safeParseFloat(row[ordinaryImpactIndex]),
                expectedHolidayImpact: safeParseFloat(row[holidayImpactIndex]),
                expectedLeaveImpact: safeParseFloat(row[leaveImpactIndex]),
            };
            
            const hasImpact = Object.values(prefilledEmployeeData).some(v => v !== 0);

            if (hasImpact) {
                 finalJson[weekId].weekData[employeeNameTrimmed] = prefilledEmployeeData;
            }
        }

        // Limpiar semanas si no se añadió ningún dato de empleado
        if (Object.keys(finalJson[weekId].weekData).length === 0) {
            delete finalJson[weekId];
        }
    }
    console.log(` -> Se han procesado ${weeklySheetNames.length} hojas de semanas.`);

    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(finalJson, null, 2));
    console.log(`\n¡Éxito! Los datos de auditoría han sido exportados a: ${OUTPUT_FILE_PATH}`);
}

main().catch(error => {
    console.error("\nHa ocurrido un error durante la extracción de datos de auditoría:");
    console.error(error);
});
