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
import { clearAllCheckmarks } from '@/lib/actions/dataCleanupActions';


export function DataCleanupManager() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCleanup = async () => {
        setIsSubmitting(true);
        try {
            const result = await clearAllCheckmarks();
            
            if (result.success) {
                toast({
                    title: '¡Limpieza Completada!',
                    description: result.message,
                    className: 'bg-primary text-primary-foreground',
                });
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error(error);
            toast({
                title: 'Error en la limpieza',
                description: error instanceof Error ? error.message : 'Ocurrió un error desconocido.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Limpieza de Datos de Auditoría</CardTitle>
                <CardDescription>
                    Herramientas para realizar operaciones de limpieza masiva en la base de datos. Usar con precaución.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
                     <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
                        <div>
                             <h4 className="font-semibold">Limpiar Marcas y Comentarios de Auditoría</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                Esta acción desmarcará todas las casillas de "Diferencia" y eliminará todos los comentarios de auditoría en todos los registros.
                                Es irreversible.
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full md:w-auto" disabled={isSubmitting}>
                                     {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Ejecutar Limpieza
                                        </>
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción recorrerá toda la base de datos y eliminará permanentemente todos los comentarios de auditoría y las marcas de "Diferencia". No se puede deshacer.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCleanup}>Sí, limpiar todo</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </div>
                </div>
            </CardContent>
        </Card>
    );
}
