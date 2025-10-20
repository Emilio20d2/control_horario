

'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Users, Clock, FileDown, Maximize, Minimize, Calendar as CalendarIcon, FileSignature, SunSnow } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod, Ausencia, HolidayEmployee, EmployeeGroup } from '@/lib/types';
import { format, isAfter, parseISO, addDays, differenceInDays, isWithinInterval, startOfDay, eachDayOfInterval, startOfWeek, isSameDay, getISOWeek, getYear, addWeeks, isBefore, getISODay, getMonth, subMonths, addMonths, startOfMonth, endOfMonth, eachWeekOfInterval, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { addScheduledAbsence, deleteScheduledAbsence } from '@/lib/services/employeeService';
import { Skeleton } from '../ui/skeleton';
import { writeBatch, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { endOfWeek, endOfDay } from 'date-fns';
import jsPDF, { Cell, UserOptions } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AutoTableWithUserOptions extends UserOptions {
    didDrawCell?: (data: {
        table: any;
        column: any;
        row: any;
        cell: Cell;
        doc: jsPDF;
    }) => void;
    didDrawPage?: (data: {
        table: any;
        pageNumber: number;
        settings: any;
        doc: jsPDF;
        cursor: { x: number, y: number };
    }) => void;
}


const QuadrantTable = forwardRef<HTMLDivElement, { isFullscreen?: boolean, selectedYear: number, onEditAbsence: (employee: any, absence: any, periodId: string) => void, employeeGroups: EmployeeGroup[], weeksOfYear: any[], vacationData: any, allEmployees: any[], weeklyRecords: any }>(({ isFullscreen, selectedYear, onEditAbsence, employeeGroups, weeksOfYear, vacationData, allEmployees, weeklyRecords }, ref) => {
    const { getTheoreticalHoursAndTurn, holidays } = useDataProvider();
    const [substitutions, setSubstitutions] = useState<Record<string, Record<string, string>>>({}); // { [weekKey]: { [originalEmpName]: substituteName } }
    
    useEffect(() => {
        const loadedSubstitutions: Record<string, Record<string, string>> = {};
        for (const week of weeksOfYear) {
            const weekRecord = weeklyRecords[week.key];
            if (weekRecord?.weekData?.substitutions) {
                loadedSubstitutions[week.key] = weekRecord.weekData.substitutions;
            }
        }
        setSubstitutions(loadedSubstitutions);
    }, [weeklyRecords, weeksOfYear]);

    const substituteEmployees = useMemo(() => {
        return allEmployees.filter(e => e.isEventual);
    }, [allEmployees]);

    const handleSetSubstitute = async (weekKey: string, originalEmployee: string, substituteName: string) => {
        const currentWeekSubstitutions = { ...(substitutions[weekKey] || {}) };
        
        if (substituteName === 'ninguno') {
            delete currentWeekSubstitutions[originalEmployee];
        } else {
            currentWeekSubstitutions[originalEmployee] = substituteName;
        }

        // Optimistic UI update
        setSubstitutions(prev => ({
            ...prev,
            [weekKey]: currentWeekSubstitutions,
        }));
        
        // Save to Firestore
        try {
            const weekDocRef = doc(db, 'weeklyRecords', weekKey);
            const weekDocSnap = await getDoc(weekDocRef);

            if (weekDocSnap.exists()) {
                await updateDoc(weekDocRef, {
                    'weekData.substitutions': currentWeekSubstitutions
                });
            } else {
                 await setDoc(weekDocRef, {
                    weekData: {
                        substitutions: currentWeekSubstitutions
                    }
                }, { merge: true });
            }
        } catch (error) {
            console.error("Error saving substitution:", error);
            // Revert UI on error
             setSubstitutions(prev => {
                const revertedWeekSubs = { ...prev[weekKey] };
                 if (substituteName === 'ninguno') {
                     // This is tricky, we don't know the old value.
                     // For simplicity, we just leave it as is or refetch.
                 } else {
                     // We can try to find the old value if needed, but for now we'll just log
                 }
                return { ...prev, [weekKey]: revertedWeekSubs };
             });
        }
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
                                                            className='flex flex-row items-center gap-2 text-left text-sm font-semibold'
                                                            onClick={() => {
                                                                if (absenceData && employeeData && !employeeData.isExternal) {
                                                                    onEditAbsence(employeeData, absenceData, absenceData.periodId);
                                                                }
                                                            }}
                                                        >
                                                            <span className={cn('truncate', isSpecialAbsence && 'text-blue-600')}>{emp.name} ({emp.absence})</span>
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
    employeeGroups,
    weeklyRecords
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
    weeklyRecords: any;
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
                    weeklyRecords={weeklyRecords}
                />
            </DialogContent>
        </Dialog>
    );
};


export function AnnualVacationQuadrant() {
    const { employees, loading, absenceTypes, weeklyRecords, getWeekId, getTheoreticalHoursAndTurn, holidays, refreshData, employeeGroups, holidayEmployees, getEffectiveWeeklyHours, calculateSeasonalVacationStatus, calculateEmployeeVacations } = useDataProvider();
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
                isEventual: false,
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
                isExternal: true, // Legacy property, may be useful
                isEventual: true, // Clearer property name
                workShift: e.workShift,
                employmentPeriods: [],
            }));

        const allEmps = [...mainEmployees, ...externalEmployees].filter(e => {
            if (e.isEventual) return true;
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
                    endDate: uniqueSortedDays[uniqueSortedDays.length - 1],
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
                        if(emp.isEventual) {
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
    };
    
    const generateGroupReport = () => {
        setIsGenerating(true);
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
        const vacationDataForReport = vacationData;
        
        const weekChunks: (typeof weeksOfYear)[] = [];
        for (let i = 0; i < weeksOfYear.length; i += 4) {
            weekChunks.push(weeksOfYear.slice(i, i + 4));
        }
    
        const sortedGroups = [...employeeGroups].sort((a, b) => a.order - b.order);
        const groupColors = ['#dbeafe', '#dcfce7', '#fef9c3', '#f3e8ff', '#fce7f3', '#e0e7ff', '#ccfbf1', '#ffedd5'];
    
        weekChunks.forEach((chunk, pageIndex) => {
            if (pageIndex > 0) doc.addPage();
            doc.setFontSize(14);
            doc.text(`Cuadrante de Ausencias Programadas - ${selectedYear}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Página ${pageIndex + 1} de ${weekChunks.length}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
    
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
                body: [],
                startY: 25,
                theme: 'grid',
                styles: { fontSize: 8, valign: 'middle', cellPadding: 1, lineColor: 128, lineWidth: 0.1 },
                headStyles: { fontStyle: 'bold', fillColor: '#d3d3d3', textColor: 0, halign: 'center', minCellHeight: 15 },
                didDrawPage: (data) => {
                    const tableHeader = data.table.head[0];
                    if (!tableHeader) return;
    
                    const maxRowHeight = 120 / sortedGroups.length;
                    let currentY = tableHeader.height + 25;
    
                    sortedGroups.forEach((group, groupIndex) => {
                        const groupColor = groupColors[groupIndex % groupColors.length];
                        for (let colIndex = 0; colIndex < chunk.length; colIndex++) {
                            const week = chunk[colIndex];
                            if (!week) continue;
    
                            const cell = data.table.body[0]?.cells?.[colIndex] ?? data.table.columns[colIndex];
                            if (!cell || typeof cell.x !== 'number' || typeof cell.y !== 'number' || typeof cell.width !== 'number' || typeof cell.height !== 'number') continue;
                            
                            doc.setFillColor(255, 255, 255);
                            doc.rect(cell.x, currentY, cell.width, maxRowHeight, 'F');
                            doc.setDrawColor(128);
                            doc.rect(cell.x, currentY, cell.width, maxRowHeight);

                            const weekSubs = weeklyRecords[week.key]?.weekData?.substitutions || {};
                            const employeesInGroupThisWeek = (vacationDataForReport.employeesByWeek[week.key] || [])
                                .filter((emp: any) => emp.groupId === group.id)
                                .sort((a: any, b: any) => a.employeeName.localeCompare(b.employeeName));
    
                            let textY = currentY + 3;
                            
                            doc.setFontSize(8);
                            employeesInGroupThisWeek.forEach((e: any) => {
                                const substitute = weekSubs[e.employeeName];
                                const isSpecialAbsence = e.absenceAbbreviation === 'EXD' || e.absenceAbbreviation === 'PE';
                                
                                const mainText = `${e.employeeName} (${e.absenceAbbreviation})`;
                                const substituteText = substitute ? ` (${substitute})` : '';
                                
                                doc.setTextColor(0, 0, 0);
                                if (isSpecialAbsence) doc.setTextColor(0, 0, 255);
                                doc.text(mainText, cell.x + 2, textY, { maxWidth: cell.width - 4 - (substitute ? 15 : 0) });
                                
                                if (substitute) {
                                    const mainTextWidth = doc.getStringUnitWidth(mainText) * doc.getFontSize() / doc.internal.scaleFactor;
                                    doc.setTextColor(255, 0, 0);
                                    doc.text(substituteText, cell.x + 2 + mainTextWidth, textY);
                                }

                                textY += 4;
                            });
                        }
                        currentY += maxRowHeight;
                    });
                }
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
    
        const autoTableOptions: AutoTableWithUserOptions = {
            head: [['Empleado', 'Periodos de Vacaciones', 'Firma']],
            body: body,
            startY: 22,
            theme: 'plain',
            rowPageBreak: 'avoid',
            styles: { valign: 'middle' },
            headStyles: { fontStyle: 'bold' },
            columnStyles: { 
                0: { cellWidth: 50 }, 
                1: { cellWidth: 'wrap' }, 
                2: { cellWidth: 40 } 
            },
            didParseCell: (data) => {
                if (data.column.index === 2 && data.section === 'body') {
                    // Set a minimum height for the entire row to ensure the box fits.
                    data.cell.styles.minCellHeight = 22;
                }
            },
            didDrawCell: (data) => {
                if (data.column.index === 2 && data.section === 'body') {
                    const rectHeight = 18;
                    // Calculate the vertical center of the cell and draw the rectangle.
                    const centerY = data.cell.y + data.cell.height / 2;
                    const rectY = centerY - rectHeight / 2;
                    doc.rect(data.cell.x + 2, rectY, data.cell.width - 4, rectHeight);
                }
            },
        };
    
        autoTable(doc, autoTableOptions);
    
        doc.save(`listado_firmas_vacaciones_${selectedYear}.pdf`);
        setIsGenerating(false);
    };

    const generateSeasonalReport = () => {
        setIsGenerating(true);
    
        const reportData = activeEmployees.map(emp => {
            const seasonalStatus = calculateSeasonalVacationStatus(emp.id, selectedYear);
            const totalVacations = calculateEmployeeVacations(emp);
            return {
                ...seasonalStatus,
                totalTaken: totalVacations.vacationDaysTaken,
                totalAvailable: totalVacations.vacationDaysAvailable
            };
        });
    
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text(`Informe de Cumplimiento de Vacaciones - ${selectedYear}`, 14, 15);
    
        const body = reportData.map(data => [
            data.employeeName,
            data.winterDaysTaken >= 10,
            data.summerDaysTaken >= 21,
            `${data.totalTaken} / ${data.totalAvailable}`
        ]);
    
        autoTable(doc, {
            head: [['Empleado', 'Invierno', 'Verano', 'Balance']],
            body: body,
            startY: 22,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && (data.column.index === 1 || data.column.index === 2)) {
                    data.cell.text = ''; // Clear the raw boolean value "true" or "false"
                    if (data.cell.raw === true) {
                        doc.setFontSize(10);
                        doc.setTextColor(34, 139, 34); // ForestGreen
                        doc.text('OK', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
                            align: 'center',
                            baseline: 'middle'
                        });
                        doc.setTextColor(0, 0, 0); // Reset text color
                    }
                }
                 if (data.section === 'body' && data.column.index === 3) {
                    const balanceText = Array.isArray(data.cell.raw) ? data.cell.raw[0] : data.cell.raw as string;
                    if(typeof balanceText === 'string') {
                        const [takenStr, availableStr] = balanceText.split(' / ');
                        const taken = Number(takenStr);
                        const available = Number(availableStr);
                        if (!isNaN(taken) && !isNaN(available)) {
                            if (taken > available) {
                                data.cell.styles.textColor = [255, 0, 0]; // Red
                            } else if (taken === available) {
                                data.cell.styles.textColor = [34, 139, 34]; // Green
                            } else {
                                data.cell.styles.textColor = [0, 0, 0]; // Black
                            }
                        }
                    }
                }
            }
        });
    
        doc.save(`informe_cumplimiento_vacaciones_${selectedYear}.pdf`);
        setIsGenerating(false);
    };

    const groupColors = ['#dbeafe', '#dcfce7', '#fef9c3', '#f3e8ff', '#fce7f3', '#e0e7ff', '#ccfbf1', '#ffedd5'];


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
                weeklyRecords={weeklyRecords}
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
                            <CardTitle>Cuadrante Vacaciones</CardTitle>
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
                            <div className="flex items-center gap-1 border rounded-md p-1">
                                <Button onClick={generateGroupReport} disabled={isGenerating || loading} size="sm" variant="ghost">
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                    Cuadrante
                                </Button>
                                <Button onClick={generateSignatureReport} disabled={isGenerating || loading} size="sm" variant="ghost">
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                                    Firmas
                                </Button>
                                <Button onClick={generateSeasonalReport} disabled={isGenerating || loading} size="sm" variant="ghost">
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SunSnow className="mr-2 h-4 w-4" />}
                                    Check Vacaciones
                                </Button>
                            </div>
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
                            weeklyRecords={weeklyRecords}
                         />
                     )}
                </CardContent>
            </Card>
        </>
    );
}

    