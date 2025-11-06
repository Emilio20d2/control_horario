

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { format, eachDayOfInterval, getYear, addWeeks, startOfWeek, endOfWeek, isSameDay, addDays, isAfter, parseISO, startOfDay, getISODay, differenceInWeeks, isWithinInterval, getISOWeek, subWeeks, endOfDay, getISOWeekYear, isValid, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataProvider } from '@/hooks/use-data-provider';
import { WeekNavigator } from '@/components/schedule/week-navigator';
import { WeekRow } from '@/components/schedule/week-row';
import type { Employee, DailyEmployeeData, DailyData, AbsenceType } from '@/lib/types';
import { CompletionDialog } from '@/components/schedule/completion-dialog';
import { Badge } from '@/components/ui/badge';
import { MessageSquareWarning, CalendarPlus, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { endIndefiniteAbsence } from '@/lib/services/employeeService';

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
        refreshData,
        unconfirmedWeeksDetails
    } = dataProvider;
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const initialDate = useMemo(() => {
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
    }, [searchParams, unconfirmedWeeksDetails, getWeekId]);
    
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
    const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
    
    const [processedWeeklyViewData, setProcessedWeeklyViewData] = useState<Record<string, DailyEmployeeData>>({});
    const [processedAnnualViewData, setProcessedAnnualViewData] = useState<Record<string, DailyEmployeeData>>({});
    const [balancePreviews, setBalancePreviews] = useState<Record<string, any | null>>({});
    const [initialBalancesMap, setInitialBalancesMap] = useState<Record<string, any | null>>({});
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

    const [completionInfo, setCompletionInfo] = useState<{ weekId: string; nextWeekId: string | null } | null>(null);

    useEffect(() => {
        if (!loading) {
            setCurrentDate(initialDate);
            if (selectedEmployeeId === 'all') {
                 setSelectedYear(getYear(new Date()));
            } else {
                setSelectedYear(getISOWeekYear(currentDate));
            }
        }
    }, [loading, initialDate, selectedEmployeeId, setSelectedYear, currentDate]);

    const isEmployeeActiveForWeek = useCallback((employee: Employee, weekStartDate: Date): boolean => {
        const weekStart = startOfDay(weekStartDate);
        const weekEnd = endOfDay(endOfWeek(weekStart, { weekStartsOn: 1 }));

        return employee.employmentPeriods.some(p => {
            const periodStart = startOfDay(p.startDate as Date);
            const periodEnd = p.endDate ? endOfDay(p.endDate as Date) : new Date('9999-12-31');
            
            return isBefore(periodStart, weekEnd) && isAfter(periodEnd, weekStart);
        });
    }, []);

    const activeEmployeesForDropdown = useMemo(() => {
        return employees.filter(e => e.employmentPeriods?.some(p => {
            if (!p.endDate) return true;
            const endDate = typeof p.endDate === 'string' ? parseISO(p.endDate) : p.endDate;
            return isAfter(endDate, startOfDay(new Date()));
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [employees]);

    const weekId = useMemo(() => getWeekId(currentDate), [currentDate, getWeekId]);
    const weekDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }), [currentDate]);
    
    // Initial data processing for weekly view
    useEffect(() => {
        if (loading || selectedEmployeeId !== 'all') return;
        
        const newProcessedData: Record<string, DailyEmployeeData> = {};
        const newInitialBalances: Record<string, any> = {};

        const activeForWeek = employees.filter(emp => isEmployeeActiveForWeek(emp, currentDate));
        
        for (const emp of activeForWeek) {
            const empData = processEmployeeWeekData(emp, weekDays, weekId);
            if (empData) {
                newProcessedData[emp.id] = empData;
                newInitialBalances[emp.id] = dataProvider.getEmployeeBalancesForWeek(emp.id, weekId);
            }
        }
        setProcessedWeeklyViewData(newProcessedData);
        setInitialBalancesMap(newInitialBalances);
    }, [loading, weekId, selectedEmployeeId, processEmployeeWeekData, weekDays, employees, isEmployeeActiveForWeek, currentDate, dataProvider.getEmployeeBalancesForWeek]);

    // Data processing for annual view
    useEffect(() => {
        if (loading || selectedEmployeeId === 'all') return;

        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (!employee) return;
        
        const year = selectedYear;
        let weeksOfYear: Date[] = [];
        const yearStartBoundary = startOfYear(new Date(year, 0, 1));
        const yearEndBoundary = endOfYear(new Date(year, 11, 31));
        if (year === 2025) {
            weeksOfYear.push(new Date('2024-12-30'));
        }
        weeksOfYear = [...weeksOfYear, ...eachWeekOfInterval({ start: yearStartBoundary, end: yearEndBoundary }, { weekStartsOn: 1 })];

        const newProcessedData: Record<string, DailyEmployeeData> = {};
        const newInitialBalances: Record<string, any> = {};

        weeksOfYear.forEach(weekStartDate => {
            const currentWeekId = getWeekId(weekStartDate);
            if (isEmployeeActiveForWeek(employee, weekStartDate)) {
                const currentWeekDays = eachDayOfInterval({ start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 }) });
                const empData = processEmployeeWeekData(employee, currentWeekDays, currentWeekId);
                if (empData) {
                    newProcessedData[currentWeekId] = empData;
                    newInitialBalances[currentWeekId] = dataProvider.getEmployeeBalancesForWeek(employee.id, currentWeekId);
                }
            }
        });
        
        setProcessedAnnualViewData(newProcessedData);
        setInitialBalancesMap(newInitialBalances);

    }, [loading, selectedEmployeeId, selectedYear, employees, processEmployeeWeekData, getWeekId, isEmployeeActiveForWeek, dataProvider.getEmployeeBalancesForWeek]);

    // Balance preview calculation effect
    useEffect(() => {
        const dataToProcess = selectedEmployeeId === 'all' ? processedWeeklyViewData : processedAnnualViewData;
        const keys = Object.keys(dataToProcess);

        if (keys.length === 0) {
            setBalancePreviews({});
            return;
        };

        const calculateAllPreviews = async () => {
            const newPreviews: Record<string, any | null> = {};
            for (const key of keys) {
                const isAnnualView = selectedEmployeeId !== 'all';
                const employeeId = isAnnualView ? selectedEmployeeId : key;
                const weekData = dataToProcess[key];
                const initialBalancesKey = isAnnualView ? key : employeeId;
                const initialBalances = initialBalancesMap[initialBalancesKey];
                
                if (weekData && initialBalances) {
                    newPreviews[key] = await dataProvider.calculateBalancePreview(
                        employeeId,
                        weekData.days || {},
                        initialBalances,
                        weekData.weeklyHoursOverride,
                        weekData.totalComplementaryHours
                    );
                }
            }
            setBalancePreviews(newPreviews);
        };
        calculateAllPreviews();
    }, [processedWeeklyViewData, processedAnnualViewData, initialBalancesMap, dataProvider.calculateBalancePreview, selectedEmployeeId]);
    
    
    const handleWeekRowChange = (employeeId: string, weekIdToUpdate: string, dayOrWeekKey: string, field: string, value: any) => {
        const isAnnualView = selectedEmployeeId !== 'all';
        const dataSetter = isAnnualView ? setProcessedAnnualViewData : setProcessedWeeklyViewData;
    
        dataSetter(prevData => {
            const keyToUpdate = isAnnualView ? weekIdToUpdate : employeeId;
            const currentData = prevData[keyToUpdate];
            if (!currentData) return prevData;
    
            const newEmployeeData: DailyEmployeeData = JSON.parse(JSON.stringify(currentData));
    
            if (dayOrWeekKey === 'week') {
                // It's a week-level change (like 'confirmed' or 'generalComment')
                (newEmployeeData as any)[field] = value;
            } else { 
                // It's a day-level change
                const dayKey = dayOrWeekKey;
                const dayToUpdate = newEmployeeData.days?.[dayKey];
                if (!dayToUpdate) return prevData;
    
                const originalAbsence = dayToUpdate.absence;
                (dayToUpdate as any)[field] = value;
    
                const absenceType = dataProvider.absenceTypes.find(at => at.abbreviation === originalAbsence);
                const isIndefinite = absenceType ? !absenceType.isAbsenceSplittable && !absenceType.affectedBag : false;
                
                // If an indefinite absence is changed, clear it for subsequent days of the week.
                if (field === 'absence' && value !== originalAbsence && isIndefinite) {
                    const interruptionDate = parseISO(dayKey);
                    const weekDaysToUpdate = eachDayOfInterval({start: startOfWeek(interruptionDate, {weekStartsOn: 1}), end: endOfWeek(interruptionDate, {weekStartsOn: 1})})
    
                    weekDaysToUpdate.forEach(day => {
                        if (isAfter(day, interruptionDate)) {
                            const subsequentDayKey = format(day, 'yyyy-MM-dd');
                            const dayToClear = newEmployeeData.days?.[subsequentDayKey];
                            if (dayToClear && dayToClear.absence === originalAbsence) {
                                dayToClear.absence = 'ninguna';
                                dayToClear.absenceHours = 0;
                                dayToClear.workedHours = dayToClear.theoreticalHours;
                            }
                        }
                    });
                }
    
                const newAbsenceType = dataProvider.absenceTypes.find(at => at.abbreviation === dayToUpdate.absence);
                if (field === 'absence' && newAbsenceType?.computesFullDay) {
                    dayToUpdate.workedHours = 0;
                    dayToUpdate.absenceHours = dayToUpdate.theoreticalHours;
                } else if (field === 'absenceHours' && newAbsenceType?.isAbsenceSplittable) {
                    dayToUpdate.workedHours = Math.max(0, dayToUpdate.theoreticalHours - (Number(value) || 0));
                }
            }
    
            return { ...prevData, [keyToUpdate]: newEmployeeData };
        });
    };

     const handleConfirm = async (employeeId: string, weekIdToConfirm: string) => {
        const employee = employees.find(e => e.id === employeeId);
        const dataMap = selectedEmployeeId === 'all' ? processedWeeklyViewData : processedAnnualViewData;
        const dataKey = selectedEmployeeId === 'all' ? employeeId : weekIdToConfirm;

        const weekData = dataMap[dataKey];
        const preview = balancePreviews[dataKey];
        const initialBalances = initialBalancesMap[dataKey];

        if (!weekData || !employee || !preview || !initialBalances) return;

        setIsSaving(prev => ({ ...prev, [dataKey]: true }));
    
        try {
            let dataWasRefreshed = false;
            const weekDaysToConfirm = eachDayOfInterval({start: startOfWeek(parseISO(weekIdToConfirm), { weekStartsOn: 1 }), end: endOfWeek(parseISO(weekIdToConfirm), { weekStartsOn: 1 })});
            
            for (const day of weekDaysToConfirm) {
                const dayKey = format(day, 'yyyy-MM-dd');
                const wasInterrupted = await endIndefiniteAbsence(employee.id, day, weekData.days[dayKey]);
                if (wasInterrupted) {
                    dataWasRefreshed = true;
                }
            }
            
            if (dataWasRefreshed) {
                await refreshData();
                await new Promise(resolve => setTimeout(resolve, 300));
            }
    
            const activePeriod = dataProvider.getActivePeriod(employee.id, weekDaysToConfirm[0]);
            if (!activePeriod) throw new Error("No active period found");
    
            const currentDbHours = dataProvider.getEffectiveWeeklyHours(activePeriod, weekDaysToConfirm[0]);
            const formHours = weekData.weeklyHoursOverride ?? currentDbHours;
    
            if (formHours !== currentDbHours && weekData.weeklyHoursOverride !== null) {
                await dataProvider.updateEmployeeWorkHours(employee.id, employee, formHours, format(weekDaysToConfirm[0], 'yyyy-MM-dd'));
                toast({ title: `Jornada Actualizada para ${employee.name}`, description: `Nueva jornada: ${formHours}h/semana.` });
            }
    
            const dataToSave: DailyEmployeeData = {
                ...weekData,
                confirmed: true,
                previousBalances: initialBalances,
                impact: {
                    ordinary: preview.ordinary,
                    holiday: preview.holiday,
                    leave: preview.leave,
                },
                weeklyHoursOverride: weekData.weeklyHoursOverride ?? null,
                totalComplementaryHours: weekData.totalComplementaryHours ?? null,
                generalComment: weekData.generalComment || null,
                isDifference: weekData.isDifference ?? false,
            };
            
            const finalData = { weekData: { [employee.id]: dataToSave } };
            
            await setDoc(doc(db, 'weeklyRecords', weekIdToConfirm), finalData, { merge: true });
            
            toast({ title: `Semana Confirmada para ${employee.name}` });
            
            handleWeekRowChange(employeeId, weekIdToConfirm, 'week', 'confirmed', true);
            
            const allConfirmed = (selectedEmployeeId === 'all' ? Object.keys(processedWeeklyViewData) : [selectedEmployeeId]).every(empId =>
                 (empId === employeeId) || (processedWeeklyViewData[empId]?.confirmed)
            );

            if(allConfirmed) {
                const nextWeek = findNextUnconfirmedWeek(currentDate);
                setCompletionInfo({ weekId: weekIdToConfirm, nextWeekId: nextWeek });
            }

        } catch (error) {
            console.error("Error al confirmar:", error);
            const errorMessage = error instanceof Error ? error.message : "No se pudo guardar la confirmación.";
            toast({ title: 'Error al confirmar', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsSaving(prev => ({ ...prev, [dataKey]: false }));
        }
    }

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
    
        const weeksOfYear = Object.keys(processedAnnualViewData).sort();
    
        return (
            <Card className="rounded-none border-0 border-t bg-card">
                <CardHeader className="flex flex-row justify-between items-center">
                    <h2 className="text-xl font-bold text-center">Vista Anual de {employee.name} - {selectedYear}</h2>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                     <Table>
                        <TableBody>
                            {weeksOfYear.map(weekId => {
                                const weekStartDate = parseISO(weekId);
                                const currentWeekDays = eachDayOfInterval({start: weekStartDate, end: endOfWeek(weekStartDate, {weekStartsOn:1})});

                                return (
                                    <React.Fragment key={weekId}>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="sticky left-0 bg-muted z-20 font-semibold p-2 text-xs w-[150px] sm:w-[200px] min-w-[150px] sm:min-w-[200px]" colSpan={1}>
                                                {format(weekStartDate, 'd MMM')} - {format(endOfWeek(weekStartDate, {weekStartsOn:1}), 'd MMM yyyy', {locale:es})}
                                            </TableHead>
                                            {currentWeekDays.map(d => 
                                                <TableHead key={d.toISOString()} className={cn("text-left p-2 text-xs w-[120px]", holidays.some(h => isSameDay(h.date, d)) && "bg-blue-100")}>
                                                    <span className="sm:hidden">{format(d, 'E', {locale:es})}</span>
                                                    <span className="hidden sm:inline">{format(d, 'E dd/MM', {locale:es})}</span>
                                                </TableHead>
                                            )}
                                        </TableRow>
                                        <WeekRow 
                                            employee={employee} 
                                            weekId={weekId} 
                                            weekDays={currentWeekDays} 
                                            weekData={processedAnnualViewData[weekId]}
                                            balancePreview={balancePreviews[weekId]}
                                            initialBalances={initialBalancesMap[weekId]}
                                            isSaving={isSaving[weekId] || false}
                                            onDataChange={handleWeekRowChange}
                                            onConfirm={() => handleConfirm(employee.id, weekId)}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }
    
    const renderWeeklyView = () => {
        const activeEmployeesForSchedule = (Object.keys(processedWeeklyViewData)
            .map(id => employees.find(e => e.id === id))
            .filter(Boolean) as Employee[])
            .sort((a, b) => a.name.localeCompare(b.name));

        return (
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
                                    <TableHead className="sticky left-0 bg-background z-20 p-2 text-xs w-[150px] sm:w-[200px] min-w-[150px] sm:min-w-[200px]">Empleado</TableHead>
                                    {weekDays.map(d => {
                                        const isHoliday = holidays.some(h => isSameDay(h.date, d));
                                        return (
                                            <TableHead key={d.toISOString()} className={cn(
                                                "text-center p-2 text-xs w-[120px]", 
                                                isHoliday ? "bg-green-100/50" : "bg-gray-50/50"
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
                                    const weekData = processedWeeklyViewData[employee.id];
                                    if (!weekData) {
                                        return <TableRow key={`${employee.id}-${weekId}`}><TableCell colSpan={8} className="p-0"><Skeleton className="h-48 w-full rounded-none" /></TableCell></TableRow>;
                                    }
                                    return (
                                        <WeekRow 
                                            key={`${employee.id}-${weekId}`} 
                                            employee={employee} 
                                            weekId={weekId} 
                                            weekDays={weekDays} 
                                            weekData={weekData}
                                            balancePreview={balancePreviews[employee.id]}
                                            initialBalances={initialBalancesMap[employee.id]}
                                            isSaving={isSaving[employee.id] || false}
                                            onDataChange={handleWeekRowChange}
                                            onConfirm={() => handleConfirm(employee.id, weekId)}
                                        />
                                    )
                                }) : <TableRow><TableCell colSpan={8} className="text-center h-48">No hay empleados activos esta semana.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        );
    }

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
        {loading ? (
             <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
        ) : selectedEmployeeId === 'all' ? renderWeeklyView() : renderAnnualView()}
    </div>
    </>
  );
}
