
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VacationsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                Programador de Vacaciones
                </h1>
            </div>

            <div className="px-4 md:px-6 pb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Planificador Anual</CardTitle>
                        <CardDescription>
                            Aquí se mostrará el cuadrante anual de vacaciones. Próximamente...
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">El calendario de vacaciones está en desarrollo.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
