

'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataProvider } from '@/hooks/use-data-provider';
import { addWeeks, endOfWeek, format, getISOWeek, getYear, startOfYear, eachDayOfInterval, parseISO, startOfWeek, isBefore, isAfter, getISODay, endOfDay, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Users, Clock, PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';


export function AnnualVacationQuadrant() {
    const { employees, employeeGroups, loading, absenceTypes, weeklyRecords, holidayEmployees, getEffectiveWeeklyHours, holidays } = useDataProvider();
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [substitutions, setSubstitutions] = useState<Record<string, Record<string, string>>>({}); // { [weekKey]: { [originalEmpName]: substituteName } }
    const vacationType = useMemo(() => absenceTypes.find(at => at.name === 'Vacaciones'), [absenceTypes]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        if (weeklyRecords) {
            Object.keys(weeklyRecords).forEach(id => years.add(parseInt(id.split('-')[0], 10)));
        }
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        years.add(currentYear + 1);
        years.add(currentYear - 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords]);
    
    const groupColors = ['#dbeafe', '#dcfce7', '#fef9c3', '#f3e8ff', '#fce7f3', '#e0e7ff', '#ccfbf1', '#ffedd5'];

    const allEmployees = useMemo(() => {
        if (loading) return [];
        
        const mainEmployees = employees
          .filter(e => e.employmentPeriods.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())))
          .map(e => {
            const activePeriod = e.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date()));
            const weeklyHours = getEffectiveWeeklyHours(activePeriod || null, new Date());
            return {
                ...e, 
                isExternal: false,
                workShift: `${weeklyHours.toFixed(2)}h`
            };
        });
        
        const mainEmployeeNames = new Set(mainEmployees.map(me => me.name.trim().toLowerCase()));

        const externalEmployees = holidayEmployees
            .filter(he => he.active && !mainEmployeeNames.has(he.name.trim().toLowerCase()))
            .map(e => ({
                id: e.id,
                name: e.name,
                groupId: e.groupId,
                isExternal: true,
                workShift: e.workShift,
                employmentPeriods: [],
            }));

        const allEmps = [...mainEmployees, ...externalEmployees].filter(e => {
            if (e.isExternal) return true;
            const holidayEmp = holidayEmployees.find(he => he.id === e.id);
            return holidayEmp ? holidayEmp.active : true;
        });

        return allEmps.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, holidayEmployees, loading, getEffectiveWeeklyHours]);

    const substituteEmployees = useMemo(() => {
        const mainEmployeeNames = new Set(employees.map(e => e.name.trim().toLowerCase()));
        return holidayEmployees.filter(he => he.active && !mainEmployeeNames.has(he.name.trim().toLowerCase()));
    }, [employees, holidayEmployees]);


    const weeksOfYear = useMemo(() => {
        const year = selectedYear;
        const firstDayOfYear = new Date(year, 0, 1);
        let firstMonday = startOfWeek(firstDayOfYear, { weekStartsOn: 1 });
    
        if (getYear(firstMonday) < year) {
            firstMonday = addWeeks(firstMonday, 1);
        }

        const weeks = [];
        let currentWeekStart = firstMonday;

        for (let i = 0; i < 53; i++) {
            const weekStart = addWeeks(firstMonday, i);
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

            if (getYear(weekStart) === year || getYear(weekEnd) === year) {
                 weeks.push({
                    start: weekStart,
                    end: weekEnd,
                    number: getISOWeek(weekStart),
                    year: getYear(weekStart),
                    key: `${getYear(weekStart)}-W${String(getISOWeek(weekStart)).padStart(2, '0')}`
                });
            } else if (getYear(weekStart) > year) {
                break;
            }
        }
        return weeks;
    }, [selectedYear]);

    const vacationData = useMemo(() => {
        if (loading || !vacationType) return { weeklySummaries: {}, employeesByWeek: {}, vacationsByEmployee: {} };

        const weeklySummaries: Record<string, { employeeCount: number; hourImpact: number }> = {};
        const employeesByWeek: Record<string, { employeeId: string; employeeName: string; groupId?: string | null; }[]> = {};
        const vacationsByEmployee: Record<string, Set<string>> = {};


        weeksOfYear.forEach(week => {
            weeklySummaries[week.key] = { employeeCount: 0, hourImpact: 0 };
            employeesByWeek[week.key] = [];
        });

        allEmployees.forEach(emp => {
            const vacationDays = new Set<string>();

            if (!emp.isExternal) {
                 emp.employmentPeriods.flatMap(p => p.scheduledAbsences ?? [])
                .filter(a => a.absenceTypeId === vacationType.id)
                .forEach(absence => {
                    if (!absence.endDate) return;
                    const absenceStart = absence.startDate;
                    const absenceEnd = absence.endDate;
                    const daysInAbsence = eachDayOfInterval({ start: absenceStart, end: absenceEnd });
                    daysInAbsence.forEach(day => {
                        if (getYear(day) === selectedYear) vacationDays.add(format(day, 'yyyy-MM-dd'));
                    });
                });
                Object.values(weeklyRecords).forEach(record => {
                    const empWeekData = record.weekData[emp.id];
                    if (!empWeekData?.days) return;
                    Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                        if (dayData.absence === vacationType.abbreviation && getYear(new Date(dayStr)) === selectedYear) {
                            vacationDays.add(dayStr);
                        }
                    });
                });
            }

            vacationsByEmployee[emp.id] = vacationDays;

            if (vacationDays.size > 0) {
                weeksOfYear.forEach(week => {
                    const hasVacationThisWeek = Array.from(vacationDays).some(dayStr => {
                        const day = parseISO(dayStr);
                        return day >= week.start && day <= week.end;
                    });
                    
                    if (hasVacationThisWeek) {
                        weeklySummaries[week.key].employeeCount++;
                        
                        let weeklyHours = 0;
                        if(emp.isExternal) {
                            const match = emp.workShift?.match(/(\d+(\.\d+)?)/);
                            if(match) weeklyHours = parseFloat(match[0]);
                        } else {
                            const activePeriod = emp.employmentPeriods.find(p => {
                                const periodStart = startOfDay(parseISO(p.startDate as string));
                                const periodEnd = p.endDate ? endOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
                                return isAfter(periodEnd, week.start) && isBefore(periodStart, week.end);
                            });
                             weeklyHours = getEffectiveWeeklyHours(activePeriod || null, week.start);
                        }
                        weeklySummaries[week.key].hourImpact += weeklyHours;
                        employeesByWeek[week.key].push({ employeeId: emp.id, employeeName: emp.name, groupId: emp.groupId });
                    }
                });
            }
        });

        return { weeklySummaries, employeesByWeek, vacationsByEmployee };

    }, [loading, allEmployees, vacationType, weeksOfYear, weeklyRecords, selectedYear, getEffectiveWeeklyHours]);

    const groupedEmployeesByWeek = useMemo(() => {
        const result: Record<string, { all: string[], byGroup: Record<string, string[]> }> = {};
        
        for (const weekKey in vacationData.employeesByWeek) {
            result[weekKey] = { all: [], byGroup: {} };
            const weekEmployees = vacationData.employeesByWeek[weekKey];
            
            weekEmployees.forEach(emp => {
                const groupId = emp.groupId;
                 result[weekKey].all.push(emp.employeeName);
                if (groupId) {
                    if (!result[weekKey].byGroup[groupId]) {
                        result[weekKey].byGroup[groupId] = [];
                    }
                    result[weekKey].byGroup[groupId].push(emp.employeeName);
                }
            });
        }
        return result;
    }, [vacationData.employeesByWeek]);
    
    const sortedGroups = useMemo(() => {
        return [...employeeGroups].sort((a,b) => a.order - b.order);
    }, [employeeGroups]);

    const handleSetSubstitute = (weekKey: string, originalEmployee: string, substituteName: string) => {
        setSubstitutions(prev => {
            const newWeekSubstitutions = { ...(prev[weekKey] || {}) };
            if (substituteName === '') {
                delete newWeekSubstitutions[originalEmployee];
            } else {
                newWeekSubstitutions[originalEmployee] = substituteName;
            }
            return {
                ...prev,
                [weekKey]: newWeekSubstitutions,
            };
        });
    };

    
    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Cuadrante Anual de Vacaciones</CardTitle>
                    </div>
                     <div className="flex items-center gap-2">
                        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                            <SelectTrigger className='w-32'>
                                <SelectValue placeholder="Año..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th style={{ minWidth: '0.25px', width: '0.25px', maxWidth: '0.25px', padding: 0, border: 'none' }} className="sticky left-0 z-10"></th>
                            {weeksOfYear.map(week => {
                                const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                                const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                                return (
                                    <th key={week.key} className={cn("p-1 text-center text-xs font-normal border w-64 min-w-64", hasHoliday ? "bg-blue-100" : "bg-gray-50")}>
                                        <div className='flex flex-col items-center justify-center h-full'>
                                            <span className='font-semibold'>Semana {week.number}</span>
                                            <span className='text-muted-foreground text-[10px]'>
                                                {format(week.start, 'dd/MM')} - {format(week.end, 'dd/MM')}
                                            </span>
                                            <div className="flex gap-3 mt-1.5 text-[11px] items-center">
                                                <div className='flex items-center gap-1'><Users className="h-3 w-3"/>{vacationData.weeklySummaries[week.key]?.employeeCount ?? 0}</div>
                                                <div className='flex items-center gap-1'><Clock className="h-3 w-3"/>{vacationData.weeklySummaries[week.key]?.hourImpact.toFixed(0) ?? 0}h</div>
                                            </div>
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                     <tbody>
                        {sortedGroups.map((group, groupIndex) => (
                             <tr key={group.id}>
                                <td style={{ minWidth: '0.25px', width: '0.25px', maxWidth: '0.25px', padding: 0, border: 'none', backgroundColor: groupColors[groupIndex % groupColors.length]}} className="sticky left-0 z-10"></td>
                                {weeksOfYear.map(week => {
                                    const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
                                    const hasHoliday = weekDays.some(day => holidays.some(h => isSameDay(h.date, day) && getISODay(day) !== 7));
                                    const employeesInGroupThisWeek = (groupedEmployeesByWeek[week.key]?.byGroup?.[group.id] || []).sort();
                                    const currentSubstitutes = substitutions[week.key] || {};

                                    const cellStyle: React.CSSProperties = {};
                                    if (employeesInGroupThisWeek.length > 0) {
                                        cellStyle.backgroundColor = groupColors[groupIndex % groupColors.length];
                                    }

                                    return (
                                        <td key={`${group.id}-${week.key}`} style={cellStyle} className={cn("border w-64 min-w-64 h-8 align-top p-1", hasHoliday && !employeesInGroupThisWeek.length && "bg-blue-50/50")}>
                                            <div className="flex flex-col gap-0.5">
                                                {employeesInGroupThisWeek.map((name, nameIndex) => {
                                                    const substitute = currentSubstitutes[name];
                                                    const availableSubstitutes = substituteEmployees.filter(
                                                        sub => !Object.values(currentSubstitutes).includes(sub.name) || sub.name === substitute
                                                    );

                                                    return (
                                                        <div key={nameIndex} className="text-[10px] p-0.5 rounded-sm flex justify-between items-center group">
                                                             <div className='flex flex-row items-center gap-2'>
                                                                <span className="truncate font-medium">{name}</span>
                                                                {substitute && <span className="text-red-600 truncate">({substitute})</span>}
                                                            </div>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100">
                                                                        <PlusCircle className="h-3 w-3" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-48 p-0">
                                                                    <Command>
                                                                        <CommandInput placeholder="Buscar sustituto..." className="h-9" />
                                                                        <CommandEmpty>No se encontró.</CommandEmpty>
                                                                        <CommandGroup>
                                                                            {availableSubstitutes.map(sub => (
                                                                                <CommandItem
                                                                                    key={sub.id}
                                                                                    value={sub.name}
                                                                                    onSelect={() => {
                                                                                        handleSetSubstitute(week.key, name, sub.name);
                                                                                    }}
                                                                                >
                                                                                    {sub.name}
                                                                                </CommandItem>
                                                                            ))}
                                                                             {substitute && (
                                                                                <CommandItem
                                                                                    className="text-destructive"
                                                                                    onSelect={() => handleSetSubstitute(week.key, name, '')}
                                                                                >
                                                                                    Quitar sustituto
                                                                                </CommandItem>
                                                                            )}
                                                                        </CommandGroup>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
