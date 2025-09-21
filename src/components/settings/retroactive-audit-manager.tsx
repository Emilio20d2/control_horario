
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, History } from 'lucide-react';
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
import { runRetroactiveAudit } from '@/lib/actions/auditActions';


export function RetroactiveAuditManager() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAudit = async () => {
        setIsSubmitting(true);
        try {
            const result = await runRetroactiveAudit();

            if (result.success) {
                 toast({
                    title: '¡Auditoría Completada!',
                    description: result.message,
                    className: 'bg-primary text-primary-foreground',
                });
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido durante la auditoría.');
            }

        } catch (error) {
            console.error("Error running retroactive audit:", error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la auditoría retroactiva.';
            toast({
                title: 'Error en la auditoría',
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
                <CardTitle>Auditoría Retroactiva de Comentarios</CardTitle>
                <CardDescription>
                    Esta herramienta audita todas las semanas ya confirmadas y añade un comentario si detecta una diferencia con los datos de Excel.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 rounded-lg border border-primary/50 p-4">
                     <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
                        <div>
                             <h4 className="font-semibold">Ejecutar Auditoría y Actualizar Comentarios</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                El proceso recorrerá todos los registros confirmados de la base de datos. Esta acción es segura y solo añade comentarios.
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="default" className="w-full md:w-auto" disabled={isSubmitting}>
                                     {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <History className="mr-2 h-4 w-4" />
                                            Ejecutar Auditoría
                                        </>
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar Auditoría Retroactiva?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción escaneará toda la base de datos para añadir comentarios de auditoría en las semanas confirmadas que tengan diferencias. Puede tardar unos minutos.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleAudit}>Sí, ejecutar ahora</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </div>
                </div>
            </CardContent>
        </Card>
    );
}
