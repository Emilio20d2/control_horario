
// ==============================================================================
// SCRIPT DE PRECARGA DE REGISTROS SEMANALES (V3 - CORREGIDO)
// ==============================================================================
// Este script lee los archivos CSV semanales desde la carpeta `csv_data`,
// los transforma al formato esperado por el formulario y los guarda en un
// único archivo JSON (prefilled_data.json) para su posterior carga manual.
// No escribe nada en la base de datos.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { parse, getISOWeek, getYear, startOfISOWeek, format, isEqual } = require('date-fns');

// --- CONFIGURACIÓN ---
const CSV_DATA_PATH = path.join(__dirname, 'csv_data');
const OUTPUT_FILE_PATH = path.join(__dirname, 'src/lib/prefilled_data.json');

// --- DATOS DE REFERENCIA ---
const holidays2025 = [
    new Date('2025-01-01'), new Date('2025-01-06'), new Date('2025-01-29'),
    new Date('2025-03-05'), new Date('2025-04-17'), new Date('2025-04-18'),
    new Date('2025-04-23'), new Date('2025-05-01'), new Date('2025-08-15'),
    new Date('2025-10-13'), new Date('2025-11-01'), new Date('2025-12-06'),
    new Date('2025-12-08'), new Date('2025-12-25'),
    // Aperturas autorizadas
    new Date('2025-01-05'), new Date('2025-01-12'), new Date('2025-06-29'),
    new Date('2025-11-30'), new Date('2025-12-14'), new Date('2025-12-21'),
    new Date('2025-12-28')
];

const isHoliday = (date) => holidays2025.some(holiday => isEqual(holiday, date));


// --- MAPA DE TRADUCCIÓN DE ABREVIATURAS ---
// Ahora las claves están en mayúsculas para asegurar la coincidencia.
const absenceTypeMap = {
    "V": "V", 
    "B": "B", 
    "LF": "LF",
    "DF": "DF", 
    "HM": "HM", 
    "CM": "HM",
    "AP": "AP", 
    "EXD": "EXD", 
    "AJ": "AJ",
    "EG": "EG", 
    "FF": "Fallecimiento Familiar", 
    "HS": "Horas Sindicales",
    "RSJ": "Reducción Jornada Senior", 
    "DH": "Devolución de Horas",
    "AT": "Accidente Trabajo", 
    "PE": "Permiso no retribuido"
};

// --- FUNCIÓN PRINCIPAL ---
async function processFiles() {
    console.log("Iniciando la preparación de datos semanales...");

    if (!fs.existsSync(CSV_DATA_PATH)) {
        console.error(`\n[ERROR] La carpeta '${CSV_DATA_PATH}' no existe.`);
        return;
    }

    const allWeeklyData = {};
    const files = fs.readdirSync(CSV_DATA_PATH);
    const weeklyFiles = files.filter(f => f.includes(' - S ') && f.endsWith('.csv'));

    for (const file of weeklyFiles) {
        await new Promise((resolve, reject) => {
            console.log(` -> Procesando archivo: ${file}`);
            const results = [];
            fs.createReadStream(path.join(CSV_DATA_PATH, file))
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => {
                    if (results.length === 0) {
                        resolve();
                        return;
                    }

                    const headers = Object.keys(results[0]);
                    const dateHeaders = headers.slice(3, 10).filter(h => h.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/));

                    if (dateHeaders.length === 0) {
                        console.warn(`    [ADVERTENCIA] No se encontraron cabeceras de fecha válidas en ${file}. Saltando...`);
                        resolve();
                        return;
                    }

                    const parsedDate = parse(dateHeaders[0], 'dd/MM/yyyy', new Date());
                    const weekStartDate = startOfISOWeek(parsedDate);
                    const year = getYear(weekStartDate);
                    const week = getISOWeek(weekStartDate);
                    const weekId = `${year}-W${String(week).padStart(2, '0')}`;

                    if (!allWeeklyData[weekId]) {
                        allWeeklyData[weekId] = { weekData: {} };
                    }

                    for (const row of results) {
                        const employeeName = row['EMPLEADO'];
                        if (!employeeName) continue;
                        
                        const hmVAlue = parseFloat(row['HM'] || 0);
                        const ajValue = parseFloat(row['AJ'] || 0);
                        if (hmVAlue > 0 || ajValue > 0) {
                            console.warn(`    [OMITIDO] Empleado: ${employeeName} en ${file}. Tiene horas en HM/AJ y se registrará manualmente.`);
                            continue;
                        }

                        const weeklyHoursOverride = row['CAMBIO JORNADA'] ? parseFloat(row['CAMBIO JORNADA']) : null;

                        const employeeData = {
                            confirmed: false,
                            days: {},
                            totalComplementaryHours: parseFloat(row['HORAS COMP.'] || 0),
                            generalComment: row['NOTA'] || "",
                            weeklyHoursOverride: isNaN(weeklyHoursOverride) ? null : weeklyHoursOverride,
                        };
                        
                        const hasHolidayPayment = parseFloat(row['PAGO FESTIVO'] || 0) > 0;

                        dateHeaders.forEach((header) => {
                            const date = parse(header, 'dd/MM/yyyy', new Date());
                            const dateKey = format(date, 'yyyy-MM-dd');
                            
                            // ** LÍNEA CORREGIDA **
                            // Limpia, convierte a mayúsculas y luego busca en el mapa.
                            const cellValue = row[header] ? String(row[header]).trim().toUpperCase() : '';

                            const dayData = {
                                workedHours: 0,
                                absence: 'ninguna',
                                absenceHours: 0,
                                doublePay: false,
                                leaveHours: 0,
                            };
                            
                            if(hasHolidayPayment && isHoliday(date)) {
                                dayData.doublePay = true;
                            }

                            if (absenceTypeMap.hasOwnProperty(cellValue)) {
                                dayData.absence = absenceTypeMap[cellValue];
                            } else if (!isNaN(parseFloat(cellValue)) && cellValue !== '') {
                                dayData.workedHours = parseFloat(cellValue);
                            } else if (cellValue !== '') {
                                console.warn(`    [DATO NO RECONOCIDO] Empleado: ${employeeName}, Fecha: ${header}, Valor: "${cellValue}". Se dejará en blanco.`);
                            }
                            
                            employeeData.days[dateKey] = dayData;
                        });
                        
                        allWeeklyData[weekId].weekData[employeeName] = employeeData;
                    }
                    resolve();
                })
                .on('error', reject);
        });
    }

    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(allWeeklyData, null, 2));
    console.log(`\n¡Éxito! Los datos de precarga han sido guardados en: ${OUTPUT_FILE_PATH}`);
}

processFiles().catch(error => {
    console.error("\nHa ocurrido un error durante el proceso:");
    console.error(error);
});
