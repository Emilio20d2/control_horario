'use client';

import React, { useMemo, useState } from 'react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addWeeks, endOfWeek, getISOWeek, getYear, isAfter, isEmployeeActiveForWeek, parseISO, startOfWeek, subWeeks, addDays, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WeekRow } from '@/components/schedule/week-row';
import { cn } from '@/lib/utils';


export default function MySchedulePage() {
    const { appUser, employees, loading, getWeekId, processEmployeeWeekData, holidays } = useDataProvider();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const employee = useMemo(() => {
        return employees.find(e => e.id === appUser?.employeeId);
    }, [employees, appUser]);

    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).filter(y => y >= 2025);
    }, []);

    const isEmployeeActiveForWeek = (employee, weekStartDate) => {
        const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
        return employee.employmentPeriods.some(p => {
            const periodStart = parseISO(p.startDate);
            const periodEnd = p.endDate ? parseISO(p.endDate) : new Date('9999-12-31');
            return !isAfter(periodStart, weekEnd) && !isAfter(weekStartDate, periodEnd);
        });
    };

    const weeksOfYear = useMemo(() => {
        let firstMondayOfYear = startOfWeek(new Date(selectedYear, 0, 4), { weekStartsOn: 1 });
        if (getISOWeek(firstMondayOfYear) > 1) {
            firstMondayOfYear = subWeeks(firstMondayOfYear, 1);
        }
        return Array.from({ length: 53 }).map((_, i) => addWeeks(firstMondayOfYear, i))
            .filter(d => {
                const yearOfWeek = getYear(addDays(d, 3));
                const isoWeek = getISOWeek(d);
                if (yearOfWeek === selectedYear) return true;
                if (getYear(d) === selectedYear - 1 && isoWeek >= 52 && getYear(endOfWeek(d, { weekStartsOn: 1 })) === selectedYear) return true;
                if (getYear(d) === selectedYear + 1 && isoWeek === 1 && getYear(startOfWeek(d, { weekStartsOn: 1 })) === selectedYear) return true;
                return false;
            });
    }, [selectedYear]);

    if (loading) {
        return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
    }

    if (!appUser || !employee) {
        return notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight font-headline">Mis Horarios Confirmados</h1>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Seleccionar año..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableBody>
                            {weeksOfYear.map(weekStartDate => {
                                const weekId = getWeekId(weekStartDate);
                                const weekDays = eachDayOfInterval({ start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 }) });
                                
                                if (!isEmployeeActiveForWeek(employee, weekStartDate)) return null;

                                const weekData = processEmployeeWeekData(employee, weekDays, weekId);
                                if (!weekData || !weekData.confirmed) return null;

                                return (
                                    <React.Fragment key={weekId}>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="sticky left-0 bg-muted z-10 font-semibold p-2 text-xs" colSpan={1}>
                                                {format(weekStartDate, 'd MMM')} - {format(endOfWeek(weekStartDate, {weekStartsOn:1}), 'd MMM yyyy', {locale:es})}
                                            </TableHead>
                                            {weekDays.map(d => (
                                                <TableHead key={d.toISOString()} className={cn("text-center p-2 text-xs", holidays.some(h => isSameDay(h.date, d)) && "bg-blue-100")}>
                                                    {format(d, 'E dd/MM', {locale:es})}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                        <WeekRow
                                            employee={employee}
                                            weekId={weekId}
                                            weekDays={weekDays}
                                            initialWeekData={weekData}
                                            onWeekCompleted={() => {}}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
