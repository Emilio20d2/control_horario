
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { format, eachDayOfInterval, getYear, isBefore, addWeeks, startOfWeek, endOfWeek, isSameDay, addDays, isAfter, parseISO, startOfDay, getISODay, differenceInWeeks, isWithinInterval, getISOWeek, subWeeks, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataProvider } from '@/hooks/use-data-provider';
import { WeekNavigator } from '@/components/schedule/week-navigator';
import { WeekRow } from '@/components/schedule/week-row';
import type { Employee, DailyEmployeeData, DailyData } from '@/lib/types';

export default function SchedulePage() {
    const { 
        loading, 
        employees, 
        getWeekId, 
        weeklyRecords,
        holidays,
        processEmployeeWeekData,
    } = useDataProvider();
    
    const [currentDate, setCurrentDate] = useState(new Date('2024-12-30'));
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
    const [selectedYear, setSelectedYear] = useState(2025);
    const [processedWeeklyViewData, setProcessedWeeklyViewData] = useState<Record<string, DailyEmployeeData | null>>({});
    const [processedAnnualViewData, setProcessedAnnualViewData] = useState<Record<string, DailyEmployeeData | null>>({});
    
    const isEmployeeActiveForWeek = useCallback((employee: Employee, weekStartDate: Date): boolean => {
        const weekStart = startOfDay(weekStartDate);
        const weekEnd = endOfDay(endOfWeek(weekStart, { weekStartsOn: 1 }));

        return employee.employmentPeriods.some(p => {
            const periodStart = startOfDay(parseISO(p.startDate as string));
            const periodEnd = p.endDate ? endOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
            
            return periodStart <= weekEnd && periodEnd >= weekStart;
        });
    }, []);

    const activeEmployeesForSchedule = useMemo(() => {
        return employees.filter(emp => isEmployeeActiveForWeek(emp, currentDate));
    }, [currentDate, employees, isEmployeeActiveForWeek]);

    const activeEmployeesForDropdown = useMemo(() => {
        return employees.filter(e => e.employmentPeriods?.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), startOfDay(new Date()))));
    }, [employees]);

    const weekId = useMemo(() => {
        return getWeekId(currentDate);
    }, [currentDate, getWeekId]);

    const weekDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }), [currentDate]);
    
    const isWeekFullyConfirmed = useCallback((date: Date) => {
        const currentWeekId = getWeekId(date);
        const weekRecord = weeklyRecords[currentWeekId]?.weekData;
        
        const activeEmpsForWeek = employees.filter(emp => isEmployeeActiveForWeek(emp, date));

        if (activeEmpsForWeek.length === 0 && getYear(date) > getYear(new Date())) return true;
        if (!weekRecord || activeEmpsForWeek.length === 0) return false;
        
        return activeEmpsForWeek.every(emp => weekRecord[emp.id]?.confirmed);
    }, [employees, getWeekId, weeklyRecords, isEmployeeActiveForWeek]);

    // Effect to find the first unconfirmed week
    useEffect(() => {
        if (loading || selectedEmployeeId !== 'all' || Object.keys(weeklyRecords).length === 0) return;
    
        let dateToCheck = startOfWeek(new Date('2024-12-30'), { weekStartsOn: 1 });
        const limit = addWeeks(new Date(), 104); // Limit to 2 years of search from today
        
        let foundDate = dateToCheck;
        while (isBefore(foundDate, limit) && isWeekFullyConfirmed(foundDate)) {
            foundDate = addWeeks(foundDate, 1);
        }
        setCurrentDate(foundDate);
    
    }, [loading, selectedEmployeeId, weeklyRecords, isWeekFullyConfirmed]);

    // Data processor for WEEKLY view (all employees)
    useEffect(() => {
        if (loading || selectedEmployeeId !== 'all') return;

        const newProcessedData: Record<string, DailyEmployeeData | null> = {};

        for (const emp of activeEmployeesForSchedule) {
            const empData = processEmployeeWeekData(emp, weekDays, weekId);
            if (empData) {
                newProcessedData[emp.id] = empData;
            }
        }
        setProcessedWeeklyViewData(newProcessedData);

    }, [loading, weekId, selectedEmployeeId, processEmployeeWeekData, weekDays, activeEmployeesForSchedule]);
    
    // Data processor for ANNUAL view (single employee)
    useEffect(() => {
        if (loading || selectedEmployeeId === 'all') return;
        
        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (!employee) return;
        
        let firstMondayOfYear = startOfWeek(new Date(selectedYear, 0, 4), { weekStartsOn: 1 });
        if (getISOWeek(firstMondayOfYear) > 1) {
            firstMondayOfYear = subWeeks(firstMondayOfYear, 1);
        }
        const weeksOfYear = Array.from({ length: 53 }).map((_, i) => addWeeks(firstMondayOfYear, i))
          .filter(d => {
              const yearOfWeek = getYear(addDays(d, 3));
              const isoWeek = getISOWeek(d);
              if (yearOfWeek === selectedYear) return true;
              if (getYear(d) === selectedYear - 1 && isoWeek >= 52 && getYear(endOfWeek(d, {weekStartsOn: 1})) === selectedYear) return true;
              if (getYear(d) === selectedYear + 1 && isoWeek === 1 && getYear(startOfWeek(d, {weekStartsOn: 1})) === selectedYear) return true;
              return false;
          });


        const newProcessedData: Record<string, DailyEmployeeData | null> = {};
        
        for (const weekStartDate of weeksOfYear) {
            const currentWeekId = getWeekId(weekStartDate);
            
             if (isEmployeeActiveForWeek(employee, weekStartDate)) {
                const currentWeekDays = eachDayOfInterval({ start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 }) });
                const empData = processEmployeeWeekData(employee, currentWeekDays, currentWeekId);
                if (empData) {
                    newProcessedData[currentWeekId] = empData;
                }
             }
        }
        setProcessedAnnualViewData(newProcessedData);
        
    }, [loading, selectedEmployeeId, selectedYear, employees, processEmployeeWeekData, getWeekId, isEmployeeActiveForWeek]);



    if (loading) {
      return (
        <div className="flex flex-col gap-0">
            <div className="flex justify-between items-center px-4 md:px-6 py-4">
                 <Skeleton className="h-9 w-48" />
                 <div className="flex gap-4">
                     <Skeleton className="h-9 w-64" />
                     <Skeleton className="h-9 w-32" />
                 </div>
            </div>
            <Card className="rounded-none border-0 border-t">
                <CardHeader><Skeleton className="h-10 w-full max-w-md mx-auto" /></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-card z-10 w-[150px] sm:w-[200px] min-w-[150px] sm:min-w-[200px] p-2"><Skeleton className="h-6 w-full" /></TableHead>
                                {Array.from({length: 7}).map((_, i) => <TableHead key={i}><Skeleton className="h-6 w-full" /></TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={8} className="p-0"><Skeleton className="h-48 w-full rounded-none" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      )
    }
    
    const renderAnnualView = () => {
        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (!employee) return <div className="text-center p-8">Empleado no encontrado.</div>;
    
        let firstMondayOfYear = startOfWeek(new Date(selectedYear, 0, 4), { weekStartsOn: 1 });
        if (getISOWeek(firstMondayOfYear) > 1) {
            firstMondayOfYear = subWeeks(firstMondayOfYear, 1);
        }

        const weeksOfYear = Array.from({ length: 53 }).map((_, i) => addWeeks(firstMondayOfYear, i))
            .filter(d => {
                const yearOfWeek = getYear(addDays(d, 3));
                const isoWeek = getISOWeek(d);
                if (yearOfWeek === selectedYear) return true;
                if (getYear(d) === selectedYear - 1 && isoWeek >= 52 && getYear(endOfWeek(d, {weekStartsOn: 1})) === selectedYear) return true;
                if (getYear(d) === selectedYear + 1 && isoWeek === 1 && getYear(startOfWeek(d, {weekStartsOn: 1})) === selectedYear) return true;

                return false;
            });
    
        return (
            <Card className="rounded-none border-0 border-t bg-card">
                <CardHeader>
                    <h2 className="text-xl font-bold text-center">Vista Anual de {employee.name} - {selectedYear}</h2>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                    <Table>
                        <TableBody>
                            {weeksOfYear.map(weekStartDate => {
                                const currentWeekId = getWeekId(weekStartDate);
                                
                                if (!isEmployeeActiveForWeek(employee, weekStartDate)) return null;
                                
                                const currentWeekDays = eachDayOfInterval({ start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 }) });
                                const initialWeekData = processedAnnualViewData[currentWeekId];
                                
                                if (!initialWeekData) {
                                    return <TableRow key={currentWeekId}><TableCell colSpan={8} className="p-0"><Skeleton className="h-48 w-full rounded-none" /></TableCell></TableRow>;
                                }

                                return (
                                    <React.Fragment key={currentWeekId}>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="sticky left-0 bg-muted z-20 font-semibold p-2 text-xs w-[150px] sm:w-[200px] min-w-[150px] sm:min-w-[200px]" colSpan={1}>
                                                {format(startOfWeek(weekStartDate, {weekStartsOn:1}), 'd MMM')} - {format(endOfWeek(weekStartDate, {weekStartsOn:1}), 'd MMM yyyy', {locale:es})}
                                            </TableHead>
                                            {currentWeekDays.map(d => <TableHead key={d.toISOString()} className={cn("text-left p-2 text-xs min-w-[140px]", holidays.some(h => isSameDay(h.date, d)) && "bg-primary/10")}><span className="sm:hidden">{format(d, 'E', {locale:es})}</span><span className="hidden sm:inline">{format(d, 'E dd/MM', {locale:es})}</span></TableHead>)}
                                        </TableRow>
                                        <WeekRow employee={employee} weekId={currentWeekId} weekDays={currentWeekDays} initialWeekData={initialWeekData} />
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }
    
    const renderWeeklyView = () => (
        <Card className="rounded-none border-0 border-t bg-card">
            <CardHeader><WeekNavigator currentDate={currentDate} onWeekChange={setCurrentDate} onDateSelect={setCurrentDate} /></CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-card z-10 p-2 text-xs w-[170px] sm:w-[200px] min-w-[170px] sm:min-w-[200px]">Empleado</TableHead>
                                {weekDays.map(d => <TableHead key={d.toISOString()} className={cn("text-left p-2 text-xs min-w-[140px]", holidays.some(h => isSameDay(h.date, d)) && "bg-primary/10")}><span className="sm:hidden">{format(d, 'E', {locale:es})}</span><span className="hidden sm:inline">{format(d, 'E dd/MM', {locale:es})}</span></TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeEmployeesForSchedule.length > 0 ? activeEmployeesForSchedule.map(employee => {
                                const employeeWeekData = processedWeeklyViewData[employee.id];
                                if (!employeeWeekData) {
                                    return <TableRow key={`${employee.id}-${weekId}`}><TableCell colSpan={8} className="p-0"><Skeleton className="h-48 w-full rounded-none" /></TableCell></TableRow>;
                                }
                                return (
                                    <WeekRow key={`${employee.id}-${weekId}`} employee={employee} weekId={weekId} weekDays={weekDays} initialWeekData={employeeWeekData} />
                                )
                            }) : <TableRow><TableCell colSpan={8} className="text-center h-48">No hay empleados activos esta semana.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

 return (
    <div className="flex flex-col gap-0">
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 md:px-6 py-4 gap-4">
            <h1 className="text-2xl font-bold tracking-tight font-headline">Registro Horario</h1>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="w-full sm:w-[250px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Empleados</SelectItem>
                        {activeEmployeesForDropdown.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {selectedEmployeeId !== 'all' && <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}><SelectTrigger className="w-full sm:w-[120px] h-9"><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:5},(_,i)=>getYear(new Date())-2+i).filter(y => y >= 2025).map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>}
            </div>
        </div>
        {selectedEmployeeId === 'all' ? renderWeeklyView() : renderAnnualView()}
    </div>
  );
}

    