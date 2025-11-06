
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function EmployeeViewManager() {
    const { toast } = useToast();
    const [isEnabled, setIsEnabled] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const configRef = doc(db, 'app_config', 'features');
        const unsubscribe = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                setIsEnabled(docSnap.data().isEmployeeViewEnabled || false);
            } else {
                // Default to disabled if the document doesn't exist
                setIsEnabled(false);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleToggle = async (checked: boolean) => {
        setIsLoading(true);
        try {
            const configRef = doc(db, 'app_config', 'features');
            await setDoc(configRef, { isEmployeeViewEnabled: checked }, { merge: true });
            toast({
                title: 'Configuración actualizada',
                description: `La vista de empleado ha sido ${checked ? 'habilitada' : 'deshabilitada'}.`,
            });
        } catch (error) {
            console.error("Error updating employee view status:", error);
            toast({
                title: 'Error',
                description: 'No se pudo actualizar la configuración.',
                variant: 'destructive',
            });
            // Revert UI on error
            setIsEnabled(!checked);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-gradient-to-br from-teal-50 to-transparent dark:from-teal-950/30 dark:to-transparent">
            <CardHeader>
                <CardTitle>Gestión de Acceso de Empleados</CardTitle>
                <CardDescription>
                    Habilita o deshabilita el acceso a la vista de empleado para toda la plantilla.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-4 rounded-lg border p-4">
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        isEnabled ? <Eye className="h-5 w-5 text-green-600" /> : <EyeOff className="h-5 w-5 text-destructive" />
                    )}
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            Habilitar Vista de Empleado
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {isEnabled
                                ? 'Los empleados pueden acceder a sus perfiles.'
                                : 'Los empleados verán una página de mantenimiento.'}
                        </p>
                    </div>
                    {isLoading ? (
                        <div className="h-6 w-11 rounded-full bg-muted" />
                    ) : (
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={handleToggle}
                            aria-label="Toggle employee view"
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
