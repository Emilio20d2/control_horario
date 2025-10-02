
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataProvider } from '@/hooks/use-data-provider';
import { addWeeks, endOfWeek, format, getISOWeek, getYear, startOfYear } from 'date-fns';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

export function AnnualVacationQuadrant() {
    const { employees, holidayEmployees, employeeGroups, loading } = useDataProvider();

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
        
        const otherGroup = { name: 'Sin Agrupación', employees: [] as any[] };
        groupsMap.set('other', otherGroup);

        allEmployees.forEach(emp => {
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
    }, [allEmployees, employeeGroups]);

    const weeksOfYear = useMemo(() => {
        const year = new Date().getFullYear();
        const firstDay = startOfYear(new Date(year, 0, 1));
        const weeks = [];
        for (let i = 0; i < 53; i++) {
            const weekStart = addWeeks(firstDay, i);
            if (getYear(weekStart) === year) {
                weeks.push({
                    start: weekStart,
                    number: getISOWeek(weekStart),
                    label: `${format(weekStart, 'dd/MM')} - ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'dd/MM')}`
                });
            }
        }
        return weeks;
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
                    <Table className="min-w-full table-auto border-collapse">
                        <TableHeader className='sticky top-0 z-20 bg-card'>
                            <TableRow>
                                <TableHead className="w-64 min-w-64 p-2 text-left sticky left-0 z-10 bg-card">Empleado</TableHead>
                                {weeksOfYear.map(week => (
                                    <TableHead key={week.number} className="w-12 min-w-12 p-1 text-center text-xs font-normal border-l">
                                        <div className='flex flex-col items-center justify-center'>
                                            <span className='font-semibold'>{week.number}</span>
                                            <span className='text-muted-foreground' style={{writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)'}}>
                                                {week.label.substring(0,5)}
                                            </span>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedEmployees.map((group, groupIndex) => (
                                <>
                                    <TableRow key={group.name} className="bg-muted/60 hover:bg-muted/60">
                                        <TableCell className="font-bold text-sm p-2 sticky left-0 z-10 bg-muted/60 flex items-center gap-2">
                                             <div className={cn('w-2 h-6 rounded-sm', chartColors[groupIndex % chartColors.length])}></div>
                                            {group.name}
                                        </TableCell>
                                        <TableCell colSpan={weeksOfYear.length} className="p-0"></TableCell>
                                    </TableRow>
                                    {group.employees.map(emp => (
                                        <TableRow key={emp.id} className="hover:bg-accent/20">
                                            <TableCell className="p-2 text-sm sticky left-0 bg-card z-10">{emp.name}</TableCell>
                                            {weeksOfYear.map(week => (
                                                <TableCell 
                                                    key={`${emp.id}-${week.number}`}
                                                    className="w-12 min-w-12 p-0 border-l"
                                                >
                                                   {/* TODO: Add vacation visualization logic here */}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </>
                            ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
