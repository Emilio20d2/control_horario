
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  User,
} from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import {
  format,
  isAfter,
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getISODay,
  startOfDay,
  isValid,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Employee, ScheduledAbsence, HolidayReport, AbsenceType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear } from 'date-fns';

interface AbsenceInfo {
  employeeId: string;
  employeeName: string;
  absenceAbbreviation: string;
  substituteName?: string;
}

export default function CalendarPage() {
  const { employees, holidayReports, absenceTypes, loading } = useDataProvider();
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const absencesByDay = useMemo(() => {
    if (loading) return {};

    const absences: Record<string, AbsenceInfo[]> = {};
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const substitutesMap: Record<string, string> = {};
    holidayReports.forEach((report: HolidayReport) => {
        const weekKey = report.weekId;
        const employeeId = report.employeeId;
        const substituteName = report.substituteName;
        substitutesMap[`${weekKey}-${employeeId}`] = substituteName;
    });

    employees.forEach((employee: Employee) => {
      employee.employmentPeriods?.forEach(period => {
        period.scheduledAbsences?.forEach((absence: ScheduledAbsence) => {
            const absenceStart = safeParseDate(absence.startDate);
            const absenceEnd = absence.endDate ? safeParseDate(absence.endDate) : absenceStart;

            if (!absenceStart || !absenceEnd) return;
            
            if (isAfter(absenceEnd, monthStart) && isAfter(monthEnd, absenceStart)) {
                eachDayOfInterval({ start: absenceStart, end: absenceEnd }).forEach(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    if (isWithinInterval(day, { start: monthStart, end: monthEnd })) {
                        if (!absences[dayKey]) {
                            absences[dayKey] = [];
                        }

                        const weekId = format(startOfDay(day), 'yyyy-MM-dd', { weekStartsOn: 1 });
                        const substituteName = substitutesMap[`${weekId}-${employee.id}`];
                        const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);

                        absences[dayKey].push({
                            employeeId: employee.id,
                            employeeName: employee.name,
                            absenceAbbreviation: absenceType?.abbreviation || '??',
                            substituteName: substituteName
                        });
                    }
                });
            }
        });
      });
    });
    // Sort absences within each day by employee name
    for (const day in absences) {
        absences[day].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    }
    return absences;
  }, [loading, currentDate, employees, holidayReports, absenceTypes, safeParseDate]);


  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const firstDayOfMonth = getISODay(startOfMonth(currentDate));
  const emptyDays = Array(firstDayOfMonth - 1).fill(null);

  if (loading) {
    return (
        <div className="p-4 md:p-6">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
        <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <CardTitle className="text-2xl font-bold tracking-tight font-headline">Calendario de Ausencias</CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Select
                        value={format(currentDate, 'yyyy-MM')}
                        onValueChange={(value) => {
                            const [year, month] = value.split('-');
                            setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
                        }}
                    >
                        <SelectTrigger className="w-48 text-lg font-semibold">
                            <SelectValue>
                                {format(currentDate, 'MMMM yyyy', { locale: es })}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                                const date = subMonths(new Date(), 12 - i);
                                return (
                                    <SelectItem key={i} value={format(date, 'yyyy-MM')}>
                                        {format(date, 'MMMM yyyy', { locale: es })}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 border-t border-l">
                    {weekDays.map(day => (
                        <div key={day} className="p-2 text-center font-semibold border-r border-b bg-muted/50 text-sm">
                            {day}
                        </div>
                    ))}
                    {emptyDays.map((_, index) => (
                        <div key={`empty-${index}`} className="border-r border-b bg-muted/20"></div>
                    ))}
                    {daysInMonth.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayAbsences = absencesByDay[dayKey] || [];
                        const dayOfWeek = getISODay(day);
                        
                        return (
                            <div key={dayKey} className={cn(
                                "p-2 border-r border-b min-h-[120px] flex flex-col",
                                (dayOfWeek === 6 || dayOfWeek === 7) && 'bg-muted/30'
                            )}>
                                <div className="font-bold text-sm">{format(day, 'd')}</div>
                                <div className="flex-grow space-y-1 mt-1">
                                    {dayAbsences.map(absence => (
                                        <div key={absence.employeeId} className="text-xs p-1 rounded-md bg-secondary text-secondary-foreground">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <User className="h-3 w-3 flex-shrink-0" />
                                                    <span className="truncate font-medium">{absence.employeeName}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] px-1">{absence.absenceAbbreviation}</Badge>
                                            </div>
                                            {absence.substituteName && (
                                                <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                                    <ArrowRight className="h-3 w-3 text-primary" />
                                                    <span className="font-semibold truncate">{absence.substituteName}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
