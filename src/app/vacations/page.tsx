
'use client';

import { AnnualVacationQuadrant } from '@/components/vacations/annual-vacation-quadrant';
import { ReportGenerator } from '@/components/vacations/report-generator';
import { VacationPlanner } from '@/components/vacations/vacation-planner';


export default function VacationsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="px-4 md:px-6 pt-4 space-y-6">
                <ReportGenerator />
                <AnnualVacationQuadrant />
                <VacationPlanner />
            </div>
        </div>
    )
}
