

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { Trash2, Loader2, Edit, X } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod, ScheduledAbsence } from '@/lib/types';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { addScheduledAbsence, hardDeleteScheduledAbsence } from '@/lib/services/employeeService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '../ui/label';


interface ScheduledAbsenceManagerProps {
    employee: Employee;
    period: EmploymentPeriod;
}

export function ScheduledAbsenceManager({ employee, period }: ScheduledAbsenceManagerProps) {
    const { absenceTypes, refreshData, weeklyRecords } = useDataProvider();
    const { appUser, reauthenticateWithPassword } = useAuth();
    const { toast } = useToast();

    const [absenceTypeId, setAbsenceTypeId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [editingAbsence, setEditingAbsence] = useState<ScheduledAbsence | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');


    const sortedAbsenceTypes = [...absenceTypes].sort((a, b) => a.name.localeCompare(b.name));
    
    const vacationTypeId = absenceTypes.find(at => at.name === 'Vacaciones')?.id;

    const groupedScheduledAbsences = (employee.employmentPeriods || [])
        .flatMap(p => 
            (p.scheduledAbsences || [])
            .filter(a => a.absenceTypeId !== vacationTypeId) // Exclude vacations
            .map(a => ({ ...a, periodId: p.id }))
        )
        .sort((a, b) => (b.startDate as Date).getTime() - (a.startDate as Date).getTime());


    const handleAddOrUpdateAbsence = async (e: React.FormEvent) => {
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
            const periodToUpdate = editingAbsence
                ? employee.employmentPeriods.find(p => p.id === (editingAbsence as any).periodId)
                : period;
            
            if (!periodToUpdate) throw new Error("No se encontró el periodo del contrato para esta ausencia.");

            if (editingAbsence) {
                // To maintain history, we don't delete. We invalidate the old period by making it a zero-day event.
                const absenceToInvalidate = periodToUpdate.scheduledAbsences?.find(a => a.id === editingAbsence!.id);
                if(absenceToInvalidate){
                    absenceToInvalidate.endDate = absenceToInvalidate.startDate;
                }
            }
            
            await addScheduledAbsence(
                employee.id,
                periodToUpdate.id,
                {
                    absenceTypeId,
                    startDate: startDate,
                    endDate: endDate || null,
                },
                employee,
                editingAbsence?.originalRequest
            );

            toast({
                title: editingAbsence ? 'Ausencia Actualizada' : 'Ausencia Programada',
                description: `Se han guardado los cambios para el empleado.`,
                className: "bg-primary text-primary-foreground",
            });

            resetForm();
            refreshData();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error al guardar',
                description: error instanceof Error ? error.message : "No se pudo programar la ausencia.",
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetForm = () => {
        setEditingAbsence(null);
        setAbsenceTypeId('');
        setStartDate('');
        setEndDate('');
    }

    const handleEditAbsence = (absence: ScheduledAbsence) => {
        setEditingAbsence(absence);
        setAbsenceTypeId(absence.absenceTypeId);
        setStartDate(format(absence.startDate as Date, 'yyyy-MM-dd'));
        setEndDate(absence.endDate ? format(absence.endDate as Date, 'yyyy-MM-dd') : '');
    };

    const handleHardDelete = async (absence: ScheduledAbsence) => {
        if (!deletePassword) {
            toast({ title: 'Contraseña requerida', description: 'Introduce tu contraseña para confirmar.', variant: 'destructive' });
            return;
        }
        setIsLoading(true);
        
        try {
            const isAuthenticated = await reauthenticateWithPassword(deletePassword);
            if (!isAuthenticated) {
                toast({ title: 'Error de autenticación', description: 'La contraseña no es correcta.', variant: 'destructive' });
                setIsLoading(false);
                return;
            }

            await hardDeleteScheduledAbsence(employee.id, (absence as any).periodId, absence.id, absence.originalRequest);
            toast({ title: 'Ausencia eliminada permanentemente', variant: 'destructive' });
            
            resetForm();
            refreshData();

        } catch (error) {
            console.error(error);
            toast({ title: 'Error al eliminar', description: error instanceof Error ? error.message : 'No se pudo eliminar la ausencia permanentemente.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
            setDeletePassword('');
        }
    };
    
    return (
        <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-background">
            <CardHeader>
                <CardTitle>Gestión de Ausencias Programadas (Bajas, etc.)</CardTitle>
                <CardDescription>
                    Planifica ausencias de larga duración. Las vacaciones se gestionan desde la página "Programador de Vacaciones".
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <form onSubmit={handleAddOrUpdateAbsence} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de Ausencia</label>
                        <Select value={absenceTypeId} onValueChange={setAbsenceTypeId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                {sortedAbsenceTypes.map(at => (
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
                    <div className="flex gap-2">
                        {editingAbsence && (
                            <Button type="button" variant="outline" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
                        )}
                        <Button type="submit" disabled={isLoading} className="flex-grow">{isLoading ? 'Guardando...' : editingAbsence ? 'Actualizar' : 'Guardar'}</Button>
                    </div>
                </form>

                <div className="space-y-4">
                    <h4 className="font-medium text-muted-foreground">Historial de Ausencias Programadas</h4>
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
                                {(!groupedScheduledAbsences || groupedScheduledAbsences.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No hay ausencias programadas.</TableCell>
                                    </TableRow>
                                )}
                                {groupedScheduledAbsences.map(absence => {
                                    const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);
                                    const isEditingCurrent = editingAbsence?.id === absence.id;
                                    return (
                                        <TableRow key={absence.id} className={isEditingCurrent ? 'bg-muted/50' : ''}>
                                            <TableCell className="font-medium">{absenceType?.name || 'Desconocido'}</TableCell>
                                            <TableCell>{format(absence.startDate as Date, 'dd/MM/yyyy', { locale: es })}</TableCell>
                                            <TableCell>{absence.endDate ? format(absence.endDate as Date, 'dd/MM/yyyy', { locale: es }) : 'Indefinida'}</TableCell>
                                            <TableCell className="text-right">
                                                 <Button variant="ghost" size="icon" onClick={() => handleEditAbsence(absence)} disabled={isEditingCurrent}>
                                                     <Edit className="h-4 w-4" />
                                                 </Button>
                                                 {appUser?.role === 'admin' && (
                                                    <AlertDialog onOpenChange={(open) => !open && setDeletePassword('')}>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground">
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Confirmas la eliminación permanente?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción eliminará permanentemente la ausencia y su registro de solicitud original. No se podrá recuperar.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <div className="space-y-2 py-2">
                                                                <Label htmlFor="password-delete">Contraseña de Administrador</Label>
                                                                <Input id="password-delete" type="password" placeholder="Introduce tu contraseña" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                                                            </div>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleHardDelete(absence)} disabled={isLoading}>
                                                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar permanentemente'}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                 )}
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
