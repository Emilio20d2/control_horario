

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupManager } from '@/components/vacations/group-manager';
import { VacationPlanner } from '@/components/vacations/vacation-planner';


export default function VacationsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                Programador de Vacaciones
                </h1>
            </div>

            <div className="px-4 md:px-6 pb-4">
                 <Tabs defaultValue="planner" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="planner">Planificador Anual</TabsTrigger>
                        <TabsTrigger value="groups">Agrupaciones</TabsTrigger>
                    </TabsList>
                    <TabsContent value="planner" className="pt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                               <VacationPlanner />
                            </div>
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Cuadrante Anual</CardTitle>
                                        <CardDescription>
                                            Aquí se mostrará el cuadrante anual de vacaciones de todos los empleados. Próximamente...
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
                    </TabsContent>
                    <TabsContent value="groups" className="pt-4">
                        <GroupManager />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
