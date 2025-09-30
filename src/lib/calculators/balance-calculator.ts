
import { getISODay, isAfter, parseISO, startOfDay } from "date-fns";
import type { AbsenceType, ContractType, DailyData, EmploymentPeriod } from "../types";

const roundToNearestQuarter = (num: number) => {
    return Math.round(num * 4) / 4;
};

const getActivePeriodForCalc = (periods: EmploymentPeriod[], date: Date): EmploymentPeriod | null => {
    if (!periods) return null;
    return periods.find(p => {
        const periodStart = startOfDay(parseISO(p.startDate as string));
        const periodEnd = p.endDate ? startOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
        return !isAfter(periodStart, date) && isAfter(periodEnd, date);
    }) || null;
};

const getEffectiveWeeklyHoursForCalc = (period: EmploymentPeriod | null, date: Date): number => {
    if (!period?.workHoursHistory || period.workHoursHistory.length === 0) {
      return 0;
    }
    const targetDate = startOfDay(date);
    const history = [...period.workHoursHistory].sort((a,b) => parseISO(b.effectiveDate).getTime() - parseISO(a.effectiveDate).getTime());
    const effectiveRecord = history.find(record => !isAfter(startOfDay(parseISO(record.effectiveDate)), targetDate));
    return effectiveRecord?.weeklyHours || 0;
};

export const calculateBalancePreview = (
    employeeId: string, 
    weekData: Record<string, DailyData>, 
    initialBalances: { ordinary: number, holiday: number, leave: number },
    absenceTypes: AbsenceType[],
    contractTypes: ContractType[],
    employmentPeriods: EmploymentPeriod[],
    weeklyHoursOverride?: number | null, 
    totalComplementaryHours?: number | null
) => {
    const firstDayKey = Object.keys(weekData).sort()[0];
    if (!firstDayKey) {
        return { ordinary: 0, holiday: 0, leave: 0, resultingOrdinary: initialBalances.ordinary, resultingHoliday: initialBalances.holiday, resultingLeave: initialBalances.leave };
    }
    const firstDate = parseISO(firstDayKey);

    const activePeriod = getActivePeriodForCalc(employmentPeriods, firstDate);
    if (!activePeriod) {
         return { ordinary: 0, holiday: 0, leave: 0, resultingOrdinary: initialBalances.ordinary, resultingHoliday: initialBalances.holiday, resultingLeave: initialBalances.leave };
    }
    
    const weeklyWorkHours = weeklyHoursOverride ?? getEffectiveWeeklyHoursForCalc(activePeriod, firstDate);
    const contractType = contractTypes.find(ct => ct.name === activePeriod.contractType) ?? { computesOrdinaryBag: true, computesHolidayBag: true, computesOffDayBag: true };
    
    let totalWeeklyComputableHours = 0;
    let impactOrdinary = 0;
    let impactHoliday = 0;
    let impactLeave = 0;

    for (const dayId of Object.keys(weekData).sort()) {
        const dayDate = parseISO(dayId);
        const dayData = weekData[dayId];
        const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
        const dayOfWeek = getISODay(dayDate);

        let dailyComputableForWeek = 0;
        
        // --- EXCEPCIÓN: Festivo de Apertura (Lunes a Sábado) ---
        if (dayData.isHoliday && dayData.holidayType === 'Apertura' && dayOfWeek !== 7) {
            // Horas que computan para la semana son las TEÓRICAS.
            dailyComputableForWeek += dayData.theoreticalHours;

            // Horas TRABAJADAS van a la bolsa de festivos (si no es pago doble).
            if (dayData.workedHours > 0 && !dayData.doublePay && contractType.computesHolidayBag) {
                impactHoliday += dayData.workedHours;
            }
        } 
        // --- Lógica para TODOS LOS DEMÁS DÍAS ---
        else {
            // Excluimos domingos del cómputo semanal.
            if (dayOfWeek !== 7) {
                dailyComputableForWeek += dayData.workedHours;

                if (absenceType && (absenceType.computesToWeeklyHours || absenceType.computesFullDay)) {
                    dailyComputableForWeek += dayData.absenceHours || 0;
                }
            }
            // Lógica para festivos normales trabajados (van a la bolsa de festivos).
            else if (dayData.isHoliday && dayData.workedHours > 0 && !dayData.doublePay && contractType.computesHolidayBag) {
                 impactHoliday += dayData.workedHours;
            }
        }

        // Lógica de Libranza (común a todos los festivos)
        if (dayData.isHoliday && dayData.absence === 'ninguna' && dayData.leaveHours > 0 && contractType.computesOffDayBag) {
            impactLeave += dayData.leaveHours;
        }

        // Sumar horas del día al total semanal (ya excluye domingos y lógica de apertura).
        totalWeeklyComputableHours += dailyComputableForWeek;
       
        // Lógica para ausencias que afectan bolsas directamente
        if (absenceType) {
            const absenceHours = dayData.absenceHours || 0;
            if (absenceType.affectedBag === 'festivos' && contractType.computesHolidayBag) {
                impactHoliday -= absenceHours;
            } else if (absenceType.affectedBag === 'libranza' && contractType.computesOffDayBag) {
                impactLeave -= absenceHours;
            } else if (absenceType.affectedBag === 'ordinaria' && contractType.computesOrdinaryBag) {
                impactOrdinary -= absenceHours;
            }
        }
    }

    const weeklyComplementaryHours = totalComplementaryHours || 0;
    const balanceHours = totalWeeklyComputableHours - weeklyWorkHours;
    if (contractType.computesOrdinaryBag) {
        impactOrdinary += balanceHours - weeklyComplementaryHours;
    }
    
    const finalImpactOrdinary = roundToNearestQuarter(impactOrdinary);
    const finalImpactHoliday = roundToNearestQuarter(impactHoliday);
    const finalImpactLeave = roundToNearestQuarter(impactLeave);

    const result = {
        ordinary: finalImpactOrdinary,
        holiday: finalImpactHoliday,
        leave: finalImpactLeave,
        resultingOrdinary: initialBalances.ordinary + finalImpactOrdinary,
        resultingHoliday: initialBalances.holiday + finalImpactHoliday,
        resultingLeave: initialBalances.leave + finalImpactLeave,
    };
    
    return result;
  }
