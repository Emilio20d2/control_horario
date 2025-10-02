
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataProvider } from '@/hooks/use-data-provider';
import { addWeeks, endOfWeek, format, getISOWeek, getYear, startOfYear, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import type { Employee, EmployeeGroup } from '@/lib/types';

export function AnnualVacationQuadrant() {
    const { employees, employeeGroups, loading, absenceTypes } = useDataProvider();

    const vacationType = useMemo(() => absenceTypes.find(at => at.name === 'Vacaciones'), [absenceTypes]);

    const employeesWithVacations = useMemo(() => {
        if (!vacationType) return [];
        return employees.map(emp => {
            const vacationPeriods = emp.employmentPeriods.flatMap(p => p.scheduledAbsences ?? [])
                .filter(a => a.absenceTypeId === vacationType.id)
                .map(a => ({
                    start: startOfDay(a.startDate),
                    end: a.endDate ? endOfDay(a.endDate) : endOfDay(a.startDate)
                }));
            return { ...emp, vacationPeriods };
        });
    }, [employees, vacationType]);


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
        const year = new Date().getFullYear();
        let firstDay = startOfYear(new Date(year, 0, 1));
        if (getISOWeek(firstDay) > 1) {
            firstDay = addWeeks(firstDay, 1);
        }
    
        const weeks = [];
        for (let i = 0; i < 53; i++) {
            const weekStart = addWeeks(firstDay, i);
            if (getYear(weekStart) <= year) {
                 weeks.push({
                    start: weekStart,
                    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
                    number: getISOWeek(weekStart),
                });
            }
        }
        return weeks.filter(w => getYear(w.start) === year || getYear(w.end) === year);
    }, []);

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
                                    <TableHead key={week.number} className="w-48 min-w-48 p-1 text-center text-xs font-normal border-l">
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
                                <TableRow key={group.name} className="hover:bg-accent/20 h-24 align-top">
                                    <TableCell className="font-bold text-sm p-2 sticky left-0 z-10 bg-card flex items-center gap-2 h-24">
                                        <div className={cn('w-2 h-6 rounded-sm', chartColors[groupIndex % chartColors.length])}></div>
                                        {group.name}
                                    </TableCell>
                                    {weeksOfYear.map(week => {
                                        const vacationingEmployees = group.employees.filter(emp => 
                                            emp.vacationPeriods.some((period: {start: Date, end: Date}) => 
                                                period.start <= week.end && period.end >= week.start
                                            )
                                        ).map((emp: Employee) => emp.name);

                                        return (
                                            <TableCell key={`${group.name}-${week.number}`} className="w-48 min-w-48 p-2 border-l align-top">
                                                <ul className="text-xs space-y-1">
                                                    {vacationingEmployees.map(name => (
                                                        <li key={name} className="truncate p-1 bg-primary/10 rounded-sm">{name}</li>
                                                    ))}
                                                </ul>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
