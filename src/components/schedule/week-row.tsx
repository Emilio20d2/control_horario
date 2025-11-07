
'use client';

import React, { useCallback, useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, getISODay, parseISO, isBefore, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { InputStepper } from '@/components/ui/input-stepper';
import { useDataProvider } from '@/hooks/use-data-provider';
import type { DailyEmployeeData, Employee, DailyData } from '@/lib/types';
import { CheckCircle, Undo2, Save, Loader2, CalendarClock, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox"
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';


import { AbsenceEditor } from './absence-editor';
import { HolidayEditor } from './holiday-editor';
import { BalancePreviewDisplay } from './balance-preview';
import { DayPicker } from 'react-day-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScheduledAbsenceManager } from '../employees/scheduled-absence-manager';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '../ui/popover';
import { endIndefiniteAbsence } from '@/lib/services/employeeService';

interface WeekRowProps {
    employee: Employee;
    weekId: string;
    weekDays: Date[];
    weekData: DailyEmployeeData;
    balancePreview: any | null;
    initialBalances: { ordinary: number, holiday: number, leave: number, total: number } | null;
    isSaving: boolean;
    onDataChange: (employeeId: string, weekId: string, dayOrWeekKey: string, field: string, value: any) => void;
    onConfirm: (employeeId: string, weekId: string) => void;
}

export const WeekRow: React.FC<WeekRowProps> = ({ 
    employee, 
    weekId, 
    weekDays, 
    weekData: initialWeekData, 
    balancePreview,
    initialBalances,
    isSaving,
    onDataChange,
    onConfirm 
}) => {
    const { 
        holidays, 
        absenceTypes, 
        contractTypes, 
        getTheoreticalHoursAndTurn,
        getEffectiveWeeklyHours,
        getActivePeriod,
        refreshData,
    } = useDataProvider();

    const [absenceManagerOpen, setAbsenceManagerOpen] = useState(false);
    
    const { turnId: weekTurn } = getTheoreticalHoursAndTurn(employee.id, weekDays[0]);

    const handleDailyDataChange = useCallback((dayKey: string, field: string, value: any) => {
        onDataChange(employee.id, weekId, dayKey, field, value);
    }, [employee.id, weekId, onDataChange]);

    const handleWeekLevelChange = useCallback((field: string, value: any) => {
        onDataChange(employee.id, weekId, 'week', field, value);
    }, [employee.id, weekId, onDataChange]);
    
    const handleEnableCorrection = useCallback(() => {
        onDataChange(employee.id, weekId, 'week', 'confirmed', false);
    }, [onDataChange, employee.id, weekId]);
    
    const activePeriod = getActivePeriod(employee.id, weekDays[0]);
    let contractType;
    if (activePeriod) {
        contractType = contractTypes.find(c => c.name === activePeriod.contractType);
    }
    const weeklyHours = initialWeekData.weeklyHoursOverride ?? getEffectiveWeeklyHours(activePeriod, weekDays[0]);
    
    const auditEndDate = new Date('2025-09-08');
    const showDifferenceCheckbox = isBefore(weekDays[0], auditEndDate);

    return (
        <>
            <Dialog open={absenceManagerOpen} onOpenChange={setAbsenceManagerOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Gestionar Ausencias Programadas de {employee.name}</DialogTitle>
                    </DialogHeader>
                    {activePeriod && <ScheduledAbsenceManager employee={employee} period={activePeriod} />}
                </DialogContent>
            </Dialog>
            <TableRow className="align-top">
                <TableCell className="font-medium sticky left-0 z-10 p-2 text-xs w-[150px] sm:w-[200px] min-w-[150px] sm:min-w-[200px] bg-gradient-to-r from-green-100/50 to-transparent">
                    <div className="flex flex-col gap-2 h-full">
                        <div className="flex justify-between items-baseline">
                            <p className="font-bold text-sm flex items-center gap-1.5">
                                {employee.name}
                            </p>
                            <Badge variant="outline">{weekTurn ? `T.${weekTurn.replace('turn', '')}` : 'N/A'}</Badge>
                        </div>
                        <p className="text-muted-foreground">{contractType?.name ?? 'N/A'}</p>
                        
                        {!initialWeekData.confirmed ? (
                            <>
                                <div className="space-y-2 mt-2">
                                    <InputStepper label="Jornada Semanal" value={initialWeekData.weeklyHoursOverride ?? weeklyHours} onChange={(v) => handleWeekLevelChange('weeklyHoursOverride', v)} className="text-xs" disabled={initialWeekData.confirmed} />
                                    <InputStepper label="H. Complementarias" value={initialWeekData.totalComplementaryHours ?? undefined} onChange={(v) => handleWeekLevelChange('totalComplementaryHours', v)} disabled={initialWeekData.confirmed} />
                                    {showDifferenceCheckbox && (
                                        <div className="flex items-center space-x-2 pt-1">
                                            <Checkbox 
                                                id={`diff-${employee.id}-${weekId}`} 
                                                checked={initialWeekData.isDifference}
                                                onCheckedChange={(checked) => handleWeekLevelChange('isDifference', !!checked)}
                                                disabled={initialWeekData.confirmed || !initialWeekData.hasPreregistration}
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
                                        onChange={(e) => handleWeekLevelChange('generalComment', e.target.value)}
                                        disabled={initialWeekData.confirmed}
                                    />
                                </div>
                                
                                <div className="flex-grow"></div>

                                <BalancePreviewDisplay initialBalances={initialBalances} preview={balancePreview} />
                                
                                <div className="mt-2 space-y-2">
                                     <div className="grid grid-cols-1 gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setAbsenceManagerOpen(true)}>Ausencias</Button>
                                    </div>
                                    <Button onClick={() => onConfirm(employee.id, weekId)} size="sm" className="w-full" disabled={isSaving || !balancePreview}>
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                        Confirmar
                                    </Button>
                                </div>
                            </>
                        ) : (
                             <div className="mt-2 space-y-2">
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
                            </div>
                        )}
                    </div>
                </TableCell>
                {weekDays.map(day => {
                    const dayId = format(day, 'yyyy-MM-dd');
                    const dayData = initialWeekData.days?.[dayId];

                    if (!dayData) return <TableCell key={day.toISOString()} className="p-1 min-w-[120px]" />;
                    
                    const isHoliday = dayData.isHoliday;
                    const holidayType = dayData.holidayType;
                    const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                    
                    const dayOfWeek = getISODay(day);
                    
                    const showLeaveHours = isHoliday &&
                        dayOfWeek !== 7 &&
                        dayData.theoreticalHours === 0 &&
                        (contractType?.computesOffDayBag ?? false) &&
                        dayData.absence === 'ninguna';
                    
                    let cellStyle: React.CSSProperties = { background: 'transparent' };
                    if(initialWeekData.confirmed) {
                         cellStyle.background = 'rgba(240, 240, 240, 0.5)';
                    }
                    if (isHoliday) {
                        cellStyle.background = holidayType === 'Apertura' ? 'linear-gradient(to right, #e8f5e9, transparent)' : 'linear-gradient(to right, #e3f2fd, transparent)';
                    } else if (absenceType?.color) {
                        cellStyle.background = `linear-gradient(to right, ${absenceType.color}40, transparent)`;
                    }

                    return (
                        <TableCell key={day.toISOString()} className="p-1 align-top text-xs min-w-[120px]" style={cellStyle}>
                            <div className="flex flex-col items-center justify-start gap-2 h-full py-2">
                                <div className='w-full space-y-1 flex-grow'>
                                    <div className="text-muted-foreground text-xs h-4 text-center font-semibold">
                                        Teóricas: {(dayData.theoreticalHours ?? 0).toFixed(2)}h
                                    </div>
                                    <InputStepper
                                        value={dayData.workedHours}
                                        onChange={(v) => handleDailyDataChange(dayId, 'workedHours', v)}
                                        disabled={initialWeekData.confirmed}
                                    />
                                    {absenceType && (absenceType.isAbsenceSplittable || absenceType.computesFullDay) && (
                                        <InputStepper
                                            label={absenceType.name}
                                            value={dayData.absenceHours}
                                            onChange={(v) => handleDailyDataChange(dayId, 'absenceHours', v)}
                                            disabled={initialWeekData.confirmed}
                                        />
                                    )}
                                    {showLeaveHours && (
                                        <InputStepper
                                            label="H. Libranza"
                                            value={dayData.leaveHours}
                                            onChange={(v) => handleDailyDataChange(dayId, 'leaveHours', v)}
                                            disabled={initialWeekData.confirmed}
                                        />
                                    )}
                                </div>

                                <div className="flex flex-row gap-1 h-auto sm:h-8 items-center mt-auto">
                                    <AbsenceEditor dayData={dayData} absenceTypes={absenceTypes} onAbsenceChange={(f, v) => handleDailyDataChange(dayId, f, v)} disabled={initialWeekData.confirmed} />
                                    {isHoliday && holidayType && <HolidayEditor dayData={dayData} holidayType={holidayType} onHolidayChange={(f, v) => handleDailyDataChange(dayId, f, v)} disabled={initialWeekData.confirmed} />}
                                </div>
                                
                                <div className="h-4 mt-1 sm:mt-2">
                                    {isHoliday && holidayType && <p className="font-semibold text-primary text-xs text-center w-full truncate" title={holidayType}>{holidays.find(h=>isSameDay(h.date,day))?.name}</p>}
                                </div>
                            </div>
                        </TableCell>
                    );
                })}
            </TableRow>
        </>
    );
};
