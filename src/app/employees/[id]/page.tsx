

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit, PlusCircle, Wallet, Briefcase, Gift, Scale, Plane, CalendarX2, Hourglass, CheckCircle } from 'lucide-react';
import { notFound, useParams } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { EmployeeDetails } from "@/components/employees/employee-details";
import { Skeleton } from '@/components/ui/skeleton';
import { useDataProvider } from '@/hooks/use-data-provider';
import { ScheduledAbsenceManager } from '@/components/employees/scheduled-absence-manager';
import { isAfter, parseISO, startOfDay, getYear, getISOWeekYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useMemo, useState, useEffect } from 'react';
import { EmployeeReportGenerator } from '@/components/employees/employee-report-generator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AbsenceType } from '@/lib/types';


const BalanceDisplay = ({ title, value, icon: Icon, isLoading }: { title: string; value: number | undefined; icon: React.ElementType; isLoading: boolean }) => (
    <div className="flex flex-col items-center justify-center p-4">
        <Icon className="h-6 w-6 text-muted-foreground mb-2" />
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {isLoading || value === undefined ? (
            <Skeleton className="h-7 w-20 mt-1" />
        ) : (
            <div className={`text-xl font-bold ${value < 0 ? 'text-destructive' : ''}`}>
                {value.toFixed(2)}h
            </div>
        )}
    </div>
);

const VacationPopoverContent = ({ vacationInfo, currentYear }: { vacationInfo: NonNullable<ReturnType<typeof useDataProvider>['calculateEmployeeVacations']>, currentYear: number }) => (
    <div className="grid gap-4">
        <div className="space-y-2">
            <h4 className="font-medium leading-none">Cálculo de Días Disponibles ({currentYear})</h4>
            <p className="text-sm text-muted-foreground">
                Desglose de cómo se calcula el total de vacaciones del empleado.
            </p>
        </div>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Días prorrateados del año:</span> <span className="font-mono font-medium">{vacationInfo.proratedDays.toFixed(2)}</span></div>
            <div className="flex justify-between">
                <span>Arrastrados del año anterior:</span>
                <span className={cn("font-mono font-medium", vacationInfo.carryOverDays < 0 && "text-destructive")}>
                    {vacationInfo.carryOverDays.toFixed(2)}
                </span>
            </div>
            {vacationInfo.suspensionDeduction > 0 && (
                <div className="flex justify-between">
                    <span>Descuento por suspensión:</span>
                    <span className="font-mono font-medium text-destructive">
                        - {vacationInfo.suspensionDeduction.toFixed(2)}
                    </span>
                </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold"><span>Total Días Disponibles:</span> <span className="font-mono">{vacationInfo.vacationDaysAvailable}</span></div>
        </div>
    </div>
);


export default function EmployeeDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { getEmployeeById, loading, weeklyRecords, getEmployeeFinalBalances, calculateEmployeeVacations, absenceTypes } = useDataProvider();
    const [displayBalances, setDisplayBalances] = useState<{ ordinary: number; holiday: number; leave: number; total: number; } | null>(null);
    const [vacationInfo, setVacationInfo] = useState<ReturnType<typeof calculateEmployeeVacations> | null>(null);
    const [seniorHoursTotal, setSeniorHoursTotal] = useState(0);
    const currentYear = getYear(new Date());
    const isMobile = useIsMobile();

    const employee = getEmployeeById(id);

    useEffect(() => {
        if (!loading && employee) {
            setDisplayBalances(getEmployeeFinalBalances(employee.id));
            setVacationInfo(calculateEmployeeVacations(employee, currentYear, 'confirmed'));
        }
    }, [id, employee, loading, getEmployeeFinalBalances, calculateEmployeeVacations, currentYear, weeklyRecords]);

    const absenceSummary = useMemo(() => {
        if (!employee || !weeklyRecords || absenceTypes.length === 0) return [];
    
        const summary: Record<string, { type: AbsenceType; total: number; isDays: boolean }> = {};
    
        const dayCountAbsences = new Set(['V', 'AT', 'AP', 'B', 'B/C', 'EG', 'EXD', 'FF', 'PE']);
    
        Object.values(weeklyRecords).forEach(record => {
            const weekDate = parseISO(record.id);
            if (getISOWeekYear(weekDate) !== currentYear) return;
    
            const empWeekData = record.weekData[employee.id];
            if (empWeekData?.days) {
                Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                    if (getYear(parseISO(dayStr)) !== currentYear) return;
    
                    if (dayData.absence && dayData.absence !== 'ninguna') {
                        const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                        if (absenceType) {
                            if (!summary[absenceType.id]) {
                                summary[absenceType.id] = { type: absenceType, total: 0, isDays: dayCountAbsences.has(absenceType.abbreviation) };
                            }
                            summary[absenceType.id].total += summary[absenceType.id].isDays ? 1 : (dayData.absenceHours || 0);
                        }
                    }
                });
            }
        });
    
        return Object.values(summary);
    
    }, [employee, weeklyRecords, absenceTypes, currentYear]);

     useEffect(() => {
        const seniorType = absenceTypes.find(at => at.name === 'Reducción Jornada Senior');
        if (!seniorType || !employee || !weeklyRecords) {
            setSeniorHoursTotal(0);
            return;
        }

        let total = 0;
        const currentYear = getYear(new Date());

        Object.values(weeklyRecords).forEach(record => {
            const empWeekData = record.weekData[employee.id];
            if (empWeekData?.confirmed && empWeekData.days) {
                Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                    if (getYear(parseISO(dayStr)) === currentYear && dayData.absence === seniorType.abbreviation) {
                        total += dayData.absenceHours;
                    }
                });
            }
        });
        setSeniorHoursTotal(total);
    }, [employee, weeklyRecords, absenceTypes]);
    
    if (loading) {
        return (
             <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10" />
                        <div className="flex flex-col gap-2">
                             <Skeleton className="h-7 w-48" />
                             <Skeleton className="h-5 w-24" />
                        </div>
                    </div>
                     <Skeleton className="h-10 w-32" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-6">
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
        <div className="flex flex-col gap-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 md:px-6">
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
                        {employee.employeeNumber && <Badge variant="secondary">{employee.employeeNumber}</Badge>}
                     </div>
                </div>
               </div>
                <div className="flex flex-wrap items-center gap-2">
                     <Link href={`/employees/${employee.id}/edit`} passHref>
                        <Button variant="outline">
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Ficha
                        </Button>
                    </Link>
                    {isContractActive && (
                       <EmployeeReportGenerator employee={employee} />
                    )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base">Detalle de Bolsas de Horas</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 divide-x divide-border">
                        <BalanceDisplay title="B. Ordinaria" value={displayBalances?.ordinary} icon={Briefcase} isLoading={!displayBalances} />
                        <BalanceDisplay title="B. Festivos" value={displayBalances?.holiday} icon={Gift} isLoading={!displayBalances} />
                        <BalanceDisplay title="B. Libranza" value={displayBalances?.leave} icon={Wallet} isLoading={!displayBalances} />
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 border-t pt-4">
                        <div className="flex justify-between w-full">
                             <div className="font-bold flex items-center gap-2">
                                <Scale className="h-5 w-5 text-muted-foreground"/>
                                Balance Total:
                            </div>
                             {!displayBalances ? (
                                <Skeleton className="h-9 w-24" />
                            ) : (
                                <Badge variant={displayBalances.total >= 0 ? 'default' : 'destructive'} className="text-lg font-bold">
                                    {displayBalances.total.toFixed(2)}h
                                </Badge>
                            )}
                        </div>
                    </CardFooter>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vacaciones</CardTitle>
                         {isMobile && <Plane className="h-4 w-4 text-muted-foreground" />}
                         {!isMobile && vacationInfo && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-xs">Ver detalle</Button>
                                </PopoverTrigger>
                                {vacationInfo && (
                                    <PopoverContent className="w-80">
                                        <VacationPopoverContent vacationInfo={vacationInfo} currentYear={currentYear} />
                                    </PopoverContent>
                                )}
                            </Popover>
                         )}
                    </CardHeader>
                    <CardContent>
                        {!vacationInfo ? <Skeleton className="h-8 w-32" /> : (
                            <div className={cn(
                                "text-2xl font-bold",
                                vacationInfo.vacationDaysTaken > vacationInfo.vacationDaysAvailable ? "text-destructive" : "",
                                vacationInfo.vacationDaysTaken === vacationInfo.vacationDaysAvailable && "text-green-600"
                            )}>
                                {vacationInfo.vacationDaysTaken} / {vacationInfo.vacationDaysAvailable}
                                <span className="text-sm text-muted-foreground ml-1">días</span>
                            </div>
                        )}
                        {!isMobile && vacationInfo && (
                             <div className="pt-4 mt-4 border-t">
                                <VacationPopoverContent vacationInfo={vacationInfo} currentYear={currentYear} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarX2 className="h-5 w-5 text-primary" />
                            Resumen de Ausencias ({getYear(new Date())})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {absenceSummary.length === 0 && seniorHoursTotal === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No hay ausencias registradas este año.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo de Ausencia</TableHead>
                                        <TableHead className="text-right">Total Consumido</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {seniorHoursTotal > 0 && (
                                        <TableRow className="bg-muted/50">
                                            <TableCell className="font-semibold flex items-center gap-2">
                                                <Hourglass className="h-4 w-4 text-muted-foreground" />
                                                Reducción Jornada Senior
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold">
                                                {seniorHoursTotal.toFixed(2)} horas
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {absenceSummary.map(item => (
                                        <TableRow key={item.type.id}>
                                            <TableCell>{item.type.name}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {item.total} {item.isDays ? 'días' : 'horas'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
                
            </div>


            <div className="px-4 md:px-6 pb-4 space-y-6">
                {periodToDisplay && <EmployeeDetails employee={employee} period={periodToDisplay} allPeriods={employee.employmentPeriods} isEmployeeView={false} />}
                {activePeriod && <ScheduledAbsenceManager employee={employee} period={activePeriod} />}
            </div>

        </div>
    );
}
