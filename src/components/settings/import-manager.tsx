
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileJson, Loader2 } from 'lucide-react';
import { processAndSeedData } from '@/lib/actions/importActions';

export function ImportManager() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await processAndSeedData();
            
            if (result.success) {
                toast({
                    title: '¡Importación Completada!',
                    description: `Se procesaron ${result.stats?.employees} empleados y ${result.stats?.weeklyRecords} registros semanales.`,
                    className: 'bg-primary text-primary-foreground',
                });
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error(error);
            toast({
                title: 'Error en la importación',
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
                <CardTitle>Importar y Migrar Datos desde JSON</CardTitle>
                <CardDescription>
                    Carga los datos desde `public/firestore_import_data.json` y migra los IDs de empleado al número de empleado.
                    Esta acción borrará las colecciones `employees`, `weeklyRecords`, `holidayEmployees`, `users` y `conversations`.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-sm text-destructive font-bold">
                       ¡Atención! Esta es una operación destructiva y no se puede deshacer. Úsala solo si estás seguro de que quieres reemplazar todos los datos existentes.
                    </p>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <FileJson className="mr-2 h-4 w-4" />
                                Importar, Migrar y Sincronizar
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
