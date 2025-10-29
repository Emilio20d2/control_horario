
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
import { ArrowRight, User } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import {
  format,
  isWithinInterval,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  getISODay,
  startOfWeek,
  endOfWeek,
  parseISO,
  isSameDay,
  isValid
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Employee, ScheduledAbsence, HolidayReport, AbsenceType } from '@/lib/types';
import { WeekNavigator } from '@/components/schedule/week-navigator';

interface WeeklyAbsenceInfo {
  employeeId: string;
  employeeName: string;
  dayAbsences: Record<string, {
    abbreviation: string;
    substituteName?: string;
  } | null>; // key: yyyy-MM-dd
}

export default function CalendarPage() {
  const { employees, holidayReports, absenceTypes, loading, getActiveEmployeesForDate, holidays } = useDataProvider();
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => eachDayOfInterval({ start: currentDate, end: endOfWeek(currentDate, { weekStartsOn: 1 }) }), [currentDate]);
  
  const activeEmployeesForWeek = useMemo(() => {
    return getActiveEmployeesForDate(currentDate).sort((a,b) => a.name.localeCompare(b.name));
  }, [currentDate, getActiveEmployeesForDate]);


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
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekId = format(weekStart, 'yyyy-MM-dd');

    const substitutesMap: Record<string, string> = {};
    holidayReports.forEach((report: HolidayReport) => {
        if (report.weekId === weekId) {
            substitutesMap[report.employeeId] = report.substituteName;
        }
    });

    return activeEmployeesForWeek.map((employee: Employee) => {
        const info: WeeklyAbsenceInfo = {
            employeeId: employee.id,
            employeeName: employee.name,
            dayAbsences: {},
        };

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
                const absenceType = absenceTypes.find(at => at.id === foundAbsence.absenceTypeId);
                info.dayAbsences[dayKey] = {
                    abbreviation: absenceType?.abbreviation || '??',
                    substituteName: substitutesMap[employee.id]
                };
            } else {
                info.dayAbsences[dayKey] = null;
            }
        });

        return info;
    });
  }, [loading, currentDate, activeEmployeesForWeek, holidayReports, absenceTypes, weekDays, safeParseDate]);


  if (loading) {
    return (
        <div className="p-4 md:p-6 space-y-4">
            <Skeleton className="h-10 w-full max-w-md mx-auto" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
        <Card>
            <CardHeader className="flex flex-col items-center gap-4">
                <div className="text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight font-headline">Calendario Semanal de Ausencias</CardTitle>
                    <CardDescription>Visualiza las ausencias y sustituciones de un vistazo.</CardDescription>
                </div>
                <WeekNavigator currentDate={currentDate} onWeekChange={setCurrentDate} onDateSelect={setCurrentDate} />
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
                                        <TableHead key={day.toISOString()} className={cn("text-center min-w-[150px]", holiday && 'bg-blue-50')}>
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
                                            <TableCell key={dayKey} className={cn("text-center p-2", absence && "bg-destructive/10", holiday && !absence && 'bg-blue-50/50')}>
                                                {absence ? (
                                                    <div className="flex flex-col items-center justify-center gap-1.5 p-1 rounded-md bg-secondary text-secondary-foreground min-h-[60px]">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-destructive" />
                                                            <span className="font-bold text-lg">{absence.abbreviation}</span>
                                                        </div>
                                                        {absence.substituteName && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                                <ArrowRight className="h-3 w-3 text-primary" />
                                                                <span className="font-semibold truncate">{absence.substituteName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : <div className="min-h-[60px]"></div>}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
