
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import { migrateEmployeeDataToUsers } from '@/lib/actions/migrationActions';

export function MigrationManager() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleMigration = async () => {
        setIsSubmitting(true);
        try {
            const result = await migrateEmployeeDataToUsers();
            if (result.success) {
                toast({
                    title: '¡Migración Completada!',
                    description: result.message,
                    className: 'bg-primary text-primary-foreground',
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error en la Migración',
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
                <CardTitle>Migración de Datos de Empleados a Usuarios</CardTitle>
                <CardDescription>
                    Sincroniza los datos de `employees` con `users` para asegurar la consistencia.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleMigration} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Migrando...
                        </>
                    ) : (
                        <>
                            <Users className="mr-2 h-4 w-4" />
                            Ejecutar Migración
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

    