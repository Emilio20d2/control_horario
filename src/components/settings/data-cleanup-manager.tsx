
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, ShieldAlert } from 'lucide-react';
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
import { clearAllCheckmarks, clearAllConversations } from '@/lib/actions/dataCleanupActions';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/useAuth';


export function DataCleanupManager() {
    const { toast } = useToast();
    const { reauthenticateWithPassword } = useAuth();

    const [isAuditSubmitting, setIsAuditSubmitting] = useState(false);
    const [isMessagesSubmitting, setIsMessagesSubmitting] = useState(false);
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
        <Card>
            <CardHeader>
                <CardTitle>Limpieza de Datos</CardTitle>
                <CardDescription>
                    Herramientas para realizar operaciones de limpieza masiva. Usar con extrema precaución.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                                            // Find a way to close dialog
                                            document.querySelector('[data-radix-alert-dialog-cancel]')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
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

                 <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
                     <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
                        <div>
                             <h4 className="font-semibold">Borrar Todas las Conversaciones</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                Elimina permanentemente todas las conversaciones y mensajes del sistema de mensajería.
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full md:w-auto">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Borrar Mensajes
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmas la eliminación de TODOS los mensajes?</AlertDialogTitle>
                                <AlertDialogDescription>
                                   Esta acción es irreversible y borrará todas las conversaciones y sus mensajes de la base de datos.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-2 py-2">
                                    <Label htmlFor="password-messages">Contraseña</Label>
                                    <Input id="password-messages" type="password" placeholder="Introduce tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setPassword('')}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        setIsMessagesSubmitting(true);
                                        const success = await handleCleanup(clearAllConversations, 'Conversaciones eliminadas.', 'Error al borrar mensajes.');
                                        setIsMessagesSubmitting(false);
                                        if (success) {
                                            // Trick to close dialog
                                            document.querySelector('[data-radix-alert-dialog-cancel]')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                                        }
                                    }}
                                    disabled={isMessagesSubmitting}
                                >
                                    {isMessagesSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, borrar todo'}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </div>
                </div>
            </CardContent>
        </Card>
    );
}
