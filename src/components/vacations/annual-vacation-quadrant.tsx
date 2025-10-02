
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataProvider } from '@/hooks/use-data-provider';
import { addWeeks, endOfWeek, format, getISOWeek, getYear, startOfYear, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, parseISO, startOfWeek } from 'date-fns';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import type { Employee, EmployeeGroup } from '@/lib/types';

export function AnnualVacationQuadrant() {
    const { employees, employeeGroups, loading, absenceTypes, weeklyRecords } = useDataProvider();

    const vacationType = useMemo(() => absenceTypes.find(at => at.name === 'Vacaciones'), [absenceTypes]);
    const currentYear = useMemo(() => new Date().getFullYear(), []);

    const employeesWithVacations = useMemo(() => {
        if (!vacationType || loading) return [];

        const yearDayMapByEmployee: Record<string, Set<string>> = {};

        // 1. Process all employees to initialize
        employees.forEach(emp => {
            yearDayMapByEmployee[emp.id] = new Set<string>();
        });
        
        // 2. Process scheduled absences from employee data
        employees.forEach(emp => {
            emp.employmentPeriods.flatMap(p => p.scheduledAbsences ?? [])
                .filter(a => a.absenceTypeId === vacationType.id)
                .forEach(absence => {
                    const absenceStart = startOfDay(absence.startDate);
                    const absenceEnd = absence.endDate ? endOfDay(absence.endDate) : absenceStart;

                    const daysInAbsence = eachDayOfInterval({ start: absenceStart, end: absenceEnd });
                    daysInAbsence.forEach(day => {
                        if (getYear(day) === currentYear) {
                            yearDayMapByEmployee[emp.id].add(format(day, 'yyyy-MM-dd'));
                        }
                    });
                });
        });

        // 3. Process weekly records for daily vacation entries
        Object.values(weeklyRecords).forEach(record => {
            Object.keys(record.weekData).forEach(employeeId => {
                if (yearDayMapByEmployee[employeeId]) {
                    const empWeekData = record.weekData[employeeId];
                    if (!empWeekData?.days) return;

                    Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                         if (dayData.absence === vacationType.abbreviation && getYear(new Date(dayStr)) === currentYear) {
                             yearDayMapByEmployee[employeeId].add(dayStr);
                        }
                    });
                }
            });
        });

        // 4. Map to final structure with vacation periods
        return employees.map(emp => {
            const vacationDays = Array.from(yearDayMapByEmployee[emp.id]);
            const vacationPeriods = vacationDays.map(day => {
                const date = new Date(day);
                return { start: startOfDay(date), end: endOfDay(date) };
            });
            return { ...emp, vacationPeriods };
        });

    }, [employees, vacationType, weeklyRecords, currentYear, loading]);


    const groupedEmployees = useMemo(() => {
        const groupsMap = new Map<string, { name: string; employees: any[] }>();
        
        [...employeeGroups].sort((a,b) => a.order - b.order).forEach(group => {
            groupsMap.set(group.id, { name: group.name, employees: [] });
        });
        
        const otherGroup = { name: 'Sin Agrupación', employees: [] as any[] };
        groupsMap.set('other', otherGroup);

        employeesWithVacations.forEach(emp => {
            if (emp.groupId && groupsMap.has(emp.groupId)) {
                groupsMap.get(emp.groupId)?.employees.push(emp);
            } else {
                otherGroup.employees.push(emp);
            }
        });
        
        for (const group of groupsMap.values()) {
            group.employees.sort((a, b) => a.name.localeCompare(b.name));
        }

        return Array.from(groupsMap.values()).filter(g => g.employees.length > 0);
    }, [employeesWithVacations, employeeGroups]);


    const weeksOfYear = useMemo(() => {
        const year = currentYear;
        const firstDayOfYear = new Date(year, 0, 1);
        let firstMonday = startOfWeek(firstDayOfYear, { weekStartsOn: 1 });
    
        // Si la primera semana del año pertenece al año anterior, avanza a la siguiente.
        if (getYear(firstMonday) < year) {
            firstMonday = addWeeks(firstMonday, 1);
        }

        const weeks = [];
        let currentWeekStart = firstMonday;

        for (let i = 0; i < 53; i++) {
            const weekStart = addWeeks(firstMonday, i);
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

            // Solo incluye semanas que son parte del año actual
            if (getYear(weekStart) === year || getYear(weekEnd) === year) {
                 weeks.push({
                    start: weekStart,
                    end: weekEnd,
                    number: getISOWeek(weekStart),
                    year: getYear(weekStart),
                });
            } else if (getYear(weekStart) > year) {
                break;
            }
        }
        return weeks;
    }, [currentYear]);

    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
    }
    
    const chartColors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cuadrante Anual de Vacaciones</CardTitle>
                <CardDescription>
                    Vista anual de la planificación de vacaciones, ordenada por agrupación.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border max-h-[70vh]">
                    <Table className="min-w-full table-fixed border-collapse">
                        <TableHeader className='sticky top-0 z-20 bg-card'>
                            <TableRow>
                                <TableHead className="w-48 min-w-48 p-2 text-left sticky left-0 z-10 bg-card">Agrupación</TableHead>
                                {weeksOfYear.map(week => (
                                    <TableHead key={`${week.year}-W${week.number}`} className="w-48 min-w-48 p-1 text-center text-xs font-normal border-l">
                                        <div className='flex flex-col items-center justify-center h-12'>
                                            <span className='font-semibold'>Semana {week.number}</span>
                                            <span className='text-muted-foreground'>
                                                {format(week.start, 'dd/MM')} - {format(week.end, 'dd/MM')}
                                            </span>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedEmployees.map((group, groupIndex) => (
                                group.employees.map((emp, empIndex) => (
                                     <TableRow key={emp.id} className="hover:bg-accent/20 h-10 align-top">
                                        <TableCell className={cn("font-medium text-sm p-2 sticky left-0 z-10 bg-card flex items-center gap-2 h-10", empIndex === 0 && "border-t-2 border-primary/50")}>
                                            {empIndex === 0 && <div className={cn('w-2 h-6 rounded-sm', chartColors[groupIndex % chartColors.length])}></div>}
                                            <span className={cn(empIndex !== 0 && "pl-4")}>{emp.name}</span>
                                        </TableCell>
                                        {weeksOfYear.map(week => {
                                            const hasVacation = emp.vacationPeriods.some((period: {start: Date, end: Date}) => 
                                                period.start <= week.end && period.end >= week.start
                                            );
                                            return (
                                                <TableCell key={`${emp.id}-${week.year}-W${week.number}`} className={cn("w-48 min-w-48 p-0 border-l", empIndex === 0 && "border-t-2 border-primary/50")}>
                                                    {hasVacation && <div className={cn('h-10', chartColors[groupIndex % chartColors.length], 'opacity-70')}></div>}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
