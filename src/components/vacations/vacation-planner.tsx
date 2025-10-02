

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod, ScheduledAbsence } from '@/lib/types';
import { format, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { addScheduledAbsence, deleteScheduledAbsence } from '@/lib/services/employeeService';
import { Skeleton } from '../ui/skeleton';

export function VacationPlanner() {
    const { employees, absenceTypes, loading, refreshData } = useDataProvider();
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
    
    const handleDeletePeriod = async (absenceId: string) => {
        const activePeriod = getActivePeriodForEmployee(selectedEmployee);
         if (!activePeriod || !selectedEmployee) return;

        setIsLoading(true);
        try {
            await deleteScheduledAbsence(selectedEmployeeId, activePeriod.id, absenceId, selectedEmployee);
            toast({ title: 'Periodo de vacaciones eliminado', variant: 'destructive' });
            refreshData();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo eliminar el periodo.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const employeeScheduledAbsences = (selectedEmployee?.employmentPeriods.find(p => !p.endDate)?.scheduledAbsences || [])
        .filter(a => a.absenceTypeId === vacationAbsenceType?.id)
        .sort((a,b) => (a.startDate as Date).getTime() - (b.startDate as Date).getTime());

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
                
                <Calendar
                    mode="range"
                    selected={selectedDateRange}
                    onSelect={setSelectedDateRange}
                    locale={es}
                    disabled={!selectedEmployeeId}
                />

                <Button onClick={handleAddPeriod} disabled={isLoading || !selectedDateRange?.from || !selectedDateRange?.to}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Guardar Periodo
                </Button>

                {selectedEmployee && (
                    <div className="space-y-4 pt-4">
                        <h4 className="font-medium">Periodos de Vacaciones de {selectedEmployee.name}</h4>
                        <div className="border rounded-md max-h-60 overflow-y-auto">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Inicio</TableHead>
                                        <TableHead>Fin</TableHead>
                                        <TableHead className="text-right">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employeeScheduledAbsences.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">No hay vacaciones programadas.</TableCell>
                                        </TableRow>
                                    ) : (
                                        employeeScheduledAbsences.map(absence => (
                                            <TableRow key={absence.id}>
                                                <TableCell>{format(absence.startDate, 'PPP', { locale: es })}</TableCell>
                                                <TableCell>{absence.endDate ? format(absence.endDate, 'PPP', { locale: es }) : 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeletePeriod(absence.id)} disabled={isLoading}>
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
            </CardContent>
        </Card>
    );
}
