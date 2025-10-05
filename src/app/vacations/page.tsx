

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnnualVacationQuadrant } from '@/components/vacations/annual-vacation-quadrant';
import { VacationPlanner } from '@/components/vacations/vacation-planner';


export default function VacationsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="px-4 md:px-6 pt-4 space-y-6">
                <AnnualVacationQuadrant />
                <VacationPlanner />
            </div>
        </div>
    )
}
