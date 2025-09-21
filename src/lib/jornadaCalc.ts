
/**
 * @fileOverview Calculates the theoretical annual work hours for an employee based on segments and suspensions.
 * This is a pure, isolated utility with no external project dependencies, rebuilt to ensure correctness.
 */

// ==============================================================================
// TYPES
// ==============================================================================

export type SegmentoJornada = {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD (inclusive)
  horasSemanales: number;
};

export type Suspension = {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD (inclusive)
};

export type ParamCalculo = {
  year: number;
  segmentos: SegmentoJornada[];
  suspensiones?: Suspension[];
  baseSemanal?: number; // default 40
  baseAnual?: number;   // default 1792
};

export type ResultadoCalculo = {
    year: number;
    totalHoras: number;
    detalle: {
        tramo: SegmentoJornada;
        diasTramo: number;
        diasSuspendidos: number;
        diasActivos: number;
        horasTramo: number;
    }[];
};


// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

const parseDateUTC = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const differenceInDaysUTC = (dateLeft: Date, dateRight: Date): number => {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.round((dateLeft.getTime() - dateRight.getTime()) / MS_PER_DAY);
};

const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};


// ==============================================================================
// MAIN CALCULATION FUNCTION (REBUILT)
// ==============================================================================

/**
 * Calculates the theoretical annual work hours based on segments of constant weekly hours and contract suspensions,
 * using a prorrata method based on natural days, as per the specified correct logic.
 * @param params - The calculation parameters.
 * @returns An object with the total hours and detailed breakdown.
 */
export function calcularJornadaAnualTeorica(params: ParamCalculo): ResultadoCalculo {
    const {
        year,
        segmentos,
        suspensiones = [],
        baseSemanal = 40,
        baseAnual = 1792
    } = params;

    const diasDelAnio = isLeapYear(year) ? 366 : 365;
    const resultadoDetallado = [];
    let totalHorasAnuales = 0;

    for (const segmento of segmentos) {
        const desdeTramo = parseDateUTC(segmento.desde);
        const hastaTramo = parseDateUTC(segmento.hasta);
        
        if (desdeTramo > hastaTramo) continue;

        const diasTramo = differenceInDaysUTC(hastaTramo, desdeTramo) + 1;

        let diasSuspendidosEnTramo = 0;
        for (const suspension of suspensiones) {
            const desdeSuspension = parseDateUTC(suspension.desde);
            const hastaSuspension = parseDateUTC(suspension.hasta);

            const inicioSolapamiento = new Date(Math.max(desdeTramo.getTime(), desdeSuspension.getTime()));
            const finSolapamiento = new Date(Math.min(hastaTramo.getTime(), hastaSuspension.getTime()));

            if (inicioSolapamiento <= finSolapamiento) {
                diasSuspendidosEnTramo += differenceInDaysUTC(finSolapamiento, inicioSolapamiento) + 1;
            }
        }
        
        const diasActivosEnTramo = diasTramo - diasSuspendidosEnTramo;
        if (diasActivosEnTramo <= 0) {
             resultadoDetallado.push({
                tramo: segmento,
                diasTramo,
                diasSuspendidos: diasSuspendidosEnTramo,
                diasActivos: 0,
                horasTramo: 0,
            });
            continue;
        };
        
        const factorJornada = segmento.horasSemanales / baseSemanal;
        const factorTiempo = diasActivosEnTramo / diasDelAnio;
        
        const horasTramo = baseAnual * factorJornada * factorTiempo;
        
        totalHorasAnuales += horasTramo;

        resultadoDetallado.push({
            tramo: segmento,
            diasTramo: diasTramo,
            diasSuspendidos: diasSuspendidosEnTramo,
            diasActivos: diasActivosEnTramo,
            horasTramo: horasTramo
        });
    }

    // Redondear el resultado final al cuarto de hora más cercano.
    const roundedTotalHoras = Math.round(totalHorasAnuales * 4) / 4;

    return {
        year: year,
        totalHoras: roundedTotalHoras,
        detalle: resultadoDetallado
    };
}
