
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod } from '@/lib/types';
import { format, isAfter, parseISO, addDays, differenceInDays, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { addScheduledAbsence, deleteScheduledAbsence } from '@/lib/services/employeeService';
import { Skeleton } from '../ui/skeleton';
import { setDocument } from '@/lib/services/firestoreService';

export function VacationPlanner() {
    const { employees, absenceTypes, loading, refreshData, weeklyRecords, getWeekId } = useDataProvider();
    const { toast } = useToast();

    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    
    const activeEmployees = employees.filter(e => e.employmentPeriods?.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())));
    const selectedEmployee = activeEmployees.find(e => e.id === selectedEmployeeId);
    
    const vacationAbsenceType = absenceTypes.find(at => at.name === 'Vacaciones');

    const getActivePeriodForEmployee = (employee: Employee | undefined): EmploymentPeriod | undefined => {
        if (!employee) return undefined;
        return employee.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date()));
    };

    const handleAddPeriod = async () => {
        if (!selectedEmployeeId || !selectedDateRange?.from || !selectedDateRange?.to || !vacationAbsenceType) {
            toast({ title: 'Datos incompletos', description: 'Selecciona un empleado y un rango de fechas.', variant: 'destructive' });
            return;
        }

        const activePeriod = getActivePeriodForEmployee(selectedEmployee);
        if (!activePeriod) {
             toast({ title: 'Error', description: 'El empleado seleccionado no tiene un periodo laboral activo.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            await addScheduledAbsence(selectedEmployeeId, activePeriod.id, {
                absenceTypeId: vacationAbsenceType.id,
                startDate: format(selectedDateRange.from, 'yyyy-MM-dd'),
                endDate: format(selectedDateRange.to, 'yyyy-MM-dd'),
            }, selectedEmployee as Employee);
            
            toast({ title: 'Periodo de vacaciones añadido', description: `Se han guardado las vacaciones para ${selectedEmployee?.name}.` });
            setSelectedDateRange(undefined);
            refreshData(); // Refresh data to show the new period
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo añadir el periodo de vacaciones.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeletePeriod = async (period: { startDate: Date, endDate: Date }) => {
        if (!selectedEmployeeId || !vacationAbsenceType) return;
    
        setIsLoading(true);
        try {
            const daysInPeriod = eachDayOfInterval({ start: period.startDate, end: period.endDate });
            const weekIdsToUpdate = new Set<string>(daysInPeriod.map(day => getWeekId(day)));
    
            for (const weekId of weekIdsToUpdate) {
                const weekRecord = weeklyRecords[weekId];
                if (weekRecord && weekRecord.weekData[selectedEmployeeId]) {
                    const employeeWeekData = JSON.parse(JSON.stringify(weekRecord.weekData[selectedEmployeeId]));
    
                    daysInPeriod.forEach(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        if (employeeWeekData.days[dayKey] && employeeWeekData.days[dayKey].absence === vacationAbsenceType.abbreviation) {
                            employeeWeekData.days[dayKey].absence = 'ninguna';
                            employeeWeekData.days[dayKey].absenceHours = 0;
                        }
                    });
                    
                    await setDocument(`weeklyRecords/${weekId}/weekData`, selectedEmployeeId, employeeWeekData, { merge: true });
                }
            }
    
            toast({ title: 'Periodo de vacaciones eliminado', variant: 'destructive' });
            refreshData();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo eliminar el periodo de vacaciones.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const vacationPeriods = useMemo(() => {
        if (!selectedEmployee || !vacationAbsenceType) return [];
        
        const allVacationDays: Date[] = [];

        // 1. Get from scheduled absences
        const activePeriod = getActivePeriodForEmployee(selectedEmployee);
        if (activePeriod?.scheduledAbsences) {
            activePeriod.scheduledAbsences.forEach(absence => {
                if (absence.absenceTypeId === vacationAbsenceType.id && absence.endDate) {
                    let currentDate = startOfDay(absence.startDate);
                    while (currentDate <= startOfDay(absence.endDate)) {
                        allVacationDays.push(currentDate);
                        currentDate = addDays(currentDate, 1);
                    }
                }
            });
        }

        // 2. Get from weekly records
        for (const weekId in weeklyRecords) {
            const weekRecord = weeklyRecords[weekId];
            const empData = weekRecord.weekData[selectedEmployee.id];
            if (empData?.days) {
                for (const dayStr in empData.days) {
                    if (empData.days[dayStr].absence === vacationAbsenceType.abbreviation) {
                        allVacationDays.push(parseISO(dayStr));
                    }
                }
            }
        }
        
        // 3. Remove duplicates and sort
        const uniqueSortedDays = [...new Set(allVacationDays.map(d => d.getTime()))].map(t => new Date(t)).sort((a,b) => a.getTime() - b.getTime());

        // 4. Group consecutive days into periods
        const periods: { id: string; startDate: Date; endDate: Date; isConfirmed: boolean; }[] = [];
        if (uniqueSortedDays.length === 0) return periods;

        let currentPeriodStart = uniqueSortedDays[0];
        for (let i = 1; i < uniqueSortedDays.length; i++) {
            if (differenceInDays(uniqueSortedDays[i], uniqueSortedDays[i-1]) > 1) {
                const periodEndDate = uniqueSortedDays[i-1];
                const daysInPeriod = eachDayOfInterval({ start: currentPeriodStart, end: periodEndDate });
                const isConfirmed = daysInPeriod.some(day => weeklyRecords[getWeekId(day)]?.weekData[selectedEmployee.id]?.confirmed);
                
                periods.push({ id: `period-${currentPeriodStart.toISOString()}`, startDate: currentPeriodStart, endDate: periodEndDate, isConfirmed });
                currentPeriodStart = uniqueSortedDays[i];
            }
        }
        
        const lastPeriodEndDate = uniqueSortedDays[uniqueSortedDays.length - 1];
        const lastPeriodDays = eachDayOfInterval({ start: currentPeriodStart, end: lastPeriodEndDate });
        const isLastPeriodConfirmed = lastPeriodDays.some(day => weeklyRecords[getWeekId(day)]?.weekData[selectedEmployee.id]?.confirmed);

        periods.push({ id: `period-${currentPeriodStart.toISOString()}`, startDate: currentPeriodStart, endDate: lastPeriodEndDate, isConfirmed: isLastPeriodConfirmed });

        return periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    }, [selectedEmployee, vacationAbsenceType, weeklyRecords, getWeekId]);
    
    if(loading) return <Skeleton className="h-96 w-full" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Programar Vacaciones</CardTitle>
                <CardDescription>
                    Selecciona un empleado y elige un rango de fechas en el calendario para asignar un periodo de vacaciones.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Empleado</label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                        <SelectContent>
                            {activeEmployees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="flex flex-col items-center">
                        <Calendar
                            mode="range"
                            selected={selectedDateRange}
                            onSelect={setSelectedDateRange}
                            locale={es}
                            disabled={!selectedEmployeeId || isLoading}
                            className="rounded-md border"
                        />
                        <Button onClick={handleAddPeriod} disabled={isLoading || !selectedDateRange?.from || !selectedDateRange?.to} className="mt-4 w-full max-w-xs">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Guardar Periodo
                        </Button>
                    </div>

                    {selectedEmployee && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Periodos de Vacaciones de {selectedEmployee.name}</h4>
                            <div className="border rounded-md max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Inicio</TableHead>
                                            <TableHead>Fin</TableHead>
                                            <TableHead className="text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {vacationPeriods.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center h-24">No hay vacaciones programadas.</TableCell>
                                            </TableRow>
                                        ) : (
                                            vacationPeriods.map(period => (
                                                <TableRow key={period.id}>
                                                    <TableCell>{format(period.startDate, 'PPP', { locale: es })}</TableCell>
                                                    <TableCell>{format(period.endDate, 'PPP', { locale: es })}</TableCell>
                                                    <TableCell className="text-right">
                                                         <Button variant="ghost" size="icon" onClick={() => handleDeletePeriod(period)} disabled={isLoading || period.isConfirmed}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
