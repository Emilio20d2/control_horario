

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
  UserCircle2,
  UserCheck,
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
  isValid,
  isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import {
  addScheduledAbsence,
  updateScheduledAbsence,
  hardDeleteScheduledAbsence,
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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


interface FormattedAbsence extends ScheduledAbsence {
    absenceAbbreviation: string;
    periodId: string;
    color?: string;
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
    
    const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
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
    const [deletePassword, setDeletePassword] = useState('');
        
    // State for status report
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    
    // State for substitutes
    const [substitutes, setSubstitutes] = useState<Record<string, Record<string, {reportId: string, substituteId: string, substituteName: string}>>>({}); // { [weekKey]: { [employeeId]: { reportId, substituteId, substituteName } } }

    const safeParseDate = useCallback((date: any): Date | null => {
        if (!date) return null;
        if (date instanceof Date) return date;
        if (date.toDate && typeof date.toDate === 'function') return date.toDate();
        if (typeof date === 'string') {
            const parsed = parseISO(date);
            if (isValid(parsed)) return parsed;
        }
        return null;
    }, []);


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
        return employees.filter(e => e.employmentPeriods.some(p => {
             const endDate = p.endDate ? safeParseDate(p.endDate as string) : null;
             return !endDate || isAfter(endDate, new Date());
        }));
    }, [employees, safeParseDate]);

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

    const { allEmployeesForQuadrant, substituteEmployees } = useMemo(() => {
        if (loading) return { allEmployeesForQuadrant: [], substituteEmployees: [] };

        const activeEmployeesForQuadrant = employees.filter(e => e.employmentPeriods.some(p => {
             const endDate = p.endDate ? safeParseDate(p.endDate as string) : null;
             return !endDate || isAfter(endDate, new Date());
        }));

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
    }, [employees, holidayEmployees, employeeGroups, loading, safeParseDate]);
    

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        allEmployeesForQuadrant.forEach(emp => {
          (emp.employmentPeriods || []).forEach(p => {
            if(p.scheduledAbsences) {
              p.scheduledAbsences.forEach(a => {
                const startDate = safeParseDate(a.startDate);
                const endDate = a.endDate ? safeParseDate(a.endDate) : null;
                if (startDate && isValid(startDate)) years.add(getYear(startDate));
                if (endDate && isValid(endDate)) years.add(getYear(endDate));
              })
            }
          })
        });
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        years.add(currentYear + 1);
        return Array.from(years).sort((a,b) => b - a);
    }, [allEmployeesForQuadrant, safeParseDate]);
    
    useEffect(() => {
      if (availableYears.length > 0) {
          const mostRecentYear = String(availableYears[0]);
          const currentYearIsValid = availableYears.map(String).includes(selectedYear);
          
          // Set the year on initial load or if the currently selected year becomes invalid.
          if (!currentYearIsValid || selectedYear === String(new Date().getFullYear())) {
              setSelectedYear(mostRecentYear);
          }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableYears]); // Only run when availableYears changes.

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
            setEditedDateRange({ from: editingAbsence.absence.startDate, to: editingAbsence.absence.endDate || undefined });
            setEditCalendarMonth(editingAbsence.absence.startDate);
        } else {
            setEditedDateRange(undefined);
            setDeletePassword('');
        }
    }, [editingAbsence]);

    const schedulableAbsenceTypes = useMemo(() => absenceTypes.filter(at => ['Vacaciones', 'Excedencia', 'Permiso no retribuido'].includes(at.name)), [absenceTypes]);

    useEffect(() => {
        if (schedulableAbsenceTypes.length > 0 && !selectedAbsenceTypeId) {
            const vacationType = schedulableAbsenceTypes.find(at => at.name === 'Vacaciones');
            if (vacationType) {
                setSelectedAbsenceTypeId(vacationType.id);
            }
        }
    }, [schedulableAbsenceTypes, selectedAbsenceTypeId]);
    
    const { employeesWithAbsences, weeklySummaries, employeesByWeek, allAbsences } = useMemo(() => {
        const schedulableIds = new Set(schedulableAbsenceTypes.map(at => at.id));
        const schedulableAbbrs = new Set(schedulableAbsenceTypes.map(at => at.abbreviation));
        const employeesWithAbsences: Record<string, FormattedAbsence[]> = {};
        const confirmedAbsenceDays = new Set<string>(); // "employeeId-dayString"
    
        // 1. Process confirmed records first. They are the source of truth.
        allEmployeesForQuadrant.forEach(emp => {
            const absences: FormattedAbsence[] = [];
            Object.values(weeklyRecords).forEach(record => {
                const empWeekData = record.weekData[emp.id];
                if (!empWeekData?.confirmed || !empWeekData.days) return;
    
                Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                    if (schedulableAbbrs.has(dayData.absence)) {
                        const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                        const period = emp.employmentPeriods.find(p => isWithinInterval(parseISO(dayStr), { start: p.startDate, end: p.endDate || new Date('9999-12-31') }));
                        
                        if (absenceType && period) {
                            absences.push({
                                id: `confirmed_${emp.id}_${dayStr}`,
                                absenceTypeId: absenceType.id,
                                startDate: parseISO(dayStr),
                                endDate: parseISO(dayStr),
                                isDefinitive: true,
                                absenceAbbreviation: absenceType.abbreviation,
                                color: absenceType.color,
                                periodId: period.id,
                            });
                            confirmedAbsenceDays.add(`${emp.id}-${dayStr}`);
                        }
                    }
                });
            });
            employeesWithAbsences[emp.id] = absences;
        });
    
        // 2. Process scheduled absences, but only if they haven't been confirmed.
        allEmployeesForQuadrant.forEach(emp => {
            (emp.employmentPeriods || []).forEach((p: EmploymentPeriod) => {
                (p.scheduledAbsences || []).forEach(a => {
                    if (schedulableIds.has(a.absenceTypeId)) {
                        const startDate = safeParseDate(a.startDate);
                        const endDate = a.endDate ? safeParseDate(a.endDate) : startDate;
                        if (!startDate || !endDate) return;

                        const absenceType = absenceTypes.find(at => at.id === a.absenceTypeId);
                        if (!absenceType) return;
                        
                        // Check each day of the scheduled absence.
                        eachDayOfInterval({ start: startDate, end: endDate }).forEach(day => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            // If this day was NOT confirmed in weeklyRecords, add it as a planned absence.
                            if (!confirmedAbsenceDays.has(`${emp.id}-${dayStr}`)) {
                                if (!employeesWithAbsences[emp.id]) {
                                    employeesWithAbsences[emp.id] = [];
                                }
                                employeesWithAbsences[emp.id].push({
                                    ...a,
                                    startDate: day,
                                    endDate: day,
                                    absenceAbbreviation: absenceType.abbreviation,
                                    color: absenceType.color,
                                    periodId: p.id,
                                });
                            }
                        });
                    }
                });
            });
        });
        
        const allAbsences = Object.values(employeesWithAbsences).flat();
        
        let year = Number(selectedYear);
        if (!year || isNaN(year)) year = getYear(new Date());
    
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
        const employeesByWeek: Record<string, { employeeId: string; employeeName: string; groupId?: string | null; absenceAbbreviation: string; color?: string; }[]> = {};
        
        weekInfo.forEach(week => {
            weeklySummaries[week.key] = { employeeCount: 0, hourImpact: 0 };
            employeesByWeek[week.key] = [];
            
            allEmployeesForQuadrant.forEach(emp => {
                const empAbsences = employeesWithAbsences[emp.id] || [];
                const absenceThisWeek = empAbsences.find(a => 
                    a.endDate && isAfter(a.endDate, week.start) && isBefore(a.startDate, week.end)
                );
    
                if (absenceThisWeek) {
                    weeklySummaries[week.key].employeeCount++;
                    const activePeriod = emp.employmentPeriods.find((p: EmploymentPeriod) => !p.endDate || isAfter(safeParseDate(p.endDate)!, new Date()));
                    const weeklyHours = getEffectiveWeeklyHours(activePeriod || null, week.start);
                    weeklySummaries[week.key].hourImpact += weeklyHours;
                    employeesByWeek[week.key].push({ employeeId: emp.id, employeeName: emp.name, groupId: emp.groupId, absenceAbbreviation: absenceThisWeek.absenceAbbreviation, color: absenceThisWeek.color });
                }
            });
        });
    
        return { employeesWithAbsences, weeklySummaries, employeesByWeek, allAbsences };
    
    }, [allEmployeesForQuadrant, schedulableAbsenceTypes, absenceTypes, selectedYear, getEffectiveWeeklyHours, getWeekId, safeParseDate, weeklyRecords]);
    
    // Recalculate vacation data when employee or year changes
    useEffect(() => {
        const emp = employees.find(e => e.id === selectedEmployeeId);
        if (emp && selectedYear) {
            const calculation = calculateEmployeeVacations(emp, Number(selectedYear));
            setVacationCalculation(calculation);
        }
    }, [selectedEmployeeId, selectedYear, employees, calculateEmployeeVacations, weeklyRecords, employeesWithAbsences]);


    const handleUpdateAbsence = async () => {
        if (!editingAbsence || !editedDateRange?.from) return;
        
        const { employee, absence } = editingAbsence;

        setIsGenerating(true);
        try {
            await updateScheduledAbsence(
                employee.id,
                absence.periodId,
                absence.id,
                {
                    absenceTypeId: absence.absenceTypeId,
                    startDate: format(editedDateRange.from, 'yyyy-MM-dd'),
                    endDate: editedDateRange.to ? format(editedDateRange.to, 'yyyy-MM-dd') : format(editedDateRange.from, 'yyyy-MM-dd'),
                },
                employee
            );
    
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

    const handleDeleteAbsence = async (employeeId: string, periodId: string, absence: FormattedAbsence) => {
        if (!deletePassword) {
            toast({ title: 'Contraseña requerida', description: 'Introduce tu contraseña para confirmar la eliminación.', variant: 'destructive' });
            return;
        }
    
        setIsGenerating(true);
        try {
            const isAuthenticated = await reauthenticateWithPassword(deletePassword);
            if (!isAuthenticated) {
                toast({ title: 'Error de autenticación', description: 'La contraseña no es correcta.', variant: 'destructive' });
                setIsGenerating(false);
                return;
            }
    
            await hardDeleteScheduledAbsence(employeeId, periodId, absence.id, absence.originalRequest);
            toast({ title: 'Ausencia Eliminada', description: `La ausencia ha sido eliminada permanentemente.`, variant: 'destructive' });
            refreshData();
            setEditingAbsence(null);
        } catch (error) {
            console.error("Error deleting absence:", error);
            toast({ title: 'Error al eliminar', description: error instanceof Error ? error.message : "No se pudo eliminar la ausencia.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
            setDeletePassword('');
        }
    };


     const handleAddPeriod = async () => {
        const selectedEmployee = activeEmployees.find(e => e.id === selectedEmployeeId);
        if (!selectedEmployeeId || !selectedAbsenceTypeId || !selectedDateRange?.from || !selectedDateRange?.to || !selectedEmployee) {
            toast({ title: 'Datos incompletos', description: 'Selecciona empleado, tipo de ausencia y un rango de fechas.', variant: 'destructive' });
            return;
        }

        const activePeriod = selectedEmployee.employmentPeriods.find(p => {
            const endDate = p.endDate ? safeParseDate(p.endDate as string) : null;
            return !endDate || isAfter(endDate, new Date());
        });
        if (!activePeriod) {
             toast({ title: 'Error', description: 'El empleado seleccionado no tiene un periodo laboral activo.', variant: 'destructive' });
            return;
        }

        setIsGenerating(true);
        try {
            await addScheduledAbsence(
                selectedEmployeeId, 
                activePeriod.id, 
                {
                    absenceTypeId: selectedAbsenceTypeId,
                    startDate: format(selectedDateRange.from, 'yyyy-MM-dd'),
                    endDate: format(selectedDateRange.to, 'yyyy-MM-dd'),
                }, 
                selectedEmployee,
                false // Admin adding it directly, not from an employee request
            );
            
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
            .sort((a,b) => safeParseDate(a.startDate)!.getTime() - safeParseDate(b.startDate)!.getTime());
    }, [selectedEmployeeId, selectedYear, employeesWithAbsences, safeParseDate]);
    
    const employeeAbsenceDays = useMemo(() => {
        if (!selectedEmployeeId) return [];
        return (employeesWithAbsences[selectedEmployeeId] || []).flatMap(p => {
            const startDate = safeParseDate(p.startDate);
            if (!startDate) return [];
            const endDate = p.endDate ? safeParseDate(p.endDate) : startDate;
            if (!endDate) return [startDate];
            return eachDayOfInterval({ start: startDate, end: endDate });
        });
    }, [selectedEmployeeId, employeesWithAbsences, safeParseDate]);


    const editingAbsenceDays = useMemo(() => {
        if (!editingAbsence?.absence?.startDate) return [];
        const { startDate, endDate } = editingAbsence.absence;
        const validStartDate = safeParseDate(startDate);
        if (!validStartDate) return [];
        const validEndDate = endDate ? safeParseDate(endDate) : validStartDate;
        if (!validEndDate) return [];
        return eachDayOfInterval({ start: validStartDate, end: validEndDate });
    }, [editingAbsence, safeParseDate]);

    const plannerModifiers = { opening: openingHolidays, other: otherHolidays, employeeAbsence: employeeAbsenceDays, editing: editingAbsenceDays };
    const editModifiers = { opening: openingHolidays, other: otherHolidays };
    const plannerModifiersStyles = { 
        opening: { backgroundColor: '#a7f3d0' }, 
        other: { backgroundColor: '#fecaca' }, 
        employeeAbsence: { backgroundColor: '#dbeafe' },
        editing: { backgroundColor: '#bfdbfe', color: '#1e3a8a', fontWeight: 'bold' }
    };
    const editModifiersStyles = { ...plannerModifiersStyles };

    const { weeksOfYear } = useMemo(() => {
        const year = Number(selectedYear);
        if (!year || isNaN(year)) return { weeksOfYear: [] };

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
        generateRequestStatusReportPDF(campaign, allEmployeesForQuadrant, employees, absenceTypes);
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

    const uniqueAbsencesForYear = useMemo(() => {
        if (!selectedEmployeeId) return [];
        const year = Number(selectedYear);
        if (isNaN(year)) return [];
    
        const dayMap = new Map<string, any>();
    
        // Use a set to ensure each day is processed once, prioritizing definitive records
        (employeesWithAbsences[selectedEmployeeId] || [])
            .filter(a => a.startDate && getYear(safeParseDate(a.startDate)!) === year)
            .forEach(absence => {
                const dayKey = format(safeParseDate(absence.startDate)!, 'yyyy-MM-dd');
                
                // If the day is already mapped by a definitive record, skip.
                if (dayMap.has(dayKey) && dayMap.get(dayKey).isDefinitive) {
                    return;
                }
                
                // If the new absence is definitive, it overwrites any non-definitive one.
                if (absence.isDefinitive) {
                     dayMap.set(dayKey, {
                        date: safeParseDate(absence.startDate),
                        absenceTypeId: absence.absenceTypeId,
                        absenceAbbreviation: absence.absenceAbbreviation,
                        originalAbsenceId: absence.id,
                        originalPeriodId: absence.periodId,
                        isDefinitive: absence.isDefinitive,
                        originalRequest: absence.originalRequest
                    });
                } else if (!dayMap.has(dayKey)) { // Only add if not present, as non-definitive
                    dayMap.set(dayKey, {
                        date: safeParseDate(absence.startDate),
                        absenceTypeId: absence.absenceTypeId,
                        absenceAbbreviation: absence.absenceAbbreviation,
                        originalAbsenceId: absence.id,
                        originalPeriodId: absence.periodId,
                        isDefinitive: absence.isDefinitive,
                        originalRequest: absence.originalRequest
                    });
                }
            });
    
        const allDaysWithAbsenceType = Array.from(dayMap.values())
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    
        if (allDaysWithAbsenceType.length === 0) return [];
    
        const periods: (FormattedAbsence & { startDate: Date; endDate: Date })[] = [];
        let currentPeriod = {
            ...allDaysWithAbsenceType[0],
            startDate: allDaysWithAbsenceType[0].date,
            endDate: allDaysWithAbsenceType[0].date,
            id: allDaysWithAbsenceType[0].originalAbsenceId,
            periodId: allDaysWithAbsenceType[0].originalPeriodId,
        };
    
        for (let i = 1; i < allDaysWithAbsenceType.length; i++) {
            const dayInfo = allDaysWithAbsenceType[i];
            const prevDayInfo = allDaysWithAbsenceType[i-1];
    
            if (isSameDay(dayInfo.date, addDays(prevDayInfo.date, 1)) && dayInfo.absenceTypeId === currentPeriod.absenceTypeId) {
                currentPeriod.endDate = dayInfo.date;
                // If any day in the period is definitive, the whole grouped period points to its ID for editing.
                if (dayInfo.isDefinitive) {
                    currentPeriod.id = dayInfo.originalAbsenceId;
                    currentPeriod.periodId = dayInfo.originalPeriodId;
                }
            } else {
                periods.push(currentPeriod);
                currentPeriod = {
                    ...dayInfo,
                    startDate: dayInfo.date,
                    endDate: dayInfo.date,
                    id: dayInfo.originalAbsenceId,
                    periodId: dayInfo.originalPeriodId,
                };
            }
        }
        periods.push(currentPeriod);
    
        return periods;
    }, [selectedEmployeeId, selectedYear, employeesWithAbsences, safeParseDate]);
    
    const renderQuadrant = () => (
        <div className="overflow-auto h-full border rounded-lg">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-10 bg-card shadow-sm">
              <tr>
                <th className="p-1 border-b border-r font-semibold text-sm sticky left-0 bg-card z-20 text-transparent" style={{ width: '0.15px' }}>
                    Agrupación
                </th>
                {weeksOfYear.map(week => {
                  const { turnId } = allEmployeesForQuadrant.length > 0 ? getTheoreticalHoursAndTurn(allEmployeesForQuadrant[0].id, week.start) : { turnId: null };
  
                  return (
                    <th key={week.key} className={cn("p-1 text-center font-semibold border-b border-r", holidays.some(h => isWithinInterval(h.date as Date, { start: week.start, end: week.end })) && "bg-blue-50")} style={{ width: '300px' }}>
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
                    <td className="border p-1 font-semibold text-sm align-top sticky left-0 z-10 text-transparent" style={{ backgroundColor: groupColors[group.id] || '#f0f0f0', width: '0.15px' }}>
                        {group.name}
                    </td>
                    {weeksOfYear.map(week => {
                        const employeesWithAbsenceInWeek = groupEmployees.map(emp => {
                            const absence = (employeesWithAbsences[emp.id] || []).find(a =>
                                a.endDate && isAfter(a.endDate, week.start) && isBefore(a.startDate, week.end)
                            );
                            return absence ? { employee: emp, absence } : null;
                        }).filter((item): item is { employee: Employee & { isEventual: boolean, groupId: string | null }, absence: FormattedAbsence } => item !== null);

                        const absenceColors = Array.from(new Set(employeesWithAbsenceInWeek.map(item => item.absence.color).filter(Boolean)));
                        
                        let backgroundStyle: React.CSSProperties = { backgroundColor: 'transparent' };
                        if (editingAbsence && employeesWithAbsenceInWeek.some(item => item.absence.id === editingAbsence.absence.id)) {
                            backgroundStyle = { backgroundColor: '#bfdbfe' }; // Editing color
                        } else if(employeesWithAbsenceInWeek.length > 0) {
                            backgroundStyle = { backgroundColor: groupColors[group.id] || '#f0f0f0' };
                        }

                      return (
                        <td key={`${group.id}-${week.key}`} className="border align-top py-1 px-0.5" style={backgroundStyle}>
                           <div className="flex flex-col gap-0.5 relative h-full">
                                {employeesWithAbsenceInWeek.map(item => {
                                    if (!item) return null;

                                    const substituteInfo = substitutes[week.key]?.[item.employee.id];
                                    const isSpecialAbsence = specialAbsenceAbbreviations.has(item.absence.absenceAbbreviation);

                                    return (
                                        <div key={item.employee.id} className="group/cell flex items-center justify-between gap-1 w-full text-left truncate rounded-sm text-[11px] leading-tight hover:bg-black/5" >
                                            <div className="flex-grow text-left truncate">
                                                <span className={cn(isSpecialAbsence && 'text-blue-600 font-semibold')}>
                                                    {`${item.employee.name} (${item.absence.absenceAbbreviation})`}
                                                </span>
                                            </div>
                                            <div className="flex-shrink-0 flex items-center">
                                                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/cell:opacity-100" onClick={() => setEditingAbsence({employee: item.employee, absence: item.absence})}>
                                                    <Edit className="h-3 w-3" />
                                                </Button>
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
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
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
                                {uniqueAbsencesForYear.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-1 h-8 text-xs">Tipo</TableHead>
                                                <TableHead className="px-1 h-8 text-xs">Inicio</TableHead>
                                                <TableHead className="px-1 h-8 text-xs">Fin</TableHead>
                                                <TableHead className="px-1 h-8 text-xs text-right">Acción</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {uniqueAbsencesForYear.map((absence: any) => (
                                                <TableRow key={absence.id}>
                                                    <TableCell className="px-1 py-1 text-xs">{absence.absenceAbbreviation}</TableCell>
                                                    <TableCell className="px-1 py-1 text-xs">{format(safeParseDate(absence.startDate)!, 'dd/MM/yy', { locale: es })}</TableCell>
                                                    <TableCell className="px-1 py-1 text-xs">{absence.endDate ? format(safeParseDate(absence.endDate)!, 'dd/MM/yy', { locale: es }) : 'N/A'}</TableCell>
                                                    <TableCell className="text-right p-0">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingAbsence({employee: activeEmployees.find(e => e.id === selectedEmployeeId), absence: absence})}>
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive-foreground">
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                                                    <AlertDialogDescription>Se eliminará el periodo de ausencia seleccionado del planificador. Esta acción no se puede deshacer.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <div className="space-y-2 py-2">
                                                                    <Label htmlFor={`password-delete-dialog-${absence.id}`}>Contraseña de Administrador</Label>
                                                                    <Input id={`password-delete-dialog-${absence.id}`} type="password" placeholder="Introduce tu contraseña" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                                                                </div>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteAbsence(selectedEmployeeId, absence.periodId!, absence)} disabled={isGenerating || !deletePassword}>
                                                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
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
                                {editingAbsence.absence.communicatedTo && 
                                    <p className="text-xs pt-2 flex items-center gap-2"><UserCheck className="h-4 w-4" />Petición comunicada a: <strong>{editingAbsence.absence.communicatedTo}</strong></p>
                                }
                                {editingAbsence.absence.originalRequest?.startDate && <p className="text-xs text-muted-foreground pt-2">Solicitud Original: del {format(safeParseDate(editingAbsence.absence.originalRequest.startDate)!, 'dd/MM/yy')} al {format(safeParseDate(editingAbsence.absence.originalRequest.endDate)!, 'dd/MM/yy')}</p>}
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
                                <Button variant="destructive" type="button">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                    <AlertDialogDescription>Se eliminará el periodo de ausencia seleccionado (y su solicitud original, si existe) del planificador. Esta acción no se puede deshacer.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-2 py-2">
                                    <Label htmlFor="password-delete-dialog">Contraseña de Administrador</Label>
                                    <Input id="password-delete-dialog" type="password" placeholder="Introduce tu contraseña" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => editingAbsence && handleDeleteAbsence(editingAbsence.employee.id, editingAbsence.absence.periodId!, editingAbsence.absence)} disabled={isGenerating || !deletePassword}>
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
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
  


    







