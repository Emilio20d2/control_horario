
'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Users, Clock, FileDown, Maximize, Minimize, Calendar as CalendarIcon, FileSignature } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod, Ausencia, HolidayEmployee, EmployeeGroup } from '@/lib/types';
import { format, isAfter, parseISO, addDays, differenceInDays, isWithinInterval, startOfDay, eachDayOfInterval, startOfWeek, isSameDay, getISOWeek, getYear, addWeeks, isBefore, getISODay, getMonth, subMonths, addMonths, startOfMonth, endOfMonth, eachWeekOfInterval, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { addScheduledAbsence, deleteScheduledAbsence } from '@/lib/services/employeeService';
import { Skeleton } from '../ui/skeleton';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { endOfWeek, endOfDay } from 'date-fns';
import jsPDF, { Cell } from 'jspdf';
import autoTable from 'jspdf-autotable';


const QuadrantTable = forwardRef<HTMLDivElement, { isFullscreen?: boolean, selectedYear: number, onEditAbsence: (employee: any, absence: any, periodId: string) => void, employeeGroups: EmployeeGroup[], weeksOfYear: any[], vacationData: any, allEmployees: any[] }>(({ isFullscreen, selectedYear, onEditAbsence, employeeGroups, weeksOfYear, vacationData, allEmployees }, ref) => {
    const { getTheoreticalHoursAndTurn, holidays } = useDataProvider();
    const [substitutions, setSubstitutions] = useState<Record<string, Record<string, string>>>({}); // { [weekKey]: { [originalEmpName]: substituteName } }
    
    const substituteEmployees = useMemo(() => {
        const mainEmployeeNames = new Set(allEmployees.filter(e => !e.isExternal).map(e => e.name.trim().toLowerCase()));
        return allEmployees.filter(e => e.isEventual && !mainEmployeeNames.has(e.name.trim().toLowerCase()));
    }, [allEmployees]);

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
    
    const groupedEmployeesByWeek = useMemo(() => {
        const result: Record<string, { all: {name: string, absence: string, id: string}[], byGroup: Record<string, {name: string, absence: string, id: string}[]> }> = {};
        
        for (const weekKey in vacationData.employeesByWeek) {
            result[weekKey] = { all: [], byGroup: {} };
            const weekEmployees = vacationData.employeesByWeek[weekKey];
            
            weekEmployees.forEach((emp: any) => {
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

    const sortedGroups = [...employeeGroups].sort((a,b) => a.order - b.order);
    const groupColors = ['#dbeafe', '#dcfce7', '#fef9c3', '#f3e8ff', '#fce7f3', '#e0e7ff', '#ccfbf1', '#ffedd5'];
    
     return (
        <div ref={ref} className="overflow-auto h-full flex-grow">
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
                                                                if (absenceData && employeeData && !employeeData.isExternal) {
                                                                    onEditAbsence(employeeData, absenceData, absenceData.periodId);
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
});
QuadrantTable.displayName = 'QuadrantTable';

const FullscreenQuadrant = ({
    isFullscreen,
    setIsFullscreen,
    tableContainerRef,
    scrollPositionRef,
    selectedYear,
    onEditAbsence,
    loading,
    weeksOfYear,
    vacationData,
    allEmployees,
    employeeGroups
}: {
    isFullscreen: boolean;
    setIsFullscreen: (value: boolean) => void;
    tableContainerRef: React.RefObject<HTMLDivElement>;
    scrollPositionRef: React.MutableRefObject<{ top: number; left: number }>;
    selectedYear: number;
    onEditAbsence: (employee: any, absence: any, periodId: string) => void;
    loading: boolean;
    weeksOfYear: any[];
    vacationData: any;
    allEmployees: any[];
    employeeGroups: EmployeeGroup[];
}) => {
    
    useLayoutEffect(() => {
        if (!loading && isFullscreen) {
            const container = tableContainerRef.current;
            if (container) {
                container.scrollTop = scrollPositionRef.current.top;
                container.scrollLeft = scrollPositionRef.current.left;
            }
        }
    }, [loading, isFullscreen, tableContainerRef, scrollPositionRef]);

    useEffect(() => {
        const handleScroll = () => {
            if (tableContainerRef.current) {
                scrollPositionRef.current = {
                    top: tableContainerRef.current.scrollTop,
                    left: tableContainerRef.current.scrollLeft
                };
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
    }, [tableContainerRef, scrollPositionRef]);
    
    return (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
            <DialogContent className="max-w-full h-full p-2 bg-background flex flex-col border-0 shadow-none gap-0">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-2 right-2 z-[9999]"
                >
                    <Minimize className="h-6 w-6" />
                </Button>
                <QuadrantTable 
                    ref={tableContainerRef} 
                    isFullscreen={true} 
                    selectedYear={selectedYear} 
                    onEditAbsence={onEditAbsence}
                    employeeGroups={employeeGroups}
                    weeksOfYear={weeksOfYear}
                    vacationData={vacationData}
                    allEmployees={allEmployees}
                />
            </DialogContent>
        </Dialog>
    );
};


export function AnnualVacationQuadrant() {
    const { employees, loading, absenceTypes, weeklyRecords, getWeekId, getTheoreticalHoursAndTurn, holidays, refreshData, employeeGroups, holidayEmployees, getEffectiveWeeklyHours } = useDataProvider();
    const { toast } = useToast();
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef({ top: 0, left: 0 });

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

        const allEmps = [...mainEmployees, ...externalEmployees].filter(e => {
            if (e.isExternal) return true;
            const holidayEmp = holidayEmployees.find(he => he.id === e.id);
            return holidayEmp ? holidayEmp.active : true;
        });

        return allEmps.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, holidayEmployees, loading, getEffectiveWeeklyHours]);

    const activeEmployees = useMemo(() => {
        return employees.filter(e => e.employmentPeriods.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())));
    }, [employees]);

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

    const schedulableAbsenceTypes = useMemo(() => {
        return absenceTypes.filter(at => at.name === 'Vacaciones' || at.name === 'Excedencia' || at.name === 'Permiso no retribuido');
    }, [absenceTypes]);
    
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
                 emp.employmentPeriods.forEach((period: EmploymentPeriod) => {
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
                            const activePeriod = emp.employmentPeriods.find((p: EmploymentPeriod) => {
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

    const handleEditAbsence = (employee: any, absence: any, periodId: string) => {
        setEditingAbsence({ employee, absence, periodId });
    };

    const vacationPeriods = useMemo(() => {
        if (!editingAbsence) return [];
        const { employee } = editingAbsence;
        const periods: { id: string; startDate: Date; endDate: Date; absenceTypeId: string; }[] = [];

        employee.employmentPeriods.forEach((period: EmploymentPeriod) => {
            period.scheduledAbsences?.forEach(sa => {
                if(sa.endDate && getYear(sa.startDate) === selectedYear) {
                    periods.push({
                        id: sa.id,
                        startDate: sa.startDate,
                        endDate: sa.endDate,
                        absenceTypeId: sa.absenceTypeId
                    });
                }
            });
        });
        return periods;
    }, [editingAbsence, selectedYear]);

    useLayoutEffect(() => {
        if (!loading && isFullscreen) {
            const container = tableContainerRef.current;
            if (container && (container.scrollTop !== scrollPositionRef.current.top || container.scrollLeft !== scrollPositionRef.current.left)) {
                container.scrollTop = scrollPositionRef.current.top;
                container.scrollLeft = scrollPositionRef.current.left;
            }
        }
    }, [loading, isFullscreen, tableContainerRef, scrollPositionRef]);

    useEffect(() => {
        const handleScroll = () => {
            if (tableContainerRef.current) {
                scrollPositionRef.current = {
                    top: tableContainerRef.current.scrollTop,
                    left: tableContainerRef.current.scrollLeft
                };
            }
        };

        const container = tableContainerRef.current;
        container?.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            container?.removeEventListener('scroll', handleScroll);
        };
    }, [tableContainerRef]);
    
    const openingHolidays = holidays.filter(h => h.type === 'Apertura').map(h => h.date as Date);
    const otherHolidays = holidays.filter(h => h.type !== 'Apertura').map(h => h.date as Date);

    const dialogModifiers = {
        opening: openingHolidays,
        other: otherHolidays,
        employeeAbsence: vacationPeriods.flatMap(p => eachDayOfInterval({start: p.startDate, end: p.endDate})),
    };

    const dialogModifiersStyles = {
        opening: {
            backgroundColor: '#a7f3d0', 
            color: '#065f46',
        },
        other: {
            backgroundColor: '#fecaca',
            color: '#991b1b',
        },
        employeeAbsence: {
            backgroundColor: '#dbeafe',
        }
    };
    
    const generateGroupReport = () => {
        setIsGenerating(true);
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
        const vacationDataForReport = vacationData;
        
        const weekChunks: (typeof weeksOfYear)[] = [];
        for (let i = 0; i < weeksOfYear.length; i += 4) {
            weekChunks.push(weeksOfYear.slice(i, i + 4));
        }
    
        weekChunks.forEach((chunk, pageIndex) => {
            if (pageIndex > 0) doc.addPage();
            doc.setFontSize(14);
            doc.text(`Cuadrante de Ausencias Programadas - ${selectedYear}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Página ${pageIndex + 1} de ${weekChunks.length}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
            
            const sortedGroups = [...employeeGroups].sort((a, b) => a.order - b.order);
            const bodyRows = sortedGroups.map(group => {
                const rowContent = chunk.map(week => {
                    const employeesInGroupThisWeek = (vacationData.employeesByWeek[week.key] || [])
                        .filter((emp: any) => emp.groupId === group.id)
                        .sort((a: any, b: any) => a.employeeName.localeCompare(b.employeeName));
                    return employeesInGroupThisWeek.map((e: any) => `${e.employeeName} (${e.absenceAbbreviation})`).join('\n');
                });
                return rowContent;
            });
    
            const tableWidth = doc.internal.pageSize.width - 28;
            const dynamicColumnWidths = chunk.map(() => tableWidth / chunk.length);
            
            const headContent = chunk.map(week => {
                const weekInfo = weeksOfYear.find(w => w.key === week.key);
                if (!weekInfo) return '';
                const turnInfo = allEmployees.length > 0 ? getTheoreticalHoursAndTurn(allEmployees[0].id, weekInfo.start) : { turnId: null };
                const summary = vacationDataForReport.weeklySummaries[weekInfo.key] || { employeeCount: 0, hourImpact: 0 };
                const turnText = turnInfo.turnId ? ` ${turnInfo.turnId.replace('turn', 'T')}` : '';
                return `${format(weekInfo.start, 'dd/MM')} - ${format(weekInfo.end, 'dd/MM')}${turnText}\n\n${summary.employeeCount} Empl. / ${summary.hourImpact.toFixed(0)}h`;
            });
    
            autoTable(doc, {
                head: [headContent],
                body: bodyRows,
                startY: 25,
                theme: 'grid',
                styles: { fontSize: 7, valign: 'top', cellPadding: 1.5, },
                headStyles: { fontStyle: 'bold', fillColor: '#d3d3d3', textColor: 0, valign: 'middle', halign: 'center', minCellHeight: 20 },
                columnStyles: { ...chunk.reduce((acc, _, i) => ({ ...acc, [i]: { cellWidth: dynamicColumnWidths[i] } }), {})},
            });
        });
    
        doc.save(`cuadrante_ausencias_${selectedYear}.pdf`);
        setIsGenerating(false);
    };

    const generateSignatureReport = () => {
        setIsGenerating(true);
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text(`Listado de Vacaciones para Firma - ${selectedYear}`, 14, 15);
    
        const vacationType = absenceTypes.find(at => at.name === 'Vacaciones');
        if (!vacationType) {
            toast({ title: 'Error', description: 'No se encontró el tipo de ausencia "Vacaciones".', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }
    
        const sortedEmployees = [...activeEmployees].sort((a, b) => a.name.localeCompare(b.name));
    
        const body = sortedEmployees.map(emp => {
            const allVacationDays = new Set<string>();
    
            emp.employmentPeriods?.forEach(period => {
                period.scheduledAbsences?.forEach(sa => {
                    if (sa.absenceTypeId === vacationType.id && sa.endDate) {
                        eachDayOfInterval({ start: sa.startDate, end: sa.endDate }).forEach(day => {
                            if (getYear(day) === selectedYear) {
                                allVacationDays.add(format(day, 'yyyy-MM-dd'));
                            }
                        });
                    }
                });
            });
    
            Object.values(weeklyRecords).forEach(record => {
                const empWeekData = record.weekData[emp.id];
                if (empWeekData?.days) {
                    Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                        if (dayData.absence === vacationType.abbreviation && getYear(parseISO(dayStr)) === selectedYear) {
                            allVacationDays.add(dayStr);
                        }
                    });
                }
            });
    
            const sortedDays = Array.from(allVacationDays).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
    
            let periodsText = '';
            if (sortedDays.length > 0) {
                const periods: string[] = [];
                let currentPeriodStart = sortedDays[0];
                for (let i = 1; i < sortedDays.length; i++) {
                    if (differenceInDays(sortedDays[i], sortedDays[i - 1]) > 1) {
                        const endDate = sortedDays[i - 1];
                        const days = differenceInDays(endDate, currentPeriodStart) + 1;
                        periods.push(`${format(currentPeriodStart, 'dd/MM')} - ${format(endDate, 'dd/MM')} (${days} días)`);
                        currentPeriodStart = sortedDays[i];
                    }
                }
                const lastEndDate = sortedDays[sortedDays.length - 1];
                const lastDays = differenceInDays(lastEndDate, currentPeriodStart) + 1;
                periods.push(`${format(currentPeriodStart, 'dd/MM')} - ${format(lastEndDate, 'dd/MM')} (${lastDays} días)`);
                periodsText = periods.join('\n');
            }
            
            return [emp.name, periodsText, ''];
        });
    
        autoTable(doc, {
            head: [['Empleado', 'Periodos de Vacaciones', 'Firma']],
            body: body,
            startY: 22,
            theme: 'plain',
            rowPageBreak: 'avoid',
            styles: { valign: 'middle' },
            headStyles: { fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 40 } },
            didDrawCell: (data) => {
                if (data.column.index === 2 && data.section === 'body') {
                    const rectHeight = 18;
                    const rectY = data.cell.y + 2;
                    doc.rect(data.cell.x + 2, rectY, data.cell.width - 4, rectHeight);
                }
            },
            minCellHeight: 22,
        });
    
        doc.save(`listado_firmas_vacaciones_${selectedYear}.pdf`);
        setIsGenerating(false);
    };


    return (
        <>
            <FullscreenQuadrant
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                tableContainerRef={tableContainerRef}
                scrollPositionRef={scrollPositionRef}
                selectedYear={selectedYear}
                onEditAbsence={handleEditAbsence}
                loading={loading}
                employeeGroups={employeeGroups}
                weeksOfYear={weeksOfYear}
                vacationData={vacationData}
                allEmployees={allEmployees}
            />

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
                                        modifiers={dialogModifiers}
                                        modifiersStyles={dialogModifiersStyles}
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
                                                {vacationPeriods.map((period: any) => {
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

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Cuadrante Anual de Ausencias</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button onClick={() => generateGroupReport()} disabled={isGenerating || loading}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Imprimir Cuadrante
                            </Button>
                            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                                <SelectTrigger className='w-32'>
                                    <SelectValue placeholder="Año..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                     {loading ? <Skeleton className="h-[600px] w-full" /> : (
                        <QuadrantTable 
                            ref={tableContainerRef}
                            selectedYear={selectedYear} 
                            onEditAbsence={handleEditAbsence}
                            employeeGroups={employeeGroups}
                            weeksOfYear={weeksOfYear}
                            vacationData={vacationData}
                            allEmployees={allEmployees}
                         />
                     )}
                </CardContent>
            </Card>
        </>
    );
}

    