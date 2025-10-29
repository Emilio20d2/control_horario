
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRight, User, Loader2, CalendarPlus } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import {
  format,
  isWithinInterval,
  startOfDay,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  parseISO,
  isSameDay,
  isValid,
  endOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Employee, ScheduledAbsence, HolidayReport, AbsenceType } from '@/lib/types';
import { WeekNavigator } from '@/components/schedule/week-navigator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addScheduledAbsence } from '@/lib/services/employeeService';
import { Label } from '@/components/ui/label';

interface WeeklyAbsenceInfo {
  employeeId: string;
  employeeName: string;
  dayAbsences: Record<string, {
    abbreviation: string;
    substituteName?: string;
  } | null>; // key: yyyy-MM-dd
}

export default function CalendarPage() {
  const { employees, holidayReports, absenceTypes, loading, getActiveEmployeesForDate, holidays, refreshData } = useDataProvider();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedAbsenceTypeId, setSelectedAbsenceTypeId] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const weekDays = useMemo(() => eachDayOfInterval({ start: currentDate, end: endOfWeek(currentDate, { weekStartsOn: 1 }) }), [currentDate]);
  
  const activeEmployees = useMemo(() => {
    return getActiveEmployeesForDate(new Date()).sort((a,b) => a.name.localeCompare(b.name));
  }, [getActiveEmployeesForDate]);


  const safeParseDate = useCallback((date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date.toDate && typeof date.toDate === 'function') return date.toDate();
    if (typeof date === 'string') {
        const parsed = parseISO(date);
        return isValid(parsed) ? parsed : null;
    }
    return null;
  }, []);

  const weeklyAbsenceData = useMemo(() => {
    if (loading) return [];

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekId = format(weekStart, 'yyyy-MM-dd');
    const activeEmployeesForWeek = getActiveEmployeesForDate(currentDate);

    const substitutesMap: Record<string, string> = {};
    holidayReports.forEach((report: HolidayReport) => {
        if (report.weekId === weekId) {
            substitutesMap[report.employeeId] = report.substituteName;
        }
    });

    const employeesWithAbsences = activeEmployeesForWeek.map((employee: Employee) => {
        const info: WeeklyAbsenceInfo = {
            employeeId: employee.id,
            employeeName: employee.name,
            dayAbsences: {},
        };
        
        let hasAbsenceInWeek = false;

        weekDays.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            let foundAbsence: ScheduledAbsence | null = null;
            
            for (const period of employee.employmentPeriods || []) {
                for (const absence of period.scheduledAbsences || []) {
                    const absenceStart = safeParseDate(absence.startDate);
                    const absenceEnd = absence.endDate ? safeParseDate(absence.endDate) : absenceStart;

                    if (absenceStart && absenceEnd && isWithinInterval(day, { start: startOfDay(absenceStart), end: endOfDay(absenceEnd) })) {
                        foundAbsence = absence;
                        break;
                    }
                }
                if (foundAbsence) break;
            }

            if (foundAbsence) {
                hasAbsenceInWeek = true;
                const absenceType = absenceTypes.find(at => at.id === foundAbsence!.absenceTypeId);
                info.dayAbsences[dayKey] = {
                    abbreviation: absenceType?.abbreviation || '??',
                    substituteName: substitutesMap[employee.id]
                };
            } else {
                info.dayAbsences[dayKey] = null;
            }
        });

        return hasAbsenceInWeek ? info : null;
    }).filter((item): item is WeeklyAbsenceInfo => item !== null)
      .sort((a,b) => a.employeeName.localeCompare(b.employeeName));

    return employeesWithAbsences;

  }, [loading, currentDate, getActiveEmployeesForDate, holidayReports, absenceTypes, weekDays, safeParseDate]);
  
  const handleDayToggle = (dayKey: string) => {
    setSelectedDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setSelectedAbsenceTypeId('');
    setSelectedDays({});
    setNotes('');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const daysToSave = Object.entries(selectedDays).filter(([, isSelected]) => isSelected).map(([dayKey]) => dayKey);

    if (!selectedEmployeeId || !selectedAbsenceTypeId || daysToSave.length === 0) {
      toast({ title: 'Datos incompletos', description: 'Debes seleccionar empleado, tipo de ausencia y al menos un día.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
        const employee = employees.find(e => e.id === selectedEmployeeId);
        const activePeriod = employee?.employmentPeriods.find(p => !p.endDate || isAfter(safeParseDate(p.endDate)!, new Date()));
        if (!employee || !activePeriod) {
            throw new Error('No se encontró un periodo de contrato activo para el empleado.');
        }

        const sortedDays = daysToSave.sort();
        let currentPeriodStart = sortedDays[0];

        for (let i = 1; i <= sortedDays.length; i++) {
            if (i === sortedDays.length || isAfter(parseISO(sortedDays[i]), addDays(parseISO(sortedDays[i - 1]), 1))) {
                const periodEnd = sortedDays[i - 1];
                
                await addScheduledAbsence(employee.id, activePeriod.id, {
                    absenceTypeId: selectedAbsenceTypeId,
                    startDate: currentPeriodStart,
                    endDate: periodEnd,
                }, employee, true);
                
                if (i < sortedDays.length) {
                    currentPeriodStart = sortedDays[i];
                }
            }
        }
        
        toast({ title: 'Ausencia Programada', description: `Se ha guardado la ausencia para ${employee.name}.` });
        resetForm();
        refreshData();

    } catch (error) {
        console.error("Error programming absence:", error);
        toast({ title: 'Error', description: error instanceof Error ? error.message : "No se pudo guardar la ausencia.", variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };


  if (loading) {
    return (
        <div className="p-4 md:p-6 space-y-4">
            <Skeleton className="h-10 w-full max-w-md mx-auto" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Programar Ausencia</CardTitle>
                <CardDescription>Selecciona la semana, el empleado y los días para registrar una nueva ausencia.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center">
                        <WeekNavigator currentDate={currentDate} onWeekChange={setCurrentDate} onDateSelect={setCurrentDate} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                         <div className="space-y-2">
                             <Label htmlFor="employee-select">Empleado</Label>
                             <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                <SelectTrigger id="employee-select"><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                                <SelectContent>
                                    {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="absence-select">Tipo de Ausencia</Label>
                             <Select value={selectedAbsenceTypeId} onValueChange={setSelectedAbsenceTypeId}>
                                <SelectTrigger id="absence-select"><SelectValue placeholder="Seleccionar tipo de ausencia..." /></SelectTrigger>
                                <SelectContent>
                                    {absenceTypes.sort((a,b) => a.name.localeCompare(b.name)).map(at => <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                         </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Días de la Ausencia</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 rounded-lg border p-4">
                            {weekDays.map(day => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                return (
                                    <div key={dayKey} className="flex items-center space-x-2">
                                        <Checkbox id={dayKey} checked={selectedDays[dayKey] || false} onCheckedChange={() => handleDayToggle(dayKey)} />
                                        <label htmlFor={dayKey} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {format(day, 'E, d MMM', {locale: es})}
                                        </label>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">Notas (Opcional)</Label>
                        <Textarea id="notes" placeholder="Añade un comentario sobre la ausencia..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                            Guardar Ausencia
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>


        <Card>
            <CardHeader className="flex flex-col items-center gap-4">
                <div className="text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight font-headline">Resumen Semanal de Ausencias</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-card z-10 w-[200px] min-w-[200px]">Empleado</TableHead>
                                {weekDays.map(day => {
                                    const holiday = holidays.find(h => isSameDay(h.date, day));
                                    return (
                                        <TableHead key={day.toISOString()} className={cn("text-center", holiday && 'bg-blue-50')}>
                                            <div className="flex flex-col items-center">
                                                <span>{format(day, 'E', { locale: es })}</span>
                                                <span className="text-xs text-muted-foreground">{format(day, 'dd/MM')}</span>
                                            </div>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weeklyAbsenceData.map(empData => (
                                <TableRow key={empData.employeeId}>
                                    <TableCell className="sticky left-0 bg-card z-10 font-medium">{empData.employeeName}</TableCell>
                                    {weekDays.map(day => {
                                        const dayKey = format(day, 'yyyy-MM-dd');
                                        const absence = empData.dayAbsences[dayKey];
                                        const holiday = holidays.find(h => isSameDay(h.date, day));
                                        
                                        return (
                                            <TableCell key={dayKey} className={cn("text-center p-1", absence && "bg-destructive/10", holiday && !absence && 'bg-blue-50/50')}>
                                                {absence ? (
                                                    <div className="flex flex-col items-center justify-center gap-0.5 p-1 rounded-md bg-secondary text-secondary-foreground min-h-[48px]">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-destructive" />
                                                            <span className="font-bold text-base">{absence.abbreviation}</span>
                                                        </div>
                                                        {absence.substituteName && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <ArrowRight className="h-3 w-3 text-primary" />
                                                                <span className="font-semibold truncate">{absence.substituteName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : <div className="h-12"></div>}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                             {!loading && weeklyAbsenceData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        No hay empleados con ausencias programadas para esta semana.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}



    