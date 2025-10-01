

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
import { EmployeeGroup } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


export function GroupManager() {
    const { employeeGroups, createEmployeeGroup, updateEmployeeGroup, deleteEmployeeGroup, loading } = useDataProvider();
    const { toast } = useToast();

    const [newGroupName, setNewGroupName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) {
            toast({ title: 'Nombre vacío', description: 'El nombre de la agrupación no puede estar vacío.', variant: 'destructive' });
            return;
        }
        setIsAdding(true);
        try {
            await createEmployeeGroup(newGroupName.trim());
            toast({ title: 'Agrupación añadida' });
            setNewGroupName('');
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo añadir la agrupación.', variant: 'destructive' });
        } finally {
            setIsAdding(false);
        }
    };
    
    const handleEditClick = (group: EmployeeGroup) => {
        setEditingId(group.id);
        setEditingName(group.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editingName.trim()) return;
        try {
            await updateEmployeeGroup(editingId, { name: editingName.trim() });
            toast({ title: 'Nombre actualizado' });
            handleCancelEdit();
        } catch (error) {
             console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar el nombre.', variant: 'destructive' });
        }
    };

    const handleDeleteEmployee = async (groupId: string, groupName: string) => {
        try {
            await deleteEmployeeGroup(groupId);
            toast({ title: 'Agrupación eliminada', description: `La agrupación ${groupName} ha sido eliminada.` });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo eliminar la agrupación.', variant: 'destructive' });
        }
    };

    if (loading) {
        return <Skeleton className="h-96 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Agrupaciones de Personal</CardTitle>
                <CardDescription>
                    Crea, edita o elimina las agrupaciones que se usarán para organizar a los empleados en los informes de vacaciones.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAddEmployee} className="flex gap-2">
                    <Input
                        placeholder="Nombre de la nueva agrupación"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        disabled={isAdding}
                    />
                    <Button type="submit" disabled={isAdding}>
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Añadir
                    </Button>
                </form>

                <div className="border rounded-md max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre de la Agrupación</TableHead>
                                <TableHead className="text-right w-40">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employeeGroups.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24">
                                        No hay agrupaciones creadas.
                                    </TableCell>
                                </TableRow>
                            )}
                            {employeeGroups.map(group => (
                                <TableRow key={group.id}>
                                    <TableCell className="font-medium">
                                        {editingId === group.id ? (
                                            <Input 
                                                value={editingName} 
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="h-8"
                                            />
                                        ) : (
                                            group.name
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === group.id ? (
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
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(group)}>
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
                                                                Esta acción eliminará la agrupación <strong>{group.name}</strong>. Los empleados asignados a este grupo quedarán sin agrupación.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteEmployee(group.id, group.name)}>Sí, eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
