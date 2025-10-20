
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileDown, CalendarX2, Library, BookUser, AlertTriangle, FileSignature, ScanText, Loader2 as Loader2Icon } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, CartesianGrid, XAxis, BarChart as RechartsBarChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMonth, getYear, parseISO, format, isSameDay, isAfter, startOfDay, startOfWeek, endOfMonth, endOfWeek, parse, isWithinInterval, parseFromISO, subWeeks, getISODay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loader2 } from 'lucide-react';
import { HolidayReportGenerator } from '@/components/dashboard/holiday-report-generator';

const chartConfig = {
    balance: {
      label: "Balance",
      color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;


export default function DashboardPage() {
    const { employees, weeklyRecords, loading, absenceTypes, holidays, getProcessedAnnualDataForEmployee, getEmployeeFinalBalances, calculateTheoreticalAnnualWorkHours, getEmployeeBalancesForWeek, getWeekId, calculateCurrentAnnualComputedHours, getEffectiveWeeklyHours, getTheoreticalHoursAndTurn, getActivePeriod, processEmployeeWeekData, calculateBalancePreview, vacationData } = useDataProvider();
    
    // Default to a date from data if available, otherwise today
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [selectedYear, setSelectedYear] = useState(getYear(referenceDate));
    const [selectedMonth, setSelectedMonth] = useState(getMonth(referenceDate));
    const [selectedBalanceReportWeek, setSelectedBalanceReportWeek] = useState(getWeekId(subWeeks(new Date(), 1)));
    const [complementaryHoursReportWeek, setComplementaryHoursReportWeek] = useState(getWeekId(subWeeks(new Date(), 1)));


    // For annual report
    const [reportEmployeeId, setReportEmployeeId] = useState('');
    const [reportYear, setReportYear] = useState(2025);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // For detailed annual report
    const [detailedReportEmployeeId, setDetailedReportEmployeeId] = useState('');
    const [detailedReportYear, setDetailedReportYear] = useState(2025);
    const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
    
    // For absence report
    const [absenceReportEmployeeId, setAbsenceReportEmployeeId] = useState('');
    const [absenceReportYear, setAbsenceReportYear] = useState(2025);
    const [isGeneratingAbsenceReport, setIsGeneratingAbsenceReport] = useState(false);
    
    // For signature report
    const [signatureReportYear, setSignatureReportYear] = useState(2025);
    const [isGeneratingSignatureReport, setIsGeneratingSignatureReport] = useState(false);

    const [isGeneratingBalanceReport, setIsGeneratingBalanceReport] = useState(false);


    
    const activeEmployeesForReport = useMemo(() => {
        return employees.filter(e => e.employmentPeriods?.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), startOfDay(new Date()))));
    }, [employees]);

    useEffect(() => {
        if (!loading && Object.keys(weeklyRecords).length > 0) {
            const firstRecordId = Object.keys(weeklyRecords).sort()[0];
            const firstDayOfWeek = Object.keys(weeklyRecords[firstRecordId].weekData[Object.keys(weeklyRecords[firstRecordId].weekData)[0]]?.days || {})[0];
            if (firstDayOfWeek) {
                 const initialDate = new Date();
                 setReferenceDate(initialDate);
                 setSelectedYear(getYear(initialDate));
                 setSelectedMonth(getMonth(initialDate));
            }
        }
         if (activeEmployeesForReport.length > 0) {
            if (!reportEmployeeId) setReportEmployeeId(activeEmployeesForReport[0].id);
            if (!detailedReportEmployeeId) setDetailedReportEmployeeId(activeEmployeesForReport[0].id);
            if (!absenceReportEmployeeId) setAbsenceReportEmployeeId(activeEmployeesForReport[0].id);
        }
    }, [loading, weeklyRecords, activeEmployeesForReport, reportEmployeeId, detailedReportEmployeeId, absenceReportEmployeeId]);

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: format(new Date(selectedYear, i), 'MMMM', { locale: es }),
    }));
    
    const availableYears = useMemo(() => {
        if (!weeklyRecords) return [new Date().getFullYear()];
        const years = new Set(Object.keys(weeklyRecords).map(id => parseInt(id.split('-')[0])));
        const currentYear = new Date().getFullYear();
        if (!years.has(currentYear)) {
            years.add(currentYear);
        }
        // Add next year for future reports
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords]);
    
    const availableWeeks = useMemo(() => {
        if (!weeklyRecords) return [];
        return Object.keys(weeklyRecords)
            .sort((a, b) => b.localeCompare(a)) // Sort weeks descending
            .map(weekId => {
                const weekStartDate = parseISO(weekId);
                const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
                
                const startDay = format(weekStartDate, 'd MMM', { locale: es });
                const endDay = format(weekEndDate, 'd MMM, yyyy', { locale: es });

                return { value: weekId, label: `${startDay} - ${endDay}`};
            });
    }, [weeklyRecords]);


    const annualRecordsForAbsences = useMemo(() => {
        return Object.values(weeklyRecords).filter(record => {
            const yearFromId = parseInt(record.id.split('-')[0], 10);
            return yearFromId === absenceReportYear;
        });
    }, [weeklyRecords, absenceReportYear]);

    const complementaryHoursRecord = useMemo(() => {
        if (loading || !complementaryHoursReportWeek) return null;
        return weeklyRecords[complementaryHoursReportWeek];
      }, [weeklyRecords, complementaryHoursReportWeek, loading]);

    const complementaryHours = useMemo(() => {
        if (!complementaryHoursRecord) return 0;
        return Object.values(complementaryHoursRecord.weekData).reduce((empAcc, empData) => empAcc + (empData.totalComplementaryHours || 0), 0);
    }, [complementaryHoursRecord]);


    if (loading) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.employmentPeriods?.some(p => !p.endDate)).length;
    

    const chartData = employees.map(emp => ({
        name: emp.name,
        balance: getEmployeeFinalBalances(emp.id).total,
      })).sort((a, b) => b.balance - a.balance).slice(0, 10);
    
    const handleGenerateReport = () => {
        if (!complementaryHoursRecord) {
            alert("No hay datos de horas complementarias para la semana seleccionada.");
            return;
        }

        const reportData = employees.map(emp => {
            const empWeekData = complementaryHoursRecord.weekData[emp.id];
            const empComplementaryHours = empWeekData?.totalComplementaryHours || 0;

            if (empComplementaryHours > 0) {
                return { name: emp.name, hours: empComplementaryHours };
            }
            return null;
        }).filter((item): item is { name: string; hours: number } => item !== null);

        if (reportData.length === 0) {
            alert("No hay horas complementarias para generar un informe en la semana seleccionada.");
            return;
        }

        const doc = new jsPDF();
        const weekStartDate = parseISO(complementaryHoursReportWeek);
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
        const weekLabel = `${format(weekStartDate, 'd MMM')} - ${format(weekEndDate, 'd MMM yyyy', { locale: es })}`;
        
        doc.text(`Informe de Horas Complementarias - Semana del ${weekLabel}`, 14, 16);

        autoTable(doc, {
            startY: 22,
            head: [['Empleado', 'Horas Complementarias']],
            body: reportData.map(item => [item.name, item.hours.toFixed(2) + 'h']),
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });
        
        const safeWeekId = complementaryHoursReportWeek.replace(/-/g, '');
        doc.save(`informe-complementarias-${safeWeekId}.pdf`);
    };
    
    const parseDateFromString = (dateString: string) => {
        return parse(dateString, 'dd/MM/yyyy', new Date());
    };

    const handleGenerateAbsenceReport = async () => {
        setIsGeneratingAbsenceReport(true);
        const employee = employees.find(e => e.id === absenceReportEmployeeId);
        const yearName = String(absenceReportYear);
    
        if (!employee) {
            alert("Selecciona un empleado válido.");
            setIsGeneratingAbsenceReport(false);
            return;
        }
    
        let totalSuspensionDays = 0;
        const absenceRecords: { date: string; type: ReturnType<typeof absenceTypes.find>; amount: number }[] = [];
    
        annualRecordsForAbsences.forEach(record => {
            const empWeekData = record.weekData[employee.id];
            if (empWeekData?.days) {
                Object.entries(empWeekData.days).forEach(([dateStr, dayData]) => {
                    if (getYear(parseISO(dateStr)) !== absenceReportYear) return;
    
                    const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                    if (absenceType && dayData.absence !== 'ninguna') {
                        if (absenceType.suspendsContract) {
                            totalSuspensionDays++;
                        }
                        
                        let amount = 0;
                        const dayCountAbsences = new Set(['V', 'AT', 'AP', 'B', 'B/C', 'EG', 'EXD', 'FF', 'PE']);
                        
                        if (dayCountAbsences.has(absenceType.abbreviation)) {
                             amount = 1;
                        } else {
                            amount = dayData.absenceHours || 0;
                        }
    
                        if (amount > 0) {
                            absenceRecords.push({
                                date: format(parseISO(dateStr), 'dd/MM/yyyy'),
                                type: absenceType,
                                amount: amount,
                            });
                        }
                    }
                });
            }
        });
    
        if (absenceRecords.length === 0) {
            alert(`No se encontraron ausencias para ${employee.name} en ${yearName}.`);
            setIsGeneratingAbsenceReport(false);
            return;
        }
    
        const doc = new jsPDF();
        doc.text(`Informe de Ausencias - ${employee.name}`, 14, 16);
        doc.setFontSize(10);
        doc.text(`Periodo: ${yearName}`, 14, 22);
    
        const summary: Record<string, { totalDays: number; totalHours: number; limit: number | null; excess: number; suspends: boolean }> = {};
        
        absenceTypes.forEach(at => {
            summary[at.name] = { 
                totalDays: 0, 
                totalHours: 0, 
                limit: at.annualHourLimit, 
                excess: 0, 
                suspends: at.suspendsContract 
            };
        });
        
        if (summary['Asuntos Propios']) {
            summary['Asuntos Propios'].limit = 1;
        }
        
        const vacationDeduction = (totalSuspensionDays / 30) * 2.5;
        const vacationLimit = 31 - vacationDeduction;
        if (summary['Vacaciones']) {
            summary['Vacaciones'].limit = vacationLimit;
        }

        const dayCountAbsences = new Set(['V', 'AT', 'AP', 'B', 'B/C', 'EG', 'EXD', 'FF', 'PE']);

        absenceRecords.forEach(rec => {
             if (rec.type) {
                if (dayCountAbsences.has(rec.type.abbreviation)) {
                    summary[rec.type.name].totalDays += rec.amount;
                } else {
                    summary[rec.type.name].totalHours += rec.amount;
                }
            }
        });
    
    
        Object.entries(summary).forEach(([name, s]) => {
            const currentTotal = dayCountAbsences.has(absenceTypes.find(at => at.name === name)?.abbreviation || '') ? s.totalDays : s.totalHours;
            if (typeof s.limit === 'number' && currentTotal > s.limit) {
                s.excess = currentTotal - s.limit;
            }
        });
    
        const summaryBody = Object.entries(summary)
            .filter(([, totals]) => totals.totalDays > 0 || totals.totalHours > 0)
            .map(([name, totals]) => {
                let limitStr = '';
                let excessStr = '';
                let totalStr = '';
                
                const isDayCount = dayCountAbsences.has(absenceTypes.find(at => at.name === name)?.abbreviation || '');
                
                if (isDayCount) {
                    totalStr = `${totals.totalDays} día(s)`;
                } else {
                    totalStr = totals.totalHours > 0 ? `${totals.totalHours.toFixed(2)}h` : '';
                }

                if (typeof totals.limit === 'number' && totals.limit > 0) {
                    limitStr = isDayCount ? `${totals.limit.toFixed(2)} días` : `${totals.limit}h`;
                    if (totals.excess > 0) {
                        excessStr = isDayCount ? `${totals.excess.toFixed(2)} días` : `${totals.excess.toFixed(2)}h`;
                    }
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
        doc.save(`informe-ausencias-${safeEmployeeName}-${yearName}.pdf`);
    
        setIsGeneratingAbsenceReport(false);
    };


    const generateAnnualReport = async () => {
        setIsGenerating(true);
        const employee = employees.find(e => e.id === reportEmployeeId);
        if (!employee) {
            alert("Selecciona un empleado válido.");
            setIsGenerating(false);
            return;
        }
    
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
        const yearStart = new Date(reportYear, 0, 1);
        const yearEnd = new Date(reportYear, 11, 31);
        let weekIdsInYear: string[] = [];
        let currentDate = yearStart;
        while (currentDate <= yearEnd) {
            weekIdsInYear.push(getWeekId(currentDate));
            currentDate = addDays(currentDate, 7);
        }
        weekIdsInYear = [...new Set(weekIdsInYear)].sort();
        
        const confirmedWeekIds = weekIdsInYear.filter(weekId => weeklyRecords[weekId]?.weekData?.[employee.id]?.confirmed);

        if (confirmedWeekIds.length === 0) {
            alert("No hay semanas confirmadas para generar este informe.");
            setIsGenerating(false);
            return;
        }
        
        const pageMargin = 10;
        let pageNumber = 1;
        let currentY = pageMargin;

        const addHeader = (pageNumber: number) => {
            doc.setFontSize(14).setFont('helvetica', 'bold');
            doc.text(`${employee.name} - Resumen Anual ${reportYear}`, pageMargin, currentY);
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(`Página ${pageNumber}`, doc.internal.pageSize.width - pageMargin, currentY, { align: 'right' });
            currentY += 8;
        };
    
        addHeader(pageNumber);
    
        for (let i = 0; i < confirmedWeekIds.length; i++) {
            const weekId = confirmedWeekIds[i];
    
            if (i > 0 && i % 5 === 0) {
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
                const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                
                if (getISODay(dayDate) !== 7) { // Exclude Sundays
                    totalWeeklyComputableHours += dayData.workedHours;
                    if (absenceType && absenceType.computesToWeeklyHours) {
                        totalWeeklyComputableHours += dayData.absenceHours;
                    }
                }
            }
            totalWeeklyComputableHours -= (weekData.totalComplementaryHours || 0);

            const weekLabel = `Semana del ${format(weekDays[0], 'd MMM')} - ${format(weekDays[6], 'd MMM yyyy')} (Computadas: ${totalWeeklyComputableHours.toFixed(2)}h / Teóricas: ${effectiveWeeklyHours.toFixed(2)}h)`;
    
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
                    format(day, 'dd/MM/yy'),
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
                    if (data.section === 'head' && data.column.index > 1) data.cell.styles.halign = 'center';
                    if (data.section === 'body' && data.column.index > 1) data.cell.styles.halign = 'right';
                    if (data.section === 'body' && data.column.index === 6) data.cell.styles.halign = 'center';
                    if (data.section === 'body') {
                        const day = weekDays[data.row.index];
                        const dayData = weekData.days[format(day, 'yyyy-MM-dd')];
                        const holiday = holidays.find(h => isSameDay(h.date, day));

                        if (holiday) {
                            data.cell.styles.fillColor = holiday.type === 'Apertura' ? '#e8f5e9' : '#eeeeee';
                        } else if (dayData && dayData.absence !== 'ninguna') {
                            data.cell.styles.fillColor = '#fff5f5';
                        }
                    }
                },
                columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 13 }, 2: { cellWidth: 12 }, 3: { cellWidth: 16 }, 4: { cellWidth: 12 }, 5: { cellWidth: 12 }, 6: { cellWidth: 15 } }
            });
    
            // @ts-ignore
            currentY = Math.max(doc.lastAutoTable.finalY, balancesSectionEnd) + 8;
        }
    
        const safeEmployeeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        doc.save(`resumen-anual-${safeEmployeeName}-${reportYear}.pdf`);
        setIsGenerating(false);
    };

    const handleGenerateBalanceReport = () => {
        if (!selectedBalanceReportWeek) {
            alert("Por favor, selecciona una semana.");
            return;
        }
        setIsGeneratingBalanceReport(true);
    
        const weekDate = parseISO(selectedBalanceReportWeek);
        const nextWeekDate = addDays(weekDate, 7);
        const nextWeekId = getWeekId(nextWeekDate);

        const activeEmps = employees.filter(emp => emp.employmentPeriods?.some(p => {
            const startDate = parseISO(p.startDate as string);
            const endDate = p.endDate ? parseISO(p.endDate as string) : new Date('9999-12-31');
            return isWithinInterval(weekDate, { start: startDate, end: endDate });
        }));
    
        if (activeEmps.length === 0) {
            alert("No hay empleados activos para la semana seleccionada.");
            setIsGeneratingBalanceReport(false);
            return;
        }
    
        const reportData = activeEmps.map(emp => {
            const balances = getEmployeeBalancesForWeek(emp.id, nextWeekId);
            return {
                name: emp.name,
                ordinary: balances.ordinary.toFixed(2),
                holiday: balances.holiday.toFixed(2),
                leave: balances.leave.toFixed(2),
                total: (balances.ordinary + balances.holiday + balances.leave).toFixed(2),
            };
        });
    
        const doc = new jsPDF();
        const weekDateParsed = parseISO(selectedBalanceReportWeek);
        const weekLabel = `${format(weekDateParsed, 'd MMM')} - ${format(endOfWeek(weekDateParsed, { weekStartsOn: 1 }), 'd MMM, yyyy')}`;
        const pageMargin = 14;
        const addHeader = () => {
             doc.setFontSize(16).setFont('helvetica', 'bold');
             doc.text(`Informe de Balances (Final Semana ${weekLabel})`, pageMargin, 20);
        };
        const addFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10).setFont('helvetica', 'normal');
                const text = `Página ${i} de ${pageCount}`;
                const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
                doc.text(text, doc.internal.pageSize.getWidth() - pageMargin - textWidth, doc.internal.pageSize.getHeight() - 10);
            }
        };

        autoTable(doc, {
            head: [['Empleado', 'B. Ordinaria', 'B. Festivos', 'B. Libranza', 'Balance Total']],
            body: reportData.map(d => [d.name, `${d.ordinary}h`, `${d.holiday}h`, `${d.leave}h`, `${d.total}h`]),
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            didDrawPage: (data) => {
                // Add header to each page
                addHeader();
            },
            margin: { top: 30 },
        });

        addFooter();

        const safeWeekId = selectedBalanceReportWeek.replace(/-/g, '');
        doc.save(`informe-balances-${safeWeekId}.pdf`);

        setIsGeneratingBalanceReport(false);
    };

    const generateAnnualDetailedReport = async () => {
        setIsGeneratingDetailed(true);
        const employee = employees.find(e => e.id === detailedReportEmployeeId);
        if (!employee) {
            alert("Selecciona un empleado válido.");
            setIsGeneratingDetailed(false);
            return;
        }
    
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const { annualData } = await getProcessedAnnualDataForEmployee(employee.id, detailedReportYear);
        const pageMargin = 15;
    
        const addHeaderFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
            doc.setFontSize(14).setFont('helvetica', 'bold');
            doc.text(`Informe de Jornada Anual - ${employee.name} (${detailedReportYear})`, pageMargin, 15);
            const pageText = `Página ${pageNumber} de ${totalPages}`;
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(pageText, doc.internal.pageSize.width - pageMargin, doc.internal.pageSize.height - 10, { align: 'right' });
        };
        
        const confirmedAnnualData = annualData.filter(record => record.data.confirmed);
    
        if (confirmedAnnualData.length === 0) {
            alert("No hay datos confirmados para generar este informe.");
            setIsGeneratingDetailed(false);
            return;
        }
    
        const { theoreticalHours, baseTheoreticalHours, suspensionDetails, workHoursChangeDetails } = calculateTheoreticalAnnualWorkHours(employee.id, detailedReportYear);
        const totalComputedHours = calculateCurrentAnnualComputedHours(employee.id, detailedReportYear);

        const firstActivePeriodThisYear = employee.employmentPeriods
            .filter(p => getYear(parseISO(p.startDate as string)) <= detailedReportYear && (!p.endDate || getYear(parseISO(p.endDate as string)) >= detailedReportYear))
            .sort((a, b) => (parseISO(a.startDate as string)).getTime() - (parseISO(b.startDate as string)).getTime())[0];
            
        const firstActiveDateThisYear = firstActivePeriodThisYear ? new Date(Math.max(parseISO(firstActivePeriodThisYear.startDate as string).getTime(), new Date(detailedReportYear, 0, 1).getTime())) : new Date(detailedReportYear, 0, 1);

        const baseWeeklyHoursForTitle = getEffectiveWeeklyHours(firstActivePeriodThisYear, firstActiveDateThisYear);
    
        let currentY = 25;
        doc.setFontSize(11);
    
        const hasSuspensions = suspensionDetails && suspensionDetails.length > 0;
        const hasWorkHoursChanges = workHoursChangeDetails && workHoursChangeDetails.length > 0;
    
        if (hasSuspensions || hasWorkHoursChanges) {
            doc.setFont('helvetica', 'bold');
            doc.text(`Ajustes a la Jornada Teórica:`, pageMargin, currentY);
            currentY += 5;
            doc.setFontSize(10);
            
            if (hasWorkHoursChanges) {
                workHoursChangeDetails.forEach(detail => {
                    const text = `· Cambio de jornada a ${detail.newWeeklyHours.toFixed(2)}h/sem (desde ${format(parseISO(detail.effectiveDate), 'dd/MM/yy')})`;
                    doc.text(text, pageMargin + 5, currentY);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${detail.impact > 0 ? '+' : ''}${detail.impact.toFixed(2)}h`, doc.internal.pageSize.width - pageMargin, currentY, { align: 'right' });
                    doc.setFont('helvetica', 'normal');
                    currentY += 5;
                });
            }
            if (hasSuspensions) {
                suspensionDetails.forEach(detail => {
                    const text = `· Suspensión (${detail.reason}): ${format(parseISO(detail.startDate), 'dd/MM/yy')} - ${format(parseISO(detail.endDate), 'dd/MM/yy')}`;
                    doc.text(text, pageMargin + 5, currentY);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${detail.hoursDeducted.toFixed(2)}h`, doc.internal.pageSize.width - pageMargin, currentY, { align: 'right' });
                    doc.setFont('helvetica', 'normal');
                    currentY += 5;
                });
            }
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
            const weekLabel = `${format(weekStartDate, 'dd/MM')}`;
            let weeklyComputableHours = 0;
            const weekAbsences = new Set<string>();
    
            Object.keys(weekData.days).sort().forEach(dayKey => {
                const dayData = weekData.days[dayKey];
                const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
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
            didDrawPage: (data) => addHeaderFooter(doc, data.pageNumber, doc.internal.getNumberOfPages()),
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 45, halign: 'right' } },
        });
    
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            addHeaderFooter(doc, i, pageCount);
        }
    
        const safeEmployeeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        doc.save(`informe-jornada-anual-${safeEmployeeName}-${detailedReportYear}.pdf`);
        setIsGeneratingDetailed(false);
    };

    return (
        <div className="flex flex-col gap-6">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
            <h1 className="text-2xl font-bold tracking-tight font-headline">
              Panel de Control
            </h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Informe Resumen Anual</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={reportEmployeeId} onValueChange={setReportEmployeeId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar empleado..." />
                            </SelectTrigger>
                            <SelectContent>
                                {activeEmployeesForReport.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={String(reportYear)} onValueChange={v => setReportYear(Number(v))}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={generateAnnualReport} disabled={isGenerating || !reportEmployeeId} className="w-full">
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isGenerating ? 'Generando...' : 'Generar Resumen'}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Informe Jornada Anual</CardTitle>
                    <BookUser className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={detailedReportEmployeeId} onValueChange={setDetailedReportEmployeeId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar empleado..." />
                            </SelectTrigger>
                            <SelectContent>
                                {activeEmployeesForReport.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={String(detailedReportYear)} onValueChange={v => setDetailedReportYear(Number(v))}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={generateAnnualDetailedReport} disabled={isGeneratingDetailed || !detailedReportEmployeeId} className="w-full">
                            {isGeneratingDetailed ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isGeneratingDetailed ? 'Generando...' : 'Generar Informe'}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    Informe Ausencias por Empleado
                    </CardTitle>
                    <CalendarX2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select value={absenceReportEmployeeId} onValueChange={setAbsenceReportEmployeeId}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar empleado..." />
                        </SelectTrigger>
                        <SelectContent>
                            {activeEmployeesForReport.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(absenceReportYear)} onValueChange={v => setAbsenceReportYear(Number(v))}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar año..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleGenerateAbsenceReport} disabled={isGeneratingAbsenceReport || !absenceReportEmployeeId} className="w-full">
                        {isGeneratingAbsenceReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        {isGeneratingAbsenceReport ? 'Generando...' : 'Generar Resumen'}
                    </Button>
                </CardContent>
                </Card>
                <HolidayReportGenerator />
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Horas Complementarias</CardTitle>
                        <CardDescription>
                            Total semana: <span className="font-bold text-primary">+{complementaryHours.toFixed(2)}h</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={complementaryHoursReportWeek} onValueChange={setComplementaryHoursReportWeek}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar semana..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableWeeks.map(w => (
                                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateReport} className="w-full">
                            <FileDown className="mr-2 h-4 w-4" />
                            Generar Informe
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Informe Semanal Horas</CardTitle>
                    <Library className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={selectedBalanceReportWeek} onValueChange={setSelectedBalanceReportWeek}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar semana..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableWeeks.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateBalanceReport} disabled={isGeneratingBalanceReport || !selectedBalanceReportWeek} className="w-full">
                            {isGeneratingBalanceReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isGeneratingBalanceReport ? 'Generando...' : 'Generar Informe'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

           <div className="px-4 md:px-6 pb-4">
            <Card>
                <CardHeader>
                <CardTitle>Top 10 Empleados por Balance de Horas</CardTitle>
                <CardDescription>Los 10 empleados con el mayor balance de horas acumulado.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <RechartsBarChart data={chartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <ChartTooltip 
                                cursor={false}
                                content={<ChartTooltipContent 
                                    formatter={(value) => `${Number(value).toFixed(2)}h`}
                                    indicator="dot"
                                />} 
                            />
                            <Bar dataKey="balance" fill="var(--color-balance)" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
           </div>
        </div>
      );
}

    