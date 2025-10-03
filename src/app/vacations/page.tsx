

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnnualVacationQuadrant } from '@/components/vacations/annual-vacation-quadrant';
import { VacationPlanner } from '@/components/vacations/vacation-planner';


export default function VacationsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                Gestión de Vacaciones
                </h1>
            </div>

            <div className="px-4 md:px-6 pb-4 space-y-6">
                <AnnualVacationQuadrant />
                <VacationPlanner />
            </div>
        </div>
    )
}
