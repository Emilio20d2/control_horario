// @ts-nocheck
'use client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, getYear, isSameDay, getISODay, addDays, endOfWeek, getISOWeekYear, isWithinInterval, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Employee, WeeklyRecord, AbsenceType, Holiday, EmployeeGroup, Ausencia, Conversation, VacationCampaign } from './types';
import { Timestamp } from 'firebase/firestore';

// Helper function to add headers and footers to PDF
const addHeaderFooter = (doc: jsPDF, title: string, pageNumber: number, totalPages: number) => {
    const pageMargin = 15;
    doc.setFontSize(14).setFont('helvetica', 'bold');
    doc.text(title, pageMargin, 15);
    const pageText = `Página ${pageNumber} de ${totalPages}`;
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(pageText, doc.internal.pageSize.width - pageMargin, doc.internal.pageSize.height - 10, { align: 'right' });
};


export async function generateAnnualReportPDF(employee: Employee, year: number, weeklyRecords: Record<string, WeeklyRecord>, dataProvider: any) {
    if (!employee) throw new Error("Empleado no válido.");

    const { getEmployeeBalancesForWeek, calculateBalancePreview, getActivePeriod, getEffectiveWeeklyHours, absenceTypes, holidays, getWeekId } = dataProvider;
    
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
    const weekIdsInYear = Object.keys(weeklyRecords).filter(weekId => {
        const weekDate = parseISO(weekId);
        const isoYear = getISOWeekYear(weekDate);
        if (year === 2025) return isoYear === 2025;
        return getYear(weekDate) === year && isoYear === year;
    }).sort();
    
    const confirmedWeekIds = weekIdsInYear.filter(weekId => weeklyRecords[weekId]?.weekData?.[employee.id]?.confirmed);

    if (confirmedWeekIds.length === 0) {
        throw new Error("No hay semanas confirmadas para generar este informe.");
    }
    
    const pageMargin = 10;
    let pageNumber = 1;
    let currentY = pageMargin;

    const addHeader = (pageNumber: number) => {
        doc.setFontSize(14).setFont('helvetica', 'bold');
        doc.text(`${employee.name} - Resumen Anual ${year}`, pageMargin, currentY);
        doc.setFontSize(10).setFont('helvetica', 'normal');
        doc.text(`Página ${pageNumber}`, doc.internal.pageSize.width - pageMargin, currentY, { align: 'right' });
        currentY += 8;
    };

    addHeader(pageNumber);

    for (let i = 0; i < confirmedWeekIds.length; i++) {
        const weekId = confirmedWeekIds[i];

        if (i > 0 && i % 5 === 0) { // Add new page every 5 records
            doc.addPage();
            pageNumber++;
            currentY = pageMargin;
            addHeader(pageNumber);
        }
        
        const weekData = weeklyRecords[weekId].weekData[employee.id];
        const weekStartDate = parseISO(weekId);
        const weekDays = Object.keys(weekData.days).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());

        const initialBalances = getEmployeeBalancesForWeek(employee.id, weekId);
        
        const impact = await calculateBalancePreview(
            employee.id,
            weekData.days,
            initialBalances,
            weekData.weeklyHoursOverride,
            weekData.totalComplementaryHours
        );

        if (!impact) continue;

        const finalBalances = {
            ordinary: impact.resultingOrdinary,
            holiday: impact.resultingHoliday,
            leave: impact.resultingLeave,
        };

        const activePeriod = getActivePeriod(employee.id, weekStartDate);
        const effectiveWeeklyHours = weekData.weeklyHoursOverride ?? getEffectiveWeeklyHours(activePeriod, weekStartDate);

        let totalWeeklyComputableHours = 0;
        for (const dayKey of Object.keys(weekData.days).sort()) {
            const dayDate = parseISO(dayKey);
            const dayData = weekData.days[dayKey];
            const absenceType = absenceTypes.find((at: AbsenceType) => at.abbreviation === dayData.absence);
            
            if (getISODay(dayDate) !== 7) { // Exclude Sundays
                totalWeeklyComputableHours += dayData.workedHours;
                if (absenceType && absenceType.computesToWeeklyHours) {
                    totalWeeklyComputableHours += dayData.absenceHours;
                }
            }
        }
        totalWeeklyComputableHours -= (weekData.totalComplementaryHours || 0);

        const weekLabel = `Semana del ${format(weekDays[0], 'd MMM', { locale: es })} - ${format(weekDays[6], 'd MMM yyyy', { locale: es })} (Computadas: ${totalWeeklyComputableHours.toFixed(2)}h / Teóricas: ${effectiveWeeklyHours.toFixed(2)}h)`;

        currentY += 5;
        
        doc.setFontSize(10).setFont('helvetica', 'bold');
        doc.text(weekLabel, pageMargin, currentY);
        currentY += 6;

        const balancesYStart = currentY;
        
        const col1 = 115;
        const col2 = col1 + 25;
        const col3 = col2 + 25;
        const col4 = col3 + 25;
        
        doc.setFontSize(7).setFont('helvetica', 'bold');
        doc.text('Bolsa', col1, currentY);
        doc.text('Inicial', col2, currentY, {align: 'right'});
        doc.text('Impacto', col3, currentY, {align: 'right'});
        doc.text('Balance', col4, currentY, {align: 'right'});
        doc.setFont('helvetica', 'normal');
        currentY += 4;
        
        const renderBalanceRow = (label: string, initialVal: number, impactVal: number, finalVal: number) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, col1, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${initialVal.toFixed(2)}h`, col2, currentY, {align: 'right'});

            if (impactVal > 0) doc.setTextColor('#007bff');
            else if (impactVal < 0) doc.setTextColor('#dc3545');
            doc.text(`${(impactVal >= 0 ? '+' : '') + impactVal.toFixed(2)}h`, col3, currentY, {align: 'right'});
            doc.setTextColor('#000000'); 

            doc.text(`${finalVal.toFixed(2)}h`, col4, currentY, {align: 'right'});
            currentY += 4;
        };

        renderBalanceRow('B. Ordinaria:', initialBalances.ordinary, impact.ordinary, finalBalances.ordinary);
        renderBalanceRow('B. Festivos:', initialBalances.holiday, impact.holiday, finalBalances.holiday);
        renderBalanceRow('B. Libranza:', initialBalances.leave, impact.leave, finalBalances.leave);
        
        let balancesSectionEnd = currentY;

        const compHours = weekData.totalComplementaryHours || 0;
        if (compHours > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('H. Complem.:', col1, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${compHours.toFixed(2)}h`, col4, currentY, {align: 'right'});
            currentY += 4;
            balancesSectionEnd = currentY;
        }
        
        if (weekData.generalComment) {
            doc.setFontSize(6).setFont('helvetica', 'italic');
            doc.text('Comentarios:', col1, currentY);
            currentY += 3;
            const commentLines = doc.splitTextToSize(weekData.generalComment, 80);
            doc.text(commentLines, col1, currentY);
            currentY += (commentLines.length * 2.5);
            balancesSectionEnd = currentY;
        }

        const head = [['Día', 'Fecha', 'Trab.', 'Ausencia', 'H. Aus.', 'H. Lib.', 'P. Doble']];
        const body = weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayData = weekData.days[dayKey];
            const absenceName = dayData.absence === 'ninguna' ? '' : absenceTypes.find(at => at.abbreviation === dayData.absence)?.abbreviation || dayData.absence;
            return [
                format(day, 'E', { locale: es }),
                format(day, 'dd/MM/yy', { locale: es }),
                dayData.workedHours.toFixed(2),
                absenceName,
                dayData.absenceHours.toFixed(2),
                dayData.leaveHours.toFixed(2),
                dayData.doublePay ? 'Sí' : ''
            ];
        });

        autoTable(doc, {
            head,
            body,
            startY: balancesYStart,
            theme: 'grid',
            tableWidth: 100,
            margin: { left: pageMargin, top: 0 },
            styles: { fontSize: 7, cellPadding: 0.8, cellHeight: 4 },
            headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', cellHeight: 4.5 },
            didParseCell: (data) => {
                if (data.section === 'head' && data.column.index > 1) (data.cell.styles as any).halign = 'center';
                if (data.section === 'body' && data.column.index > 1) (data.cell.styles as any).halign = 'right';
                if (data.section === 'body' && data.column.index === 6) (data.cell.styles as any).halign = 'center';
                if (data.section === 'body') {
                    const day = weekDays[data.row.index];
                    const dayData = weekData.days[format(day, 'yyyy-MM-dd')];
                    const holiday = holidays.find(h => isSameDay(h.date, day));

                    if (holiday) {
                        (data.cell.styles as any).fillColor = holiday.type === 'Apertura' ? '#e8f5e9' : '#eeeeee';
                    } else if (dayData && dayData.absence !== 'ninguna') {
                        (data.cell.styles as any).fillColor = '#fff5f5';
                    }
                }
            },
            columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 13 }, 2: { cellWidth: 12 }, 3: { cellWidth: 16 }, 4: { cellWidth: 12 }, 5: { cellWidth: 12 }, 6: { cellWidth: 15 } }
        });

        // @ts-ignore
        currentY = Math.max(doc.lastAutoTable.finalY, balancesSectionEnd) + 8;
    }

    const safeEmployeeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`resumen-anual-${safeEmployeeName}-${year}.pdf`);
}

export async function generateAnnualDetailedReportPDF(employee: Employee, year: number, dataProvider: any) {
    if (!employee) throw new Error("Empleado no válido.");

    const { getProcessedAnnualDataForEmployee, calculateTheoreticalAnnualWorkHours, calculateCurrentAnnualComputedHours, absenceTypes } = dataProvider;
    
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const { annualData } = await getProcessedAnnualDataForEmployee(employee.id, year);
    const pageMargin = 15;

    const confirmedAnnualData = annualData.filter(record => record.data.confirmed);

    if (confirmedAnnualData.length === 0) {
        throw new Error("No hay datos confirmados para generar este informe.");
    }

    const { theoreticalHours, workHoursChangeDetails } = calculateTheoreticalAnnualWorkHours(employee.id, year);
    const totalComputedHours = calculateCurrentAnnualComputedHours(employee.id, year);

    let currentY = 25;
    doc.setFontSize(14).setFont('helvetica', 'bold');
    doc.text(`Informe de Jornada Anual - ${employee.name} (${year})`, pageMargin, 15);
    doc.setFontSize(11);

    if (workHoursChangeDetails && workHoursChangeDetails.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Ajustes a la Jornada Teórica:`, pageMargin, currentY);
        currentY += 5;
        doc.setFontSize(10);
        workHoursChangeDetails.forEach(detail => {
            const text = `· Cambio de jornada a ${detail.newWeeklyHours.toFixed(2)}h/sem (desde ${format(parseISO(detail.effectiveDate), 'dd/MM/yy', { locale: es })})`;
            doc.text(text, pageMargin + 5, currentY);
            doc.setFont('helvetica', 'bold');
            doc.text(`${detail.impact > 0 ? '+' : ''}${detail.impact.toFixed(2)}h`, doc.internal.pageSize.width - pageMargin, currentY, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            currentY += 5;
        });
        currentY += 2;
    }

    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text(`Jornada Teórica Anual (Ajustada):`, pageMargin, currentY);
    doc.text(`${theoreticalHours.toFixed(2)}h`, doc.internal.pageSize.width - pageMargin, currentY, { align: 'right' });
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Horas Computadas:`, pageMargin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalComputedHours.toFixed(2)}h`, doc.internal.pageSize.width - pageMargin, currentY, { align: 'right' });
    currentY += 7;

    const finalBalance = totalComputedHours - theoreticalHours;
    doc.setFont('helvetica', 'bold');
    doc.text(`Balance Anual:`, pageMargin, currentY);
    doc.setTextColor(finalBalance >= 0 ? '#107c10' : '#c41717');
    doc.text(`${finalBalance.toFixed(2)}h`, doc.internal.pageSize.width - pageMargin, currentY, { align: 'right' });
    doc.setTextColor('#000000');

    const bodyRows = confirmedAnnualData.map(weekRecord => {
        const weekData = weekRecord.data;
        const weekStartDate = parseISO(weekRecord.id);
        const weekLabel = `${format(weekStartDate, 'dd/MM', { locale: es })}`;
        let weeklyComputableHours = 0;
        const weekAbsences = new Set<string>();

        Object.keys(weekData.days).sort().forEach(dayKey => {
            const dayData = weekData.days[dayKey];
            const absenceType = absenceTypes.find((at: AbsenceType) => at.abbreviation === dayData.absence);
            let dailyComputable = 0;
            if (absenceType?.computesToAnnualHours) {
                dailyComputable = dayData.absenceHours || 0;
            } else if (!dayData.isHoliday && getISODay(parseISO(dayKey)) !== 7) {
                dailyComputable = dayData.workedHours || 0;
            }
            if (dayData.absence !== 'ninguna' && absenceType) {
                weekAbsences.add(absenceType.name);
            }
            weeklyComputableHours += dailyComputable;
        });
        if (weekData.totalComplementaryHours && weekData.totalComplementaryHours > 0) {
            weeklyComputableHours -= weekData.totalComplementaryHours;
        }

        const concept = Array.from(weekAbsences).join(', ') || 'Horas trabajadas';
        return [weekLabel, concept, weeklyComputableHours !== 0 ? weeklyComputableHours.toFixed(2) : ''];
    });

    autoTable(doc, {
        head: [['Semana', 'Concepto', 'Horas que Computan']],
        body: bodyRows,
        startY: currentY + 10,
        theme: 'striped',
        pageBreak: 'auto',
        margin: { left: pageMargin, right: pageMargin, top: 25 },
        didDrawPage: (data) => addHeaderFooter(doc, `Informe Jornada Anual - ${employee.name} (${year})`, data.pageNumber, doc.internal.getNumberOfPages()),
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 45, halign: 'right' } },
    });

    const safeEmployeeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`informe-jornada-anual-${safeEmployeeName}-${year}.pdf`);
}

export async function generateAbsenceReportPDF(employee: Employee, year: number, weeklyRecords: Record<string, WeeklyRecord>, absenceTypes: AbsenceType[]) {
    if (!employee) throw new Error("Empleado no válido.");

    const annualRecordsForAbsences = Object.values(weeklyRecords).filter(record => getISOWeekYear(parseISO(record.id)) === year);
    let totalSuspensionDays = 0;
    const absenceRecords: { date: string; type: AbsenceType | undefined; amount: number }[] = [];

    annualRecordsForAbsences.forEach(record => {
        const empWeekData = record.weekData[employee.id];
        if (empWeekData?.days) {
            Object.entries(empWeekData.days).forEach(([dateStr, dayData]) => {
                if (getISOWeekYear(parseISO(dateStr)) !== year) return;

                const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                if (absenceType && dayData.absence !== 'ninguna') {
                    if (absenceType.suspendsContract) totalSuspensionDays++;
                    
                    let amount = new Set(['V', 'AT', 'AP', 'B', 'B/C', 'EG', 'EXD', 'FF', 'PE']).has(absenceType.abbreviation) ? 1 : (dayData.absenceHours || 0);

                    if (amount > 0) {
                        absenceRecords.push({
                            date: format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es }),
                            type: absenceType,
                            amount: amount,
                        });
                    }
                }
            });
        }
    });

    if (absenceRecords.length === 0) {
        throw new Error(`No se encontraron ausencias para ${employee.name} en ${year}.`);
    }

    const doc = new jsPDF();
    doc.text(`Informe de Ausencias - ${employee.name}`, 14, 16);
    doc.setFontSize(10).text(`Periodo: ${year}`, 14, 22);

    const summary: Record<string, { totalDays: number; totalHours: number; limit: number | null; excess: number; suspends: boolean }> = {};
    
    absenceTypes.forEach(at => {
        summary[at.name] = { totalDays: 0, totalHours: 0, limit: at.annualHourLimit, excess: 0, suspends: at.suspendsContract };
    });
    if (summary['Asuntos Propios']) summary['Asuntos Propios'].limit = 1;
    if (summary['Vacaciones']) summary['Vacaciones'].limit = 31 - ((totalSuspensionDays / 30) * 2.5);

    const dayCountAbsences = new Set(['V', 'AT', 'AP', 'B', 'B/C', 'EG', 'EXD', 'FF', 'PE']);

    absenceRecords.forEach(rec => {
         if (rec.type) {
            if (dayCountAbsences.has(rec.type.abbreviation)) summary[rec.type.name].totalDays += rec.amount;
            else summary[rec.type.name].totalHours += rec.amount;
        }
    });

    Object.entries(summary).forEach(([name, s]) => {
        const isDayCount = dayCountAbsences.has(absenceTypes.find(at => at.name === name)?.abbreviation || '');
        const currentTotal = isDayCount ? s.totalDays : s.totalHours;
        if (typeof s.limit === 'number' && s.limit > 0) {
            if (currentTotal > s.limit) {
                s.excess = currentTotal - s.limit;
            }
        }
    });

    const summaryBody = Object.entries(summary)
        .filter(([, totals]) => totals.totalDays > 0 || totals.totalHours > 0)
        .map(([name, totals]) => {
            const isDayCount = dayCountAbsences.has(absenceTypes.find(at => at.name === name)?.abbreviation || '');
            const totalStr = isDayCount ? `${totals.totalDays} día(s)` : (totals.totalHours > 0 ? `${totals.totalHours.toFixed(2)}h` : '');
            let limitStr = '';
            let excessStr = '';
            if (typeof totals.limit === 'number' && totals.limit > 0) {
                limitStr = isDayCount ? `${totals.limit.toFixed(2)} días` : `${totals.limit}h`;
                if (totals.excess > 0) excessStr = isDayCount ? `${totals.excess.toFixed(2)} días` : `${totals.excess.toFixed(2)}h`;
            }
            return { name, total: totalStr, limit: limitStr, excess: excessStr };
        });
        
    doc.setFontSize(12).setFont('helvetica', 'bold');
    doc.text('Resumen por Tipo de Ausencia', 14, 30);
    
    autoTable(doc, {
        startY: 33,
        head: [['Tipo de Ausencia', 'Total', 'Límite Anual', 'Exceso']],
        body: summaryBody.map(s => [s.name, s.total, s.limit, s.excess]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    const safeEmployeeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`informe-ausencias-${safeEmployeeName}-${year}.pdf`);
}

export const generateQuadrantReportPDF = (
    year: number,
    weeksOfYear: any[],
    holidays: Holiday[],
    employeeGroups: EmployeeGroup[],
    allEmployeesForQuadrant: any[],
    employeesByWeek: Record<string, { employeeId: string; employeeName: string; absenceAbbreviation: string }[]>,
    weeklySummaries: Record<string, { employeeCount: number; hourImpact: number; }>,
    substitutesByWeek: Record<string, Record<string, { substituteId: string, substituteName: string }>> | undefined,
    getTheoreticalHoursAndTurn: (employeeId: string, date: Date) => { turnId: string | null },
    specialAbsenceAbbreviations: Set<string>,
) => {
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a3' });
    const pageMargin = 10;
    const headerHeight = 25;
    const weeksPerPage = 5;
    const safeSubstitutesByWeek = substitutesByWeek || {};

    const totalPages = Math.ceil(weeksOfYear.length / weeksPerPage);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) doc.addPage();
        
        const pageNum = pageIndex + 1;
        addHeaderFooter(doc, `Cuadrante Anual de Ausencias - ${year}`, pageNum, totalPages);

        const startWeekIndex = pageIndex * weeksPerPage;
        const endWeekIndex = Math.min(startWeekIndex + weeksPerPage, weeksOfYear.length);
        const weeksForPage = weeksOfYear.slice(startWeekIndex, endWeekIndex);

        const tableBody = employeeGroups.map(group => {
            const groupEmployees = allEmployeesForQuadrant.filter(e => e.groupId === group.id);
            const rowData: any[] = [{ content: '', styles: { fillColor: group.color } }]; 

            weeksForPage.forEach(week => {
                const employeesWithAbsenceInWeek = groupEmployees.map(emp => {
                    const absenceInWeek = employeesByWeek[week.key]?.find(e => e.employeeId === emp.id);
                    return absenceInWeek ? { employee: emp, absence: absenceInWeek } : null;
                }).filter(Boolean);

                const cellContent = employeesWithAbsenceInWeek.map(item => {
                    if (!item) return '';
                    const substitute = safeSubstitutesByWeek[week.key]?.[item.employee.id];
                    return { employee: item.employee, absence: item.absence, substitute };
                });
                
                rowData.push({ content: cellContent, styles: { fillColor: employeesWithAbsenceInWeek.length > 0 ? group.color : '#ffffff' } });
            });
            return rowData;
        });
        
        const groupColumnLabel = '';
        const tableHeader = [groupColumnLabel, ...weeksForPage.map(week => {
            const summary = weeklySummaries[week.key];
            const { turnId } = allEmployeesForQuadrant.length > 0 ? getTheoreticalHoursAndTurn(allEmployeesForQuadrant[0].id, week.start) : { turnId: null };
            return `Sem: ${getISOWeek(week.start)} | ${format(week.start, 'dd/MM', { locale: es })} - ${format(week.end, 'dd/MM', { locale: es })}\n` +
                   `Turno: ${turnId ? `T.${turnId.replace('turn', '')}` : 'N/A'}\n` +
                   `Nº Ausentes: ${summary?.employeeCount ?? 0} | Nºh: ${summary?.hourImpact.toFixed(0) ?? 0}`;
        })];


        const availableWidth = doc.internal.pageSize.width - (pageMargin * 2) - 0.0025;
        const weekColumnWidth = availableWidth / weeksForPage.length;

        const columnStyles = { 0: { cellWidth: 0.0025 } };
        for (let i = 0; i < weeksForPage.length; i++) {
            columnStyles[i + 1] = { cellWidth: weekColumnWidth };
        }

        autoTable(doc, {
            startY: headerHeight,
            head: [tableHeader],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, valign: 'top', lineColor: [0,0,0], lineWidth: 0.1 },
            headStyles: { halign: 'center', fontSize: 8, fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 20 },
            columnStyles: columnStyles,
            margin: { left: pageMargin, right: pageMargin },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index > 0) {
                    const cellContent: any = data.cell.raw;
                    let y = data.cell.y + data.cell.padding('top') + 1;
                    data.cell.text = []; // Limpiar el contenido original de la celda

                    if (Array.isArray(cellContent)) {
                        cellContent.forEach(item => {
                            const isSpecial = specialAbsenceAbbreviations.has(item.absence.absenceAbbreviation);
                            const employeeColor: [number, number, number] = isSpecial ? [0, 0, 255] : [0, 0, 0];
                            
                            doc.setTextColor(employeeColor[0], employeeColor[1], employeeColor[2]);
                            doc.text(`${item.employee.name} (${item.absence.absenceAbbreviation})`, data.cell.x + data.cell.padding('left'), y);
                            y += doc.getLineHeight() * 0.9;
                            
                            if (item.substitute) {
                                doc.setTextColor(255, 0, 0); // Rojo para sustituto
                                const substituteText = `${item.substitute.substituteName}`;
                                const textWidth = doc.getStringUnitWidth(substituteText) * doc.getFontSize() / doc.internal.scaleFactor;
                                const xPos = data.cell.x + data.cell.width - data.cell.padding('right') - textWidth;
                                doc.text(substituteText, xPos, y - doc.getLineHeight() * 0.9);
                            }
                        });
                    }
                }
            },
        });
    }
    
    doc.save(`cuadrante_anual_${year}.pdf`);
};


export const generateSignatureReportPDF = (
    year: number,
    allEmployeesForQuadrant: Employee[],
    employeesWithAbsences: Record<string, Ausencia[]>,
    absenceTypes: AbsenceType[],
) => {
    const doc = new jsPDF();
    const vacationType = absenceTypes.find((at: AbsenceType) => at.name === 'Vacaciones');
    if (!vacationType) {
        alert('No se encuentra el tipo de ausencia "Vacaciones".');
        return;
    }

    doc.setFontSize(16).setFont('helvetica', 'bold');
    doc.text(`Listado para Firmas de Vacaciones - ${year}`, 15, 20);

    let finalY = 25;

    allEmployeesForQuadrant.forEach((employee, index) => {
        const vacationAbsences = (employeesWithAbsences[employee.id] || [])
            .filter(a => a.absenceTypeId === vacationType.id)
            .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());

        const vacationPeriodsText = vacationAbsences.length > 0
            ? vacationAbsences.map(v => `del ${format(v.startDate, 'dd/MM/yyyy', { locale: es })} al ${format(v.endDate, 'dd/MM/yyyy', { locale: es })}`).join('\n')
            : 'No tiene vacaciones programadas.';
        
        const textLines = doc.splitTextToSize(vacationPeriodsText, 180);
        const blockHeight = Math.max(30, textLines.length * 5 + 15);
        
        if (finalY + blockHeight > doc.internal.pageSize.height - 20) {
            doc.addPage();
            finalY = 20;
        }

        autoTable(doc, {
            body: [
                [
                    { content: employee.name, styles: { fontStyle: 'bold' } },
                    { content: vacationPeriodsText, styles: { fontSize: 9 } },
                    { content: 'Firma:', styles: { halign: 'right', valign: 'bottom' } },
                ],
            ],
            startY: finalY,
            theme: 'grid',
            styles: { cellHeight: blockHeight, valign: 'top' },
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 30 } }
        });
        finalY = doc.lastAutoTable.finalY + 5;
    });

    doc.save(`firmas_vacaciones_${year}.pdf`);
};

export const generateRequestStatusReportPDF = (
    campaign: VacationCampaign,
    allEmployees: Employee[],
    conversations: Conversation[],
    absenceTypes: AbsenceType[],
) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageMargin = 15;

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold');
    doc.text(`Informe de Estado de Solicitudes`, pageMargin, 15);
    doc.setFontSize(12);
    doc.text(campaign.title, pageMargin, 22);

    const submissionStart = campaign.submissionStartDate instanceof Timestamp ? campaign.submissionStartDate.toDate() : campaign.submissionStartDate;

    const reportData = allEmployees.map(emp => {
        const conversation = conversations.find(c => c.employeeId === emp.id);
        const lastMessage = conversation?.lastMessageText || '';
        const lastMessageTimestamp = conversation?.lastMessageTimestamp;
        
        let status = 'PENDIENTE DE SOLICITUD';
        let details = '';

        if (lastMessageTimestamp && (lastMessageTimestamp as Timestamp).toDate() > submissionStart) {
            const requestRegex = /Confirmación de solicitud de (.*?) para los periodos: (.*)/s;
            const match = lastMessage.match(requestRegex);

            if (match) {
                status = 'Solicitud Realizada';
                const [, type, periods] = match;
                details = `${type} | ${periods}`;
            }
        }
        
        return {
            name: emp.name,
            status,
            details,
        };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const head = [['Empleado', 'Estado', 'Detalles de la Solicitud']];
    const body = reportData.map(d => [d.name, d.status, d.details]);

    autoTable(doc, {
        head: head,
        body: body,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                if (data.cell.raw === 'PENDIENTE DE SOLICITUD') {
                    doc.setTextColor(220, 53, 69); // Destructive color
                    doc.setFont(doc.getFont().fontName, 'bold');
                }
            }
        },
    });
    
    const safeTitle = campaign.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`informe_estado_${safeTitle}.pdf`);
};


    

    


