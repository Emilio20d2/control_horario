
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeDetails } from '@/components/employees/employee-details';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { isAfter, parseISO, startOfDay, getYear, isWithinInterval, startOfYear, endOfYear, getISOWeekYear } from 'date-fns';
import { Briefcase, Gift, Scale, Wallet, Plane, Info, CalendarX2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { AbsenceType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const BalanceItem = ({ title, value, icon: Icon, isLoading }: { title: string; value: number | undefined; icon: React.ElementType; isLoading: boolean }) => (
    <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between space-y-0">
            <h3 className="text-sm font-medium">{title}</h3>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
            {isLoading || value === undefined ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <div className={`text-2xl font-bold ${value < 0 ? 'text-destructive' : ''}`}>
                    {value.toFixed(2)}h
                </div>
            )}
        </div>
    </div>
);


export default function MyProfilePage() {
    const { employeeRecord: employee, getEmployeeFinalBalances, weeklyRecords, loading: dataLoading, calculateEmployeeVacations, absenceTypes } = useDataProvider();
    const [displayBalances, setDisplayBalances] = useState<{ ordinary: number; holiday: number; leave: number; total: number; } | null>(null);

    useEffect(() => {
        if (!dataLoading && employee) {
            const balances = getEmployeeFinalBalances(employee.id);
            setDisplayBalances(balances);
        }
    }, [employee, dataLoading, getEmployeeFinalBalances, weeklyRecords]);

    const absenceSummary = useMemo(() => {
        if (!employee || !weeklyRecords || absenceTypes.length === 0) return [];
    
        const currentYear = getYear(new Date());
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
    
    }, [employee, weeklyRecords, absenceTypes]);
    
    if (dataLoading || !employee) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    const activePeriod = employee.employmentPeriods?.find(p => {
        if (!p.endDate) return true;
        const endDate = typeof p.endDate === 'string' ? parseISO(p.endDate) : p.endDate as Date;
        return isAfter(endDate, startOfDay(new Date()));
    });
    
    const vacationInfo = calculateEmployeeVacations(employee);

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline">
                {employee.name} <span className="text-lg font-medium text-muted-foreground">({employee.employeeNumber})</span>
            </h1>

            <div className="grid grid-cols-2 gap-4">
                <Card className="flex-1 min-w-[150px]">
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
                <Popover>
                    <PopoverTrigger asChild>
                        <Card className="flex-1 min-w-[150px] cursor-pointer hover:bg-muted/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Vacaciones</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                    <Plane className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className={cn(
                                    "text-2xl font-bold",
                                    vacationInfo.vacationDaysTaken > vacationInfo.vacationDaysAvailable ? "text-destructive" : "",
                                    vacationInfo.vacationDaysTaken === vacationInfo.vacationDaysAvailable && "text-green-600"
                                )}>
                                    {vacationInfo.vacationDaysTaken} / {vacationInfo.vacationDaysAvailable}
                                    <span className="text-sm text-muted-foreground ml-1">días</span>
                                </div>
                            </CardContent>
                        </Card>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Cálculo de Días Disponibles</h4>
                                <p className="text-sm text-muted-foreground">
                                    Desglose de cómo se calcula tu total de vacaciones.
                                </p>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Días base prorrateados:</span> <span className="font-mono font-medium">{vacationInfo.proratedDays.toFixed(2)}</span></div>
                                {vacationInfo.vacationDays2024 > 0 && <div className="flex justify-between"><span>Días de 2024:</span> <span className="font-mono font-medium text-blue-600">+ {vacationInfo.vacationDays2024.toFixed(2)}</span></div>}
                                {vacationInfo.carryOverDays > 0 && <div className="flex justify-between"><span>Arrastrados año anterior:</span> <span className="font-mono font-medium text-blue-600">+ {vacationInfo.carryOverDays.toFixed(2)}</span></div>}
                                {vacationInfo.suspensionDeduction > 0 && <div className="flex justify-between"><span>Descuento por suspensión:</span> <span className="font-mono font-medium text-red-600">- {vacationInfo.suspensionDeduction.toFixed(2)}</span></div>}
                                <Separator />
                                <div className="flex justify-between font-bold"><span>Total Días Disponibles:</span> <span className="font-mono">{vacationInfo.vacationDaysAvailable}</span></div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle className="text-base">Detalle de Bolsas de Horas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                    <BalanceItem title="B. Ordinaria" value={displayBalances?.ordinary} icon={Briefcase} isLoading={!displayBalances} />
                    <BalanceItem title="B. Festivos" value={displayBalances?.holiday} icon={Gift} isLoading={!displayBalances} />
                    <BalanceItem title="B. Libranza" value={displayBalances?.leave} icon={Wallet} isLoading={!displayBalances} />
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
                    {absenceSummary.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo de Ausencia</TableHead>
                                    <TableHead className="text-right">Total Consumido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
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
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No tienes ausencias registradas este año.</p>
                    )}
                </CardContent>
            </Card>
            
            <div className="space-y-6 col-span-2">
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
