

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Edit, Check, X, Save } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import { EmployeeGroup } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { InputStepper } from '../ui/input-stepper';


export function GroupManager() {
    const { employeeGroups, createEmployeeGroup, updateEmployeeGroup, deleteEmployeeGroup, loading, updateEmployeeGroupOrder } = useDataProvider();
    const { toast } = useToast();

    const [newGroupName, setNewGroupName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const [localGroups, setLocalGroups] = useState<EmployeeGroup[]>([]);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    useEffect(() => {
        setLocalGroups(employeeGroups);
    }, [employeeGroups]);

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) {
            toast({ title: 'Nombre vacío', description: 'El nombre de la agrupación no puede estar vacío.', variant: 'destructive' });
            return;
        }
        setIsAdding(true);
        try {
            const maxOrder = employeeGroups.reduce((max, group) => group.order > max ? group.order : max, 0);
            await createEmployeeGroup({ name: newGroupName.trim(), order: maxOrder + 1 });
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

    const handleOrderChange = (groupId: string, newOrder: number) => {
        setLocalGroups(prevGroups => prevGroups.map(g => g.id === groupId ? { ...g, order: newOrder } : g));
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            await updateEmployeeGroupOrder(localGroups);
            toast({ title: "Orden guardado", description: "El nuevo orden de las agrupaciones ha sido guardado." });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo guardar el orden.', variant: 'destructive' });
        } finally {
            setIsSavingOrder(false);
        }
    }


    if (loading) {
        return <Skeleton className="h-96 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Agrupaciones de Personal</CardTitle>
                <CardDescription>
                    Crea agrupaciones y define su orden de aparición en los informes.
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

                <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-md font-medium">Agrupaciones</h3>
                        <Button onClick={handleSaveOrder} disabled={isSavingOrder}>
                            {isSavingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Orden
                        </Button>
                    </div>
                    <div className="border rounded-md max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre de la Agrupación</TableHead>
                                    <TableHead className="text-right w-40">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {localGroups.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">
                                            No hay agrupaciones creadas.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {localGroups.sort((a,b) => a.order - b.order).map(group => (
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
                </div>
            </CardContent>
        </Card>
    );
}
