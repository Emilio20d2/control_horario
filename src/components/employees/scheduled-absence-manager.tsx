

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { Trash2, Loader2 } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { addScheduledAbsence, deleteScheduledAbsence } from '@/lib/services/employeeService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '../ui/label';


interface ScheduledAbsenceManagerProps {
    employee: Employee;
    period: EmploymentPeriod;
}

export function ScheduledAbsenceManager({ employee, period }: ScheduledAbsenceManagerProps) {
    const { absenceTypes, refreshData } = useDataProvider();
    const { toast } = useToast();
    const [absenceTypeId, setAbsenceTypeId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const nonSplittableAbsenceTypes = absenceTypes
        .filter(at => !at.isAbsenceSplittable && at.name !== 'Vacaciones')
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleAddAbsence = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!absenceTypeId || !startDate) {
            toast({
                title: 'Campos incompletos',
                description: 'Por favor, selecciona un tipo de ausencia y una fecha de inicio.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            await addScheduledAbsence(
                employee.id,
                period.id,
                {
                    absenceTypeId,
                    startDate: startDate,
                    endDate: endDate || null,
                },
                employee
            );
            toast({
                title: 'Ausencia Programada',
                description: 'Se ha añadido la nueva ausencia al calendario del empleado.',
                className: "bg-primary text-primary-foreground",
            });
            setAbsenceTypeId('');
            setStartDate('');
            setEndDate('');
            refreshData();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error al guardar',
                description: 'No se pudo programar la ausencia.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAbsence = async (absenceId: string) => {
        setIsLoading(true);
        try {
            await deleteScheduledAbsence(employee.id, period.id, absenceId, employee);
            toast({
                title: 'Ausencia Eliminada',
                description: 'Se ha eliminado la ausencia programada.',
                variant: 'destructive',
            });
            refreshData();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error al eliminar',
                description: 'No se pudo eliminar la ausencia.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const vacationAbsenceType = absenceTypes.find(at => at.name === 'Vacaciones');

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestión de Ausencias Programadas (Bajas, etc.)</CardTitle>
                <CardDescription>
                    Planifica ausencias de larga duración. Las vacaciones se gestionan desde la página "Programador de Vacaciones".
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <form onSubmit={handleAddAbsence} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de Ausencia</label>
                        <Select value={absenceTypeId} onValueChange={setAbsenceTypeId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                {nonSplittableAbsenceTypes.map(at => (
                                    <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fecha de Inicio</label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fecha de Fin (Opcional)</label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar Ausencia'}</Button>
                </form>

                <div className="space-y-4">
                    <h4 className="font-medium text-muted-foreground">Ausencias Programadas</h4>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Fecha de Inicio</TableHead>
                                    <TableHead>Fecha de Fin</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(!period.scheduledAbsences || period.scheduledAbsences.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No hay ausencias programadas.</TableCell>
                                    </TableRow>
                                )}
                                {period.scheduledAbsences?.map(absence => {
                                    const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);
                                    return (
                                        <TableRow key={absence.id}>
                                            <TableCell className="font-medium">{absenceType?.name || 'Desconocido'}</TableCell>
                                            <TableCell>{format(absence.startDate, 'PPP', { locale: es })}</TableCell>
                                            <TableCell>{absence.endDate ? format(absence.endDate, 'PPP', { locale: es }) : 'Indefinida'}</TableCell>
                                            <TableCell className="text-right">
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground">
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción eliminará permanentemente la ausencia programada. Deberás ajustar manualmente las semanas afectadas si ya fueron confirmadas.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteAbsence(absence.id)} disabled={isLoading}>
                                                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
