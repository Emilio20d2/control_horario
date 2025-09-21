
'use client';

import { HolidayForm } from "@/components/settings/holiday-form";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useParams, notFound } from "next/navigation";
import { useDataProvider } from '@/hooks/use-data-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";

export default function EditHolidayPage() {
    const params = useParams();
    const id = params.id as string;
    const { holidays, loading } = useDataProvider();
    const holiday = holidays.find(h => h.id === id);

    if (loading) {
         return (
             <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center gap-4">
                     <Skeleton className="h-10 w-10 rounded-md" />
                     <Skeleton className="h-7 w-64" />
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        )
    }

    if (!holiday) {
        notFound();
    }
    
    const formattedHoliday = {
        ...holiday,
        date: format(holiday.date, 'yyyy-MM-dd')
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 px-4 md:px-6 pt-4">
                <Link href="/settings" passHref>
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Editar: {holiday.name}
                </h1>
            </div>
            <div className="px-4 md:px-6 pb-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Festivo</CardTitle>
                        <CardDescription>
                            Modifica el nombre o tipo de este día festivo. La fecha no se puede cambiar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <HolidayForm holiday={formattedHoliday} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
