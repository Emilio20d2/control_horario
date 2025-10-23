
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Loader2,
  Users,
  Clock,
  FileDown,
  FileSignature,
  SunSnow,
  Trash2,
  Info,
  Plus,
} from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod } from '@/lib/types';
import {
  format,
  isAfter,
  parseISO,
  addDays,
  differenceInDays,
  isWithinInterval,
  startOfDay,
  eachDayOfInterval,
  startOfWeek,
  getISOWeek,
  getYear,
  addWeeks,
  isBefore,
  getISOWeekYear,
  endOfWeek,
  startOfYear,
  endOfYear,
  subMonths,
  addMonths,
  subDays,
  eachWeekOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import {
  addScheduledAbsence,
  deleteScheduledAbsence,
} from '@/lib/services/employeeService';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn, generateGroupColors } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { generateAbsenceReportPDF, generateQuadrantReportPDF, generateSignatureReportPDF, generateSeasonalReportPDF } from '@/lib/report-generators';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface FormattedAbsence {
  id: string;
  startDate: Date;
  endDate: Date;
  absenceTypeId: string;
  absenceAbbreviation: string;
  periodId?: string;
}

export default function VacationsPage() {
    const dataProvider = useDataProvider();
    const {
        employees,
        loading,
        absenceTypes,
        weeklyRecords,
        getWeekId,
        holidays,
        refreshData,
        employeeGroups,
        holidayEmployees,
        getEffectiveWeeklyHours,
        calculateSeasonalVacationStatus,
        calculateEmployeeVacations,
        holidayReports,
        addHolidayReport,
        updateHolidayReport,
        getTheoreticalHoursAndTurn,
    } = dataProvider;
    const { toast } = useToast();
    
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);
    
    // State for planner
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedAbsenceTypeId, setSelectedAbsenceTypeId] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // State for editing
    const [editingAbsence, setEditingAbsence] = useState<{ employee: any; absence: FormattedAbsence; } | null>(null);
    const [editedDateRange, setEditedDateRange] = useState<DateRange | undefined>(undefined);
    const [editCalendarMonth, setEditCalendarMonth] = useState<Date>(new Date());
    
    // State for substitute assignment
    const [assignSubstituteOpen, setAssignSubstituteOpen] = useState(false);
    const [currentWeekAndEmployee, setCurrentWeekAndEmployee] = useState<{ weekKey: string, employeeId: string } | null>(null);
    const [selectedSubstituteId, setSelectedSubstituteId] = useState('');
    
    const activeEmployees = useMemo(() => {
        return employees.filter(e => e.employmentPeriods.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())));
    }, [employees]);
    
    const eventualEmployees = useMemo(() => {
        return holidayEmployees.filter(he => he.workShift === 'Eventual' && he.active);
    }, [holidayEmployees]);
    
    const groupColors = useMemo(() => generateGroupColors(employeeGroups.map(g => g.id)), [employeeGroups]);


    useEffect(() => {
        if (activeEmployees.length > 0 && !selectedEmployeeId) {
            setSelectedEmployeeId(activeEmployees[0].id);
        }
    }, [activeEmployees, selectedEmployeeId]);

    useEffect(() => {
        if (editingAbsence) {
            setEditedDateRange({ from: editingAbsence.absence.startDate, to: editingAbsence.absence.endDate });
            setEditCalendarMonth(editingAbsence.absence.startDate);
        } else {
            setEditedDateRange(undefined);
        }
    }, [editingAbsence]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        if (weeklyRecords) {
            Object.keys(weeklyRecords).forEach(id => years.add(getISOWeekYear(parseISO(id))));
        }
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords]);
    
    const allEmployeesForQuadrant = useMemo(() => {
        return employees.map(e => {
            const holidayInfo = holidayEmployees.find(he => he.id === e.id);
            return {
                ...e,
                groupId: holidayInfo?.groupId,
                active: holidayInfo ? holidayInfo.active : true,
            };
        }).filter(e => e.active && e.employmentPeriods.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())))
          .sort((a,b) => {
            const groupA = employeeGroups.find(g => g.id === a.groupId)?.order ?? Infinity;
            const groupB = employeeGroups.find(g => g.id === b.groupId)?.order ?? Infinity;
            if (groupA !== groupB) {
                return groupA - groupB;
            }
            return a.name.localeCompare(b.name);
        });
    }, [employees, holidayEmployees, employeeGroups]);


    const schedulableAbsenceTypes = useMemo(() => {
        return absenceTypes.filter(at => at.name === 'Vacaciones' || at.name === 'Excedencia' || at.name === 'Permiso no retribuido');
    }, [absenceTypes]);

     useEffect(() => {
        if (schedulableAbsenceTypes.length > 0 && !selectedAbsenceTypeId) {
            const vacationType = schedulableAbsenceTypes.find(at => at.name === 'Vacaciones');
            if (vacationType) {
                setSelectedAbsenceTypeId(vacationType.id);
            }
        }
    }, [schedulableAbsenceTypes, selectedAbsenceTypeId]);
    
    const { employeesWithAbsences, weeklySummaries, employeesByWeek, substitutesByWeek } = useMemo(() => {
        const schedulableIds = new Set(schedulableAbsenceTypes.map(at => at.id));
        const schedulableAbbrs = new Set(schedulableAbsenceTypes.map(at => at.abbreviation));
        const employeesWithAbsences: Record<string, FormattedAbsence[]> = {};

        allEmployeesForQuadrant.forEach(emp => {
            const allAbsenceDays = new Map<string, { typeId: string; typeAbbr: string; periodId?: string; absenceId?: string; }>();

            // 1. Get from scheduledAbsences
            emp.employmentPeriods.forEach(period => {
                (period.scheduledAbsences || []).filter(a => schedulableIds.has(a.absenceTypeId))
                    .forEach(absence => {
                        if (!absence.endDate) return;
                        const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);
                        if (!absenceType) return;
                        eachDayOfInterval({ start: startOfDay(absence.startDate), end: startOfDay(absence.endDate) }).forEach(day => {
                            if (getISOWeekYear(day) === selectedYear) {
                                allAbsenceDays.set(format(day, 'yyyy-MM-dd'), {
                                    typeId: absenceType.id,
                                    typeAbbr: absenceType.abbreviation,
                                    periodId: period.id,
                                    absenceId: absence.id,
                                });
                            }
                        });
                    });
            });

            // 2. Get from weeklyRecords for point absences
            Object.values(weeklyRecords).forEach(record => {
                const empWeekData = record.weekData[emp.id];
                if (!empWeekData?.days) return;

                Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                    const day = parseISO(dayStr);
                    if (getISOWeekYear(day) === selectedYear && dayData.absence && schedulableAbbrs.has(dayData.absence)) {
                         if (!allAbsenceDays.has(dayStr)) {
                            const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                            if (absenceType) {
                                allAbsenceDays.set(dayStr, {
                                    typeId: absenceType.id,
                                    typeAbbr: absenceType.abbreviation,
                                    absenceId: `weekly-${dayStr}` // Create a temporary unique ID
                                });
                            }
                         }
                    }
                });
            });
            
            const sortedDays = Array.from(allAbsenceDays.keys()).map(d => parseISO(d)).sort((a,b) => a.getTime() - b.getTime());
            const periods: FormattedAbsence[] = [];

            if (sortedDays.length > 0) {
                let currentStart = sortedDays[0];
                let currentInfo = allAbsenceDays.get(format(currentStart, 'yyyy-MM-dd'))!;
                for (let i = 1; i < sortedDays.length; i++) {
                    const dayInfo = allAbsenceDays.get(format(sortedDays[i], 'yyyy-MM-dd'))!;
                    if (differenceInDays(sortedDays[i], sortedDays[i-1]) > 1 || dayInfo.typeId !== currentInfo.typeId) {
                        periods.push({
                            id: currentInfo.absenceId!, startDate: currentStart, endDate: sortedDays[i-1],
                            absenceTypeId: currentInfo.typeId, absenceAbbreviation: currentInfo.typeAbbr, periodId: currentInfo.periodId
                        });
                        currentStart = sortedDays[i];
                        currentInfo = dayInfo;
                    }
                }
                periods.push({
                    id: currentInfo.absenceId!, startDate: currentStart, endDate: sortedDays[sortedDays.length - 1],
                    absenceTypeId: currentInfo.typeId, absenceAbbreviation: currentInfo.typeAbbr, periodId: currentInfo.periodId
                });
            }
            employeesWithAbsences[emp.id] = periods;
        });
        
        const year = selectedYear;
        const yearStartBoundary = startOfYear(new Date(year, 0, 1));
        const yearEndBoundary = endOfYear(new Date(year, 11, 31));
        
        let weeksOfYear: Date[] = [];
        if (year === 2025) {
            let current = new Date('2024-12-30');
            const end = endOfWeek(new Date('2025-12-28'));
            while (current <= end) {
                weeksOfYear.push(startOfWeek(current, { weekStartsOn: 1 }));
                current = addWeeks(current, 1);
            }
        } else {
            weeksOfYear = eachWeekOfInterval({ start: yearStartBoundary, end: yearEndBoundary }, { weekStartsOn: 1 });
        }
        
        const weekInfo = weeksOfYear.map(weekStart => ({
            start: weekStart,
            end: endOfWeek(weekStart, { weekStartsOn: 1 }),
            key: getWeekId(weekStart)
        }));

        const weeklySummaries: Record<string, { employeeCount: number; hourImpact: number }> = {};
        const employeesByWeek: Record<string, { employeeId: string; employeeName: string; groupId?: string | null; absenceAbbreviation: string }[]> = {};
        const substitutesByWeek: Record<string, { employeeId: string, substituteId: string, substituteName: string }[]> = {};

        holidayReports.filter(r => r.weekDate && getISOWeekYear(r.weekDate.toDate()) === year).forEach(report => {
            if (!report.weekId) return;
            if (!substitutesByWeek[report.weekId]) substitutesByWeek[report.weekId] = [];
            const subName = holidayEmployees.find(he => he.id === report.substituteId)?.name || 'Desconocido';
            substitutesByWeek[report.weekId].push({ employeeId: report.employeeId, substituteId: report.substituteId, substituteName: subName });
        });
        

        weekInfo.forEach(week => {
            weeklySummaries[week.key] = { employeeCount: 0, hourImpact: 0 };
            employeesByWeek[week.key] = [];
            
            allEmployeesForQuadrant.forEach(emp => {
                const empAbsences = employeesWithAbsences[emp.id];
                const absenceThisWeek = empAbsences?.find(a => 
                    isAfter(a.endDate, week.start) && isBefore(a.startDate, week.end)
                );

                if (absenceThisWeek) {
                    weeklySummaries[week.key].employeeCount++;
                    const weeklyHours = getEffectiveWeeklyHours(emp.employmentPeriods?.[0] || null, week.start);
                    weeklySummaries[week.key].hourImpact += weeklyHours;
                    employeesByWeek[week.key].push({ employeeId: emp.id, employeeName: emp.name, groupId: emp.groupId, absenceAbbreviation: absenceThisWeek.absenceAbbreviation });
                }
            });
        });

        return { employeesWithAbsences, weeklySummaries, employeesByWeek, substitutesByWeek };

    }, [allEmployeesForQuadrant, schedulableAbsenceTypes, absenceTypes, selectedYear, getEffectiveWeeklyHours, getWeekId, weeklyRecords, holidayReports, holidayEmployees]);
    
    const handleUpdateAbsence = async () => {
        if (!editingAbsence || !editedDateRange?.from) return;
        
        if (editingAbsence.absence.id.startsWith('weekly-')) {
            toast({ title: 'No editable', description: 'Las ausencias puntuales registradas en el horario semanal no se pueden editar desde aquí.', variant: 'destructive' });
            return;
        }

        setIsGenerating(true);
        try {
            const { employee, absence } = editingAbsence;
            const period = employee.employmentPeriods.find((p: EmploymentPeriod) => p.id === absence.periodId);
            if (!period) throw new Error("Periodo laboral no encontrado para la ausencia.");

            await deleteScheduledAbsence(employee.id, period.id, absence.id, employee, weeklyRecords);
            
            await addScheduledAbsence(employee.id, period.id, {
                absenceTypeId: absence.absenceTypeId,
                startDate: format(editedDateRange.from, 'yyyy-MM-dd'),
                endDate: editedDateRange.to ? format(editedDateRange.to, 'yyyy-MM-dd') : format(editedDateRange.from, 'yyyy-MM-dd'),
            }, employee);

            toast({ title: 'Ausencia actualizada', description: `La ausencia de ${employee.name} ha sido modificada.` });
            refreshData();
            setEditingAbsence(null);
        } catch (error) {
            console.error("Error updating absence:", error);
            toast({ title: 'Error al actualizar', description: 'No se pudo modificar la ausencia.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleDeleteAbsence = async (absence: FormattedAbsence) => {
        const employee = allEmployeesForQuadrant.find(e => e.id === selectedEmployeeId);
        if (!employee) return;
        if (absence.id.startsWith('weekly-')) {
            toast({ title: 'No editable', description: 'Las ausencias puntuales registradas en el horario semanal no se pueden borrar desde aquí.', variant: 'destructive' });
            return;
        }

        setIsGenerating(true);
        try {
            const period = employee.employmentPeriods.find((p: EmploymentPeriod) => p.id === absence.periodId);
            if (!period) throw new Error("Periodo laboral no encontrado para la ausencia.");

            await deleteScheduledAbsence(employee.id, period.id, absence.id, employee, weeklyRecords);
            toast({ title: 'Ausencia eliminada', description: `La ausencia de ${employee.name} ha sido eliminada.`, variant: 'destructive'});
            refreshData();
        } catch (error) {
            console.error("Error deleting absence:", error);
            toast({ title: 'Error al eliminar', description: error instanceof Error ? error.message : "No se pudo eliminar la ausencia.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

     const handleAddPeriod = async () => {
        const selectedEmployee = activeEmployees.find(e => e.id === selectedEmployeeId);
        if (!selectedEmployeeId || !selectedAbsenceTypeId || !selectedDateRange?.from || !selectedDateRange?.to || !selectedEmployee) {
            toast({ title: 'Datos incompletos', description: 'Selecciona empleado, tipo de ausencia y un rango de fechas.', variant: 'destructive' });
            return;
        }

        const activePeriod = selectedEmployee.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date()));
        if (!activePeriod) {
             toast({ title: 'Error', description: 'El empleado seleccionado no tiene un periodo laboral activo.', variant: 'destructive' });
            return;
        }

        setIsGenerating(true);
        try {
            await addScheduledAbsence(selectedEmployeeId, activePeriod.id, {
                absenceTypeId: selectedAbsenceTypeId,
                startDate: format(selectedDateRange.from, 'yyyy-MM-dd'),
                endDate: format(selectedDateRange.to, 'yyyy-MM-dd'),
            }, selectedEmployee);
            
            toast({ title: 'Periodo de ausencia añadido', description: `Se ha guardado la ausencia para ${selectedEmployee?.name}.` });
            setSelectedDateRange(undefined);
            refreshData();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo añadir el periodo de ausencia.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const openingHolidays = holidays.filter(h => h.type === 'Apertura').map(h => h.date as Date);
    const otherHolidays = holidays.filter(h => h.type !== 'Apertura').map(h => h.date as Date);
    const employeeAbsenceDays = employeesWithAbsences[selectedEmployeeId]?.flatMap(p => eachDayOfInterval({ start: p.startDate, end: p.endDate })) || [];

    const plannerModifiers = { opening: openingHolidays, other: otherHolidays, employeeAbsence: employeeAbsenceDays };
    const plannerModifiersStyles = { opening: { backgroundColor: '#a7f3d0' }, other: { backgroundColor: '#fecaca' }, employeeAbsence: { backgroundColor: '#dbeafe' }};
    const editModifiersStyles = { ...plannerModifiersStyles };

    const { weeksOfYear } = useMemo(() => {
        const year = selectedYear;
        const yearStartBoundary = startOfYear(new Date(year, 0, 1));
        const yearEndBoundary = endOfYear(new Date(year, 11, 31));
        
        let weeks: Date[] = [];
        if (year === 2025) {
            let current = new Date('2024-12-30');
            const end = endOfWeek(new Date('2025-12-28'));
            while (current <= end) {
                weeks.push(current);
                current = addWeeks(current, 1);
            }
        } else {
            weeks = eachWeekOfInterval({ start: yearStartBoundary, end: yearEndBoundary }, { weekStartsOn: 1 });
        }

        return {
            weeksOfYear: weeks.map(weekStart => ({
                start: weekStart,
                end: endOfWeek(weekStart, { weekStartsOn: 1 }),
                key: getWeekId(weekStart)
            }))
        };
    }, [selectedYear, getWeekId]);
    
    const handleAssignSubstitute = async (weekKey: string, employeeId: string, substituteId: string) => {
        if (!substituteId) {
            return;
        }

        setIsGenerating(true);
        try {
            const report = holidayReports.find(r => r.weekId === weekKey && r.employeeId === employeeId);
            const reportData = {
                weekId: weekKey,
                employeeId: employeeId,
                substituteId: substituteId,
                weekDate: parseISO(weekKey),
            };

            if (report) {
                await updateHolidayReport(report.id, reportData);
            } else {
                await addHolidayReport(reportData);
            }

            toast({ title: "Sustituto Asignado", description: "Se ha guardado el empleado eventual para esta semana." });
            refreshData();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error al asignar', description: 'No se pudo guardar la asignación.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const specialAbsenceAbbreviations = new Set(['EXD', 'PNR']);

    const selectedEmployeeAbsences = employeesWithAbsences[selectedEmployeeId]?.filter(a => getYear(a.startDate) === selectedYear || getYear(a.endDate) === selectedYear) || [];


    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline">Programador de Vacaciones</h1>

             <Card>
                <CardHeader>
                    <CardTitle>Planificar Nueva Ausencia</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Empleado</label>
                                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo de Ausencia</label>
                                <Select value={selectedAbsenceTypeId} onValueChange={setSelectedAbsenceTypeId} disabled={!selectedEmployeeId}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{schedulableAbsenceTypes.map(at => <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Calendar
                            mode="range"
                            selected={selectedDateRange}
                            onSelect={setSelectedDateRange}
                            locale={es}
                            disabled={!selectedEmployeeId || isGenerating}
                            className="rounded-md border"
                            modifiers={plannerModifiers}
                            modifiersStyles={plannerModifiersStyles}
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                        />
                        <Button onClick={handleAddPeriod} disabled={isGenerating || !selectedEmployeeId || !selectedDateRange?.from}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Guardar Periodo
                        </Button>
                    </div>
                    <div className="space-y-4">
                      <p className="font-medium">Leyenda</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full" style={plannerModifiersStyles.employeeAbsence}></div>Ausencia Programada</div>
                        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full" style={plannerModifiersStyles.other}></div>Festivo</div>
                        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full" style={plannerModifiersStyles.opening}></div>Festivo de Apertura</div>
                      </div>

                       <div className="space-y-2 pt-6">
                        <h4 className="font-medium">Historial de Ausencias Programadas ({selectedYear})</h4>
                        <div className="border rounded-md max-h-60 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Inicio</TableHead>
                                        <TableHead>Fin</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedEmployeeAbsences.length > 0 ? (
                                        selectedEmployeeAbsences.map(absence => (
                                            <TableRow key={absence.id}>
                                                <TableCell>{absenceTypes.find(at => at.id === absence.absenceTypeId)?.name || 'Desconocido'}</TableCell>
                                                <TableCell>{format(absence.startDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>{format(absence.endDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" disabled={isGenerating || absence.id.startsWith('weekly-')}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción eliminará la ausencia. Si alguna semana dentro de este periodo ya está confirmada, la eliminación fallará.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteAbsence(absence)}>Sí, eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                                No hay ausencias programadas para este empleado en {selectedYear}.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                       </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!editingAbsence} onOpenChange={(open) => { if (!open) setEditingAbsence(null); }}>
                <DialogContent>
                    {editingAbsence && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Editar Ausencia de {editingAbsence.employee.name}</DialogTitle>
                            </DialogHeader>
                            <Calendar
                                mode="range"
                                selected={editedDateRange}
                                onSelect={setEditedDateRange}
                                locale={es}
                                className="rounded-md border"
                                month={editCalendarMonth}
                                onMonthChange={setEditCalendarMonth}
                                modifiers={plannerModifiers}
                                modifiersStyles={editModifiersStyles}
                            />
                            <DialogFooter>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={isGenerating}>
                                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteAbsence(editingAbsence.absence)}>Eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                                <Button onClick={handleUpdateAbsence} disabled={isGenerating}>
                                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Cambios
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle>Cuadrante Anual de Ausencias</CardTitle>
                        <div className="flex items-center gap-2">
                            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                                <SelectTrigger className='w-32'><SelectValue /></SelectTrigger>
                                <SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                            <div className="flex items-center gap-1 border rounded-md p-1">
                                <Button onClick={() => generateQuadrantReportPDF(selectedYear, weeksOfYear, holidays, employeeGroups, allEmployeesForQuadrant, employeesByWeek, weeklySummaries)} disabled={isGenerating} size="sm" variant="ghost">
                                    <FileDown className="mr-2 h-4 w-4" /> Cuadrante
                                </Button>
                                <Button onClick={() => generateSignatureReportPDF(selectedYear, allEmployeesForQuadrant, employeesWithAbsences, dataProvider)} disabled={isGenerating} size="sm" variant="ghost">
                                    <FileSignature className="mr-2 h-4 w-4" /> Firmas
                                </Button>
                                <Button onClick={() => generateSeasonalReportPDF(allEmployeesForQuadrant, selectedYear, dataProvider)} disabled={isGenerating} size="sm" variant="ghost">
                                    <SunSnow className="mr-2 h-4 w-4" /> Check
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-[600px] w-full" /> : (
                         <div className="overflow-auto h-[70vh] border rounded-lg">
                             <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                                <thead className="sticky top-0 z-10 bg-card shadow-sm">
                                    <tr>
                                        <th className="p-0 border-b border-r sticky left-0 bg-card z-20" style={{ width: '1px', overflow: 'hidden' }}>
                                            <div className="w-0 opacity-0">Grupo</div>
                                        </th>
                                        {weeksOfYear.map(week => {
                                            const { turnId } = allEmployeesForQuadrant.length > 0 ? getTheoreticalHoursAndTurn(allEmployeesForQuadrant[0].id, week.start) : { turnId: null };

                                            return (
                                                <th key={week.key} className={cn("p-1 text-center font-semibold border-b border-r", holidays.some(h => isWithinInterval(h.date, { start: week.start, end: week.end })) && "bg-blue-50")} style={{ width: '400px' }}>
                                                    <div className='flex justify-between items-center h-full px-1'>
                                                        <div className="flex flex-col items-start">
                                                            <span className='text-xs'>{format(week.start, 'dd/MM')} - {format(week.end, 'dd/MM')}</span>
                                                            <div className="flex gap-3 mt-1 text-xs items-center font-normal text-muted-foreground">
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <button className='flex items-center gap-1 cursor-pointer'><Users className="h-3 w-3"/>{weeklySummaries[week.key]?.employeeCount ?? 0}</button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-64 p-2">
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold text-sm">Personal Ausente</p>
                                                                            {employeesByWeek[week.key]?.map(e => <p key={e.employeeId} className="text-xs">{e.employeeName} ({e.absenceAbbreviation})</p>)}
                                                                            {employeesByWeek[week.key]?.length === 0 && <p className="text-xs text-muted-foreground">Nadie.</p>}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                                <div className='flex items-center gap-1'><Clock className="h-3 w-3"/>{weeklySummaries[week.key]?.hourImpact.toFixed(0) ?? 0}h</div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary">{turnId ? `T.${turnId.replace('turn', '')}`: 'N/A'}</Badge>
                                                    </div>
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {employeeGroups.map(group => {
                                        const groupEmployees = allEmployeesForQuadrant.filter(e => e.groupId === group.id);
                                        return (
                                            <tr key={group.id}>
                                                <td className="border p-0 font-semibold text-sm align-top sticky left-0 z-10 bg-card" style={{ width: '1px', overflow: 'hidden' }}>
                                                   <div className="w-0 opacity-0">{group.name}</div>
                                                </td>
                                                {weeksOfYear.map(week => {
                                                    const employeesWithAbsenceInWeek = groupEmployees.map(emp => {
                                                        const absence = employeesWithAbsences[emp.id]?.find(a => 
                                                            isAfter(a.endDate, week.start) && isBefore(a.startDate, week.end)
                                                        );
                                                        return absence ? { employee: emp, absence } : null;
                                                    }).filter(Boolean);

                                                    const cellHasContent = employeesWithAbsenceInWeek.length > 0;
                                                    const cellBg = cellHasContent ? (groupColors[group.id] || '#f0f0f0') : 'transparent';
                                                    
                                                    return (
                                                        <td key={`${group.id}-${week.key}`} className="border align-top py-0 px-0.5" style={{ backgroundColor: cellBg }}>
                                                            <div className="flex flex-col gap-0 relative h-full">
                                                                {employeesWithAbsenceInWeek.map(item => {
                                                                    if (!item) return null;
                                                                    const substitute = substitutesByWeek[week.key]?.find(s => s.employeeId === item.employee.id);
                                                                    const isSpecialAbsence = specialAbsenceAbbreviations.has(item.absence.absenceAbbreviation);
                                                                    
                                                                    return (
                                                                        <div key={item.employee.id} className="flex items-center justify-between gap-1 w-full text-left truncate rounded-sm text-[10px] leading-tight py-0">
                                                                            <span className={cn("flex-grow text-left truncate", isSpecialAbsence && "text-blue-600 font-semibold")}>
                                                                                 {`${item.employee.name} (${item.absence.absenceAbbreviation})`}
                                                                            </span>
                                                                             <div className="flex items-center gap-1 flex-shrink-0">
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 m-0 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 flex-shrink-0 border-0">
                                                                                            <Plus className="h-3 w-3" />
                                                                                        </Button>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-56 p-1">
                                                                                        <div className="flex flex-col">
                                                                                            {eventualEmployees.map(emp => (
                                                                                                <Button
                                                                                                    key={emp.id}
                                                                                                    variant="ghost"
                                                                                                    className="w-full justify-start text-xs h-8"
                                                                                                    onClick={() => handleAssignSubstitute(week.key, item.employee.id, emp.id)}
                                                                                                >
                                                                                                    {emp.name}
                                                                                                </Button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </PopoverContent>
                                                                                </Popover>

                                                                                {substitute && (
                                                                                    <div className="text-[10px] truncate text-red-600 font-semibold">
                                                                                        Sust: {substitute.substituteName}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    