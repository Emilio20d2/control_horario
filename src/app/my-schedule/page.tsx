
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addWeeks, endOfWeek, getISOWeek, getYear, isAfter, parseISO, startOfWeek, subWeeks, addDays, eachDayOfInterval, format, isSameDay, getISODay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DailyEmployeeData, DailyData } from '@/lib/types';

interface ConfirmedWeekCardProps {
    employeeId: string;
    weekId: string;
}

const ConfirmedWeekCard: React.FC<ConfirmedWeekCardProps> = ({ employeeId, weekId }) => {
    const { 
        getEmployeeById,
        weeklyRecords,
        absenceTypes,
        holidays,
        getEmployeeBalancesForWeek,
        calculateBalancePreview,
        getActivePeriod,
        getEffectiveWeeklyHours
    } = useDataProvider();

    const [impact, setImpact] = useState<any | null>(null);
    const [initialBalances, setInitialBalances] = useState<ReturnType<typeof getEmployeeBalancesForWeek> | null>(null);

    const employee = getEmployeeById(employeeId);
    const weekData = weeklyRecords[weekId]?.weekData?.[employeeId];
    
    useEffect(() => {
        const calculateAsyncData = async () => {
            if (weekData && employee) {
                const balances = getEmployeeBalancesForWeek(employee.id, weekId);
                setInitialBalances(balances);

                const previewResult = await calculateBalancePreview(
                    employee.id,
                    weekData.days || {},
                    balances,
                    weekData.weeklyHoursOverride,
                    weekData.totalComplementaryHours
                );
                setImpact(previewResult);
            }
        };
        calculateAsyncData();
    }, [weekData, employee, weekId, getEmployeeBalancesForWeek, calculateBalancePreview]);

    if (!weekData || !employee || !initialBalances || !impact) {
        return <Skeleton className="h-48 w-full" />;
    }

    const weekStartDate = parseISO(weekId);
    const weekDays = eachDayOfInterval({ start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 }) });

    const activePeriod = getActivePeriod(employee.id, weekStartDate);
    const effectiveWeeklyHours = weekData.weeklyHoursOverride ?? getEffectiveWeeklyHours(activePeriod, weekStartDate);

    let totalWeeklyComputableHours = 0;
    for (const dayKey of Object.keys(weekData.days).sort()) {
        const dayDate = parseISO(dayKey);
        const dayData = weekData.days[dayKey];
        const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
        
        if (getISODay(dayDate) !== 7) {
            totalWeeklyComputableHours += dayData.workedHours;
            if (absenceType && absenceType.computesToWeeklyHours) {
                totalWeeklyComputableHours += dayData.absenceHours;
            }
        }
    }
    totalWeeklyComputableHours -= (weekData.totalComplementaryHours || 0);

    const weekLabel = `Computadas: ${totalWeeklyComputableHours.toFixed(2)}h / Teóricas: ${effectiveWeeklyHours.toFixed(2)}h`;

    const renderBalanceRow = (label: string, initialVal: number, impactVal: number, finalVal: number) => (
        <div className="grid grid-cols-4 gap-2 text-xs">
            <span className="font-semibold col-span-1">{label}</span>
            <span className="text-right font-mono col-span-1">{initialVal.toFixed(2)}h</span>
            <span className={cn("text-right font-mono font-bold col-span-1", impactVal > 0 ? "text-blue-600" : impactVal < 0 ? "text-red-600" : "")}>
                {(impactVal >= 0 ? '+' : '') + impactVal.toFixed(2)}h
            </span>
            <span className="text-right font-mono font-bold col-span-1">{finalVal.toFixed(2)}h</span>
        </div>
    );

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="flex justify-between items-baseline">
                    <span className="text-base font-bold">
                        {format(weekStartDate, 'd MMM')} - {format(endOfWeek(weekStartDate, {weekStartsOn:1}), 'd MMM, yyyy', {locale:es})}
                    </span>
                    <span className="text-sm font-mono font-medium text-muted-foreground">{weekLabel}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <Table>
                        <TableHeader>
                             <TableRow>
                                <TableHead className="w-[40px]">Día</TableHead>
                                <TableHead className="w-[70px]">Fecha</TableHead>
                                <TableHead className="text-right">Trab.</TableHead>
                                <TableHead>Ausencia</TableHead>
                                <TableHead className="text-right">H. Aus.</TableHead>
                                <TableHead className="text-right">H. Lib.</TableHead>
                                <TableHead className="text-center">P. Doble</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weekDays.map(day => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const dayData = weekData.days[dayKey];
                                if (!dayData) return null;

                                const absenceName = dayData.absence === 'ninguna' ? '' : (absenceTypes.find(at => at.abbreviation === dayData.absence)?.abbreviation || dayData.absence);
                                const isHoliday = holidays.some(h => isSameDay(h.date, day));

                                return (
                                    <TableRow key={dayKey} className={cn(isHoliday && "bg-blue-50", dayData.absence !== 'ninguna' && "bg-red-50")}>
                                        <TableCell className="font-semibold p-1 text-xs">{format(day, 'E', { locale: es })}</TableCell>
                                        <TableCell className="p-1 text-xs">{format(day, 'dd/MM/yy')}</TableCell>
                                        <TableCell className="text-right p-1 text-xs font-mono">{dayData.workedHours.toFixed(2)}</TableCell>
                                        <TableCell className="p-1 text-xs">{absenceName}</TableCell>
                                        <TableCell className="text-right p-1 text-xs font-mono">{dayData.absenceHours > 0 ? dayData.absenceHours.toFixed(2) : ''}</TableCell>
                                        <TableCell className="text-right p-1 text-xs font-mono">{dayData.leaveHours > 0 ? dayData.leaveHours.toFixed(2) : ''}</TableCell>
                                        <TableCell className="text-center p-1 text-xs">{dayData.doublePay ? 'Sí' : ''}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                     <div className="grid grid-cols-4 gap-2 text-xs font-bold text-muted-foreground">
                        <span className="col-span-1">Bolsa</span>
                        <span className="text-right col-span-1">Inicial</span>
                        <span className="text-right col-span-1">Impacto</span>
                        <span className="text-right col-span-1">Final</span>
                    </div>
                    {renderBalanceRow("Ordinaria", initialBalances.ordinary, impact.ordinary, impact.resultingOrdinary)}
                    {renderBalanceRow("Festivos", initialBalances.holiday, impact.holiday, impact.resultingHoliday)}
                    {renderBalanceRow("Libranza", initialBalances.leave, impact.leave, impact.resultingLeave)}
                    
                    {(weekData.totalComplementaryHours ?? 0) > 0 && (
                        <div className="pt-2 text-xs grid grid-cols-4 gap-2">
                             <span className="font-semibold col-span-3">H. Complem.:</span>
                             <span className="text-right font-mono font-bold col-span-1">{weekData.totalComplementaryHours?.toFixed(2)}h</span>
                        </div>
                    )}
                    {weekData.generalComment && (
                        <div className="pt-2">
                            <p className="text-xs font-semibold">Comentarios:</p>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{weekData.generalComment}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default function MySchedulePage() {
    const { appUser, employees, loading, weeklyRecords } = useDataProvider();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const employee = useMemo(() => {
        return employees.find(e => e.id === appUser?.employeeId);
    }, [employees, appUser]);

    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).filter(y => y >= 2025);
    }, []);

    const confirmedWeeks = useMemo(() => {
        if (!employee) return [];
        return Object.keys(weeklyRecords)
            .filter(weekId => {
                const weekYear = getYear(parseISO(weekId));
                const empData = weeklyRecords[weekId]?.weekData?.[employee.id];
                return empData?.confirmed && weekYear === selectedYear;
            })
            .sort((a,b) => b.localeCompare(a)); // Sort descending, most recent first
    }, [weeklyRecords, employee, selectedYear]);

    if (loading) {
        return (
             <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
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
            
            <div className="space-y-4">
                {confirmedWeeks.length > 0 ? (
                    confirmedWeeks.map(weekId => (
                        <ConfirmedWeekCard key={weekId} employeeId={employee.id} weekId={weekId} />
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center text-muted-foreground">
                            No tienes semanas confirmadas para el año {selectedYear}.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

