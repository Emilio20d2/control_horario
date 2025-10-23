

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Loader2, Edit, Check, X, Save } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import { HolidayEmployee } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';
import { isAfter, parseISO } from 'date-fns';


export function HolidayEmployeeManager() {
    const { employees, holidayEmployees, employeeGroups, addHolidayEmployee, updateHolidayEmployee, deleteHolidayEmployee, loading, getEffectiveWeeklyHours } = useDataProvider();
    const { toast } = useToast();

    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Partial<HolidayEmployee>>({});
    
    const unifiedEmployees = useMemo(() => {
        if (loading) return [];

        const mainEmployeesMap = new Map(employees.map(e => [e.id, e]));
        const holidayEmployeesMap = new Map(holidayEmployees.map(he => [he.id, he]));

        const allEmployeeIds = new Set([...mainEmployeesMap.keys(), ...holidayEmployeesMap.keys()]);

        return Array.from(allEmployeeIds).map(id => {
            const mainEmp = mainEmployeesMap.get(id);
            const holidayEmp = holidayEmployeesMap.get(id);

            if (mainEmp) {
                const activePeriod = mainEmp.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date()));
                
                if (!activePeriod) {
                    return null;
                }
                
                return {
                    id: mainEmp.id,
                    name: mainEmp.name,
                    groupId: holidayEmp?.groupId,
                    active: holidayEmp?.active ?? true,
                    isEventual: false,
                };
            } else if (holidayEmp) {
                return { ...holidayEmp, isEventual: true };
            }
            return null;
        }).filter((emp): emp is HolidayEmployee & { isEventual: boolean; workShift?: string } => emp !== null)
          .sort((a, b) => a.name.localeCompare(b.name));

    }, [loading, employees, holidayEmployees]);


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
            });
            toast({ title: 'Empleado añadido', description: `Se ha añadido a ${newEmployeeName.trim()} a la lista.` });
            setNewEmployeeName('');
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
                 groupId: editingEmployee.groupId || null,
            });
            toast({ title: 'Empleado actualizado', description: 'Los datos del empleado han sido actualizados.' });
            handleCancelEdit();
        } catch (error) {
             console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar el empleado.', variant: 'destructive' });
        }
    };

    const handleToggleActive = async (employee: HolidayEmployee & { isEventual: boolean; workShift?: string }) => {
        try {
            const holidayEmpExists = holidayEmployees.some(he => he.id === employee.id);
            const newActiveState = !employee.active;
    
            if (!holidayEmpExists && !employee.isEventual) {
                await addHolidayEmployee({
                    id: employee.id,
                    name: employee.name,
                    active: newActiveState,
                    groupId: employee.groupId,
                });
            } else {
                await updateHolidayEmployee(employee.id, { active: newActiveState });
            }
    
            toast({ title: 'Estado actualizado', description: `El estado de ${employee.name} ha sido actualizado.` });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
        }
    };
    
    const handleGroupChange = async (employeeId: string, groupId: string) => {
        const holidayEmp = holidayEmployees.find(he => he.id === employeeId);
        const groupValue = groupId === 'none' ? null : groupId;

        try {
             if (holidayEmp) {
                await updateHolidayEmployee(employeeId, { groupId: groupValue });
            } else {
                // If the employee is not in holidayEmployees, add them
                const mainEmp = employees.find(e => e.id === employeeId);
                if (mainEmp) {
                     await addHolidayEmployee({ id: mainEmp.id, name: mainEmp.name, active: true, groupId: groupValue });
                }
            }
            toast({ title: 'Grupo actualizado', description: 'La agrupación del empleado ha sido actualizada.' });
        } catch (error) {
             console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar la agrupación.', variant: 'destructive' });
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Empleados para Informes</CardTitle>
                <CardDescription>
                    Esta lista combina empleados fijos activos y eventuales. Gestiona su aparición en informes y asígnalos a grupos de vacaciones.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div className="space-y-1 col-span-2">
                        <label className="text-xs font-medium">Nombre Completo (Eventual)</label>
                        <Input
                            placeholder="Nombre del nuevo empleado eventual"
                            value={newEmployeeName}
                            onChange={(e) => setNewEmployeeName(e.target.value)}
                            disabled={isAdding}
                        />
                    </div>
                    <Button type="submit" disabled={isAdding}>
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Añadir Eventual
                    </Button>
                </form>

                <div className="border rounded-md max-h-[30rem] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[200px]">Empleado</TableHead>
                                <TableHead className="w-[150px]">Agrupación</TableHead>
                                <TableHead className="text-center w-24">Activo</TableHead>
                                <TableHead className="text-right w-32">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {unifiedEmployees.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No hay empleados que mostrar.
                                    </TableCell>
                                </TableRow>
                            )}
                            {unifiedEmployees.map(emp => {
                                const isEditingCurrent = editingId === emp.id;
                                
                                return (
                                <TableRow key={emp.id} className={cn(!emp.isEventual && "bg-muted/50")}>
                                    <TableCell className="font-medium min-w-[200px]">
                                        {isEditingCurrent && emp.isEventual ? (
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
                                        <Select value={emp.groupId || 'none'} onValueChange={(value) => handleGroupChange(emp.id, value)}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Sin grupo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin Grupo</SelectItem>
                                                {employeeGroups.map(g => (
                                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={emp.active}
                                            onCheckedChange={() => handleToggleActive(emp)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {emp.isEventual ? (
                                            <>
                                                {isEditingCurrent ? (
                                                     <div className="flex gap-2 justify-end">
                                                        <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="text-destructive hover:text-destructive-foreground">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                     <Button variant="ghost" size="icon" onClick={() => handleEditClick(emp as HolidayEmployee)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
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
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Fijo</span>
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
