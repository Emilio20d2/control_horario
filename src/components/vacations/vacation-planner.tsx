

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
import { format, isAfter, parseISO, addDays, differenceInDays, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { addScheduledAbsence, deleteScheduledAbsence } from '@/lib/services/employeeService';
import { Skeleton } from '../ui/skeleton';
import { setDocument } from '@/lib/services/firestoreService';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';

export function VacationPlanner() {
    const { employees, absenceTypes, holidays, loading, refreshData, weeklyRecords, getWeekId } = useDataProvider();
    const { toast } = useToast();

    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedAbsenceTypeId, setSelectedAbsenceTypeId] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    
    const activeEmployees = employees.filter(e => e.employmentPeriods?.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())));
    const selectedEmployee = activeEmployees.find(e => e.id === selectedEmployeeId);
    
    const schedulableAbsenceTypes = useMemo(() => {
        return absenceTypes.filter(at => at.name === 'Vacaciones' || at.name === 'Excedencia' || at.name === 'Permiso no retribuido');
    }, [absenceTypes]);

    useEffect(() => {
        if (schedulableAbsenceTypes.length > 0 && !selectedAbsenceTypeId) {
            const vacationType = schedulableAbsenceTypes.find(at => at.name === 'Vacaciones');
            if (vacationType) {
                setSelectedAbsenceTypeId(vacationType.id);
            }
        }
    }, [schedulableAbsenceTypes, selectedAbsenceTypeId]);

    const getActivePeriodForEmployee = (employee: Employee | undefined): EmploymentPeriod | undefined => {
        if (!employee) return undefined;
        return employee.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date()));
    };

    const handleAddPeriod = async () => {
        if (!selectedEmployeeId || !selectedAbsenceTypeId || !selectedDateRange?.from || !selectedDateRange?.to) {
            toast({ title: 'Datos incompletos', description: 'Selecciona empleado, tipo de ausencia y un rango de fechas.', variant: 'destructive' });
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
                absenceTypeId: selectedAbsenceTypeId,
                startDate: format(selectedDateRange.from, 'yyyy-MM-dd'),
                endDate: format(selectedDateRange.to, 'yyyy-MM-dd'),
            }, selectedEmployee as Employee);
            
            toast({ title: 'Periodo de ausencia añadido', description: `Se ha guardado la ausencia para ${selectedEmployee?.name}.` });
            setSelectedDateRange(undefined);
            refreshData(); // Refresh data to show the new period
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo añadir el periodo de ausencia.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeletePeriod = async (periodId: string) => {
        if (!selectedEmployee) return;
    
        setIsLoading(true);
        try {
            const activePeriod = getActivePeriodForEmployee(selectedEmployee);
            if (!activePeriod) throw new Error("No active period found for employee.");
    
            const scheduledAbsenceToDelete = activePeriod.scheduledAbsences?.find(a => a.id === periodId);
    
            if (scheduledAbsenceToDelete) {
                // It's a long-term scheduled absence, delete it from the employee document
                await deleteScheduledAbsence(selectedEmployee.id, activePeriod.id, periodId, selectedEmployee);
                toast({ title: 'Periodo de ausencia eliminado', description: 'Se ha eliminado la ausencia programada de la ficha del empleado.', variant: 'destructive' });
            } else {
                // It's a vacation period aggregated from weekly records
                const periodToDelete = absencePeriods.find(p => p.id === periodId);
                if (!periodToDelete) throw new Error("Period to delete not found.");

                const batch = writeBatch(db);
                const daysInPeriod = eachDayOfInterval({ start: periodToDelete.startDate, end: periodToDelete.endDate });
        
                const updatesByWeek: Record<string, Record<string, any>> = {};
        
                for (const day of daysInPeriod) {
                    const weekId = getWeekId(day);
                    const dayKey = format(day, 'yyyy-MM-dd');
        
                    if (!updatesByWeek[weekId]) {
                        updatesByWeek[weekId] = {};
                    }
        
                    updatesByWeek[weekId][`weekData.${selectedEmployee.id}.days.${dayKey}.absence`] = 'ninguna';
                    updatesByWeek[weekId][`weekData.${selectedEmployee.id}.days.${dayKey}.absenceHours`] = 0;
                }
        
                for (const weekId in updatesByWeek) {
                    const docRef = doc(db, "weeklyRecords", weekId);
                    batch.update(docRef, updatesByWeek[weekId]);
                }
                
                await batch.commit();
                toast({ title: 'Días de ausencia eliminados', description: 'Los días han sido borrados de los registros semanales no confirmados.', variant: 'destructive' });
            }
            
            refreshData();
        } catch (error) {
            console.error("Error deleting vacation period:", error);
            toast({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo eliminar el periodo de ausencia.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const absencePeriods = useMemo(() => {
        if (!selectedEmployee) return [];
        
        const schedulableAbsenceTypeIds = new Set(schedulableAbsenceTypes.map(at => at.id));
        const schedulableAbsenceTypeAbbrs = new Set(schedulableAbsenceTypes.map(at => at.abbreviation));

        const allAbsenceDays = new Map<string, string>(); // date string -> absenceTypeId

        // 1. Get from scheduled absences
        const activePeriod = getActivePeriodForEmployee(selectedEmployee);
        if (activePeriod?.scheduledAbsences) {
            activePeriod.scheduledAbsences.forEach(absence => {
                if (schedulableAbsenceTypeIds.has(absence.absenceTypeId) && absence.endDate) {
                    eachDayOfInterval({ start: startOfDay(absence.startDate), end: startOfDay(absence.endDate) })
                        .forEach(d => allAbsenceDays.set(format(d, 'yyyy-MM-dd'), absence.absenceTypeId));
                }
            });
        }

        // 2. Get from weekly records
        for (const weekId in weeklyRecords) {
            const empData = weeklyRecords[weekId]?.weekData?.[selectedEmployee.id];
            if (empData?.days) {
                for (const dayStr in empData.days) {
                    const absenceType = absenceTypes.find(at => at.abbreviation === empData.days[dayStr].absence);
                    if (absenceType && schedulableAbsenceTypeAbbrs.has(absenceType.abbreviation)) {
                        if (!allAbsenceDays.has(dayStr)) {
                            allAbsenceDays.set(dayStr, absenceType.id);
                        }
                    }
                }
            }
        }
        
        const uniqueSortedDays = Array.from(allAbsenceDays.keys()).map(d => parseISO(d)).sort((a,b) => a.getTime() - b.getTime());

        // 4. Group consecutive days into periods
        const periods: { id: string; startDate: Date; endDate: Date; isConfirmed: boolean; absenceTypeId: string; }[] = [];
        if (uniqueSortedDays.length === 0) return periods;

        let currentPeriodStart = uniqueSortedDays[0];
        let currentAbsenceTypeId = allAbsenceDays.get(format(currentPeriodStart, 'yyyy-MM-dd'))!;

        for (let i = 1; i < uniqueSortedDays.length; i++) {
            const dayStr = format(uniqueSortedDays[i], 'yyyy-MM-dd');
            const dayAbsenceTypeId = allAbsenceDays.get(dayStr)!;

            if (differenceInDays(uniqueSortedDays[i], uniqueSortedDays[i-1]) > 1 || dayAbsenceTypeId !== currentAbsenceTypeId) {
                const periodEndDate = uniqueSortedDays[i-1];
                const daysInPeriod = eachDayOfInterval({ start: currentPeriodStart, end: periodEndDate });
                const isConfirmed = daysInPeriod.some(day => weeklyRecords[getWeekId(day)]?.weekData[selectedEmployee.id]?.confirmed);
                
                const scheduledAbsence = activePeriod?.scheduledAbsences?.find(sa => sa.endDate && isSameDay(sa.startDate, currentPeriodStart) && isSameDay(sa.endDate, periodEndDate) && sa.absenceTypeId === currentAbsenceTypeId);
                
                periods.push({ id: scheduledAbsence?.id || `agg-${currentPeriodStart.toISOString()}`, startDate: currentPeriodStart, endDate: periodEndDate, isConfirmed, absenceTypeId: currentAbsenceTypeId });
                
                currentPeriodStart = uniqueSortedDays[i];
                currentAbsenceTypeId = dayAbsenceTypeId;
            }
        }
        
        const lastPeriodEndDate = uniqueSortedDays[uniqueSortedDays.length - 1];
        const lastPeriodDays = eachDayOfInterval({ start: currentPeriodStart, end: lastPeriodEndDate });
        const isLastPeriodConfirmed = lastPeriodDays.some(day => weeklyRecords[getWeekId(day)]?.weekData[selectedEmployee.id]?.confirmed);
        const lastScheduledAbsence = activePeriod?.scheduledAbsences?.find(sa => sa.endDate && isSameDay(sa.startDate, currentPeriodStart) && isSameDay(sa.endDate, lastPeriodEndDate) && sa.absenceTypeId === currentAbsenceTypeId);

        periods.push({ id: lastScheduledAbsence?.id || `agg-${currentPeriodStart.toISOString()}`, startDate: currentPeriodStart, endDate: lastPeriodEndDate, isConfirmed: isLastPeriodConfirmed, absenceTypeId: currentAbsenceTypeId });

        return periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    }, [selectedEmployee, schedulableAbsenceTypes, weeklyRecords, getWeekId, absenceTypes]);

    const employeeAbsenceDays = useMemo(() => {
        if (!selectedEmployee) return [];
        return absencePeriods.flatMap(p => eachDayOfInterval({ start: p.startDate, end: p.endDate }));
    }, [absencePeriods, selectedEmployee]);
    
    const openingHolidays = holidays.filter(h => h.type === 'Apertura').map(h => h.date as Date);
    const otherHolidays = holidays.filter(h => h.type !== 'Apertura').map(h => h.date as Date);

    const modifiers = {
        opening: openingHolidays,
        other: otherHolidays,
        employeeAbsence: employeeAbsenceDays,
    };

    const modifiersStyles = {
        opening: {
            backgroundColor: '#a7f3d0', // green-200
            color: '#065f46', // green-800
        },
        other: {
            backgroundColor: '#fecaca', // red-200
            color: '#991b1b', // red-800
        },
        employeeAbsence: {
            backgroundColor: '#dbeafe', // blue-100
        }
    };
    
    if(loading) return <Skeleton className="h-96 w-full" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Programar Ausencias (Vacaciones, Excedencias, etc.)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de Ausencia</label>
                        <Select value={selectedAbsenceTypeId} onValueChange={setSelectedAbsenceTypeId} disabled={!selectedEmployeeId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                            <SelectContent>
                                {schedulableAbsenceTypes.map(at => (
                                    <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
                            modifiers={modifiers}
                            modifiersStyles={modifiersStyles}
                        />
                        <Button onClick={handleAddPeriod} disabled={isLoading || !selectedDateRange?.from || !selectedDateRange?.to} className="mt-4 w-full max-w-xs">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Guardar Periodo
                        </Button>
                    </div>

                    {selectedEmployee && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Periodos de Ausencia de {selectedEmployee.name}</h4>
                            <div className="border rounded-md max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Inicio</TableHead>
                                            <TableHead>Fin</TableHead>
                                            <TableHead className="text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {absencePeriods.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">No hay ausencias programadas.</TableCell>
                                            </TableRow>
                                        ) : (
                                            absencePeriods.map(period => {
                                                const absenceType = absenceTypes.find(at => at.id === period.absenceTypeId);
                                                return (
                                                <TableRow key={period.id}>
                                                    <TableCell><Badge variant="outline">{absenceType?.abbreviation || '??'}</Badge></TableCell>
                                                    <TableCell>{format(period.startDate, 'PPP', { locale: es })}</TableCell>
                                                    <TableCell>{format(period.endDate, 'PPP', { locale: es })}</TableCell>
                                                    <TableCell className="text-right">
                                                         <Button variant="ghost" size="icon" onClick={() => handleDeletePeriod(period.id)} disabled={isLoading || period.isConfirmed}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                )
                                            })
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
