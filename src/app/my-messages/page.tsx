
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat } from 'lucide-react';

export default function MyMessagesPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 md:p-6">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                        <HardHat className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle>Página en Construcción</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Esta sección para que puedas comunicarte con los administradores se encuentra en desarrollo.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
