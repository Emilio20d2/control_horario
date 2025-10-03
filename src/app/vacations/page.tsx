

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnnualVacationQuadrant } from '@/components/vacations/annual-vacation-quadrant';
import { VacationPlanner } from '@/components/vacations/vacation-planner';


export default function VacationsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                Cuadrante de Vacaciones Anual
                </h1>
            </div>

            <div className="px-4 md:px-6 pb-4">
                 <Tabs defaultValue="planner" className="w-full">
                    <TabsList className="grid w-full grid-cols-1">
                        <TabsTrigger value="planner">Planificador Anual</TabsTrigger>
                    </TabsList>
                    <TabsContent value="planner" className="pt-4 space-y-6">
                       <AnnualVacationQuadrant />
                       <VacationPlanner />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
