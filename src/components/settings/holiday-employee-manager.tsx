

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Loader2, Edit, Check, X } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import { HolidayEmployee } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { seedHolidayEmployees } from '@/lib/services/settingsService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


export function HolidayEmployeeManager() {
    const { holidayEmployees, employeeGroups, addHolidayEmployee, updateHolidayEmployee, deleteHolidayEmployee, loading, refreshData } = useDataProvider();
    const { toast } = useToast();

    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [newEmployeeGroupId, setNewEmployeeGroupId] = useState('');
    const [newEmployeeWorkShift, setNewEmployeeWorkShift] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Partial<HolidayEmployee>>({});

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmployeeName.trim()) {
            toast({ title: 'Nombre vacío', description: 'El nombre del empleado no puede estar vacío.', variant: 'destructive' });
            return;
        }
        setIsAdding(true);
        try {
            await addHolidayEmployee({
                name: newEmployeeName.trim(),
                groupId: newEmployeeGroupId || undefined,
                workShift: newEmployeeWorkShift || undefined,
            });
            toast({ title: 'Empleado añadido', description: `Se ha añadido a ${newEmployeeName.trim()} a la lista.` });
            setNewEmployeeName('');
            setNewEmployeeGroupId('');
            setNewEmployeeWorkShift('');
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo añadir el empleado.', variant: 'destructive' });
        } finally {
            setIsAdding(false);
        }
    };
    
    const handleEditClick = (employee: HolidayEmployee) => {
        setEditingId(employee.id);
        setEditingEmployee({ 
            name: employee.name,
            groupId: employee.groupId,
            workShift: employee.workShift,
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingEmployee({});
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editingEmployee.name?.trim()) return;
        try {
            await updateHolidayEmployee(editingId, {
                 name: editingEmployee.name.trim(),
                 groupId: editingEmployee.groupId || undefined,
                 workShift: editingEmployee.workShift || undefined,
            });
            toast({ title: 'Empleado actualizado', description: 'Los datos del empleado han sido actualizados.' });
            handleCancelEdit();
        } catch (error) {
             console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar el empleado.', variant: 'destructive' });
        }
    };

    const handleToggleActive = async (employee: HolidayEmployee) => {
        try {
            await updateHolidayEmployee(employee.id, { active: !employee.active });
            toast({ title: 'Estado actualizado', description: `El estado de ${employee.name} ha sido actualizado.` });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
        }
    };

    const handleDeleteEmployee = async (employeeId: string) => {
        try {
            await deleteHolidayEmployee(employeeId);
            toast({ title: 'Empleado eliminado', description: 'El empleado ha sido eliminado de la lista.', variant: 'destructive' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo eliminar el empleado.', variant: 'destructive' });
        }
    };

    if (loading) {
        return <Skeleton className="h-96 w-full" />
    }
    
    const sortedHolidayEmployees = holidayEmployees ? [...holidayEmployees].sort((a,b) => a.name.localeCompare(b.name)) : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Empleados para Informes</CardTitle>
                <CardDescription>
                    Define la lista de empleados que aparecerán en los listados personalizados y el informe de festivos/vacaciones.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Nombre Completo</label>
                        <Input
                            placeholder="Nombre del nuevo empleado"
                            value={newEmployeeName}
                            onChange={(e) => setNewEmployeeName(e.target.value)}
                            disabled={isAdding}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Agrupación</label>
                        <Select value={newEmployeeGroupId} onValueChange={setNewEmployeeGroupId} disabled={isAdding}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                {employeeGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium">Jornada</label>
                        <Input
                            placeholder="Ej: 40h, 20h Finde"
                            value={newEmployeeWorkShift}
                            onChange={(e) => setNewEmployeeWorkShift(e.target.value)}
                            disabled={isAdding}
                        />
                    </div>
                    <Button type="submit" disabled={isAdding}>
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Añadir
                    </Button>
                </form>

                <div className="border rounded-md max-h-[30rem] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Agrupación</TableHead>
                                <TableHead>Jornada</TableHead>
                                <TableHead className="text-center w-24">Activo</TableHead>
                                <TableHead className="text-right w-32">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedHolidayEmployees.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No hay empleados en la lista.
                                    </TableCell>
                                </TableRow>
                            )}
                            {sortedHolidayEmployees.map(emp => {
                                const group = employeeGroups.find(g => g.id === emp.groupId);
                                return (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">
                                        {editingId === emp.id ? (
                                            <Input 
                                                value={editingEmployee.name || ''} 
                                                onChange={(e) => setEditingEmployee(prev => ({...prev, name: e.target.value}))}
                                                className="h-8"
                                            />
                                        ) : (
                                            emp.name
                                        )}
                                    </TableCell>
                                    <TableCell>
                                         {editingId === emp.id ? (
                                             <Select value={editingEmployee.groupId || ''} onValueChange={v => setEditingEmployee(prev => ({...prev, groupId: v}))}>
                                                <SelectTrigger className="h-8"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                                <SelectContent>
                                                    {employeeGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                                </SelectContent>
                                             </Select>
                                         ) : (
                                            group?.name || <span className="text-muted-foreground">N/A</span>
                                         )}
                                    </TableCell>
                                     <TableCell>
                                         {editingId === emp.id ? (
                                             <Input 
                                                value={editingEmployee.workShift || ''} 
                                                onChange={(e) => setEditingEmployee(prev => ({...prev, workShift: e.target.value}))}
                                                className="h-8"
                                             />
                                         ) : (
                                            emp.workShift || <span className="text-muted-foreground">N/A</span>
                                         )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {editingId !== emp.id && (
                                            <Switch
                                                checked={emp.active}
                                                onCheckedChange={() => handleToggleActive(emp)}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === emp.id ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="text-destructive hover:text-destructive-foreground">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(emp)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
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
                                                                Esta acción eliminará a <strong>{emp.name}</strong> de la lista de empleados para informes.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteEmployee(emp.id)}>Sí, eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
