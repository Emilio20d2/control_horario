
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, LogOut, Wrench } from 'lucide-react';
import Image from 'next/image';

export default function UnavailablePage() {
    const { logout, loading } = useAuth();

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Wrench className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold font-headline">Vista en Mantenimiento</CardTitle>
                    <CardDescription>
                        La vista para empleados se está actualizando para mejorar tu experiencia.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        De momento, solo el personal de administración tiene acceso. Podrás volver a entrar pronto. Disculpa las molestias.
                    </p>
                    <Button onClick={logout} disabled={loading} className="w-full">
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                        )}
                        Cerrar Sesión
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
