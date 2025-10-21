'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, getISODay, isBefore, parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InputStepper } from '@/components/ui/input-stepper';
import { useDataProvider } from '@/hooks/use-data-provider';
import type { DailyEmployeeData, Employee, DailyData } from '@/lib/types';
import { CheckCircle, Undo2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox"
import { es } from 'date-fns/locale';


import { AbsenceEditor } from './absence-editor';
import { HolidayEditor } from './holiday-editor';
import { BalancePreviewDisplay } from './balance-preview';

interface WeekRowProps {
    employee: Employee;
    weekId: string;
    weekDays: Date[];
    initialWeekData: DailyEmployeeData | null;
    onWeekCompleted: (weekId: string) => void;
}

export const WeekRow: React.FC<WeekRowProps> = ({ employee, weekId, weekDays, initialWeekData, onWeekCompleted }) => {
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
        getActiveEmployeesForDate,
    } = useDataProvider();
    
    const [localWeekData, setLocalWeekData] = useState<DailyEmployeeData | null>(initialWeekData);
    const [preview, setPreview] = useState<any | null>(null);
    const [initialBalances, setInitialBalances] = useState<ReturnType<typeof getEmployeeBalancesForWeek> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [weekTurn, setWeekTurn] = useState<string | null>(null);


    useEffect(() => {
        setLocalWeekData(initialWeekData);
        if (initialWeekData) {
            const { turnId } = getTheoreticalHoursAndTurn(employee.id, weekDays[0]);
            setWeekTurn(turnId);
            const balances = getEmployeeBalancesForWeek(employee.id, weekId);
            setInitialBalances(balances);
        }
    }, [initialWeekData, employee.id, weekId, weekDays, getTheoreticalHoursAndTurn, getEmployeeBalancesForWeek]);

    useEffect(() => {
        const updatePreview = async () => {
            if (localWeekData && employee && initialBalances) {
                const auditData = localWeekData.hasPreregistration ? {
                    expectedOrdinary: localWeekData.expectedOrdinaryImpact ?? 0,
                    expectedHoliday: localWeekData.expectedHolidayImpact ?? 0,
                    expectedLeave: localWeekData.expectedLeaveImpact ?? 0,
                } : undefined;

                const previewResult = await calculateBalancePreview(
                    employee.id,
                    localWeekData.days || {},
                    initialBalances,
                    localWeekData.weeklyHoursOverride,
                    localWeekData.totalComplementaryHours,
                    auditData,
                );
                setPreview(previewResult);

                if (previewResult?.isDifference && !localWeekData.isDifference) {
                    handleWeekLevelDataChange('isDifference', true);
                }
            }
        };
        updatePreview();
    }, [localWeekData, employee, calculateBalancePreview, initialBalances]);
    
    const handleDailyDataChange = useCallback((day: Date, field: string, value: any) => {
        setLocalWeekData(prevData => {
            if (!prevData?.days) return prevData;
            const dayId = format(day, 'yyyy-MM-dd');
            const currentDayData = prevData.days[dayId];
            if (!currentDayData) return prevData;
    
            let updatedDayData = { ...currentDayData, [field]: value };
    
            if (field === 'absence') {
                const selectedAbsenceType = absenceTypes.find(at => at.abbreviation === value);
                
                if (selectedAbsenceType) {
                    if (selectedAbsenceType.computesFullDay) {
                        updatedDayData.absenceHours = currentDayData.theoreticalHours;
                        updatedDayData.workedHours = 0;
                    } else if (selectedAbsenceType.isAbsenceSplittable) {
                         updatedDayData.absenceHours = 0;
                    }
                } else if (value === 'ninguna') {
                    updatedDayData.absenceHours = 0;
                    const oldAbsenceType = absenceTypes.find(at => at.abbreviation === currentDayData.absence);
                    if (oldAbsenceType && oldAbsenceType.computesFullDay) {
                        updatedDayData.workedHours = currentDayData.theoreticalHours;
                    }
                }
            }
    
            if (field === 'absenceHours') {
                const selectedAbsenceType = absenceTypes.find(at => at.abbreviation === currentDayData.absence);
                if (selectedAbsenceType && selectedAbsenceType.isAbsenceSplittable) {
                    const newAbsenceHours = value;
                    const theoretical = currentDayData.theoreticalHours;
                    updatedDayData.workedHours = Math.max(0, theoretical - newAbsenceHours);
                }
            }
    
            return { ...prevData, days: { ...prevData.days, [dayId]: updatedDayData } };
        });
    }, [absenceTypes]);


    const handleWeekLevelDataChange = useCallback((field: string, value: any) => {
        setLocalWeekData(prevData => {
            if (!prevData) return null;
            if (typeof value === 'number' && (isNaN(value) || value === null)) {
                return { ...prevData, [field]: null };
            }
            return { ...prevData, [field]: value };
        });
    }, []);

    const handleConfirm = async () => {
        if (!localWeekData || !employee || !preview || !initialBalances) return;
        setIsSaving(true);
    
        try {
            const activePeriod = getActivePeriod(employee.id, weekDays[0]);
            if (!activePeriod) throw new Error("No active period found");
    
            const currentDbHours = [...(activePeriod.workHoursHistory || [])].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0]?.weeklyHours;
            const formHours = localWeekData.weeklyHoursOverride ?? currentDbHours ?? 0;
    
            if (formHours !== currentDbHours && localWeekData.weeklyHoursOverride !== null) {
                await updateEmployeeWorkHours(employee.id, formHours, format(weekDays[0], 'yyyy-MM-dd'));
                toast({ title: `Jornada Actualizada para ${employee.name}`, description: `Nueva jornada: ${formHours}h/semana.` });
            }
            
            const currentComment = String(localWeekData.generalComment || '');
            const auditEndDate = new Date('2025-09-08');

            let finalComment = currentComment;

            if (isAfter(weekDays[0], auditEndDate) && preview.isDifference) {
                const diffs: string[] = [];
                 const expected = {
                    ordinary: localWeekData.expectedOrdinaryImpact ?? 0,
                    holiday: localWeekData.expectedHolidayImpact ?? 0,
                    leave: localWeekData.expectedLeaveImpact ?? 0,
                };
                if (Math.abs(preview.ordinary - expected.ordinary) > 0.01) diffs.push(`Ordinaria (Dif: ${(preview.ordinary - expected.ordinary).toFixed(2)}h)`);
                if (Math.abs(preview.holiday - expected.holiday) > 0.01) diffs.push(`Festivos (Dif: ${(preview.holiday - expected.holiday).toFixed(2)}h)`);
                if (Math.abs(preview.leave - expected.leave) > 0.01) diffs.push(`Libranza (Dif: ${(preview.leave - expected.leave).toFixed(2)}h)`);
                
                if (diffs.length > 0) {
                    const diffMessage = `AUDITORÍA: Diferencia detectada en bolsas: ${diffs.join(', ')}.`;
                    finalComment = finalComment ? `${finalComment}\n${diffMessage}` : diffMessage;
                }
            }

            const sanitizedDays: Record<string, DailyData> = {};
            Object.keys(localWeekData.days).forEach(dayKey => {
                const dayData = localWeekData.days[dayKey];
                sanitizedDays[dayKey] = {
                    ...dayData,
                    holidayType: dayData.holidayType ?? null,
                    doublePay: dayData.doublePay,
                };
            });

            const dataToSave: DailyEmployeeData = {
                ...localWeekData,
                days: sanitizedDays,
                confirmed: true,
                previousBalances: initialBalances,
                weeklyHoursOverride: localWeekData.weeklyHoursOverride ?? null,
                totalComplementaryHours: localWeekData.totalComplementaryHours ?? null,
                generalComment: finalComment,
                isDifference: localWeekData.isDifference ?? false,
            };
    
            Object.keys(dataToSave).forEach(key => {
                const typedKey = key as keyof DailyEmployeeData;
                if ((dataToSave as any)[typedKey] === undefined) {
                    (dataToSave as any)[typedKey] = null;
                }
            });
            Object.keys(dataToSave.days).forEach(dayKey => {
                 Object.keys(dataToSave.days[dayKey]).forEach(fieldKey => {
                    const typedFieldKey = fieldKey as keyof DailyData;
                    if ((dataToSave.days[dayKey] as any)[typedFieldKey] === undefined) {
                        (dataToSave.days[dayKey] as any)[typedFieldKey] = null;
                    }
                 });
            });


            await setDoc(doc(db, 'weeklyRecords', weekId), { weekData: { [employee.id]: dataToSave } }, { merge: true });
            toast({ title: `Semana Confirmada para ${employee.name}` });

            // Check if all employees for this week are now confirmed
            const activeEmployeesForWeek = getActiveEmployeesForDate(weekDays[0]);
            const updatedWeekRecord = await getDoc(doc(db, 'weeklyRecords', weekId));
            const updatedWeekData = updatedWeekRecord.data()?.weekData;

            const allConfirmed = activeEmployeesForWeek.every(emp => 
                updatedWeekData?.[emp.id]?.confirmed
            );

            if (allConfirmed) {
                onWeekCompleted(weekId);
            }
    
        } catch (error) {
            console.error(error);
            toast({ title: 'Error al confirmar', description: error instanceof Error ? error.message : "Error desconocido.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleEnableCorrection = async () => {
        if (!localWeekData || !employee) return;
        setIsSaving(true);
        try {
            const docRef = doc(db, 'weeklyRecords', weekId);
            const docSnap = await getDoc(docRef);
            const existingData = docSnap.exists() ? docSnap.data() : { weekData: {} };

            const { previousBalances: _, ...rest } = localWeekData;
            
            const dataToSet = {
                ...existingData.weekData,
                [employee.id]: {
                    ...rest,
                    confirmed: false,
                },
            };

            await setDoc(docRef, { weekData: dataToSet }, { merge: true }); 
            
            // Force local state update to unlock UI
            setLocalWeekData(prev => prev ? { ...prev, confirmed: false } : null);

            toast({ title: `Semana Habilitada para Edición`, variant: "destructive" });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error al habilitar corrección', description: error instanceof Error ? error.message : "Error desconocido.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!localWeekData) {
        return <TableRow><TableCell colSpan={8} className="p-0"><Skeleton className="h-48 w-full rounded-none" /></TableCell></TableRow>;
    }
    
    const isConfirmed = !!localWeekData.confirmed;
    const activePeriod = getActivePeriod(employee.id, weekDays[0]);
    let contractType;
    if (activePeriod) {
        contractType = contractTypes.find(c => c.name === activePeriod.contractType);
    }
    const weeklyHours = localWeekData.weeklyHoursOverride ?? getEffectiveWeeklyHours(activePeriod, weekDays[0]);
    
    const auditEndDate = new Date('2025-09-08');
    const showDifferenceCheckbox = isBefore(weekDays[0], auditEndDate);

    return (
        <TableRow className="align-top">
            <TableCell className="font-medium sticky left-0 z-10 p-2 text-xs w-[170px] sm:w-[200px] min-w-[170px] sm:min-w-[200px] bg-card">
                <div className="flex flex-col gap-2 h-full">
                    <div className="flex justify-between items-baseline">
                        <p className="font-bold text-sm flex items-center gap-1.5">
                            {isConfirmed && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {employee.name}
                        </p>
                        <Badge variant="outline">{weekTurn ? `T.${weekTurn.replace('turn', '')}` : 'N/A'}</Badge>
                    </div>
                    <p className="text-muted-foreground">{contractType?.name ?? 'N/A'}</p>
                    
                    <div className="space-y-1 sm:space-y-2 mt-2">
                         <InputStepper label="Jornada Semanal" value={weeklyHours} onChange={(v) => handleWeekLevelDataChange('weeklyHoursOverride', v)} className="text-xs" disabled={isConfirmed} />
                         <InputStepper label="H. Complementarias" value={localWeekData.totalComplementaryHours ?? 0} onChange={(v) => handleWeekLevelDataChange('totalComplementaryHours', v)} disabled={isConfirmed} />
                         {showDifferenceCheckbox && (
                            <div className="flex items-center space-x-2 pt-1">
                                <Checkbox 
                                    id={`diff-${employee.id}-${weekId}`} 
                                    checked={localWeekData.isDifference}
                                    onCheckedChange={(checked) => handleWeekLevelDataChange('isDifference', !!checked)}
                                    disabled={isConfirmed || !localWeekData.hasPreregistration}
                                />
                                <label
                                    htmlFor={`diff-${employee.id}-${weekId}`}
                                    className={cn("text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", localWeekData.hasPreregistration && localWeekData.isDifference && "text-destructive")}
                                >
                                    Diferencia con Excel
                                </label>
                            </div>
                         )}
                         <Textarea
                            placeholder="Añadir comentario..."
                            className="h-8 text-xs mt-2 resize-none"
                            value={localWeekData.generalComment || ''}
                            onChange={(e) => handleWeekLevelDataChange('generalComment', e.target.value)}
                            disabled={isConfirmed}
                        />
                    </div>
                    
                    <div className="flex-grow"></div>

                    <BalancePreviewDisplay initialBalances={initialBalances} preview={preview} />
                    
                    {isConfirmed ? (
                         <Button onClick={handleEnableCorrection} size="sm" variant="outline" className="w-full mt-2" disabled={isSaving}>
                            {isSaving ? "Procesando..." : <><Undo2 className="mr-2 h-4 w-4" />Habilitar Corrección</>}
                        </Button>
                    ) : (
                        <Button onClick={handleConfirm} size="sm" variant="default" className="w-full mt-2" disabled={isSaving || !preview}>
                            {isSaving ? "Procesando..." : !preview ? "Calculando..." : <><CheckCircle className="mr-2 h-4 w-4" />Confirmar</>}
                        </Button>
                    )}
                </div>
            </TableCell>
            {weekDays.map(day => {
                const dayId = format(day, 'yyyy-MM-dd');
                const dayData = localWeekData.days?.[dayId];

                if (!dayData) return <TableCell key={day.toISOString()} className="p-1 min-w-[140px] sm:min-w-[150px]" />;
                
                const isHoliday = dayData.isHoliday;
                const holidayType = dayData.holidayType;
                const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                
                const dayOfWeek = getISODay(day);
                
                const showLeaveHours = isHoliday &&
                    dayOfWeek !== 7 &&
                    dayData.theoreticalHours === 0 &&
                    (contractType?.computesOffDayBag ?? false) &&
                    dayData.absence === 'ninguna';

                return (
                    <TableCell key={day.toISOString()} className={cn("p-1 align-top text-xs min-w-[140px] sm:min-w-[150px]", isHoliday && "bg-blue-100")}>
                        <div className="flex flex-col gap-1 h-full">
                            <div className='w-full space-y-1 flex-grow'>
                                <p className="text-muted-foreground text-xs h-4">
                                    <span className='sm:hidden'>Teo: </span>
                                    <span className='hidden sm:inline'>Teóricas: </span>
                                    {(dayData.theoreticalHours ?? 0).toFixed(2)}h
                                </p>
                                
                                <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                                     <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Trab:</span>
                                    <InputStepper
                                        label="H. Trabajadas"
                                        value={dayData.workedHours}
                                        onChange={(v) => handleDailyDataChange(day, 'workedHours', v)}
                                        inputClassName="text-xs"
                                        disabled={isConfirmed}
                                        className='sm:w-[105px]'
                                    />
                                </div>


                                {absenceType && !absenceType.computesFullDay && (
                                     <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                                         <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Aus:</span>
                                         <InputStepper
                                            label={absenceType.name}
                                            value={dayData.absenceHours}
                                            onChange={(v) => handleDailyDataChange(day, 'absenceHours', v)}
                                            disabled={isConfirmed}
                                            inputClassName="text-xs"
                                            className='sm:w-[105px]'
                                        />
                                     </div>
                                )}
                                
                                {absenceType && absenceType.computesFullDay && (
                                    <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                                         <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Aus:</span>
                                         <InputStepper
                                            label={absenceType.name}
                                            value={dayData.absenceHours}
                                            onChange={(v) => handleDailyDataChange(day, 'absenceHours', v)}
                                            disabled={isConfirmed}
                                            inputClassName="text-xs"
                                            className='sm:w-[105px]'
                                        />
                                    </div>
                                )}
                                
                                {showLeaveHours && (
                                     <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                                         <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Lib:</span>
                                        <InputStepper
                                            label="H. Libranza"
                                            value={dayData.leaveHours}
                                            onChange={(v) => handleDailyDataChange(day, 'leaveHours', v)}
                                            disabled={isConfirmed}
                                            inputClassName="text-xs"
                                            className='sm:w-[105px]'
                                        />
                                     </div>
                                )}
                            </div>

                            <div className="flex flex-row gap-1 h-auto sm:h-8 items-center mt-auto">
                                <AbsenceEditor dayData={dayData} absenceTypes={absenceTypes} onAbsenceChange={(f, v) => handleDailyDataChange(day, f, v)} disabled={isConfirmed} />
                                {isHoliday && holidayType && <HolidayEditor dayData={dayData} holidayType={holidayType} onHolidayChange={(f, v) => handleDailyDataChange(day, f, v)} disabled={isConfirmed} />}
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
