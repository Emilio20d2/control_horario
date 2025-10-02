
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit, PlusCircle, Wallet, Briefcase, Gift, Scale, Loader2, Users } from 'lucide-react';
import { notFound, useParams } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { EmployeeDetails } from "@/components/employees/employee-details";
import { Skeleton } from '@/components/ui/skeleton';
import { useDataProvider } from '@/hooks/use-data-provider';
import { ScheduledAbsenceManager } from '@/components/employees/scheduled-absence-manager';
import { isAfter, parseISO, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo, useState, useEffect } from 'react';

const BalanceCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: number | undefined; icon: React.ElementType, isLoading: boolean }) => (
    <Card className="flex-1 min-w-[200px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading || value === undefined ? (
            <Skeleton className="h-8 w-24" />
        ) : (
            <div className={`text-2xl font-bold ${value < 0 ? 'text-destructive' : ''}`}>
                {value.toFixed(2)}h
            </div>
        )}
      </CardContent>
    </Card>
);

export default function EmployeeDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { getEmployeeById, loading, weeklyRecords, getEmployeeFinalBalances, employeeGroups } = useDataProvider();
    const [displayBalances, setDisplayBalances] = useState<{ ordinary: number; holiday: number; leave: number; total: number; } | null>(null);

    const employee = getEmployeeById(id);

    useEffect(() => {
        if (!loading && employee) {
            const balances = getEmployeeFinalBalances(id);
            setDisplayBalances(balances);
        }
    }, [id, employee, loading, getEmployeeFinalBalances, weeklyRecords]);
    
    if (loading) {
        return (
             <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="flex flex-col gap-2">
                             <Skeleton className="h-7 w-48" />
                             <Skeleton className="h-5 w-24" />
                        </div>
                    </div>
                     <Skeleton className="h-10 w-32" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-6">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
                 <div className="px-4 md:px-6 pb-4">
                    <Skeleton className="h-96 w-full" />
                 </div>
            </div>
        );
    }

    if (!employee) {
        return notFound();
    }
    
    const employeeGroup = employeeGroups.find(g => g.id === employee.groupId);

    const activePeriod = employee.employmentPeriods?.find(p => {
        if (!p.endDate) return true;
        const endDate = typeof p.endDate === 'string' ? parseISO(p.endDate) : p.endDate as Date;
        return isAfter(endDate, startOfDay(new Date()));
    });
    
    const latestPeriod = employee.employmentPeriods?.sort((a,b) => {
        const dateA = typeof a.startDate === 'string' ? parseISO(a.startDate) : a.startDate as Date;
        const dateB = typeof b.startDate === 'string' ? parseISO(b.startDate) : b.startDate as Date;
        return dateB.getTime() - dateA.getTime();
    })[0];
    
    const periodToDisplay = activePeriod || latestPeriod;

    const isContractActive = !!activePeriod;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 px-4 md:px-6 pt-4">
               <div className="flex items-center gap-4">
                 <Link href="/employees" passHref>
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">
                        {employee.name}
                    </h1>
                     <div className="flex items-center gap-2 mt-1">
                        {isContractActive && periodToDisplay ? (
                            <Badge variant="outline">{periodToDisplay.contractType}</Badge>
                        ) : (
                            <Badge variant="destructive">Inactivo</Badge>
                        )}
                        {employeeGroup ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {employeeGroup.name}
                            </Badge>
                        ) : (
                            <Badge variant="secondary">Sin Agrupación</Badge>
                        )}
                     </div>
                </div>
               </div>
                <div className="flex items-center gap-2">
                     <Link href={`/employees/${employee.id}/edit`} passHref>
                        <Button variant="outline">
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Ficha
                        </Button>
                    </Link>
                    {!isContractActive && (
                        <Link href={`/employees/${employee.id}/new-contract`} passHref>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Recontratar (Nuevo Contrato)
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-stretch justify-center gap-4 px-4 md:px-6">
                <BalanceCard title="Bolsa Ordinaria" value={displayBalances?.ordinary} icon={Briefcase} isLoading={!displayBalances} />
                <BalanceCard title="Bolsa Festivos" value={displayBalances?.holiday} icon={Gift} isLoading={!displayBalances} />
                <BalanceCard title="Bolsa Libranza" value={displayBalances?.leave} icon={Wallet} isLoading={!displayBalances} />
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
            </div>


            <div className="px-4 md:px-6 pb-4 space-y-6">
                {periodToDisplay && <EmployeeDetails period={periodToDisplay} employeeId={employee.id} allPeriods={employee.employmentPeriods} />}
                {activePeriod && <ScheduledAbsenceManager employee={employee} period={activePeriod} />}
            </div>

        </div>
    );
}
