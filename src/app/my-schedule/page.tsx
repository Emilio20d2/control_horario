'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getYear, isAfter, parseISO, endOfWeek, eachDayOfInterval, format, isSameDay, getISODay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DailyData, WeeklyRecord, Employee } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface ConfirmedWeekCardProps {
    employee: Employee | null;
    weekId: string;
    weekData: WeeklyRecord['weekData'][string];
    initialBalances: { ordinary: number; holiday: number; leave: number; };
    impact: { ordinary: number; holiday: number; leave: number; };
}

const ConfirmedWeekCard: React.FC<ConfirmedWeekCardProps> = ({ employee, weekId, weekData, initialBalances, impact }) => {
    const { 
        absenceTypes,
        holidays,
        getEffectiveWeeklyHours
    } = useDataProvider();

    const weekStartDate = parseISO(weekId);
    const weekDays = eachDayOfInterval({ start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 }) });

    const effectiveWeeklyHours = employee ? (weekData.weeklyHoursOverride ?? getEffectiveWeeklyHours(
        employee.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), weekStartDate)), 
        weekStartDate
    )) : 40;

    let totalWeeklyComputableHours = 0;
    for (const dayKey of Object.keys(weekData.days || {}).sort()) {
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

    const renderBalanceRow = (label: string, initialVal: number, impactVal: number) => {
        const finalVal = initialVal + impactVal;
        return (
            <div className="grid grid-cols-4 gap-2 text-xs">
                <span className="font-semibold col-span-1">{label}</span>
                <span className="text-right font-mono col-span-1">{initialVal.toFixed(2)}h</span>
                <span className={cn("text-right font-mono font-bold col-span-1", impactVal > 0 ? "text-blue-600" : impactVal < 0 ? "text-red-600" : "")}>
                    {(impactVal >= 0 ? '+' : '') + impactVal.toFixed(2)}h
                </span>
                <span className="text-right font-mono font-bold col-span-1">{finalVal.toFixed(2)}h</span>
            </div>
        );
    };

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
                    {renderBalanceRow("Ordinaria", initialBalances.ordinary, impact.ordinary)}
                    {renderBalanceRow("Festivos", initialBalances.holiday, impact.holiday)}
                    {renderBalanceRow("Libranza", initialBalances.leave, impact.leave)}
                    
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
    
    // Mock data for one week to show the component structure
    const mockWeekData: WeeklyRecord['weekData'][string] = {
        days: {
            '2025-03-03': { theoreticalHours: 8, workedHours: 8, absence: 'ninguna', absenceHours: 0, leaveHours: 0, doublePay: false },
            '2025-03-04': { theoreticalHours: 8, workedHours: 8, absence: 'ninguna', absenceHours: 0, leaveHours: 0, doublePay: false },
            '2025-03-05': { theoreticalHours: 8, workedHours: 0, absence: 'V', absenceHours: 8, leaveHours: 0, doublePay: false },
            '2025-03-06': { theoreticalHours: 8, workedHours: 8, absence: 'ninguna', absenceHours: 0, leaveHours: 0, doublePay: false },
            '2025-03-07': { theoreticalHours: 8, workedHours: 8, absence: 'ninguna', absenceHours: 0, leaveHours: 0, doublePay: false },
            '2025-03-08': { theoreticalHours: 0, workedHours: 4, absence: 'ninguna', absenceHours: 0, leaveHours: 0, doublePay: false },
            '2025-03-09': { theoreticalHours: 0, workedHours: 0, absence: 'ninguna', absenceHours: 0, leaveHours: 0, doublePay: false },
        },
        confirmed: true,
        totalComplementaryHours: 2,
        generalComment: "Semana de ejemplo con una ausencia y horas extra."
    };
    const mockInitialBalances = { ordinary: 10, holiday: 5, leave: 2 };
    const mockImpact = { ordinary: -1.75, holiday: 0, leave: 0 };
    
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight font-headline">Mis Horarios Confirmados</h1>
                <Select value="2025">
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Seleccionar año..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                    Esto es un ejemplo de cómo se verá una semana confirmada. Una vez que se carguen sus datos, aquí aparecerán todas sus semanas.
                </p>
                <ConfirmedWeekCard 
                    employee={null}
                    weekId="2025-03-03" 
                    weekData={mockWeekData}
                    initialBalances={mockInitialBalances}
                    impact={mockImpact}
                />
            </div>
        </div>
    );
}
