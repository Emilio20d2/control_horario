
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Database, Loader2, AlertTriangle } from 'lucide-react';
import { migrateEmployeeDataToUsers } from '@/lib/actions/migrationActions';
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

export function MigrationManager() {
    const { toast } = useToast();
    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigration = async () => {
        setIsMigrating(true);
        try {
            const result = await migrateEmployeeDataToUsers();
            if (result.success) {
                toast({
                    title: '¡Migración Completada!',
                    description: result.message,
                    className: 'bg-primary text-primary-foreground',
                    duration: 5000,
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Error running migration:", error);
            toast({
                title: 'Error en la Migración',
                description: error instanceof Error ? error.message : 'Ocurrió un error desconocido.',
                variant: 'destructive',
                duration: 10000,
            });
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <Card className="border-amber-500">
            <CardHeader>
                <CardTitle>Migración de ID de Empleado</CardTitle>
                <CardDescription>
                    Ejecuta un script para reemplazar todos los IDs de documento de los empleados por su `employeeNumber`.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 rounded-lg border border-amber-500/50 p-4">
                    <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
                        <div>
                            <h4 className="font-semibold flex items-center gap-2"><AlertTriangle className="text-amber-500" /> ¡Acción Única e Irreversible!</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                Este script reestructurará la base de datos. Solo debe ejecutarse una vez.
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="secondary" className="w-full md:w-auto bg-amber-100 hover:bg-amber-200 text-amber-900" disabled={isMigrating}>
                                    {isMigrating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Migrando...
                                        </>
                                    ) : (
                                        <>
                                            <Database className="mr-2 h-4 w-4" />
                                            Ejecutar Migración de ID
                                        </>
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción modificará permanentemente la estructura de IDs de tu base de datos. Es una operación de un solo uso y no se puede deshacer.
                                    Asegúrate de tener una copia de seguridad si es necesario.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleMigration} disabled={isMigrating}>
                                         {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, ejecutar migración"}
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
