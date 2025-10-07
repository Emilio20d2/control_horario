

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Users, Clock, FileDown, Maximize, Minimize, Calendar as CalendarIcon, FileSignature } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod, Ausencia } from '@/lib/types';
import { format, isAfter, parseISO, addDays, differenceInDays, isWithinInterval, startOfDay, eachDayOfInterval, startOfWeek, isSameDay, getISOWeek, getYear, addWeeks, isBefore, getISODay } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { addScheduledAbsence, deleteScheduledAbsence } from '@/lib/services/employeeService';
import { Skeleton } from '../ui/skeleton';
import { setDocument } from '@/lib/services/firestoreService';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { endOfWeek, endOfDay } from 'date-fns';


export function AnnualVacationQuadrant() {
    const { employees, employeeGroups, loading, absenceTypes, weeklyRecords, holidayEmployees, getEffectiveWeeklyHours, holidays, refreshData, getWeekId, getTheoreticalHoursAndTurn } = useDataProvider();
    const { toast } = useToast();
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [substitutions, setSubstitutions] = useState<Record<string, Record<string, string>>>({}); // { [weekKey]: { [originalEmpName]: substituteName } }
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef(0);

    const [editingAbsence, setEditingAbsence] = useState<{
        employee: any;
        absence: any;
        periodId: string;
    } | null>(null);

    const [editedDateRange, setEditedDateRange] = useState<DateRange | undefined>(undefined);
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

    useEffect(() => {
        if (editingAbsence) {
            setEditedDateRange({
                from: editingAbsence.absence.startDate,
                to: editingAbsence.absence.endDate,
            });
            setCalendarMonth(editingAbsence.absence.startDate);
        } else {
            setEditedDateRange(undefined);
        }
    }, [editingAbsence]);
    
    useEffect(() => {
        const handleScroll = () => {
            if (tableContainerRef.current) {
                scrollPositionRef.current = tableContainerRef.current.scrollLeft;
            }
        };
    
        const container = tableContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
        }
        
        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);
    
    useEffect(() => {
        const container = tableContainerRef.current;
        if (container && isFullscreen) {
            container.scrollLeft = scrollPositionRef.current;
        }
    }, [isFullscreen]);


    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);


    const schedulableAbsenceTypes = useMemo(() => {
        return absenceTypes.filter(at => at.name === 'Vacaciones' || at.name === 'Excedencia' || at.name === 'Permiso no retribuido');
    }, [absenceTypes]);

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
    }, [employees, holidayEmployees, loading, getEffectiveWeeklyHours]);

    const substituteEmployees = useMemo(() => {
        const mainEmployeeNames = new Set(employees.map(e => e.name.trim().toLowerCase()));
        return holidayEmployees.filter(he => he.active && !mainEmployeeNames.has(he.name.trim().toLowerCase()));
    }, [employees, holidayEmployees]);


    const weeksOfYear = useMemo(() => {
        const year = selectedYear;
        const firstDayOfYear = new Date(year, 0, 1);
        let firstMonday = startOfWeek(firstDayOfYear, { weekStartsOn: 1 });
    
        if (getYear(firstMonday) < year) {
            firstMonday = addWeeks(firstMonday, 1);
        }

        const weeks = [];
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
        if (loading || schedulableAbsenceTypes.length === 0) return { weeklySummaries: {}, employeesByWeek: {}, absencesByEmployee: {} };

        const weeklySummaries: Record<string, { employeeCount: number; hourImpact: number }> = {};
        const employeesByWeek: Record<string, { employeeId: string; employeeName: string; groupId?: string | null; absenceAbbreviation: string }[]> = {};
        const absencesByEmployee: Record<string, any[]> = {};
        
        const schedulableAbsenceTypeIds = new Set(schedulableAbsenceTypes.map(at => at.id));
        const schedulableAbsenceTypeAbbrs = new Set(schedulableAbsenceTypes.map(at => at.abbreviation));


        weeksOfYear.forEach(week => {
            weeklySummaries[week.key] = { employeeCount: 0, hourImpact: 0 };
            employeesByWeek[week.key] = [];
        });

        allEmployees.forEach(emp => {
            absencesByEmployee[emp.id] = [];
            const allAbsenceDays = new Map<string, { typeId: string, typeAbbr: string, periodId?: string, absenceId?: string, isScheduled: boolean }>();

            if (!emp.isExternal) {
                 emp.employmentPeriods.forEach(period => {
                    (period.scheduledAbsences ?? [])
                        .filter(a => schedulableAbsenceTypeIds.has(a.absenceTypeId))
                        .forEach(absence => {
                            if (!absence.endDate) return;
                            const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);
                            if (!absenceType) return;

                            eachDayOfInterval({ start: startOfDay(absence.startDate), end: startOfDay(absence.endDate) }).forEach(day => {
                                if (getYear(day) === selectedYear) {
                                    allAbsenceDays.set(format(day, 'yyyy-MM-dd'), { 
                                        typeId: absenceType.id, 
                                        typeAbbr: absenceType.abbreviation, 
                                        periodId: period.id,
                                        absenceId: absence.id,
                                        isScheduled: true
                                    });
                                }
                            });
                        });
                 });
                
                Object.values(weeklyRecords).forEach(record => {
                    const empWeekData = record.weekData[emp.id];
                    if (!empWeekData?.days) return;
                    Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                        const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                        if (absenceType && schedulableAbsenceTypeAbbrs.has(absenceType.abbreviation) && getYear(new Date(dayStr)) === selectedYear) {
                            if (!allAbsenceDays.has(dayStr)) {
                                allAbsenceDays.set(dayStr, { typeId: absenceType.id, typeAbbr: absenceType.abbreviation, isScheduled: false });
                            }
                        }
                    });
                });
            }

            const uniqueSortedDays = Array.from(allAbsenceDays.keys()).map(d => parseISO(d)).sort((a,b) => a.getTime() - b.getTime());
            if (uniqueSortedDays.length > 0) {
                let currentPeriodStart = uniqueSortedDays[0];
                let currentAbsenceInfo = allAbsenceDays.get(format(currentPeriodStart, 'yyyy-MM-dd'))!;
                
                for (let i = 1; i < uniqueSortedDays.length; i++) {
                    const dayInfo = allAbsenceDays.get(format(uniqueSortedDays[i], 'yyyy-MM-dd'))!;
                    if (differenceInDays(uniqueSortedDays[i], uniqueSortedDays[i-1]) > 1 || dayInfo.typeId !== currentAbsenceInfo.typeId) {
                        absencesByEmployee[emp.id].push({
                            id: currentAbsenceInfo.absenceId || `agg-${currentPeriodStart.toISOString()}`,
                            startDate: currentPeriodStart,
                            endDate: uniqueSortedDays[i-1],
                            absenceTypeId: currentAbsenceInfo.typeId,
                            absenceAbbreviation: currentAbsenceInfo.typeAbbr,
                            periodId: currentAbsenceInfo.periodId
                        });
                        currentPeriodStart = uniqueSortedDays[i];
                        currentAbsenceInfo = dayInfo;
                    }
                }
                 absencesByEmployee[emp.id].push({
                    id: currentAbsenceInfo.absenceId || `agg-${currentPeriodStart.toISOString()}`,
                    startDate: currentPeriodStart,
                    endDate: uniqueSortedDays[uniqueSortedDays.length-1],
                    absenceTypeId: currentAbsenceInfo.typeId,
                    absenceAbbreviation: currentAbsenceInfo.typeAbbr,
                    periodId: currentAbsenceInfo.periodId
                });
            }


            if (allAbsenceDays.size > 0) {
                weeksOfYear.forEach(week => {
                    let absenceThisWeek: string | undefined = undefined;
                    for (const dayStr of Array.from(allAbsenceDays.keys())) {
                        const day = parseISO(dayStr);
                        if (day >= week.start && day <= week.end) {
                           absenceThisWeek = allAbsenceDays.get(dayStr)!.typeAbbr;
                           break;
                        }
                    }
                    
                    if (absenceThisWeek) {
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
                        employeesByWeek[week.key].push({ employeeId: emp.id, employeeName: emp.name, groupId: emp.groupId, absenceAbbreviation: absenceThisWeek });
                    }
                });
            }
        });

        return { weeklySummaries, employeesByWeek, absencesByEmployee };

    }, [loading, allEmployees, schedulableAbsenceTypes, weeksOfYear, weeklyRecords, selectedYear, getEffectiveWeeklyHours, absenceTypes]);

    const groupedEmployeesByWeek = useMemo(() => {
        const result: Record<string, { all: {name: string, absence: string, id: string}[], byGroup: Record<string, {name: string, absence: string, id: string}[]> }> = {};
        
        for (const weekKey in vacationData.employeesByWeek) {
            result[weekKey] = { all: [], byGroup: {} };
            const weekEmployees = vacationData.employeesByWeek[weekKey];
            
            weekEmployees.forEach(emp => {
                const groupId = emp.groupId;
                const empData = { name: emp.employeeName, absence: emp.absenceAbbreviation, id: emp.employeeId };
                 result[weekKey].all.push(empData);
                if (groupId) {
                    if (!result[weekKey].byGroup[groupId]) {
                        result[weekKey].byGroup[groupId] = [];
                    }
                    result[weekKey].byGroup[groupId].push(empData);
                }
            });
        }
        return result;
    }, [vacationData.employeesByWeek]);
    
    const sortedGroups = useMemo(() => {
        return [...employeeGroups].sort((a,b) => a.order - b.order);
    }, [employeeGroups]);

    const handleUpdateAbsence = async () => {
        if (!editingAbsence || !editedDateRange?.from) return;

        setIsGenerating(true);
        try {
            const { employee, absence, periodId } = editingAbsence;
            
            await deleteScheduledAbsence(employee.id, periodId, absence.id, employee);
            
            await addScheduledAbsence(employee.id, periodId, {
                absenceTypeId: absence.absenceTypeId,
                startDate: format(editedDateRange.from, 'yyyy-MM-dd'),
                endDate: editedDateRange.to ? format(editedDateRange.to, 'yyyy-MM-dd') : format(editedDateRange.from, 'yyyy-MM-dd'),
            }, employee);

            toast({ title: 'Ausencia actualizada', description: `La ausencia de ${employee.name} ha sido modificada.` });
            refreshData();
            setEditingAbsence(null);
        } catch (error) {
            console.error("Error updating absence:", error);
            toast({ title: 'Error al actualizar', description: 'No se pudo modificar la ausencia.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleDeleteAbsence = async () => {
        if (!editingAbsence) return;

        setIsGenerating(true);
        try {
            const { employee, absence, periodId } = editingAbsence;
            await deleteScheduledAbsence(employee.id, periodId, absence.id, employee);
            toast({ title: 'Ausencia eliminada', description: `La ausencia de ${employee.name} ha sido eliminada.`, variant: 'destructive'});
            refreshData();
            setEditingAbsence(null);
        } catch (error) {
            console.error("Error deleting absence:", error);
            toast({ title: 'Error al eliminar', description: 'No se pudo eliminar la ausencia.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const generateGroupReport = () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    
            const WEEKS_PER_PAGE = 4;
            const weeksInChunks = [];
            for (let i = 0; i < weeksOfYear.length; i += WEEKS_PER_PAGE) {
                weeksInChunks.push(weeksOfYear.slice(i, i + WEEKS_PER_PAGE));
            }
    
            const totalPages = weeksInChunks.length;
    
            weeksInChunks.forEach((weekChunk, pageIndex) => {
                if (pageIndex > 0) doc.addPage('l', 'a4');
    
                const pageHeight = doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageMargin = 15;
    
                const addHeaderFooter = (data: any) => {
                    doc.setFontSize(14).setFont('helvetica', 'bold');
                    doc.text(`Informe de Ausencias por Agrupaciones - ${selectedYear}`, pageMargin, 20);
                    doc.setFontSize(8).setFont('helvetica', 'normal');
                    doc.text(`Página ${data.pageNumber} de ${totalPages}`, pageWidth - pageMargin, pageHeight - 10, { align: 'right' });
                };
    
                const headContent = weekChunk.map(week => {
                    const summary = vacationData.weeklySummaries[week.key];
                    return `${format(week.start, 'dd/MM')} - ${format(week.end, 'dd/MM')}\n${summary?.employeeCount || 0} emp. - ${summary?.hourImpact.toFixed(0) || 0}h`;
                });

                const bodyRows = sortedGroups.map(group => {
                    const employeesInGroupThisChunk = weekChunk.map(week => {
                        const employeesInGroupForWeek = groupedEmployeesByWeek[week.key]?.byGroup?.[group.id] || [];
                        const currentSubstitutes = substitutions[week.key] || {};
                        
                        const cellTexts = employeesInGroupForWeek.map(emp => {
                             const substituteName = currentSubstitutes[emp.name] || '';
                             let text = `${emp.name} (${emp.absence})`;
                             if (substituteName) {
                                 text += `\n(${substituteName})`;
                             }
                             return text;
                        });
                        return cellTexts.join('\n\n');
                    });
                    return ['', ...employeesInGroupThisChunk];
                });

                const columnStyles: { [key: number]: any } = {
                  0: { cellWidth: 0.1 },
                };
                const availableWidth = pageWidth - (pageMargin * 2) - 0.1;
                const weekColumnWidth = availableWidth / WEEKS_PER_PAGE;
                for (let i = 0; i < WEEKS_PER_PAGE; i++) {
                    columnStyles[i + 1] = { cellWidth: weekColumnWidth };
                }
    
                autoTable(doc, {
                    head: [[' ', ...headContent]],
                    body: bodyRows,
                    startY: 30,
                    theme: 'grid',
                    didDrawPage: addHeaderFooter,
                    headStyles: { 
                        fillColor: [240, 240, 240], 
                        textColor: [0, 0, 0], 
                        fontStyle: 'bold', 
                        halign: 'center',
                        fontSize: 9,
                        cellPadding: 1,
                    },
                    columnStyles: columnStyles,
                    styles: {
                        fontSize: 8,
                        valign: 'top',
                        cellPadding: 1,
                        lineHeight: 2,
                    },
                    willDrawCell: (data) => {
                        if (data.column.index === 0) {
                            data.cell.styles.lineWidth = 0;
                            return false;
                        }
                    },
                    didParseCell: (data) => {
                        if (data.column.index === 0) {
                            return;
                        }
                        if (data.section === 'body') {
                           data.cell.styles.fillColor = false;
                           
                            const cellText = data.cell.raw as string;
                            if (cellText) {
                                const styledText = cellText.split('\n\n').map(empBlock => {
                                    const lines = empBlock.split('\n');
                                    const mainLine = lines[0];
                                    const subLine = lines[1];

                                    const isSpecial = mainLine.includes('(EXD)') || mainLine.includes('(PE)');
                                    
                                    const textParts: any[] = [];
                                    textParts.push({ text: mainLine, styles: { textColor: isSpecial ? [0, 0, 255] : [0, 0, 0] } });
                                    if(subLine) {
                                        textParts.push({ text: `\n${subLine}`, styles: { textColor: [255, 0, 0] } });
                                    }
                                    textParts.push({ text: '\n', styles: { fontSize: 4 } }); 
                                    return textParts;
                                }).flat();
                                
                                if (styledText.length > 0) {
                                    styledText.pop();
                                }
                                data.cell.content = styledText;
                            }
                        }
                    },
                });
            });
    
            doc.save(`informe_ausencias_${selectedYear}.pdf`);
        } catch (e) {
            console.error(e);
            toast({
                title: 'Error al generar el informe',
                description: 'Ha ocurrido un problema al crear el PDF.',
                variant: 'destructive'
            })
        } finally {
            setIsGenerating(false);
        }
    };
    
    const generateSignatureReport = () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text(`Listado de Conformidad de Vacaciones - ${selectedYear}`, 15, 20);

            const activeEmployees = allEmployees.filter(emp => !emp.isExternal);

            const body = activeEmployees.map(emp => {
                const vacationAbsenceType = absenceTypes.find(at => at.name === 'Vacaciones');
                const empVacations = vacationData.absencesByEmployee[emp.id]
                    .filter((abs: any) => abs.absenceTypeId === vacationAbsenceType?.id)
                    .map((p: any) => `${format(p.startDate, 'dd/MM', { locale: es })} - ${format(p.endDate, 'dd/MM', { locale: es })}`)
                    .join('\n');
                
                return [emp.name, empVacations, ''];
            });

            autoTable(doc, {
                head: [['Empleado', 'Periodos de Vacaciones', 'Firma']],
                body: body,
                startY: 30,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: {
                    0: { cellWidth: 60 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 50, minCellHeight: 20 },
                },
            });

            doc.save(`listado_firmas_vacaciones_${selectedYear}.pdf`);
        } catch (error) {
             console.error("Error generating signature report:", error);
            toast({ title: 'Error al generar informe', description: 'No se pudo crear el PDF de firmas.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSetSubstitute = (weekKey: string, originalEmployee: string, substituteName: string) => {
        setSubstitutions(prev => {
            const newWeekSubstitutions = { ...(prev[weekKey] || {}) };
            if (substituteName === 'ninguno') {
                delete newWeekSubstitutions[originalEmployee];
            } else {
                newWeekSubstitutions[originalEmployee] = substituteName;
            }
            return {
                ...prev,
                [weekKey]: newWeekSubstitutions,
            };
        });
    };
    
    const QuadrantTable = ({ isFullscreen }: { isFullscreen?: boolean }) => {
        return (
             <div ref={tableContainerRef} className={cn("overflow-auto", isFullscreen && "h-full flex-grow")} onScroll={(e) => { if(!isFullscreen) {scrollPositionRef.current = e.currentTarget.scrollLeft} }}>
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20 bg-background">
                        <tr>
                            <th className="sticky left-0 z-30 bg-background p-0" style={{ width: '1px' }}>
                                <div className="w-px h-full" />
                            </th>
                            {weeksOfYear.map(week => {
                                const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                                const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                                const firstEmployee = allEmployees[0];
                                const turnInfo = firstEmployee ? getTheoreticalHoursAndTurn(firstEmployee.id, week.start) : { turnId: null };
                                
                                return (
                                    <th key={week.key} className={cn("p-1 text-center font-normal border min-w-[20rem]", hasHoliday ? "bg-blue-100" : "bg-gray-50", "w-80")}>
                                        <div className='flex flex-col items-center justify-center h-full'>
                                            <div className='flex items-center gap-2'>
                                                <span className='font-semibold text-lg'>
                                                    {format(week.start, 'dd/MM')} - {format(week.end, 'dd/MM')}
                                                </span>
                                                {turnInfo.turnId && <Badge variant="secondary">{turnInfo.turnId.replace('turn','T')}</Badge>}
                                            </div>
                                            <div className="flex gap-3 mt-1.5 text-sm items-center">
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
                                <td style={{ backgroundColor: groupColors[groupIndex % groupColors.length], width: '1px' }} className="sticky left-0 z-10 p-0"></td>
                                {weeksOfYear.map(week => {
                                    const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                                    const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                                    const employeesInGroupThisWeek = (groupedEmployeesByWeek[week.key]?.byGroup?.[group.id] || []).sort((a, b) => a.name.localeCompare(b.name));
                                    const currentSubstitutes = substitutions[week.key] || {};
    
                                    const cellStyle: React.CSSProperties = {};
                                    if (employeesInGroupThisWeek.length > 0) {
                                        cellStyle.backgroundColor = groupColors[groupIndex % groupColors.length];
                                    }
    
                                    return (
                                        <td key={`${group.id}-${week.key}`} style={cellStyle} className={cn("border min-w-[20rem] align-top p-1", hasHoliday && !employeesInGroupThisWeek.length && "bg-blue-50/50", "w-80")}>
                                            <div className="flex flex-col gap-0">
                                                {employeesInGroupThisWeek.map((emp, nameIndex) => {
                                                    const substitute = currentSubstitutes[emp.name];
                                                    const availableSubstitutes = substituteEmployees.filter(
                                                        sub => !Object.values(currentSubstitutes).includes(sub.name) || sub.name === substitute
                                                    );
                                                    const isSpecialAbsence = emp.absence === 'EXD' || emp.absence === 'PE';
                                                    const employeeData = allEmployees.find(e => e.id === emp.id);
                                                    const absenceData = vacationData.absencesByEmployee[emp.id]?.find((a: any) => isWithinInterval(week.start, {start: a.startDate, end: a.endDate}));
    
                                                    return (
                                                        <div key={nameIndex} className="py-0 px-1 rounded-sm flex justify-between items-center group">
                                                            <button
                                                                className={cn('flex flex-row items-center gap-2 text-left text-sm font-semibold', isSpecialAbsence && 'text-blue-600')}
                                                                onClick={() => {
                                                                    if (employeeData && absenceData) {
                                                                        setEditingAbsence({
                                                                            employee: employeeData,
                                                                            absence: absenceData,
                                                                            periodId: absenceData.periodId
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <span className="truncate">{emp.name} ({emp.absence})</span>
                                                                {substitute && <span className="text-red-600 truncate">({substitute})</span>}
                                                            </button>
                                                             <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <button className="opacity-100 transition-opacity">
                                                                        <PlusCircle className="h-4 w-4 text-gray-500 hover:text-black" />
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-56 p-2">
                                                                    <p className="text-sm font-medium p-2">Asignar sustituto</p>
                                                                    <Select
                                                                        onValueChange={(value) => handleSetSubstitute(week.key, emp.name, value)}
                                                                        defaultValue={substitute}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Seleccionar..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="ninguno">Ninguno</SelectItem>
                                                                            {availableSubstitutes.map(sub => (
                                                                                <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
    
    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
    }

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 bg-background z-[9999] flex flex-col h-screen">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-4 right-4 z-[10000]"
                >
                    <Minimize className="h-6 w-6" />
                </Button>
                <Dialog open={!!editingAbsence} onOpenChange={(open) => { if (!open) { setEditingAbsence(null); } }}>
                    <DialogContent>
                        {editingAbsence && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Editar Ausencia de {editingAbsence.employee.name}</DialogTitle>
                                    <DialogDescription>
                                        Modifica el rango de fechas para esta ausencia.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                     <div className="space-y-2">
                                        <label className="text-sm font-medium">Rango de Fechas</label>
                                        <Calendar
                                            mode="range"
                                            selected={editedDateRange}
                                            onSelect={setEditedDateRange}
                                            locale={es}
                                            className="rounded-md border"
                                            month={calendarMonth}
                                            onMonthChange={setCalendarMonth}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-sm text-muted-foreground">Periodos de Ausencia ({selectedYear})</h4>
                                        <div className="border rounded-md max-h-40 overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead>Inicio</TableHead>
                                                        <TableHead>Fin</TableHead>
                                                        <TableHead>Días</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(vacationData.absencesByEmployee[editingAbsence.employee.id] || []).filter((p: any) => getYear(p.startDate) === selectedYear).map((period: any) => {
                                                        const absenceType = absenceTypes.find(at => at.id === period.absenceTypeId);
                                                        return (
                                                        <TableRow key={period.id}>
                                                            <TableCell><Badge variant="outline">{absenceType?.abbreviation || '??'}</Badge></TableCell>
                                                            <TableCell>{format(period.startDate, 'dd/MM/yy')}</TableCell>
                                                            <TableCell>{format(period.endDate, 'dd/MM/yy')}</TableCell>
                                                            <TableCell>{differenceInDays(period.endDate, period.startDate) + 1}</TableCell>
                                                        </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="destructive" onClick={handleDeleteAbsence} disabled={isGenerating}>
                                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancelar</Button>
                                    </DialogClose>
                                    <Button onClick={handleUpdateAbsence} disabled={isGenerating}>
                                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Guardar Cambios
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
                <QuadrantTable isFullscreen={true} />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Cuadrante Anual de Ausencias</CardTitle>
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
                        <Button onClick={generateGroupReport} disabled={isGenerating || loading}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Imprimir Cuadrante
                        </Button>
                         <Button onClick={generateSignatureReport} disabled={isGenerating || loading}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                            Listado para Firmas
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setIsFullscreen(true)}>
                            <Maximize className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <QuadrantTable />
            </CardContent>
        </Card>
    );
}

    

    






