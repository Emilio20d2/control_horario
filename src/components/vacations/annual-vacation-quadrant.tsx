
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataProvider } from '@/hooks/use-data-provider';
import { addWeeks, endOfWeek, format, getISOWeek, getYear, startOfYear, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, parseISO, startOfWeek, isBefore, isAfter, getISODay } from 'date-fns';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import type { Employee, EmployeeGroup } from '@/lib/types';
import { Users, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function AnnualVacationQuadrant() {
    const { employees, employeeGroups, loading, absenceTypes, weeklyRecords, holidayEmployees, getEffectiveWeeklyHours, holidays } = useDataProvider();

    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
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
        const employeesByWeek: Record<string, { employeeId: string; employeeName: string; groupId?: string }[]> = {};

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
        'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200', 'bg-pink-200', 
        'bg-indigo-200', 'bg-teal-200', 'bg-orange-200',
    ];

    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Cuadrante Anual de Vacaciones</CardTitle>
                        <CardDescription>
                            Vista anual de la planificación de vacaciones, ordenada por agrupación.
                        </CardDescription>
                    </div>
                     <div className="w-40">
                        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <Table className="min-w-full table-fixed border-collapse">
                        <TableHeader className='sticky top-0 z-20 bg-card'>
                            <TableRow>
                                <TableHead className="w-48 min-w-48 p-2 text-left sticky left-0 z-10 bg-card">Agrupación</TableHead>
                                {weeksOfYear.map(week => {
                                    const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                                    const hasHoliday = weekDays.some(day => 
                                        holidays.some(h => h.date.getTime() === day.getTime() && getISODay(day) !== 7)
                                    );
                                    return (
                                    <TableHead key={week.key} className={cn("w-48 min-w-48 p-1 text-center text-xs font-normal border-l", hasHoliday && "bg-primary/10")}>
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
                                    </TableHead>
                                )})}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedGroups.map((group, groupIndex) => (
                                <TableRow key={group.id} className="h-10 align-top bg-muted/30">
                                    <TableCell className="font-semibold text-sm p-2 sticky left-0 z-10 bg-card border-b">
                                        {group.name}
                                    </TableCell>
                                    {weeksOfYear.map(week => {
                                         const employeesInGroup = groupedEmployeesByWeek[week.key]?.[group.id] || [];
                                         const hasEmployees = employeesInGroup.length > 0;
                                         const bgColor = hasEmployees ? groupColors[groupIndex % groupColors.length] : '';
                                        return (
                                            <TableCell 
                                                key={`${group.id}-${week.key}`} 
                                                className={cn("w-48 min-w-48 p-1.5 border-l align-top text-xs", bgColor)}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    {employeesInGroup.map(name => (
                                                        <div key={name} className="truncate p-0.5">{name}</div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                             <TableRow className="h-10 align-top bg-muted/30">
                                <TableCell className="font-semibold text-sm p-2 sticky left-0 z-10 bg-card border-b">
                                    Sin Agrupación
                                </TableCell>
                                {weeksOfYear.map(week => {
                                    const employeesInGroup = groupedEmployeesByWeek[week.key]?.['unassigned'] || [];
                                    const hasEmployees = employeesInGroup.length > 0;
                                    return (
                                        <TableCell 
                                            key={`unassigned-${week.key}`} 
                                            className={cn(
                                                "w-48 min-w-48 p-1.5 border-l align-top text-xs",
                                                hasEmployees && "bg-gray-300"
                                            )}
                                        >
                                            <div className="flex flex-col gap-1">
                                                {employeesInGroup.map(name => (
                                                    <div key={name} className="truncate p-0.5">{name}</div>
                                                ))}
                                            </div>
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

    