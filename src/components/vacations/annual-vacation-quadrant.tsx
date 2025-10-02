
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataProvider } from '@/hooks/use-data-provider';
import { addWeeks, endOfWeek, format, getISOWeek, getYear, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

export function AnnualVacationQuadrant() {
    const { employees, holidayEmployees, employeeGroups, getVacationSummaryForWeek, loading } = useDataProvider();

    const allEmployees = useMemo(() => {
        const internal = employees.map(e => ({ ...e, isExternal: false }));
        const external = holidayEmployees.map(e => ({ id: e.id, name: e.name, groupId: e.groupId, isExternal: true }));
        return [...internal, ...external];
    }, [employees, holidayEmployees]);

    const groupedEmployees = useMemo(() => {
        const sortedGroups = [...employeeGroups].sort((a, b) => a.order - b.order);
        const groupsMap = new Map<string, { name: string; employees: any[] }>();

        sortedGroups.forEach(group => {
            groupsMap.set(group.id, { name: group.name, employees: [] });
        });

        allEmployees.forEach(emp => {
            if (emp.groupId && groupsMap.has(emp.groupId)) {
                groupsMap.get(emp.groupId)?.employees.push(emp);
            } else {
                const otherGroup = groupsMap.get('other') || { name: 'Sin Agrupación', employees: [] };
                otherGroup.employees.push(emp);
                if (!groupsMap.has('other')) {
                    groupsMap.set('other', otherGroup);
                }
            }
        });
        
        // Sort employees within each group by name
        for (const group of groupsMap.values()) {
            group.employees.sort((a, b) => a.name.localeCompare(b.name));
        }

        return Array.from(groupsMap.values()).filter(g => g.employees.length > 0);
    }, [allEmployees, employeeGroups]);

    const weeksOfYear = useMemo(() => {
        const year = new Date().getFullYear();
        const firstDay = startOfYear(new Date(year, 0, 1));
        const weeks = [];
        for (let i = 0; i < 53; i++) {
            const weekStart = addWeeks(firstDay, i);
            if (getYear(weekStart) === year) {
                weeks.push(weekStart);
            }
        }
        return weeks;
    }, []);

    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cuadrante Anual de Vacaciones</CardTitle>
                <CardDescription>
                    Vista anual de la planificación de vacaciones, ordenada por agrupación.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <Table className="min-w-full table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-center sticky left-0 bg-card z-20">Sem</TableHead>
                                <TableHead className="w-24 text-center sticky left-12 bg-card z-20">Fechas</TableHead>
                                <TableHead className="w-20 text-center sticky left-[148px] bg-card z-20">En Vac.</TableHead>
                                <TableHead className="w-20 text-center sticky left-[228px] bg-card z-20">H. Impacto</TableHead>
                                {groupedEmployees.map(group => (
                                    <TableHead 
                                        key={group.name} 
                                        colSpan={group.employees.length} 
                                        className="text-center bg-muted/50"
                                    >
                                        {group.name}
                                    </TableHead>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-card z-10 p-0 h-0" colSpan={4}></TableHead>
                                {groupedEmployees.map(group =>
                                    group.employees.map(emp => (
                                        <TableHead key={emp.id} className="w-32 text-xs p-1 text-center truncate font-normal">
                                            {emp.name}
                                        </TableHead>
                                    ))
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weeksOfYear.map(weekStart => {
                                const weekSummary = getVacationSummaryForWeek(weekStart);
                                return (
                                    <TableRow key={weekStart.toISOString()} className="hover:bg-muted/20">
                                        <TableCell className="w-12 text-center text-xs font-medium sticky left-0 bg-card">
                                            {getISOWeek(weekStart)}
                                        </TableCell>
                                        <TableCell className="w-24 text-center text-xs sticky left-12 bg-card">
                                            {format(weekStart, 'dd/MM')} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'dd/MM')}
                                        </TableCell>
                                        <TableCell className="w-20 text-center text-sm font-bold sticky left-[148px] bg-card">
                                            {weekSummary.vacationingEmployees.size}
                                        </TableCell>
                                        <TableCell className="w-20 text-center text-xs font-mono sticky left-[228px] bg-card">
                                            {weekSummary.totalWeeklyHours.toFixed(2)}h
                                        </TableCell>
                                        {groupedEmployees.map(group =>
                                            group.employees.map(emp => {
                                                const isOnVacation = weekSummary.vacationingEmployees.has(emp.id);
                                                return (
                                                <TableCell 
                                                    key={emp.id} 
                                                    className={cn("w-32 p-0", isOnVacation && "bg-primary/20")}
                                                >
                                                    {/* TODO: Add interaction logic here */}
                                                </TableCell>
                                            )})
                                        )}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
