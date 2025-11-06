
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { format, eachDayOfInterval, getYear, isBefore, addWeeks, startOfWeek, endOfWeek, isSameDay, addDays, isAfter, parseISO, startOfDay, getISODay, differenceInWeeks, isWithinInterval, getISOWeek, subWeeks, endOfDay, getISOWeekYear, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataProvider } from '@/hooks/use-data-provider';
import { WeekNavigator } from '@/components/schedule/week-navigator';
import { WeekRow } from '@/components/schedule/week-row';
import type { Employee, DailyEmployeeData, DailyData } from '@/lib/types';
import { CompletionDialog } from '@/components/schedule/completion-dialog';
import { Badge } from '@/components/ui/badge';
import { MessageSquareWarning } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AddAbsenceDialog } from '@/components/schedule/add-absence-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function SchedulePage() {
    const dataProvider = useDataProvider();
    const { 
        loading, 
        employees, 
        getWeekId, 
        weeklyRecords,
        holidays,
        processEmployeeWeekData,
        getActiveEmployeesForDate,
        findNextUnconfirmedWeek,
        correctionRequests,
        availableYears,
        absenceTypes,
        unconfirmedWeeksDetails
    } = dataProvider;
    const searchParams = useSearchParams();

    const getInitialDate = useCallback(() => {
        const weekParam = searchParams.get('week');
        if (weekParam) {
            const date = parseISO(weekParam);
            if (isValid(date)) return startOfWeek(date, { weekStartsOn: 1 });
        }
        
        if (unconfirmedWeeksDetails && unconfirmedWeeksDetails.length > 0) {
            const oldestWeekId = unconfirmedWeeksDetails[unconfirmedWeeksDetails.length - 1].weekId;
            const date = parseISO(oldestWeekId);
            if (isValid(date)) return startOfWeek(date, { weekStartsOn: 1 });
        }
        
        return startOfWeek(new Date(), { weekStartsOn: 1 });
    
    }, [searchParams, unconfirmedWeeksDetails]);
    
    const [currentDate, setCurrentDate] = useState(getInitialDate);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
    const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
    const [processedWeeklyViewData, setProcessedWeeklyViewData] = useState<Record<string, DailyEmployeeData | null>>({});
    const [completionInfo, setCompletionInfo] = useState<{ weekId: string; nextWeekId: string | null } | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    useEffect(() => {
        if (!loading) {
            setCurrentDate(getInitialDate());
            if (selectedEmployeeId === 'all') {
                 setSelectedYear(getYear(new Date()));
            } else {
                setSelectedYear(getISOWeekYear(currentDate));
            }
        }
    }, [loading, getInitialDate, selectedEmployeeId]);
    
    const isEmployeeActiveForWeek = useCallback((employee: Employee, weekStartDate: Date): boolean => {
        const weekStart = startOfDay(weekStartDate);
        const weekEnd = endOfDay(endOfWeek(weekStart, { weekStartsOn: 1 }));

        return employee.employmentPeriods.some(p => {
            const periodStart = startOfDay(p.startDate as Date);
            const periodEnd = p.endDate ? endOfDay(p.endDate as Date) : new Date('9999-12-31');
            
            return isBefore(periodStart, weekEnd) && isAfter(periodEnd, weekStart);
        });
    }, []);

    const activeEmployeesForSchedule = useMemo(() => {
        return employees.filter(emp => isEmployeeActiveForWeek(emp, currentDate));
    }, [currentDate, employees, isEmployeeActiveForWeek]);

    const activeEmployeesForDropdown = useMemo(() => {
        return employees.filter(e => e.employmentPeriods?.some(p => {
            if (!p.endDate) return true;
            const endDate = typeof p.endDate === 'string' ? parseISO(p.endDate) : p.endDate;
            return isAfter(endDate, startOfDay(new Date()));
        }));
    }, [employees]);

    const weekId = useMemo(() => {
        return getWeekId(currentDate);
    }, [currentDate, getWeekId]);

    const weekDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }), [currentDate]);
    
    const onWeekCompleted = (completedWeekId: string) => {
        const activeEmployeesForCompletedWeek = getActiveEmployeesForDate(parseISO(completedWeekId));
        const allConfirmed = activeEmployeesForCompletedWeek.every(emp => 
            weeklyRecords[completedWeekId]?.weekData?.[emp.id]?.confirmed
        );

        if (allConfirmed) {
            const nextWeekId = findNextUnconfirmedWeek(parseISO(completedWeekId));
            setCompletionInfo({ weekId: completedWeekId, nextWeekId });
        }
    };

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

    }, [loading, weekId, selectedEmployeeId, processEmployeeWeekData, weekDays, activeEmployeesForSchedule, employees, weeklyRecords]);
    
    const pendingRequestsForWeek = useMemo(() => {
        return correctionRequests.filter(r => r.weekId === weekId && r.status === 'pending');
    }, [correctionRequests, weekId]);


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
                                <TableHead className="sticky left-0 bg-card z-10 w-[200px] min-w-[200px] p-2"><Skeleton className="h-6 w-full" /></TableHead>
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
    
        let weeksOfYear: Date[] = [];
        const year = selectedYear;

        let firstMondayOfYear = startOfWeek(new Date(year, 0, 4), { weekStartsOn: 1 });
        if (getISOWeek(firstMondayOfYear) > 1) {
            firstMondayOfYear = subWeeks(firstMondayOfYear, 1);
        }
        weeksOfYear = Array.from({ length: 53 }).map((_, i) => addWeeks(firstMondayOfYear, i))
            .filter(d => {
                const isoYear = getISOWeekYear(d);
                // Special case for 2025: include the week of 2024-12-30
                if (year === 2025) {
                    return isoYear === 2025;
                }
                return isoYear === year;
            });
    
        return (
            <Card className="rounded-none border-0 border-t bg-card">
                <CardHeader className="flex flex-row justify-between items-center">
                    <h2 className="text-xl font-bold text-center">Vista Anual de {employee.name} - {selectedYear}</h2>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                    <Table>
                        <TableBody>
                            {weeksOfYear.map(weekStartDate => {
                                const currentWeekId = getWeekId(weekStartDate);
                                
                                if (!isEmployeeActiveForWeek(employee, weekStartDate)) return null;
                                
                                const currentWeekDays = eachDayOfInterval({ start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 }) });
                                const initialWeekData = processEmployeeWeekData(employee, currentWeekDays, currentWeekId);
                                
                                if (!initialWeekData) {
                                    return <TableRow key={currentWeekId}><TableCell colSpan={8} className="p-0"><Skeleton className="h-48 w-full rounded-none" /></TableCell></TableRow>;
                                }

                                const hasCorrectionRequest = correctionRequests.some(r => r.weekId === currentWeekId && r.employeeId === employee.id && r.status === 'pending');

                                return (
                                    <React.Fragment key={currentWeekId}>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="sticky left-0 bg-muted z-20 font-semibold p-2 text-xs w-[150px] sm:w-[200px] min-w-[150px] sm:min-w-[200px]" colSpan={1}>
                                                <div className="flex items-center gap-2">
                                                    {hasCorrectionRequest && <MessageSquareWarning className="h-4 w-4 text-destructive" />}
                                                    {format(startOfWeek(weekStartDate, {weekStartsOn:1}), 'd MMM')} - {format(endOfWeek(weekStartDate, {weekStartsOn:1}), 'd MMM yyyy', {locale:es})}
                                                </div>
                                            </TableHead>
                                            {currentWeekDays.map(d => <TableHead key={d.toISOString()} className={cn("text-left p-2 text-xs", holidays.some(h => isSameDay(h.date, d)) && "bg-blue-100")}><span className="sm:hidden">{format(d, 'E', {locale:es})}</span><span className="hidden sm:inline">{format(d, 'E dd/MM', {locale:es})}</span></TableHead>)}
                                        </TableRow>
                                        <WeekRow employee={employee} weekId={currentWeekId} weekDays={currentWeekDays} initialWeekData={initialWeekData} onWeekCompleted={onWeekCompleted} />
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
            <CardHeader className="flex flex-col gap-2 items-center">
                <div className="flex w-full justify-center items-center gap-4">
                    <div className="flex-1 flex justify-end">
                    </div>
                    <div className="flex-grow-0">
                        <WeekNavigator currentDate={currentDate} onWeekChange={setCurrentDate} onDateSelect={setCurrentDate} />
                    </div>
                    <div className="flex-1"></div>
                </div>

                {pendingRequestsForWeek.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                             <Badge variant="destructive" className="mt-2 animate-pulse cursor-pointer">
                                <MessageSquareWarning className="mr-2 h-4 w-4" />
                                {pendingRequestsForWeek.length} solicitud(es) de corrección
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent>
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Solicitudes Pendientes</h4>
                                <p className="text-sm text-muted-foreground">
                                    Los siguientes empleados han solicitado correcciones para esta semana:
                                </p>
                                <ul className="list-disc list-inside">
                                    {pendingRequestsForWeek.map(req => (
                                        <li key={req.id} className="text-sm">{req.employeeName}</li>
                                    ))}
                                </ul>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-gradient-to-br from-primary/10 to-transparent z-20 p-2 text-xs w-[150px] sm:w-[200px] min-w-[150px] sm:min-w-[200px]">Empleado</TableHead>
                                {weekDays.map(d => {
                                    const isHoliday = holidays.some(h => isSameDay(h.date, d));
                                    return (
                                        <TableHead key={d.toISOString()} className={cn(
                                            "text-center p-2 text-xs min-w-[100px] sm:min-w-[120px]", 
                                            isHoliday 
                                            ? "bg-gradient-to-br from-green-100 to-transparent" 
                                            : "bg-gradient-to-br from-gray-50/50 to-transparent"
                                        )}>
                                            <span className="sm:hidden">{format(d, 'E', {locale:es})}</span>
                                            <span className="hidden sm:inline">{format(d, 'E dd/MM', {locale:es})}</span>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeEmployeesForSchedule.length > 0 ? activeEmployeesForSchedule.map(employee => {
                                const employeeWeekData = processedWeeklyViewData[employee.id];
                                if (!employeeWeekData) {
                                    return <TableRow key={`${employee.id}-${weekId}`}><TableCell colSpan={8} className="p-0"><Skeleton className="h-48 w-full rounded-none" /></TableCell></TableRow>;
                                }
                                return (
                                    <WeekRow key={`${employee.id}-${weekId}`} employee={employee} weekId={weekId} weekDays={weekDays} initialWeekData={employeeWeekData} onWeekCompleted={onWeekCompleted} />
                                )
                            }) : <TableRow><TableCell colSpan={8} className="text-center h-48">No hay empleados activos esta semana.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

 return (
    <>
    <CompletionDialog
        isOpen={!!completionInfo}
        onClose={() => setCompletionInfo(null)}
        nextWeekId={completionInfo?.nextWeekId}
        onNavigate={(weekId) => {
            setCurrentDate(parseISO(weekId));
            setCompletionInfo(null);
        }}
    />
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
                {selectedEmployeeId !== 'all' && (
                  <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                      <SelectTrigger className="w-full sm:w-[120px] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                  </Select>
                )}
            </div>
        </div>
        {selectedEmployeeId === 'all' ? renderWeeklyView() : renderAnnualView()}
    </div>
    </>
  );
}
