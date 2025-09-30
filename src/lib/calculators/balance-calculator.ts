
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

        let dailyComputableForWeek = 0;
        
        if (dayData.isHoliday) {
            const holidayType = dayData.holidayType;

            // CORRECTED: Logic to add leaveHours to the leave bag impact
            if (dayData.absence === 'ninguna' && dayData.leaveHours > 0 && contractType.computesOffDayBag) {
                impactLeave += dayData.leaveHours;
            }

            // Now, process worked hours on holidays.
            if (holidayType === 'Apertura' && dayData.workedHours > 0 && !dayData.doublePay) {
                if (contractType.computesHolidayBag) {
                    impactHoliday += dayData.workedHours;
                }
            } else if (holidayType !== 'Apertura' && dayData.workedHours > 0) {
                // Worked hours on a normal holiday count towards the weekly total
                dailyComputableForWeek += dayData.workedHours;
            }
        } else {
            // Non-holiday
            dailyComputableForWeek += dayData.workedHours;
        }


        if (absenceType && (absenceType.computesToWeeklyHours || absenceType.computesFullDay)) {
            dailyComputableForWeek += dayData.absenceHours || 0;
        }
        
        if (getISODay(dayDate) !== 7) {
            totalWeeklyComputableHours += dailyComputableForWeek;
        }
       
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
