

'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Expand,
  X,
  Edit,
  UserX,
  UserPlus,
  Plane,
} from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import type { Employee, EmploymentPeriod, Ausencia, VacationCampaign, Conversation, HolidayEmployee, ScheduledAbsence } from '@/lib/types';
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
  parse,
  isEqual,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import {
  addScheduledAbsence,
  deleteScheduledAbsence,
  updateScheduledAbsence,
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
import { generateQuadrantReportPDF, generateSignatureReportPDF, generateRequestStatusReportPDF } from '@/lib/report-generators';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Timestamp } from 'firebase/firestore';
import { HolidayEmployeeManager } from '@/components/settings/holiday-employee-manager';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';


interface FormattedAbsence extends Ausencia {
    isRequest?: boolean;
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
        holidayReports,
        addHolidayReport,
        getTheoreticalHoursAndTurn,
        vacationCampaigns,
        conversations,
        deleteHolidayReport,
        calculateEmployeeVacations,
    } = dataProvider;
    const { toast } = useToast();
    const { appUser, reauthenticateWithPassword } = useAuth();
    
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isHolidayEmployeeManagerOpen, setIsHolidayEmployeeManagerOpen] = useState(false);
    
    // State for planner
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedAbsenceTypeId, setSelectedAbsenceTypeId] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [vacationCalculation, setVacationCalculation] = useState<ReturnType<typeof calculateEmployeeVacations> | null>(null);


    // State for editing
    const [editingAbsence, setEditingAbsence] = useState<{ employee: any; absence: FormattedAbsence; } | null>(null);
    const [editedDateRange, setEditedDateRange] = useState<DateRange | undefined>(undefined);
    const [editCalendarMonth, setEditCalendarMonth] = useState<Date>(new Date());
        
    // State for status report
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    
    // State for substitutes
    const [substitutes, setSubstitutes] = useState<Record<string, Record<string, {reportId: string, substituteId: string, substituteName: string}>>>({}); // { [weekKey]: { [employeeId]: { reportId, substituteId, substituteName } } }

    useEffect(() => {
        if (holidayReports.length > 0) {
            const newSubs: Record<string, Record<string, {reportId: string, substituteId: string, substituteName: string}>> = {};
            holidayReports.forEach(report => {
                if (!newSubs[report.weekId]) {
                    newSubs[report.weekId] = {};
                }
                newSubs[report.weekId][report.employeeId] = {
                    reportId: report.id,
                    substituteId: report.substituteId,
                    substituteName: report.substituteName,
                };
            });
            setSubstitutes(newSubs);
        }
    }, [holidayReports]);

    const activeEmployees = useMemo(() => {
        return employees.filter(e => e.employmentPeriods.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())));
    }, [employees]);

    const allCampaignsSorted = useMemo(() => {
        const toDate = (date: Date | Timestamp) => (date instanceof Timestamp ? date.toDate() : date);
        return [...vacationCampaigns]
            .sort((a,b) => toDate(b.submissionStartDate).getTime() - toDate(a.submissionStartDate).getTime());
    }, [vacationCampaigns]);

    useEffect(() => {
        if (allCampaignsSorted.length > 0 && !selectedCampaignId) {
            setSelectedCampaignId(allCampaignsSorted[0].id);
        }
    }, [allCampaignsSorted, selectedCampaignId]);
    
    const groupColors = useMemo(() => generateGroupColors(employeeGroups.map(g => g.id)), [employeeGroups]);

    useEffect(() => {
        if (activeEmployees.length > 0 && !selectedEmployeeId) {
            setSelectedEmployeeId(activeEmployees[0].id);
        }
    }, [activeEmployees, selectedEmployeeId]);
    
    useEffect(() => {
        if (selectedYear) {
            setCalendarMonth(new Date(Number(selectedYear), 0, 1));
        }
    }, [selectedYear]);

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
        employees.forEach(emp => {
          (emp.employmentPeriods || []).forEach(p => {
            if(p.scheduledAbsences) {
              p.scheduledAbsences.forEach(a => {
                years.add(getYear(a.startDate));
                if(a.endDate) {
                    years.add(getYear(a.endDate));
                }
              })
            }
          })
        });
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords, employees]);

    const schedulableAbsenceTypes = useMemo(() => {
        return absenceTypes.filter(at => at.name === 'Vacaciones' || at.name === 'Excedencia' || at.name === 'Permiso no retribuido');
    }, [absenceTypes]);
    
    const { allEmployeesForQuadrant, substituteEmployees } = useMemo(() => {
        if (loading) return { allEmployeesForQuadrant: [], substituteEmployees: [] };

        const activeEmployeesForQuadrant = employees.filter(e => e.employmentPeriods.some(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date())));

        const mainEmployeesMap = new Map(activeEmployeesForQuadrant.map(e => [e.id, e]));

        const holidayEmployeesData: Record<string, { groupId?: string | null, active: boolean }> = {};
        holidayEmployees.forEach(he => {
            holidayEmployeesData[he.id] = { groupId: he.groupId, active: he.active };
        });

        const eventuals = holidayEmployees
            .filter(he => !mainEmployeesMap.has(he.id) && he.active)
            .map(he => ({
                id: he.id,
                name: he.name,
                employmentPeriods: [],
                isEventual: true,
                groupId: he.groupId || null,
            }));

        const mainEmployeesWithGroup = activeEmployeesForQuadrant.map(emp => ({
            ...emp,
            isEventual: false,
            groupId: holidayEmployeesData[emp.id]?.groupId || null,
        }));

        const combinedList = [...mainEmployeesWithGroup, ...eventuals] as (Employee & { isEventual: boolean, groupId: string | null })[];

        const sortedQuadrantEmployees = combinedList.sort((a, b) => {
            const groupA = employeeGroups.find(g => g.id === a.groupId)?.order ?? Infinity;
            const groupB = employeeGroups.find(g => g.id === b.groupId)?.order ?? Infinity;
            if (groupA !== groupB) return groupA - groupB;
            return a.name.localeCompare(b.name);
        });

        return {
            allEmployeesForQuadrant: sortedQuadrantEmployees,
            substituteEmployees: eventuals,
        };
    }, [employees, holidayEmployees, employeeGroups, loading]);
    
    
    // Recalculate vacation data when employee or year changes
    useEffect(() => {
        const emp = employees.find(e => e.id === selectedEmployeeId);
        if (emp && selectedYear) {
            const calculation = calculateEmployeeVacations(emp, Number(selectedYear), 'programmed');
            setVacationCalculation(calculation);
        }
    }, [selectedEmployeeId, selectedYear, employees, calculateEmployeeVacations, weeklyRecords]);

     useEffect(() => {
        if (schedulableAbsenceTypes.length > 0 && !selectedAbsenceTypeId) {
            const vacationType = schedulableAbsenceTypes.find(at => at.name === 'Vacaciones');
            if (vacationType) {
                setSelectedAbsenceTypeId(vacationType.id);
            }
        }
    }, [schedulableAbsenceTypes, selectedAbsenceTypeId]);
    
    const { employeesWithAbsences, weeklySummaries, employeesByWeek } = useMemo(() => {
        const schedulableIds = new Set(schedulableAbsenceTypes.map(at => at.id));
        const schedulableAbbrs = new Set(schedulableAbsenceTypes.map(at => at.abbreviation));
        const employeesWithAbsences: Record<string, FormattedAbsence[]> = {};

        allEmployeesForQuadrant.forEach(emp => {
            const allAbsenceDays = new Map<string, { typeId: string; typeAbbr: string; periodId?: string; absenceId?: string; isRequest?: boolean; originalRequest?: { startDate: Date, endDate: Date | null } }>();

            (emp.employmentPeriods || []).forEach(period => {
                (period.scheduledAbsences || []).filter(a => schedulableIds.has(a.absenceTypeId))
                    .forEach(absence => {
                        if (!absence.endDate) return;
                        const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);
                        if (!absenceType) return;
                        eachDayOfInterval({ start: startOfDay(absence.startDate), end: startOfDay(absence.endDate) }).forEach(day => {
                           allAbsenceDays.set(format(day, 'yyyy-MM-dd'), {
                                typeId: absenceType.id,
                                typeAbbr: absenceType.abbreviation,
                                periodId: period.id,
                                absenceId: absence.id,
                                isRequest: false,
                                originalRequest: absence.originalRequest,
                            });
                        });
                    });
            });
            
            Object.values(weeklyRecords).forEach(record => {
                const empWeekData = record.weekData[emp.id];
                if (!empWeekData?.days) return;

                Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                    const day = parseISO(dayStr);
                    if (dayData.absence && schedulableAbbrs.has(dayData.absence)) {
                         if (!allAbsenceDays.has(dayStr)) {
                            const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                            if (absenceType) {
                                allAbsenceDays.set(dayStr, {
                                    typeId: absenceType.id,
                                    typeAbbr: absenceType.abbreviation,
                                    absenceId: `weekly-${dayStr}`
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
                    if (differenceInDays(sortedDays[i], sortedDays[i-1]) > 1 || dayInfo.typeId !== currentInfo.typeId || dayInfo.isRequest !== currentInfo.isRequest) {
                        periods.push({
                            id: currentInfo.absenceId!, startDate: currentStart, endDate: sortedDays[i-1],
                            absenceTypeId: currentInfo.typeId, absenceAbbreviation: currentInfo.typeAbbr, periodId: currentInfo.periodId,
                            isRequest: currentInfo.isRequest, originalRequest: currentInfo.originalRequest
                        });
                        currentStart = sortedDays[i];
                        currentInfo = dayInfo;
                    }
                }
                periods.push({
                    id: currentInfo.absenceId!, startDate: currentStart, endDate: sortedDays[sortedDays.length - 1],
                    absenceTypeId: currentInfo.typeId, absenceAbbreviation: currentInfo.typeAbbr, periodId: currentInfo.periodId,
                    isRequest: currentInfo.isRequest, originalRequest: currentInfo.originalRequest,
                });
            }
            employeesWithAbsences[emp.id] = periods;
        });
        
        const year = Number(selectedYear);
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
        
        weekInfo.forEach(week => {
            weeklySummaries[week.key] = { employeeCount: 0, hourImpact: 0 };
            employeesByWeek[week.key] = [];
            
            allEmployeesForQuadrant.forEach(emp => {
                const empAbsences = employeesWithAbsences[emp.id];
                const absenceThisWeek = empAbsences?.find(a => 
                    isAfter(a.endDate, week.start) && isBefore(a.startDate, week.end) && getYear(a.startDate) === year
                );

                if (absenceThisWeek) {
                    weeklySummaries[week.key].employeeCount++;
                    const weeklyHours = getEffectiveWeeklyHours(emp.employmentPeriods?.[0] || null, week.start);
                    weeklySummaries[week.key].hourImpact += weeklyHours;
                    employeesByWeek[week.key].push({ employeeId: emp.id, employeeName: emp.name, groupId: emp.groupId, absenceAbbreviation: absenceThisWeek.absenceAbbreviation });
                }
            });
        });

        return { employeesWithAbsences, weeklySummaries, employeesByWeek };

    }, [allEmployeesForQuadrant, substituteEmployees, schedulableAbsenceTypes, absenceTypes, selectedYear, getEffectiveWeeklyHours, getWeekId, weeklyRecords, holidayReports, conversations]);
    
    const isInitialLoad = useRef(true);
    useEffect(() => {
        if (!loading && isInitialLoad.current) {
            const latestYearWithAbsence = Object.values(employeesWithAbsences)
                .flat()
                .reduce((latest, absence) => {
                    const year = getYear(absence.startDate);
                    return year > latest ? year : latest;
                }, 0);
            
            const currentYear = new Date().getFullYear();
            const yearToSet = latestYearWithAbsence > 0 ? latestYearWithAbsence : currentYear;

            if (availableYears.includes(yearToSet)) {
                setSelectedYear(String(yearToSet));
            }
            isInitialLoad.current = false;
        }
    }, [loading, employeesWithAbsences, availableYears]);


    const handleUpdateAbsence = async () => {
        if (!editingAbsence || !editedDateRange?.from) return;
    
        if (editingAbsence.absence.id.startsWith('weekly-')) {
            toast({ title: 'No editable', description: 'Las ausencias puntuales registradas en el horario semanal no se pueden editar desde aquí.', variant: 'destructive' });
            setEditingAbsence(null);
            return;
        }
    
        setIsGenerating(true);
        try {
            const { employee, absence } = editingAbsence;
            
            await updateScheduledAbsence(employee.id, absence.periodId!, absence.id, {
                startDate: format(editedDateRange.from, 'yyyy-MM-dd'),
                endDate: editedDateRange.to ? format(editedDateRange.to, 'yyyy-MM-dd') : format(editedDateRange.from, 'yyyy-MM-dd'),
            }, employee);
    
            toast({ title: 'Ausencia actualizada', description: `La ausencia de ${employee.name} ha sido modificada.` });
            refreshData();
            setEditingAbsence(null);
        } catch (error) {
            console.error("Error updating absence:", error);
            toast({ title: 'Error al actualizar', description: error instanceof Error ? error.message : "No se pudo modificar la ausencia.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteAbsence = async () => {
        if (!editingAbsence) return;
        
        if (editingAbsence.absence.id.startsWith('weekly-')) {
            toast({ title: 'No editable', description: 'Las ausencias puntuales del horario no se pueden eliminar desde aquí.', variant: 'destructive' });
            setEditingAbsence(null);
            return;
        }

        setIsGenerating(true);
        try {
            const { employee, absence } = editingAbsence;
            await deleteScheduledAbsence(employee.id, absence.periodId!, absence.id, employee, weeklyRecords);
            toast({ title: 'Ausencia Eliminada', description: `La ausencia de ${employee.name} ha sido eliminada.`, variant: 'destructive' });
            refreshData();
            setEditingAbsence(null);
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
            // For manual additions, the originalRequest is not set, as it's not a formal campaign request
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
    
    const employeeAbsencesForYear = useMemo(() => {
        if (!selectedEmployeeId || !selectedYear) return [];
        return (employeesWithAbsences[selectedEmployeeId] || [])
            .filter(a => getYear(a.startDate) === Number(selectedYear))
            .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
    }, [selectedEmployeeId, selectedYear, employeesWithAbsences]);
    
    const employeeAbsenceDays = useMemo(() => {
        if (!selectedEmployeeId) return [];
        return (employeesWithAbsences[selectedEmployeeId] || []).flatMap(p => {
            if (!p.endDate) return [p.startDate];
            return eachDayOfInterval({ start: p.startDate, end: p.endDate });
        });
    }, [selectedEmployeeId, employeesWithAbsences]);


    const plannerModifiers = { opening: openingHolidays, other: otherHolidays, employeeAbsence: employeeAbsenceDays };
    const editModifiers = { opening: openingHolidays, other: otherHolidays };
    const plannerModifiersStyles = { 
        opening: { backgroundColor: '#a7f3d0' }, 
        other: { backgroundColor: '#fecaca' }, 
        employeeAbsence: { backgroundColor: '#dbeafe' },
    };
    const editModifiersStyles = { ...plannerModifiersStyles };

    const { weeksOfYear } = useMemo(() => {
        const year = Number(selectedYear);
        if (!year) return { weeksOfYear: [] };

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
    
    const handleGenerateStatusReport = () => {
        const campaign = allCampaignsSorted.find(c => c.id === selectedCampaignId);
        if (!campaign) {
            toast({ title: 'Error', description: 'Por favor, selecciona una campaña válida.', variant: 'destructive' });
            return;
        }
        generateRequestStatusReportPDF(campaign, allEmployeesForQuadrant, conversations, absenceTypes);
    };

    const handleSelectSubstitute = async (weekKey: string, employeeId: string, substitute: {id: string, name: string} | null) => {
        const existingReport = substitutes[weekKey]?.[employeeId];

        try {
            if (substitute) { // Adding or updating
                await addHolidayReport({
                    id: existingReport?.reportId,
                    weekId: weekKey,
                    weekDate: Timestamp.fromDate(parseISO(weekKey)),
                    employeeId,
                    substituteId: substitute.id,
                    substituteName: substitute.name,
                });
                toast({ title: 'Sustituto Asignado', description: `${substitute.name} asignado.` });
            } else if (existingReport) { // Removing
                await deleteHolidayReport(existingReport.reportId);
                toast({ title: 'Sustitución Eliminada', variant: 'destructive' });
            }
            refreshData(); // To get the latest holidayReports
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'No se pudo actualizar el sustituto.', variant: 'destructive'});
        }
    };

    const specialAbsenceAbbreviations = new Set(['EXD', 'PNR']);

    const renderQuadrant = () => (
        <div className="overflow-auto h-full border rounded-lg">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-10 bg-card shadow-sm">
              <tr>
                <th className="p-1 border-b border-r font-semibold text-sm sticky left-0 bg-card z-20" style={{ width: '0.0025px' }}></th>
                {weeksOfYear.map(week => {
                  const { turnId } = allEmployeesForQuadrant.length > 0 ? getTheoreticalHoursAndTurn(allEmployeesForQuadrant[0].id, week.start) : { turnId: null };
  
                  return (
                    <th key={week.key} className={cn("p-1 text-center font-semibold border-b border-r", holidays.some(h => isWithinInterval(h.date, { start: week.start, end: week.end })) && "bg-blue-50")} style={{ width: '300px' }}>
                      <div className='flex justify-between items-center h-full px-1'>
                        <div className="flex flex-col items-start">
                          <span className='text-xs'>{format(week.start, 'dd/MM')} - {format(week.end, 'dd/MM')}</span>
                          <div className="flex gap-3 mt-1 text-xs items-center font-normal text-muted-foreground">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className='flex items-center gap-1 cursor-pointer'><Users className="h-3 w-3" />{weeklySummaries[week.key]?.employeeCount ?? 0}</button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-2">
                                <div className="space-y-1">
                                  <p className="font-bold text-sm">Personal Ausente</p>
                                  {employeesByWeek[week.key]?.map(e => <p key={e.employeeId} className="text-xs">{e.employeeName} ({e.absenceAbbreviation})</p>)}
                                  {employeesByWeek[week.key]?.length === 0 && <p className="text-xs text-muted-foreground">Nadie.</p>}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <div className='flex items-center gap-1'><Clock className="h-3 w-3" />{weeklySummaries[week.key]?.hourImpact.toFixed(0) ?? 0}h</div>
                          </div>
                        </div>
                        <Badge variant="secondary">{turnId ? `T.${turnId.replace('turn', '')}` : 'N/A'}</Badge>
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
                    <td className="border p-1 font-semibold text-sm align-top sticky left-0 z-10 bg-card" style={{ backgroundColor: groupColors[group.id] || '#f0f0f0', width: '0.0025px' }}>
                    </td>
                    {weeksOfYear.map(week => {
                      const employeesWithAbsenceInWeek = groupEmployees.map(emp => {
                        const absence = (employeesWithAbsences[emp.id] || []).find(a =>
                          isAfter(a.endDate, week.start) && isBefore(a.startDate, week.end)
                        );
                        return absence ? { employee: emp, absence } : null;
                      }).filter((item): item is { employee: Employee & { isEventual: boolean, groupId: string | null }, absence: FormattedAbsence } => item !== null);
  
                      const cellHasContent = employeesWithAbsenceInWeek.length > 0;
                       const cellBg = cellHasContent
                          ? (groupColors[group.id] || '#f0f0f0')
                          : 'transparent';
  
                      return (
                        <td key={`${group.id}-${week.key}`} className="border align-top py-1 px-0.5" style={{ backgroundColor: cellBg }}>
                           <div className="flex flex-col gap-0.5 relative h-full">
                                {employeesWithAbsenceInWeek.map(item => {
                                    if (!item) return null;

                                    const substituteInfo = substitutes[week.key]?.[item.employee.id];
                                    const isSpecialAbsence = specialAbsenceAbbreviations.has(item.absence.absenceAbbreviation);

                                    return (
                                        <div key={item.employee.id} className="group/cell flex items-center justify-between gap-1 w-full text-left truncate rounded-sm text-[11px] leading-tight hover:bg-black/5" >
                                            <button onClick={() => setEditingAbsence({employee: item.employee, absence: item.absence})} className="flex-grow text-left truncate">
                                                <span className={cn(isSpecialAbsence && 'text-blue-600 font-semibold')}>
                                                    {`${item.employee.name} (${item.absence.absenceAbbreviation})`}
                                                </span>
                                            </button>
                                            <div className="flex-shrink-0">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button className="p-0.5 rounded-full hover:bg-slate-200">
                                                            {substituteInfo ? (
                                                                <span className="text-red-600 font-bold">{substituteInfo.substituteName}</span>
                                                            ) : (
                                                                <Plus className="h-3 w-3" />
                                                            )}
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-48 p-1">
                                                    <div className="flex flex-col">
                                                        {substituteEmployees.map(sub => (
                                                            <button key={sub.id} onClick={() => handleSelectSubstitute(week.key, item.employee.id, sub)} className="text-sm text-left p-1 rounded-sm hover:bg-accent">
                                                                {sub.name}
                                                            </button>
                                                        ))}
                                                        {substituteInfo && (
                                                            <>
                                                                <hr className="my-1"/>
                                                                <button onClick={() => handleSelectSubstitute(week.key, item.employee.id, null)} className="flex items-center gap-2 text-sm text-left p-1 rounded-sm text-destructive hover:bg-destructive/10">
                                                                <UserX className="h-4 w-4" /> Quitar Sustituto
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            </div>
                                        </div>
                                    );
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
      );

    const CalculationRow = ({ label, value, isBold = false, isNegative = false }: { label: string; value: string; isBold?: boolean; isNegative?: boolean; }) => (
        <div className={cn("flex justify-between text-xs", isBold && "font-bold")}>
            <span>{label}</span>
            <span className={cn("font-mono", isNegative && "text-destructive")}>{value}</span>
        </div>
    );
    
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
             <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div className="flex-grow">
                        <CardTitle>Planificar Nueva Ausencia</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsHolidayEmployeeManagerOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Gestionar Empleados Eventuales
                    </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2 sm:col-span-1">
                                <label className="text-sm font-medium">Año</label>
                                <Select value={selectedYear} onValueChange={(value) => setSelectedYear(String(value))}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-sm font-medium">Empleado</label>
                                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Tipo de Ausencia</label>
                            <Select value={selectedAbsenceTypeId} onValueChange={setSelectedAbsenceTypeId} disabled={!selectedEmployeeId}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>{schedulableAbsenceTypes.map(at => <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>)}</SelectContent>
                            </Select>
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
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Días Programados ({selectedYear})</CardTitle>
                                <Plane className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                            {vacationCalculation ? (
                                <div className={cn(
                                    "text-2xl font-bold",
                                    vacationCalculation.vacationDaysTaken > vacationCalculation.vacationDaysAvailable ? "text-destructive" : ""
                                )}>
                                    {vacationCalculation.vacationDaysTaken} / {vacationCalculation.vacationDaysAvailable}
                                    <span className="text-sm text-muted-foreground ml-1">días</span>
                                </div>
                            ) : (
                                <Skeleton className="h-8 w-32" />
                            )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                 <CardTitle className="text-sm font-medium">Cálculo de Días Disponibles</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {vacationCalculation ? (
                                    <>
                                        <CalculationRow label="Días prorrateados del año" value={vacationCalculation.proratedDays.toFixed(2)} />
                                        <CalculationRow label={`Arrastrados del año anterior`} value={vacationCalculation.carryOverDays.toFixed(2)} isNegative={vacationCalculation.carryOverDays < 0} />
                                        <CalculationRow label="Descuento por suspensión" value={`-${vacationCalculation.suspensionDeduction.toFixed(2)}`} isNegative={vacationCalculation.suspensionDeduction > 0} />
                                        <Separator className="my-2" />
                                        <CalculationRow label="Total Días Disponibles" value={String(vacationCalculation.vacationDaysAvailable)} isBold />
                                    </>
                                ) : (
                                    <Skeleton className="h-20 w-full" />
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Periodos Programados en {selectedYear}</CardTitle>
                            </CardHeader>
                             <CardContent>
                                {employeeAbsencesForYear.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-1 h-8 text-xs">Tipo</TableHead>
                                                <TableHead className="px-1 h-8 text-xs">Inicio</TableHead>
                                                <TableHead className="px-1 h-8 text-xs">Fin</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employeeAbsencesForYear.map((absence) => (
                                                <TableRow key={absence.id}>
                                                    <TableCell className="px-1 py-1 text-xs">{absence.absenceAbbreviation}</TableCell>
                                                    <TableCell className="px-1 py-1 text-xs">{format(absence.startDate, 'dd/MM/yy', { locale: es })}</TableCell>
                                                    <TableCell className="px-1 py-1 text-xs">{format(absence.endDate, 'dd/MM/yy', { locale: es })}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">No hay ausencias programadas para este empleado en el año seleccionado.</p>
                                )}
                             </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!editingAbsence} onOpenChange={(open) => !open && setEditingAbsence(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Ausencia Programada</DialogTitle>
                        {editingAbsence && (
                            <DialogDescription>
                                Modificando la ausencia de <strong>{editingAbsence.employee.name}</strong> del tipo <strong>{absenceTypes.find(at => at.id === editingAbsence.absence.absenceTypeId)?.name}</strong>.
                                {editingAbsence.absence.originalRequest && <p className="text-xs text-muted-foreground pt-2">Solicitud Original: del {format(editingAbsence.absence.originalRequest.startDate, 'dd/MM/yy')} al {editingAbsence.absence.originalRequest.endDate ? format(editingAbsence.absence.originalRequest.endDate, 'dd/MM/yy') : ''}</p>}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="py-4 flex justify-center">
                        <Calendar
                            mode="range"
                            selected={editedDateRange}
                            onSelect={setEditedDateRange}
                            locale={es}
                            disabled={isGenerating}
                            className="rounded-md border"
                            modifiers={editModifiers}
                            modifiersStyles={editModifiersStyles}
                            month={editCalendarMonth}
                            onMonthChange={setEditCalendarMonth}
                        />
                    </div>
                    <DialogFooter className="justify-between sm:justify-between w-full">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isGenerating}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Se eliminará el periodo de ausencia seleccionado. Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAbsence} disabled={isGenerating}>
                                        {isGenerating ? 'Eliminando...' : 'Sí, eliminar'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div className="flex gap-2">
                             <DialogClose asChild>
                                <Button variant="outline">Cancelar</Button>
                            </DialogClose>
                            <Button onClick={handleUpdateAbsence} disabled={isGenerating || !editedDateRange?.from}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Guardar Cambios
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isHolidayEmployeeManagerOpen} onOpenChange={setIsHolidayEmployeeManagerOpen}>
                <DialogContent className="max-w-4xl">
                    <HolidayEmployeeManager />
                </DialogContent>
            </Dialog>


            <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
              <DialogContent className="max-w-none w-screen h-full p-0 m-0 sm:max-w-none sm:max-w-none:translate-x-0 sm:max-w-none:translate-y-0">
                 <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(false)} className="absolute top-2 right-2 z-20 bg-background/50 border hover:bg-background">
                    <X className="h-6 w-6" />
                </Button>
                <div className="w-full h-full overflow-auto">
                    {renderQuadrant()}
                </div>
              </DialogContent>
            </Dialog>

            <Card>
                 <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                         <CardTitle>Programador vacaciones</CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap items-center gap-1 border rounded-md p-1">
                            <Button onClick={() => generateQuadrantReportPDF(Number(selectedYear), weeksOfYear, holidays, employeeGroups, allEmployeesForQuadrant, employeesByWeek, weeklySummaries, substitutes, getTheoreticalHoursAndTurn, specialAbsenceAbbreviations)} disabled={isGenerating} size="sm" variant="ghost" className="h-9 md:h-8">
                                <FileDown className="mr-2 h-4 w-4" /> Cuadrante
                            </Button>
                            <Button onClick={() => generateSignatureReportPDF(Number(selectedYear), allEmployeesForQuadrant, employeesWithAbsences, absenceTypes)} disabled={isGenerating} size="sm" variant="ghost" className="h-9 md:h-8">
                                <FileSignature className="mr-2 h-4 w-4" /> Firmas
                            </Button>
                            {allCampaignsSorted.length > 0 && (
                                <>
                                    <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                                        <SelectTrigger className="h-9 md:h-8 w-auto md:w-48 text-xs">
                                            <SelectValue placeholder="Seleccionar campaña..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allCampaignsSorted.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.title} {c.isActive ? '' : '(Inactiva)'}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleGenerateStatusReport} disabled={isGenerating || !selectedCampaignId} size="sm" variant="ghost" className="h-9 md:h-8">
                                        <SunSnow className="mr-2 h-4 w-4" /> Peticiones
                                    </Button>
                                </>
                            )}
                            <Button onClick={() => setIsFullScreen(true)} size="sm" variant="ghost" className="h-9 md:h-8">
                                <Expand className="mr-2 h-4 w-4" /> Completa
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-full w-full" /> : renderQuadrant()}
                </CardContent>
            </Card>
        </div>
    );
}

    

    

    




