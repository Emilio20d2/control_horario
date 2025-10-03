

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { EmploymentPeriod, DaySchedule, WeeklyScheduleData, AnnualConfiguration, WeeklyRecordWithBalances } from '@/lib/types';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Scale, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmployeeDetailsProps {
    period: EmploymentPeriod;
    employeeId: string;
    allPeriods: EmploymentPeriod[];
}

const weekDays = [
    { id: 'mon', label: 'L' },
    { id: 'tue', label: 'M' },
    { id: 'wed', label: 'X' },
    { id: 'thu', label: 'J' },
    { id: 'fri', label: 'V' },
    { id: 'sat', label: 'S' },
    { id: 'sun', label: 'D' },
];


const ShiftRow = ({ shift, shiftName }: { shift: Record<string, DaySchedule>, shiftName: string }) => {
    const totalHours = Object.values(shift || {}).reduce((acc, day) => acc + (day.isWorkDay ? day.hours : 0), 0);
    
    return (
        <TableRow>
            <TableCell className="font-medium">{shiftName}</TableCell>
            {weekDays.map(day => {
                const dayData = shift?.[day.id];
                return (
                    <TableCell key={day.id} className="text-center p-2">
                        {dayData?.isWorkDay ? (
                            <div className="flex flex-col items-center text-xs">
                                <span className="font-bold text-base">{dayData.hours.toFixed(2)}h</span>
                            </div>
                        ) : '—'}
                    </TableCell>
                );
            })}
            <TableCell className="text-right font-bold text-base">{totalHours.toFixed(2)}h</TableCell>
        </TableRow>
    );
};


export function EmployeeDetails({ period, employeeId, allPeriods }: EmployeeDetailsProps) {
    const { 
        getEffectiveWeeklyHours,
        getProcessedAnnualDataForAllYears,
        getEmployeeById,
        employeeGroups,
    } = useDataProvider();

    const [annualData, setAnnualData] = useState<Awaited<ReturnType<typeof getProcessedAnnualDataForAllYears>> | null>(null);
    const [isLoadingAnnual, setIsLoadingAnnual] = useState(true);

    const employee = getEmployeeById(employeeId);
    const employeeGroup = employee ? employeeGroups.find(g => g.id === employee.groupId) : undefined;

    const currentWeeklyHours = getEffectiveWeeklyHours(period, new Date());
    
    useEffect(() => {
        const fetchAnnualData = async () => {
            setIsLoadingAnnual(true);
            const data = await getProcessedAnnualDataForAllYears(employeeId);
            setAnnualData(data);
            setIsLoadingAnnual(false);
        };
        fetchAnnualData();
    }, [employeeId, getProcessedAnnualDataForAllYears]);
    
    
    const processedAnnualData = () => {
        if (!annualData) return { details: [], totalBalance: 0 };
        const years = Object.keys(annualData).map(Number).sort((a,b) => b - a);

        let totalBalance = 0;
        const details = years.map(year => {
            const data = annualData[year];
            if (!data) return null;
            const annualBalance = data.annualComputedHours - data.theoreticalAnnualWorkHours;
            totalBalance += annualBalance;
            return { year, ...data, annualBalance };
        }).filter(Boolean);

        return { details, totalBalance };
    };

    const annualReport = processedAnnualData();


    const getCurrentWeeklySchedule = (): WeeklyScheduleData | undefined => {
        if (!period.weeklySchedulesHistory || period.weeklySchedulesHistory.length === 0) {
            return undefined;
        }
        const today = new Date();
        const sortedSchedules = [...period.weeklySchedulesHistory].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
        return sortedSchedules.find(s => new Date(s.effectiveDate) <= today);
    }

    const currentWeeklySchedule = getCurrentWeeklySchedule();
    
    const startDate = typeof period.startDate === 'string' ? parseISO(period.startDate) : period.startDate;
    const endDate = period.endDate ? (typeof period.endDate === 'string' ? parseISO(period.endDate) : period.endDate) : null;
    
    const sortedPeriods = allPeriods.slice().sort((a,b) => parseISO(b.startDate as string).getTime() - parseISO(a.startDate as string).getTime());

    return (
        <Card>
            <CardHeader>
                <CardTitle>Datos del Periodo Laboral Actual</CardTitle>
                <CardDescription>
                    Información detallada del contrato y calendario vigentes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos del Contrato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Fecha de Inicio</p>
                            <p>{format(startDate, 'PPP', { locale: es })}</p>
                        </div>
                         <div>
                            <p className="text-sm font-medium text-muted-foreground">Fecha de Fin</p>
                            <p>{endDate ? format(endDate, 'PPP', { locale: es }) : 'Activo'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Tipo de Contrato</p>
                            <p>{period.contractType}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Jornada Semanal Vigente</p>
                            <p className="text-xl font-bold">{currentWeeklyHours.toFixed(2)} horas</p>
                        </div>
                         <div className="hidden">
                            <p className="text-sm font-medium text-muted-foreground">Agrupación</p>
                            {employeeGroup ? (
                                <p className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {employeeGroup.name}
                                </p>
                            ) : (
                                <p>Sin agrupación</p>
                            )}
                        </div>
                    </div>
                </div>

                {sortedPeriods.length > 1 && (
                     <div className="space-y-2">
                        <h4 className="font-medium text-muted-foreground">Historial de Contratos</h4>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo de Contrato</TableHead>
                                        <TableHead>Fecha Inicio</TableHead>
                                        <TableHead className="text-right">Fecha Fin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedPeriods.map((p, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{p.contractType}</TableCell>
                                            <TableCell>{format(new Date(p.startDate as string), 'PPP', { locale: es })}</TableCell>
                                            <TableCell className="text-right">{p.endDate ? format(new Date(p.endDate as string), 'PPP', { locale: es }) : 'Activo'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
                
                {period.workHoursHistory && period.workHoursHistory.length > 0 && (
                     <div className="space-y-2">
                        <h4 className="font-medium text-muted-foreground">Historial de Cambio de Jornada</h4>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha de Vigencia</TableHead>
                                        <TableHead className="text-right">Jornada Semanal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {period.workHoursHistory.slice().reverse().map((record, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{format(new Date(record.effectiveDate), 'PPP', { locale: es })}</TableCell>
                                            <TableCell className="text-right font-mono">{record.weeklyHours.toFixed(2)}h</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
                
                <Separator />
                
                <div className="space-y-4">
                     <h3 className="text-lg font-medium">Cómputo Anual de Horas</h3>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Año</TableHead>
                                    <TableHead className="text-center">Jornada Teórica</TableHead>
                                    <TableHead className="text-center">Horas Computadas</TableHead>
                                    <TableHead className="text-right">Balance Anual</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingAnnual ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : annualReport.details.length > 0 ? (
                                    annualReport.details.map(data => {
                                        if (!data) return null;
                                        return (
                                            <TableRow key={data.year}>
                                                <TableCell className="font-bold">{data.year}</TableCell>
                                                <TableCell className="text-center font-mono">{data.theoreticalAnnualWorkHours.toFixed(2)}h</TableCell>
                                                <TableCell className="text-center font-mono">{data.annualComputedHours.toFixed(2)}h</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className={cn("font-mono font-bold", data.annualBalance >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                                                        {data.annualBalance >= 0 ? <TrendingUp className='mr-1 h-3 w-3'/> : <TrendingDown className='mr-1 h-3 w-3'/>}
                                                        {data.annualBalance.toFixed(2)}h
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No hay datos de cómputo anual para mostrar.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        {!isLoadingAnnual && annualReport.details.length > 0 && (
                             <div className="flex justify-end items-center gap-4 p-4 border-t bg-muted/50 rounded-b-lg">
                                <p className="text-lg font-bold flex items-center gap-2"><Scale className="h-5 w-5 text-muted-foreground" /> Balance Total Acumulado:</p>
                                <Badge variant={annualReport.totalBalance >= 0 ? "default" : "destructive"} className="text-2xl font-bold p-2 px-4">
                                     {annualReport.totalBalance.toFixed(2)}h
                                </Badge>
                             </div>
                        )}
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <h3 className="text-lg font-medium">Historial de Calendarios Laborales</h3>
                             <p className="text-sm text-muted-foreground">
                                Vigente: {currentWeeklySchedule ? format(new Date(currentWeeklySchedule.effectiveDate), 'PPP', { locale: es }) : 'No definido'}
                            </p>
                        </div>
                    </div>
                    {period.weeklySchedulesHistory && period.weeklySchedulesHistory.length > 0 ? (
                        <div className="space-y-6">
                            {period.weeklySchedulesHistory.slice().reverse().map(schedule => (
                                <div key={schedule.effectiveDate} className='border rounded-lg p-4'>
                                     <p className="font-semibold pb-4">Vigente desde: {format(new Date(schedule.effectiveDate), 'PPP', { locale: es })}</p>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Turno</TableHead>
                                                    {weekDays.map(day => <TableHead key={day.id} className="text-center">{day.label}</TableHead>)}
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <ShiftRow shift={schedule.shifts.turn1} shiftName="Turno 1" />
                                                <ShiftRow shift={schedule.shifts.turn2} shiftName="Turno 2" />
                                                <ShiftRow shift={schedule.shifts.turn3} shiftName="Turno 3" />
                                                <ShiftRow shift={schedule.shifts.turn4} shiftName="Turno 4" />
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No hay un calendario laboral definido para este periodo.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

    