
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataProvider } from '@/hooks/use-data-provider';
import { format, parseISO, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Clock } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function VacationSummary() {
    const { weeklyRecords, getVacationSummaryForWeek, loading } = useDataProvider();
    
    // Default to the most recent week with data
    const lastWeekId = useMemo(() => {
        if (!weeklyRecords || Object.keys(weeklyRecords).length === 0) {
            return format(new Date(), 'yyyy-MM-dd');
        }
        return Object.keys(weeklyRecords).sort().pop() || format(new Date(), 'yyyy-MM-dd');
    }, [weeklyRecords]);

    const [selectedWeek, setSelectedWeek] = useState<string>(lastWeekId);

    const availableWeeks = useMemo(() => {
        if (!weeklyRecords) return [];
        return Object.keys(weeklyRecords)
            .sort((a, b) => b.localeCompare(a)) // Sort weeks descending
            .map(weekId => {
                const weekStartDate = parseISO(weekId);
                const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
                const startDay = format(weekStartDate, 'd MMM', { locale: es });
                const endDay = format(weekEndDate, 'd MMM, yyyy', { locale: es });
                return { value: weekId, label: `${startDay} - ${endDay}` };
            });
    }, [weeklyRecords]);
    
    const summary = useMemo(() => {
        const dateInWeek = parseISO(selectedWeek);
        return getVacationSummaryForWeek(dateInWeek);
    }, [selectedWeek, getVacationSummaryForWeek]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Resumen Semanal de Vacaciones</CardTitle>
                <CardDescription>
                    Calcula el total de empleados de vacaciones y el impacto en horas para una semana concreta.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Semana</label>
                    <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar semana..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableWeeks.map(w => (
                                <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                             {loading ? <Skeleton className="h-8 w-16" /> : (
                                <div className="text-2xl font-bold">{summary.vacationingEmployees}</div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Horas</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           {loading ? <Skeleton className="h-8 w-24" /> : (
                                <div className="text-2xl font-bold">{summary.totalWeeklyHours.toFixed(2)}h</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}
