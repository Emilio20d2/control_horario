

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
    
    // Oculto para evitar confusiones. La carga de datos de auditoría se hace por script
    // y la carga inicial de datos también. Esta herramienta podría borrar los datos de auditoría.
    return null;

    /*
    return (
        <Card>
            <CardHeader>
                <CardTitle>Importar Datos desde JSON</CardTitle>
                <CardDescription>
                    Carga los datos desde el archivo `public/firestore_import_data.json`.
                    Esta acción borrará todos los datos existentes antes de importar los nuevos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Asegúrate de que el archivo `import_from_excel.js` se haya ejecutado para generar el archivo JSON más reciente antes de proceder.
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
                                Importar desde JSON y Sincronizar
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
    */
}
