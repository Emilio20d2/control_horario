

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeDetails } from '@/components/employees/employee-details';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { isAfter, parseISO, startOfDay, getYear, isWithinInterval, startOfYear, endOfYear, getISOWeekYear, eachDayOfInterval, startOfWeek, isSameDay, addDays } from 'date-fns';
import { Briefcase, Gift, Scale, Wallet, Plane, Info, CalendarX2, CheckCircle, Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { AbsenceType, ScheduledAbsence } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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


export default function MyProfilePage() {
    const { employeeRecord: employee, weeklyRecords, loading: dataLoading, absenceTypes, getEmployeeFinalBalances, calculateEmployeeVacations } = useDataProvider();
    const [displayBalances, setDisplayBalances] = useState<{ ordinary: number; holiday: number; leave: number; total: number; } | null>(null);
    const [vacationInfo, setVacationInfo] = useState<ReturnType<typeof calculateEmployeeVacations> | null>(null);
    const [seniorHoursTotal, setSeniorHoursTotal] = useState(0);
    const currentYear = getYear(new Date());

    useEffect(() => {
        if (!dataLoading && employee) {
            setDisplayBalances(getEmployeeFinalBalances(employee.id));
            setVacationInfo(calculateEmployeeVacations(employee, currentYear, 'confirmed'));
        }
    }, [employee, dataLoading, weeklyRecords, getEmployeeFinalBalances, calculateEmployeeVacations, currentYear]);

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

    const vacationPeriods = useMemo(() => {
        if (!employee) return [];
        const vacationType = absenceTypes.find(at => at.name === 'Vacaciones');
        if (!vacationType) return [];
    
        const allVacationDays = new Map<string, { isConfirmed: boolean }>();
    
        // 1. Get from weeklyRecords (confirmed vacations) - HIGHEST PRIORITY
        Object.values(weeklyRecords).forEach(record => {
            const empWeekData = record.weekData[employee.id];
            if (empWeekData?.confirmed && empWeekData.days) {
                Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                    const dayDate = parseISO(dayStr);
                    const dayYear = getYear(dayDate);
                    if ((dayYear === currentYear || dayYear === currentYear + 1) && dayData.absence === vacationType.abbreviation) {
                        allVacationDays.set(dayStr, { isConfirmed: true });
                    }
                });
            }
        });
        
        // 2. Get from scheduledAbsences, but only if the day hasn't been confirmed
        (employee.employmentPeriods || []).forEach(p => {
            (p.scheduledAbsences || []).forEach(a => {
                if (a.absenceTypeId === vacationType.id && a.endDate) {
                    const absenceYear = getYear(a.startDate);
                    if (absenceYear === currentYear || absenceYear === currentYear + 1) {
                        eachDayOfInterval({ start: a.startDate, end: a.endDate }).forEach(day => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            if (!allVacationDays.has(dayStr)) {
                                allVacationDays.set(dayStr, { isConfirmed: false });
                            }
                        });
                    }
                }
            });
        });
        
        const sortedDays = Array.from(allVacationDays.keys()).sort();
        if (sortedDays.length === 0) return [];
        
        const periods: { startDate: Date, endDate: Date, isConfirmed: boolean }[] = [];
    
        let currentPeriod = {
            startDate: parseISO(sortedDays[0]),
            endDate: parseISO(sortedDays[0]),
            isConfirmed: allVacationDays.get(sortedDays[0])!.isConfirmed
        };

        for (let i = 1; i < sortedDays.length; i++) {
            const currentDay = parseISO(sortedDays[i]);
            const prevDay = parseISO(sortedDays[i-1]);

            if (isSameDay(currentDay, addDays(prevDay, 1))) {
                currentPeriod.endDate = currentDay;
                if (allVacationDays.get(sortedDays[i])!.isConfirmed) {
                    currentPeriod.isConfirmed = true;
                }
            } else {
                periods.push(currentPeriod);
                currentPeriod = {
                    startDate: currentDay,
                    endDate: currentDay,
                    isConfirmed: allVacationDays.get(sortedDays[i])!.isConfirmed
                };
            }
        }
        periods.push(currentPeriod);
    
        return periods;
    
    }, [employee, absenceTypes, currentYear, weeklyRecords]);
    
    if (dataLoading || !employee || !vacationInfo) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6 pt-6">
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
        const endDate = p.endDate instanceof Date ? p.endDate : parseISO(p.endDate as string);
        return isAfter(endDate, startOfDay(new Date()));
    });
    

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 pt-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline">
                {employee.name} <span className="text-lg font-medium text-muted-foreground">({employee.employeeNumber})</span>
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <Card className="bg-gradient-to-br from-indigo-50 to-transparent dark:from-indigo-950/30 dark:to-transparent">
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
                            <Badge variant={displayBalances && displayBalances.total >= 0 ? 'default' : 'destructive'} className="text-lg font-bold">
                                {displayBalances?.total.toFixed(2)}h
                            </Badge>
                        </div>
                    </CardFooter>
                </Card>
                <Popover>
                    <PopoverTrigger asChild>
                        <Card className="cursor-pointer bg-gradient-to-br from-cyan-50 to-transparent dark:from-cyan-950/30 dark:to-transparent">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Vacaciones</CardTitle>
                                <Plane className="h-4 w-4 text-muted-foreground" />
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
                                <h4 className="font-medium leading-none">Cálculo de Días Disponibles ({currentYear})</h4>
                                <p className="text-sm text-muted-foreground">
                                    Desglose de cómo se calcula tu total de vacaciones.
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
                    </PopoverContent>
                </Popover>
            </div>


             <Card className="bg-gradient-to-br from-pink-50 to-transparent dark:from-pink-950/30 dark:to-transparent">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <CalendarX2 className="h-5 w-5 text-primary" />
                        Resumen de Ausencias ({getYear(new Date())})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {absenceSummary.length === 0 && seniorHoursTotal === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No tienes ausencias registradas este año.</p>
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

            <Card className="bg-gradient-to-br from-teal-50 to-transparent dark:from-teal-950/30 dark:to-transparent">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plane className="h-5 w-5 text-primary" />
                        Mis Vacaciones ({currentYear} - {currentYear + 1})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {vacationPeriods.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha de Inicio</TableHead>
                                    <TableHead>Fecha de Fin</TableHead>
                                    <TableHead className="text-center">Confirmado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vacationPeriods.map((period, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{format(period.startDate, 'dd/MM/yyyy', { locale: es })}</TableCell>
                                        <TableCell>{format(period.endDate, 'dd/MM/yyyy', { locale: es })}</TableCell>
                                        <TableCell className="text-center">
                                            {period.isConfirmed && <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No tienes periodos de vacaciones programados para este año o el siguiente.</p>
                    )}
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">Para que los periodos de vacaciones sean oficiales, tienen que estar firmados.</p>
                </CardFooter>
            </Card>
            
            <div className="space-y-6 col-span-2">
                {activePeriod ? (
                    <>
                        <EmployeeDetails employee={employee} period={activePeriod} allPeriods={employee.employmentPeriods} isEmployeeView={true} />
                    </>
                ) : (
                    <Card className="bg-gradient-to-br from-gray-50 to-transparent dark:from-gray-950/30 dark:to-transparent">
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
