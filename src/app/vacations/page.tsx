

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { Loader2, PlusCircle, Edit, Check, X, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

function GroupManager() {
    const { employeeGroups, createEmployeeGroup, updateEmployeeGroup, deleteEmployeeGroup, loading } = useDataProvider();
    const { toast } = useToast();
    const { reauthenticateWithPassword } = useAuth();

    const [newGroupName, setNewGroupName] = useState('');
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupName, setEditingGroupName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [password, setPassword] = useState('');

    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setIsAddingGroup(true);
        try {
            await createEmployeeGroup(newGroupName.trim());
            toast({ title: 'Agrupación creada' });
            setNewGroupName('');
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo crear la agrupación.', variant: 'destructive' });
        } finally {
            setIsAddingGroup(false);
        }
    };

    const handleSaveGroupEdit = async () => {
        if (!editingGroupId || !editingGroupName.trim()) return;
        try {
            await updateEmployeeGroup(editingGroupId, { name: editingGroupName.trim() });
            toast({ title: 'Agrupación actualizada' });
            setEditingGroupId(null);
            setEditingGroupName('');
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar la agrupación.', variant: 'destructive' });
        }
    };
    
    const performDelete = async (groupId: string) => {
        if (!password) {
            toast({ title: 'Contraseña requerida', description: 'Por favor, introduce tu contraseña para confirmar.', variant: 'destructive' });
            return;
        }
        setIsDeleting(true);

        const isAuthenticated = await reauthenticateWithPassword(password);
        if (!isAuthenticated) {
            toast({ title: 'Error de autenticación', description: 'La contraseña no es correcta.', variant: 'destructive' });
            setIsDeleting(false);
            return;
        }
        
        try {
            await deleteEmployeeGroup(groupId);
            toast({ title: 'Agrupación eliminada', variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Error al eliminar', description: 'No se pudo eliminar la agrupación.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setPassword('');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Agrupaciones de Personal</CardTitle>
                <CardDescription>
                    Crea y gestiona las agrupaciones para organizar a los empleados en los informes (ej: Ventas, Almacén).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAddGroup} className="flex gap-2">
                    <Input
                        placeholder="Nombre de la nueva agrupación"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        disabled={isAddingGroup}
                    />
                    <Button type="submit" disabled={isAddingGroup}>
                        {isAddingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Añadir
                    </Button>
                </form>
                <div className="border rounded-md">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre de la Agrupación</TableHead>
                                <TableHead className="text-right w-40">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={2}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            ) : employeeGroups.map(group => (
                                <TableRow key={group.id}>
                                    <TableCell>
                                        {editingGroupId === group.id ? (
                                            <Input value={editingGroupName} onChange={(e) => setEditingGroupName(e.target.value)} className="h-8" />
                                        ) : (
                                            group.name
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingGroupId === group.id ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" size="icon" onClick={handleSaveGroupEdit} className="text-green-600"><Check className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setEditingGroupId(null)} className="text-destructive"><X className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                 <AlertDialog onOpenChange={(open) => !open && setPassword('')}>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground">
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. Los empleados asignados a este grupo quedarán sin agrupación.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <div className="space-y-2 py-2">
                                                            <Label htmlFor="password-group">Contraseña</Label>
                                                            <Input
                                                                id="password-group"
                                                                type="password"
                                                                placeholder="Introduce tu contraseña para confirmar"
                                                                value={password}
                                                                onChange={(e) => setPassword(e.target.value)}
                                                            />
                                                        </div>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => performDelete(group.id)} disabled={isDeleting}>
                                                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
                                                            </AlertDialogAction>
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

export default function VacationsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                Programador de Vacaciones
                </h1>
            </div>

            <div className="px-4 md:px-6 pb-4">
                 <Tabs defaultValue="planner" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="planner">Planificador Anual</TabsTrigger>
                        <TabsTrigger value="groups">Agrupaciones</TabsTrigger>
                    </TabsList>
                    <TabsContent value="planner" className="pt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Planificador Anual</CardTitle>
                                <CardDescription>
                                    Aquí se mostrará el cuadrante anual de vacaciones. Próximamente...
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">El calendario de vacaciones está en desarrollo.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="groups" className="pt-4">
                        <GroupManager />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
