

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearAllCheckmarks, deleteSelectedConversations } from '@/lib/actions/dataCleanupActions';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';


function ConversationCleanupManager() {
    const { conversations, loading } = useDataProvider();
    const { toast } = useToast();
    const { reauthenticateWithPassword } = useAuth();
    
    const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [password, setPassword] = useState('');

    const handleConversationSelect = (id: string, checked: boolean) => {
        setSelectedConversations(prev => 
            checked ? [...prev, id] : prev.filter(convId => convId !== id)
        );
    };

    const handleDelete = async () => {
        if (selectedConversations.length === 0) {
            toast({ title: 'Ninguna conversación seleccionada', description: 'Por favor, selecciona al menos una conversación para eliminar.', variant: 'destructive' });
            return;
        }
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
            const result = await deleteSelectedConversations(selectedConversations);
            if (result.success) {
                toast({
                    title: 'Conversaciones Eliminadas',
                    description: result.message,
                    variant: 'destructive',
                });
                setSelectedConversations([]);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error al eliminar',
                description: error instanceof Error ? error.message : 'No se pudieron eliminar las conversaciones.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
            setPassword('');
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Limpieza de Conversaciones</CardTitle>
                <CardDescription>
                    Selecciona y elimina permanentemente las conversaciones deseadas. Esta acción es irreversible.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <ScrollArea className="h-72 w-full rounded-md border">
                    <div className="p-4">
                        {loading ? <Loader2 className="animate-spin" /> : conversations.map(conv => (
                            <div key={conv.id} className="flex items-center space-x-2 py-2">
                                <Checkbox 
                                    id={`conv-${conv.id}`}
                                    onCheckedChange={(checked) => handleConversationSelect(conv.id, !!checked)}
                                    checked={selectedConversations.includes(conv.id)}
                                />
                                <label htmlFor={`conv-${conv.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {conv.employeeName}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <AlertDialog onOpenChange={(open) => !open && setPassword('')}>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive" className="w-full" disabled={selectedConversations.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Conversaciones Seleccionadas ({selectedConversations.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará permanentemente las <strong>{selectedConversations.length}</strong> conversaciones seleccionadas y todos sus mensajes. No se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                         <div className="space-y-2 py-2">
                            <Label htmlFor="password-delete-conv">Contraseña de Administrador</Label>
                            <Input id="password-delete-conv" type="password" placeholder="Introduce tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}


export function DataCleanupManager() {
    const { toast } = useToast();
    const { reauthenticateWithPassword } = useAuth();

    const [isAuditSubmitting, setIsAuditSubmitting] = useState(false);
    const [password, setPassword] = useState('');

    const handleCleanup = async (cleanupFn: () => Promise<{success: boolean; message?: string; error?: string;}>, successMessage: string, errorMessage: string) => {
        if (!password) {
            toast({ title: 'Contraseña requerida', description: 'Por favor, introduce tu contraseña para confirmar.', variant: 'destructive' });
            return false;
        }

        const isAuthenticated = await reauthenticateWithPassword(password);
        if (!isAuthenticated) {
            toast({ title: 'Error de autenticación', description: 'La contraseña no es correcta.', variant: 'destructive' });
            setPassword('');
            return false;
        }

        try {
            const result = await cleanupFn();
            if (result.success) {
                toast({
                    title: '¡Limpieza Completada!',
                    description: result.message || successMessage,
                    className: 'bg-primary text-primary-foreground',
                });
                return true;
            } else {
                throw new Error(result.error || errorMessage);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error en la limpieza',
                description: error instanceof Error ? error.message : 'Ocurrió un error desconocido.',
                variant: 'destructive',
            });
            return false;
        }
    };


    return (
        <>
            <ConversationCleanupManager />
            <Card>
                <CardHeader>
                    <CardTitle>Limpieza de Datos de Auditoría</CardTitle>
                    <CardDescription>
                        Herramientas para realizar operaciones de limpieza masiva en registros de auditoría. Usar con precaución.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
                        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
                            <div>
                                <h4 className="font-semibold">Limpiar Marcas y Comentarios de Auditoría</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Desmarca todas las casillas de "Diferencia" y elimina los comentarios de auditoría en todos los registros.
                                    Es irreversible.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full md:w-auto">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Limpiar Auditoría
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción eliminará permanentemente todos los comentarios de auditoría y las marcas de "Diferencia". No se puede deshacer.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="space-y-2 py-2">
                                        <Label htmlFor="password-audit">Contraseña</Label>
                                        <Input id="password-audit" type="password" placeholder="Introduce tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setPassword('')}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            setIsAuditSubmitting(true);
                                            const success = await handleCleanup(clearAllCheckmarks, 'Datos de auditoría limpiados.', 'Error al limpiar auditoría.');
                                            setIsAuditSubmitting(false);
                                            if (success) {
                                                const cancelButton = document.querySelector('[data-radix-alert-dialog-cancel]') as HTMLElement | null;
                                                if (cancelButton) {
                                                    cancelButton.click();
                                                }
                                            }
                                        }}
                                        disabled={isAuditSubmitting}
                                    >
                                        {isAuditSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, limpiar'}
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
