

'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataProvider } from '@/hooks/use-data-provider';
import { addWeeks, endOfWeek, format, getISOWeek, getYear, startOfYear, eachDayOfInterval, parseISO, startOfWeek, isBefore, isAfter, getISODay, endOfDay, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Users, Clock, FileDown, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import type { EmployeeGroup } from '@/lib/types';


export function AnnualVacationQuadrant() {
    const { employees, employeeGroups, loading, absenceTypes, weeklyRecords, holidayEmployees, getEffectiveWeeklyHours, holidays } = useDataProvider();
    const { toast } = useToast();
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const vacationType = useMemo(() => absenceTypes.find(at => at.name === 'Vacaciones'), [absenceTypes]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        if (weeklyRecords) {
            Object.keys(weeklyRecords).forEach(id => years.add(parseInt(id.split('-')[0], 10)));
        }
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        years.add(currentYear + 1);
        years.add(currentYear - 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords]);
    
    const groupColors = ['#dbeafe', '#dcfce7', '#fef9c3', '#f3e8ff', '#fce7f3', '#e0e7ff', '#ccfbf1', '#ffedd5'];

    const allEmployees = useMemo(() => {
        if (loading) return [];
        
        const mainEmployees = employees
          .filter(e => e.employmentPeriods.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())))
          .map(e => {
            const activePeriod = e.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date()));
            const weeklyHours = getEffectiveWeeklyHours(activePeriod || null, new Date());
            return {
                ...e, 
                isExternal: false,
                workShift: `${weeklyHours.toFixed(2)}h`
            };
        });
        
        const mainEmployeeNames = new Set(mainEmployees.map(me => me.name.trim().toLowerCase()));

        const externalEmployees = holidayEmployees
            .filter(he => he.active && !mainEmployeeNames.has(he.name.trim().toLowerCase()))
            .map(e => ({
                id: e.id,
                name: e.name,
                groupId: e.groupId,
                isExternal: true,
                workShift: e.workShift,
                employmentPeriods: [],
            }));

        const allEmps = [...mainEmployees, ...externalEmployees].filter(e => {
            if (e.isExternal) return true;
            const holidayEmp = holidayEmployees.find(he => he.id === e.id);
            return holidayEmp ? holidayEmp.active : true;
        });

        return allEmps.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, holidayEmployees, loading, getEffectiveWeeklyHours, employeeGroups]);


    const weeksOfYear = useMemo(() => {
        const year = selectedYear;
        const firstDayOfYear = new Date(year, 0, 1);
        let firstMonday = startOfWeek(firstDayOfYear, { weekStartsOn: 1 });
    
        if (getYear(firstMonday) < year) {
            firstMonday = addWeeks(firstMonday, 1);
        }

        const weeks = [];
        let currentWeekStart = firstMonday;

        for (let i = 0; i < 53; i++) {
            const weekStart = addWeeks(firstMonday, i);
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

            if (getYear(weekStart) === year || getYear(weekEnd) === year) {
                 weeks.push({
                    start: weekStart,
                    end: weekEnd,
                    number: getISOWeek(weekStart),
                    year: getYear(weekStart),
                    key: `${getYear(weekStart)}-W${String(getISOWeek(weekStart)).padStart(2, '0')}`
                });
            } else if (getYear(weekStart) > year) {
                break;
            }
        }
        return weeks;
    }, [selectedYear]);

    const vacationData = useMemo(() => {
        if (loading || !vacationType) return { weeklySummaries: {}, employeesByWeek: {} };

        const weeklySummaries: Record<string, { employeeCount: number; hourImpact: number }> = {};
        const employeesByWeek: Record<string, { employeeId: string; employeeName: string; groupId?: string | null; }[]> = {};

        weeksOfYear.forEach(week => {
            weeklySummaries[week.key] = { employeeCount: 0, hourImpact: 0 };
            employeesByWeek[week.key] = [];
        });

        allEmployees.forEach(emp => {
            const vacationDays = new Set<string>();

            if (!emp.isExternal) {
                 emp.employmentPeriods.flatMap(p => p.scheduledAbsences ?? [])
                .filter(a => a.absenceTypeId === vacationType.id)
                .forEach(absence => {
                    if (!absence.endDate) return;
                    const absenceStart = parseISO(absence.startDate as string);
                    const absenceEnd = parseISO(absence.endDate as string);
                    const daysInAbsence = eachDayOfInterval({ start: absenceStart, end: absenceEnd });
                    daysInAbsence.forEach(day => {
                        if (getYear(day) === selectedYear) vacationDays.add(format(day, 'yyyy-MM-dd'));
                    });
                });
                Object.values(weeklyRecords).forEach(record => {
                    const empWeekData = record.weekData[emp.id];
                    if (!empWeekData?.days) return;
                    Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                        if (dayData.absence === vacationType.abbreviation && getYear(new Date(dayStr)) === selectedYear) {
                            vacationDays.add(dayStr);
                        }
                    });
                });
            }

            if (vacationDays.size > 0) {
                weeksOfYear.forEach(week => {
                    const hasVacationThisWeek = Array.from(vacationDays).some(dayStr => {
                        const day = parseISO(dayStr);
                        return day >= week.start && day <= week.end;
                    });
                    
                    if (hasVacationThisWeek) {
                        weeklySummaries[week.key].employeeCount++;
                        
                        let weeklyHours = 0;
                        if(emp.isExternal) {
                            const match = emp.workShift?.match(/(\d+(\.\d+)?)/);
                            if(match) weeklyHours = parseFloat(match[0]);
                        } else {
                            const activePeriod = emp.employmentPeriods.find(p => {
                                const periodStart = parseISO(p.startDate as string);
                                const periodEnd = p.endDate ? parseISO(p.endDate as string) : new Date('9999-12-31');
                                return isAfter(periodEnd, week.start) && isBefore(periodStart, week.end);
                            });
                             weeklyHours = getEffectiveWeeklyHours(activePeriod || null, week.start);
                        }
                        weeklySummaries[week.key].hourImpact += weeklyHours;
                        employeesByWeek[week.key].push({ employeeId: emp.id, employeeName: emp.name, groupId: emp.groupId });
                    }
                });
            }
        });

        return { weeklySummaries, employeesByWeek };

    }, [loading, allEmployees, vacationType, weeksOfYear, weeklyRecords, selectedYear, getEffectiveWeeklyHours]);

    const groupedEmployeesByWeek = useMemo(() => {
        const result: Record<string, { all: string[], byGroup: Record<string, string[]> }> = {};
        
        for (const weekKey in vacationData.employeesByWeek) {
            result[weekKey] = { all: [], byGroup: {} };
            const weekEmployees = vacationData.employeesByWeek[weekKey];
            
            weekEmployees.forEach(emp => {
                const groupId = emp.groupId;
                 result[weekKey].all.push(emp.employeeName);
                if (groupId) {
                    if (!result[weekKey].byGroup[groupId]) {
                        result[weekKey].byGroup[groupId] = [];
                    }
                    result[weekKey].byGroup[groupId].push(emp.employeeName);
                }
            });
        }
        return result;
    }, [vacationData.employeesByWeek]);
    
    const sortedGroups = useMemo(() => {
        return [...employeeGroups].sort((a,b) => a.order - b.order);
    }, [employeeGroups]);

    
     const handleGeneratePdf = () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a3' });
            const pageMargin = 10;
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
    
            const headerHeight = 25;
            const rowHeight = 12; // Increased row height
            const fontSize = 10; // Increased font size
            
            const colsPerPage = 5; 
            const totalWeekCols = weeksOfYear.length;
            const totalPages = Math.ceil(totalWeekCols / colsPerPage);

            const allGroupRows = sortedGroups.map(group => ({
                id: group.id,
                name: group.name,
                isGroup: true,
            }));
    
            for (let page = 0; page < totalPages; page++) {
                if (page > 0) doc.addPage('a3', 'l');
                let initialY = pageMargin + headerHeight;
    
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(`Cuadrante Anual de Vacaciones - ${selectedYear}`, pageMargin, pageMargin + 10);
    
                const startCol = page * colsPerPage;
                const endCol = Math.min(startCol + colsPerPage, totalWeekCols);
                
                // Hide Group column in PDF
                const groupColWidth = 0;
                const employeeColWidth = 0;
                
                const contentWidth = pageWidth - (pageMargin * 2) - groupColWidth - employeeColWidth;
                const colWidth = contentWidth / (endCol - startCol);
    
                // Draw headers
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                
                let currentX = pageMargin;
                 if (groupColWidth > 0) {
                    doc.rect(currentX, initialY - headerHeight + 5, groupColWidth, headerHeight - 5, 'F');
                    doc.text('Grupo', currentX + 5, initialY - headerHeight + 15);
                    currentX += groupColWidth;
                }

                for (let i = startCol; i < endCol; i++) {
                    const week = weeksOfYear[i];
                    const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                    const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                    
                    doc.setFillColor(hasHoliday ? '#e0f2fe' : '#f8fafc');
                    doc.rect(currentX, initialY - headerHeight + 5, colWidth, headerHeight - 5, 'F');
                    
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Sem. ${week.number}`, currentX + colWidth / 2, initialY - headerHeight + 9, { align: 'center' });
                    
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`${format(week.start, 'dd/MM')} - ${format(week.end, 'dd/MM')}`, currentX + colWidth / 2, initialY - headerHeight + 13, { align: 'center' });

                    const summary = vacationData.weeklySummaries[week.key];
                    if (summary) {
                        doc.setFontSize(8);
                        doc.text(`${summary.employeeCount}E / ${summary.hourImpact.toFixed(0)}h`, currentX + colWidth / 2, initialY - headerHeight + 17, { align: 'center' });
                    }
                    currentX += colWidth;
                }
                
                // Draw Body
                let currentY = initialY;
                allGroupRows.forEach(groupRow => {
                    doc.setFontSize(fontSize);
                    doc.setFont('helvetica', 'bold');
                    doc.rect(pageMargin, currentY, contentWidth, rowHeight);
                    doc.text(groupRow.name, pageMargin + 2, currentY + rowHeight / 2, { baseline: 'middle' });
                    
                    let cellX = pageMargin + groupColWidth + employeeColWidth;

                    for (let i = startCol; i < endCol; i++) {
                        const week = weeksOfYear[i];
                        const weekKey = week.key;
                        const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                        const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));

                        const employeesInGroupThisWeek = (groupedEmployeesByWeek[weekKey]?.byGroup?.[groupRow.id] || []).sort();
                        
                        doc.setFillColor(hasHoliday ? '#e0f2fe' : '#ffffff');
                        doc.rect(cellX, currentY, colWidth, rowHeight, 'F');

                        if (employeesInGroupThisWeek.length > 0) {
                            doc.setFontSize(fontSize - 1);
                            doc.setFont('helvetica', 'normal');
                            doc.text(employeesInGroupThisWeek.join(', '), cellX + 2, currentY + rowHeight / 2, { baseline: 'middle', maxWidth: colWidth - 4 });
                        }
                        
                        cellX += colWidth;
                    }
                    currentY += rowHeight;
                });
    
                // Footer
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Página ${page + 1} de ${totalPages}`, pageWidth - pageMargin, pageHeight - 5, { align: 'right' });
            }
    
            doc.save(`cuadrante_vacaciones_${selectedYear}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            if (toast) {
                toast({
                    title: 'Error al generar PDF',
                    description: 'Hubo un problema al crear el documento.',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsGeneratingPdf(false);
        }
    };


    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Cuadrante Anual de Vacaciones</CardTitle>
                    </div>
                     <div className="flex items-center gap-2">
                        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                            <SelectTrigger className='w-32'>
                                <SelectValue placeholder="Año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                            {isGeneratingPdf ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <FileDown className='mr-2 h-4 w-4' />}
                            Generar PDF
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 bg-white z-10 p-2 border w-40 min-w-40 text-left">Grupo</th>
                            {weeksOfYear.map(week => {
                                const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                                const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                                return (
                                    <th key={week.key} className={cn("p-1 text-center text-xs font-normal border w-32 min-w-32", hasHoliday ? "bg-blue-100" : "bg-gray-50")}>
                                        <div className='flex flex-col items-center justify-center h-full'>
                                            <span className='font-semibold'>Semana {week.number}</span>
                                            <span className='text-muted-foreground text-[10px]'>
                                                {format(week.start, 'dd/MM')} - {format(week.end, 'dd/MM')}
                                            </span>
                                            <div className="flex gap-3 mt-1.5 text-[11px] items-center">
                                                <div className='flex items-center gap-1'><Users className="h-3 w-3"/>{vacationData.weeklySummaries[week.key]?.employeeCount ?? 0}</div>
                                                <div className='flex items-center gap-1'><Clock className="h-3 w-3"/>{vacationData.weeklySummaries[week.key]?.hourImpact.toFixed(0) ?? 0}h</div>
                                            </div>
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                     <tbody>
                        {sortedGroups.map((group, groupIndex) => (
                             <tr key={group.id}>
                                <td className="sticky left-0 bg-white z-10 p-2 border font-bold text-sm w-40 min-w-40 align-top">{group.name}</td>
                                {weeksOfYear.map(week => {
                                    const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                                    const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                                    const employeesInGroupThisWeek = (groupedEmployeesByWeek[week.key]?.byGroup?.[group.id] || []).sort();

                                    return (
                                        <td key={`${group.id}-${week.key}`} className={cn("border w-32 min-w-32 h-8 align-top p-1", hasHoliday && "bg-blue-50/50")}>
                                            <div className="flex flex-col gap-0.5">
                                                {employeesInGroupThisWeek.map((name, nameIndex) => (
                                                     <div
                                                        key={nameIndex}
                                                        className="text-[10px] truncate p-0.5 rounded-sm"
                                                        style={{ backgroundColor: groupColors[groupIndex % groupColors.length]}}
                                                    >
                                                        {name}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}

    