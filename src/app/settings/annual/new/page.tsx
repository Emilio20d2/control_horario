
import { AnnualConfigForm } from "@/components/settings/annual-config-form";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NewAnnualConfigPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 px-4 md:px-6 pt-4">
                <Link href="/settings" passHref>
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Crear Nueva Configuración Anual
                </h1>
            </div>
            <div className="px-4 md:px-6 pb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalles de la Configuración Anual</CardTitle>
                        <CardDescription>
                            Define las reglas de cómputo de horas para un año específico.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AnnualConfigForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
