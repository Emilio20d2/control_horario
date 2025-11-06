

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, getISODay, isBefore, parseISO, isAfter, eachDayOfInterval, subDays, startOfDay, isValid, isWithinInterval, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InputStepper } from '@/components/ui/input-stepper';
import { useDataProvider } from '@/hooks/use-data-provider';
import type { DailyEmployeeData, Employee, DailyData } from '@/lib/types';
import { CheckCircle, Undo2, Save, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox"
import { es } from 'date-fns/locale';


import { AbsenceEditor } from './absence-editor';
import { HolidayEditor } from './holiday-editor';
import { BalancePreviewDisplay } from './balance-preview';
import { endIndefiniteAbsence } from '@/lib/services/employeeService';
import { Label } from '../ui/label';

interface WeekRowProps {
    employee: Employee;
    weekId: string;
    weekDays: Date[];
    initialWeekData: DailyEmployeeData | null;
    onWeekCompleted: (weekId: string) => void;
    onDataChange: (employeeId: string, dayKey: string, field: string, value: any) => void;
    onWeekLevelChange?: (employeeId: string, field: string, value: any) => void;
}

export const WeekRow: React.FC<WeekRowProps> = ({ employee, weekId, weekDays, initialWeekData, onWeekCompleted, onDataChange }) => {
    const { toast } = useToast();
    const { 
        holidays, 
        absenceTypes, 
        contractTypes, 
        calculateBalancePreview, 
        updateEmployeeWorkHours, 
        getActivePeriod, 
        getEmployeeBalancesForWeek,
        getTheoreticalHoursAndTurn,
        getEffectiveWeeklyHours,
        refreshData,
    } = useDataProvider();
    
    const [preview, setPreview] = useState<any | null>(null);
    const [initialBalances, setInitialBalances] = useState<ReturnType<typeof getEmployeeBalancesForWeek> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [weekTurn, setWeekTurn] = useState<string | null>(null);
    
    // This effect ensures balances are always fresh if the employee data changes.
    useEffect(() => {
        if (employee && weekId) {
            const balances = getEmployeeBalancesForWeek(employee.id, weekId);
            setInitialBalances(balances);
        }
        if (employee && weekDays && weekDays.length > 0) {
            const { turnId } = getTheoreticalHoursAndTurn(employee.id, weekDays[0]);
            setWeekTurn(turnId);
        }
    }, [employee, weekId, getEmployeeBalancesForWeek, getTheoreticalHoursAndTurn, weekDays]);

    useEffect(() => {
        const updatePreview = async () => {
            if (initialWeekData && employee && initialBalances) {
                const previewResult = await calculateBalancePreview(
                    employee.id,
                    initialWeekData.days || {},
                    initialBalances,
                    initialWeekData.weeklyHoursOverride,
                    initialWeekData.totalComplementaryHours
                );
                setPreview(previewResult);
            }
        };
        updatePreview();
    }, [initialWeekData, employee, calculateBalancePreview, initialBalances]);

    const handleConfirm = async () => {
        if (!initialWeekData || !employee || !preview || !initialBalances) return;
        setIsSaving(true);
    
        try {
            // First, process any indefinite absence interruptions for the week.
            // This needs to happen before the final data save.
            let dataWasRefreshed = false;
            for (const day of weekDays) {
                const dayKey = format(day, 'yyyy-MM-dd');
                const wasInterrupted = await endIndefiniteAbsence(employee.id, day, initialWeekData.days?.[dayKey]);
                if (wasInterrupted) {
                    dataWasRefreshed = true;
                }
            }
            
            // If any absence was ended, we need to refresh all data to get the latest state before saving.
            if (dataWasRefreshed) {
                await refreshData();
                // A small delay to ensure state propagation, though ideally this would be handled more elegantly
                await new Promise(resolve => setTimeout(resolve, 250));
            }
    
            const activePeriod = getActivePeriod(employee.id, weekDays[0]);
            if (!activePeriod) throw new Error("No active period found");
    
            const currentDbHours = getEffectiveWeeklyHours(activePeriod, weekDays[0]);
            const formHours = initialWeekData.weeklyHoursOverride ?? currentDbHours;
    
            if (formHours !== currentDbHours && initialWeekData.weeklyHoursOverride !== null) {
                await updateEmployeeWorkHours(employee.id, employee, formHours, format(weekDays[0], 'yyyy-MM-dd'));
                toast({ title: `Jornada Actualizada para ${employee.name}`, description: `Nueva jornada: ${formHours}h/semana.` });
            }
    
            const dataToSave: DailyEmployeeData = {
                ...initialWeekData,
                confirmed: true,
                previousBalances: initialBalances,
                impact: {
                    ordinary: preview.ordinary,
                    holiday: preview.holiday,
                    leave: preview.leave,
                },
                weeklyHoursOverride: initialWeekData.weeklyHoursOverride ?? null,
                totalComplementaryHours: initialWeekData.totalComplementaryHours ?? null,
                generalComment: initialWeekData.generalComment || null,
                isDifference: initialWeekData.isDifference ?? false,
                expectedOrdinaryImpact: initialWeekData.expectedOrdinaryImpact || null,
                expectedHolidayImpact: initialWeekData.expectedHolidayImpact || null,
                expectedLeaveImpact: initialWeekData.expectedLeaveImpact || null,
            };
            
            const finalData = {
                weekData: {
                    [employee.id]: dataToSave
                }
            };
            
            await setDoc(doc(db, 'weeklyRecords', weekId), finalData, { merge: true });
            
            toast({ title: `Semana Confirmada para ${employee.name}` });
            
            refreshData(); 
            onWeekCompleted(weekId);

        } catch (error) {
            console.error("Error al confirmar:", error);
            const errorMessage = error instanceof Error ? error.message : "No se pudo guardar la confirmación.";
            toast({ 
                title: 'Error al confirmar', 
                description: errorMessage,
                variant: 'destructive' 
            });
        } finally {
            setIsSaving(false);
        }
    }
    
    const { processEmployeeWeekData } = useDataProvider();

    const handleEnableCorrection = async () => {
        if (!initialWeekData || !employee) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'weeklyRecords', weekId), { [`weekData.${employee.id}.confirmed`]: false });
            
            refreshData();

            toast({ title: `Semana Habilitada para Edición`, variant: "destructive" });
        } catch (error) {
            console.error("Error al habilitar corrección:", error);
            toast({ title: 'Error al habilitar corrección', description: error instanceof Error ? error.message : "Error desconocido.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!initialWeekData) {
        return <TableRow><TableCell colSpan={8} className="p-0"><Skeleton className="h-48 w-full rounded-none" /></TableCell></TableRow>;
    }
    
    const isConfirmed = !!initialWeekData.confirmed;
    const activePeriod = getActivePeriod(employee.id, weekDays[0]);
    let contractType;
    if (activePeriod) {
        contractType = contractTypes.find(c => c.name === activePeriod.contractType);
    }
    const weeklyHours = initialWeekData.weeklyHoursOverride ?? getEffectiveWeeklyHours(activePeriod, weekDays[0]);
    
    const auditEndDate = new Date('2025-09-08');
    const showDifferenceCheckbox = isBefore(weekDays[0], auditEndDate);

    return (
        <TableRow className="align-top">
            <TableCell className="font-medium sticky left-0 z-10 p-2 text-xs w-[150px] sm:w-[200px] min-w-[150px] sm:min-w-[200px] bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex flex-col gap-2 h-full">
                    <div className="flex justify-between items-baseline">
                        <p className="font-bold text-sm flex items-center gap-1.5">
                            {employee.name}
                        </p>
                        <Badge variant="outline">{weekTurn ? `T.${weekTurn.replace('turn', '')}` : 'N/A'}</Badge>
                    </div>
                    <p className="text-muted-foreground">{contractType?.name ?? 'N/A'}</p>
                    
                    <div className="space-y-2 mt-2">
                         <InputStepper label="Jornada Semanal" value={initialWeekData.weeklyHoursOverride ?? weeklyHours} onChange={(v) => onDataChange(employee.id, 'week', 'weeklyHoursOverride', v)} className="text-xs" disabled={isConfirmed} />
                         <InputStepper label="H. Complementarias" value={initialWeekData.totalComplementaryHours ?? undefined} onChange={(v) => onDataChange(employee.id, 'week', 'totalComplementaryHours', v)} disabled={isConfirmed} />
                         {showDifferenceCheckbox && (
                            <div className="flex items-center space-x-2 pt-1">
                                <Checkbox 
                                    id={`diff-${employee.id}-${weekId}`} 
                                    checked={initialWeekData.isDifference}
                                    onCheckedChange={(checked) => onDataChange(employee.id, 'week', 'isDifference', !!checked)}
                                    disabled={isConfirmed || !initialWeekData.hasPreregistration}
                                />
                                <label
                                    htmlFor={`diff-${employee.id}-${weekId}`}
                                    className={cn("text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", initialWeekData.hasPreregistration && initialWeekData.isDifference && "text-destructive")}
                                >
                                    Diferencia con Excel
                                </label>
                            </div>
                         )}
                         <Textarea
                            placeholder="Añadir comentario..."
                            className="h-8 text-xs mt-2 resize-none"
                            value={initialWeekData.generalComment || ''}
                            onChange={(e) => onDataChange(employee.id, 'week', 'generalComment', e.target.value)}
                            disabled={isConfirmed}
                        />
                    </div>
                    
                    <div className="flex-grow"></div>

                    <BalancePreviewDisplay initialBalances={initialBalances} preview={preview} />
                    
                    <div className="mt-2 space-y-2">
                        {isConfirmed ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 p-2 justify-center rounded-md bg-green-100 dark:bg-green-900/50 w-full">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <p className="font-semibold text-green-700 dark:text-green-300">Confirmado</p>
                                </div>
                                 <Button onClick={handleEnableCorrection} size="sm" variant="secondary" className="w-full">
                                    <Undo2 className="mr-2 h-4 w-4" />
                                    Habilitar Corrección
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={handleConfirm} size="sm" className="w-full" disabled={isSaving || !preview}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                Confirmar
                            </Button>
                        )}
                    </div>
                </div>
            </TableCell>
            {weekDays.map(day => {
                const dayId = format(day, 'yyyy-MM-dd');
                const dayData = initialWeekData.days?.[dayId];

                if (!dayData) return <TableCell key={day.toISOString()} className="p-1" />;
                
                const isHoliday = dayData.isHoliday;
                const holidayType = dayData.holidayType;
                const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                
                const dayOfWeek = getISODay(day);
                
                const showLeaveHours = isHoliday &&
                    dayOfWeek !== 7 &&
                    dayData.theoreticalHours === 0 &&
                    (contractType?.computesOffDayBag ?? false) &&
                    dayData.absence === 'ninguna';
                
                const cellStyle: React.CSSProperties = {};
                if (isHoliday) {
                    cellStyle.background = 'linear-gradient(to bottom right, #e0f2f1, transparent)';
                } else if (isConfirmed) {
                     cellStyle.background = 'linear-gradient(to bottom right, rgba(240, 240, 240, 0.5), transparent)';
                }


                if (absenceType?.color) {
                    cellStyle.background = `linear-gradient(to bottom right, ${absenceType.color}40, transparent)`;
                }

                return (
                    <TableCell key={day.toISOString()} className="p-1 align-top text-xs" style={cellStyle}>
                        <div className="flex flex-col items-center justify-start gap-2 h-full py-2">
                             <div className='w-full space-y-1 flex-grow'>
                                <div className="text-muted-foreground text-xs h-4 text-center font-semibold">
                                    Teóricas: {(dayData.theoreticalHours ?? 0).toFixed(2)}h
                                </div>
                                <InputStepper
                                    value={dayData.workedHours}
                                    onChange={(v) => onDataChange(employee.id, dayId, 'workedHours', v)}
                                    disabled={isConfirmed}
                                />
                                {absenceType && (absenceType.isAbsenceSplittable || absenceType.computesFullDay) && (
                                     <InputStepper
                                        label={absenceType.name}
                                        value={dayData.absenceHours}
                                        onChange={(v) => onDataChange(employee.id, dayId, 'absenceHours', v)}
                                        disabled={isConfirmed}
                                    />
                                )}
                                {showLeaveHours && (
                                    <InputStepper
                                        label="H. Libranza"
                                        value={dayData.leaveHours}
                                        onChange={(v) => onDataChange(employee.id, dayId, 'leaveHours', v)}
                                        disabled={isConfirmed}
                                    />
                                )}
                            </div>

                            <div className="flex flex-row gap-1 h-auto sm:h-8 items-center mt-auto">
                                <AbsenceEditor dayData={dayData} absenceTypes={absenceTypes} onAbsenceChange={(f, v) => onDataChange(employee.id, dayId, f, v)} disabled={isConfirmed} />
                                {isHoliday && holidayType && <HolidayEditor dayData={dayData} holidayType={holidayType} onHolidayChange={(f, v) => onDataChange(employee.id, dayId, f, v)} disabled={isConfirmed} />}
                            </div>
                            
                             <div className="h-4 mt-1 sm:mt-2">
                                {isHoliday && holidayType && <p className="font-semibold text-primary text-xs text-center w-full truncate" title={holidayType}>{holidays.find(h=>isSameDay(h.date,day))?.name}</p>}
                            </div>
                        </div>
                    </TableCell>
                );
            })}
        </TableRow>
    );
};
