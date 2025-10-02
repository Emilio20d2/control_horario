
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataProvider } from '@/hooks/use-data-provider';
import { addWeeks, endOfWeek, format, getISOWeek, getYear, startOfYear, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, parseISO, startOfWeek, isBefore, isAfter, getISODay, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import type { Employee, EmployeeGroup } from '@/lib/types';
import { Users, Clock, FileDown, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';


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

        return [...mainEmployees, ...externalEmployees].filter(e => {
            if (e.isExternal) return true;
            const holidayEmp = holidayEmployees.find(he => he.id === e.id);
            return holidayEmp ? holidayEmp.active : true;
        });

    }, [employees, holidayEmployees, loading, getEffectiveWeeklyHours]);


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

            // Get from scheduled absences AND weekly records for internal employees
            if (!emp.isExternal) {
                // 1. Scheduled absences
                emp.employmentPeriods.flatMap(p => p.scheduledAbsences ?? [])
                .filter(a => a.absenceTypeId === vacationType.id)
                .forEach(absence => {
                    if (!absence.endDate) return;
                    const absenceStart = startOfDay(absence.startDate);
                    const absenceEnd = endOfDay(absence.endDate);
                    const daysInAbsence = eachDayOfInterval({ start: absenceStart, end: absenceEnd });
                    daysInAbsence.forEach(day => {
                        if (getYear(day) === selectedYear) vacationDays.add(format(day, 'yyyy-MM-dd'));
                    });
                });
                // 2. Weekly records
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

            // Populate weekly summaries
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
                                const periodStart = startOfDay(parseISO(p.startDate as string));
                                const periodEnd = p.endDate ? endOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
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
        const result: Record<string, Record<string, string[]>> = {}; // { [weekKey]: { [groupId]: [employeeName, ...] } }
        
        for (const weekKey in vacationData.employeesByWeek) {
            result[weekKey] = {};
            const weekEmployees = vacationData.employeesByWeek[weekKey];
            
            weekEmployees.forEach(emp => {
                const groupId = emp.groupId || 'unassigned';
                if (!result[weekKey][groupId]) {
                    result[weekKey][groupId] = [];
                }
                result[weekKey][groupId].push(emp.employeeName);
            });
        }
        return result;
    }, [vacationData.employeesByWeek]);
    
    const sortedGroups = useMemo(() => {
        return [...employeeGroups].sort((a,b) => a.order - b.order);
    }, [employeeGroups]);

    const groupColors = [
        '#dbeafe', '#dcfce7', '#fef9c3', '#f3e8ff', '#fce7f3', 
        '#e0e7ff', '#ccfbf1', '#ffedd5',
    ];

    const allRowsData = useMemo(() => {
      const rows = [
          ...sortedGroups.map(g => ({...g, isUnassigned: false})),
          { id: 'unassigned', name: 'Sin Agrupación', order: 999, isUnassigned: true }
      ];
      
      const maxEmployeesInAnyCell = Math.max(1, ...weeksOfYear.flatMap(week => 
          rows.map(group => (groupedEmployeesByWeek[week.key]?.[group.id] || []).length)
      ));
      
      return rows.map(group => {
          const employeesInWeeks = weeksOfYear.map(week => groupedEmployeesByWeek[week.key]?.[group.id] || []);
          const maxInRow = Math.max(1, ...employeesInWeeks.map(e => e.length));
          return { ...group, rowSpan: maxInRow };
      });
  }, [sortedGroups, weeksOfYear, groupedEmployeesByWeek]);


    const handleGeneratePdf = () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a3' });
            const pageMargin = 10;
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const contentWidth = pageWidth - (pageMargin * 2);
    
            const headerHeight = 20;
            const rowHeight = 8;
            const colWidth = 40; 
            const firstColWidth = 50; 
    
            const colsPerPage = Math.floor((contentWidth - firstColWidth) / colWidth);
            const totalWeekCols = weeksOfYear.length;
            const totalPages = Math.ceil(totalWeekCols / colsPerPage);
    
            for (let page = 0; page < totalPages; page++) {
                if (page > 0) doc.addPage('a3', 'l');
                let currentY = pageMargin + headerHeight;
    
                // --- Header ---
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(`Cuadrante Anual de Vacaciones - ${selectedYear}`, pageMargin, pageMargin + 10);
    
                // --- Week Headers ---
                const startCol = page * colsPerPage;
                const endCol = Math.min(startCol + colsPerPage, totalWeekCols);
    
                let currentX = pageMargin;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Agrupación', currentX, currentY - 2);
                currentX += firstColWidth;
    
                for (let i = startCol; i < endCol; i++) {
                    const week = weeksOfYear[i];
                    const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                    const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                    
                    doc.setFillColor(hasHoliday ? 224, 242, 254 : 248, 250, 252);
                    doc.rect(currentX, currentY - headerHeight + 5, colWidth, headerHeight - 5, 'F');
                    
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Semana ${week.number}`, currentX + colWidth / 2, currentY - headerHeight + 9, { align: 'center' });
                    
                    doc.setFontSize(5);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`${format(week.start, 'dd/MM')} - ${format(week.end, 'dd/MM')}`, currentX + colWidth / 2, currentY - headerHeight + 12, { align: 'center' });

                    const summary = vacationData.weeklySummaries[week.key];
                    if (summary) {
                        doc.setFontSize(6);
                        doc.text(`${summary.employeeCount}E / ${summary.hourImpact.toFixed(0)}h`, currentX + colWidth / 2, currentY - headerHeight + 16, { align: 'center' });
                    }
                    currentX += colWidth;
                }
    
                // --- Body Rows ---
                allRowsData.forEach((group, groupIndex) => {
                    const groupColor = group.id === 'unassigned' ? '#e5e7eb' : groupColors[groupIndex % groupColors.length];
                    const numRowsForGroup = group.rowSpan;
    
                    doc.setFillColor(248, 250, 252);
                    doc.rect(pageMargin, currentY, firstColWidth, rowHeight * numRowsForGroup, 'F');
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(group.name, pageMargin + 2, currentY + (rowHeight * numRowsForGroup) / 2, { valign: 'middle' });
    
                    let cellX = pageMargin + firstColWidth;
                    for (let i = startCol; i < endCol; i++) {
                        const week = weeksOfYear[i];
                        const employeesInCell = groupedEmployeesByWeek[week.key]?.[group.id] || [];
    
                        for (let j = 0; j < numRowsForGroup; j++) {
                             const empName = employeesInCell[j];
                             if (empName) {
                                doc.setFillColor(groupColor);
                                doc.rect(cellX, currentY + j * rowHeight, colWidth, rowHeight, 'F');
                                doc.setFontSize(6);
                                doc.setFont('helvetica', 'normal');
                                doc.text(empName, cellX + 2, currentY + j * rowHeight + rowHeight / 2, { valign: 'middle' });
                             } else {
                                doc.setFillColor(255,255,255);
                                doc.rect(cellX, currentY + j * rowHeight, colWidth, rowHeight, 'F');
                             }
                        }
                        cellX += colWidth;
                    }
                    currentY += rowHeight * numRowsForGroup;
                    doc.setDrawColor(229, 231, 235); // border color
                    doc.line(pageMargin, currentY, pageWidth - pageMargin, currentY);
                });
    
                // --- Footer ---
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
                <div className="grid grid-flow-col auto-cols-max">
                    {/* First column for Group Names */}
                    <div className="sticky left-0 z-10 bg-card">
                        <div className="h-20 border-b flex items-center justify-center p-1 text-xs font-semibold">Agrupación</div>
                        {allRowsData.map(group => (
                             <div key={group.id} className="flex items-center justify-center p-1.5 border-b text-xs font-semibold" style={{ height: `${group.rowSpan * 2.5}rem`}}>
                                {group.name}
                             </div>
                        ))}
                    </div>

                    {/* Weekly Columns */}
                    {weeksOfYear.map(week => {
                        const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                        const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                        return (
                            <div key={week.key} className="flex flex-col">
                                <div className={cn("h-20 p-1 text-center text-xs font-normal border-b border-l", hasHoliday ? "bg-blue-100" : "bg-gray-50")}>
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
                                </div>
                                {allRowsData.map((group, groupIndex) => {
                                    const employeesInCell = groupedEmployeesByWeek[week.key]?.[group.id] || [];
                                    return(
                                    <div key={group.id} className="border-b border-l p-1" style={{ height: `${group.rowSpan * 2.5}rem`}}>
                                         {employeesInCell.map((name, nameIndex) => (
                                            <div 
                                                key={name}
                                                className="text-[10px] truncate p-0.5 rounded-sm mb-0.5"
                                                style={{ backgroundColor: group.id === 'unassigned' ? '#e5e7eb' : groupColors[groupIndex % groupColors.length] }}
                                            >
                                                {name}
                                            </div>
                                         ))}
                                    </div>
                                )})}
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

