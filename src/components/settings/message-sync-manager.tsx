
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquareReply } from 'lucide-react';
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
import { syncCorrectionRequestMessages } from '@/lib/actions/auditActions';

export function MessageSyncManager() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSync = async () => {
        setIsSubmitting(true);
        try {
            const result = await syncCorrectionRequestMessages();

            if (result.success) {
                 toast({
                    title: '¡Sincronización Completada!',
                    description: result.message,
                    className: 'bg-primary text-primary-foreground',
                });
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido durante la sincronización.');
            }

        } catch (error) {
            console.error("Error syncing messages:", error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
            toast({
                title: 'Error en la Sincronización',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sincronización de Mensajes</CardTitle>
                <CardDescription>
                    Recupera solicitudes de corrección pendientes y las muestra como mensajes en la bandeja de entrada.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 rounded-lg border border-primary/50 p-4">
                     <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
                        <div>
                             <h4 className="font-semibold">Recuperar Mensajes de Solicitudes</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                Escanea las solicitudes de corrección y crea los mensajes correspondientes si no existen.
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="default" className="w-full md:w-auto" disabled={isSubmitting}>
                                     {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sincronizando...
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquareReply className="mr-2 h-4 w-4" />
                                            Sincronizar Mensajes
                                        </>
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar Sincronización?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción escaneará todas las solicitudes de corrección pendientes para asegurarse de que aparecen como mensajes.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSync}>Sí, sincronizar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </div>
                </div>
            </CardContent>
        </Card>
    );
}
