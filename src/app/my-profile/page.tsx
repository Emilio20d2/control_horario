
'use client';

import { useEffect, useState } from 'react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeDetails } from '@/components/employees/employee-details';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { isAfter, parseISO, startOfDay } from 'date-fns';
import { BalanceCard } from '../employees/[id]/page';
import { Briefcase, Gift, Scale, Wallet, Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function MyProfilePage() {
    const { employeeRecord: employee, getEmployeeFinalBalances, weeklyRecords, loading: dataLoading, calculateEmployeeVacations } = useDataProvider();
    const [displayBalances, setDisplayBalances] = useState<{ ordinary: number; holiday: number; leave: number; total: number; } | null>(null);

    useEffect(() => {
        if (!dataLoading && employee) {
            const balances = getEmployeeFinalBalances(employee.id);
            setDisplayBalances(balances);
        }
    }, [employee, dataLoading, getEmployeeFinalBalances, weeklyRecords]);
    
    // If data provider is loading, or the specific employee hasn't been found yet, show skeleton.
    if (dataLoading || !employee) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    const activePeriod = employee.employmentPeriods?.find(p => {
        if (!p.endDate) return true;
        const endDate = typeof p.endDate === 'string' ? parseISO(p.endDate) : p.endDate as Date;
        return isAfter(endDate, startOfDay(new Date()));
    });
    
    const { vacationDaysTaken, vacationDaysAvailable } = calculateEmployeeVacations(employee);

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline">
                Mi Ficha Personal
            </h1>

             <div className="flex flex-wrap items-stretch justify-center gap-4">
                <BalanceCard title="B. Ordinaria" value={displayBalances?.ordinary} icon={Briefcase} isLoading={!displayBalances} />
                <BalanceCard title="B. Festivos" value={displayBalances?.holiday} icon={Gift} isLoading={!displayBalances} />
                <BalanceCard title="B. Libranza" value={displayBalances?.leave} icon={Wallet} isLoading={!displayBalances} />
                <Card className="flex-1 min-w-[200px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
                        <Scale className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {!displayBalances ? (
                             <Skeleton className="h-9 w-24" />
                        ) : (
                            <Badge variant={displayBalances.total >= 0 ? 'default' : 'destructive'} className="text-2xl font-bold">
                                {displayBalances.total.toFixed(2)}h
                            </Badge>
                        )}
                    </CardContent>
                </Card>
                <Card className="flex-1 min-w-[200px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vacaciones</CardTitle>
                        <Plane className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-2xl font-bold",
                            vacationDaysTaken > vacationDaysAvailable ? "text-destructive" : "",
                            vacationDaysTaken === vacationDaysAvailable && "text-green-600"
                        )}>
                            {vacationDaysTaken} / {vacationDaysAvailable}
                            <span className="text-sm text-muted-foreground ml-1">días</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="space-y-6">
                {activePeriod ? (
                    <>
                        <EmployeeDetails employee={employee} period={activePeriod} allPeriods={employee.employmentPeriods} isEmployeeView={true} />
                    </>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Sin Contrato Activo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>No tienes un periodo de contrato activo en este momento.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
