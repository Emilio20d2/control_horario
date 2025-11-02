
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, CalendarPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DayPicker, type DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format, isAfter, isValid, parseISO } from 'date-fns';
import { addScheduledAbsence } from '@/lib/services/employeeService';
import type { Employee, AbsenceType } from '@/lib/types';

export const AddAbsenceDialog = ({
    isOpen,
    onOpenChange,
    activeEmployees,
    absenceTypes,
    holidays,
    employees,
    refreshData
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeEmployees: Employee[];
    absenceTypes: AbsenceType[];
    holidays: any[];
    employees: Employee[],
    refreshData: () => void;
}) => {
    const { toast } = useToast();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedAbsenceTypeId, setSelectedAbsenceTypeId] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openingHolidays = useMemo(() => holidays.filter(h => h.type === 'Apertura').map(h => h.date as Date), [holidays]);
    const otherHolidays = useMemo(() => holidays.filter(h => h.type !== 'Apertura').map(h => h.date as Date), [holidays]);
    const dayPickerModifiers = { opening: openingHolidays, other: otherHolidays };
    const dayPickerModifiersStyles = { opening: { backgroundColor: '#a7f3d0' }, other: { backgroundColor: '#fecaca' } };

    const resetForm = () => {
        setSelectedEmployeeId('');
        setSelectedAbsenceTypeId('');
        setSelectedDateRange(undefined);
    };

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

    const handleAddAbsenceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEmployeeId || !selectedAbsenceTypeId || !selectedDateRange?.from || !selectedDateRange?.to) {
            toast({ title: 'Datos incompletos', description: 'Debes seleccionar empleado, tipo de ausencia y un rango de fechas.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const employee = employees.find(e => e.id === selectedEmployeeId);
            if (!employee) {
                 throw new Error('Empleado no encontrado.');
            }
            const activePeriod = employee.employmentPeriods.find(p => !p.endDate || isAfter(safeParseDate(p.endDate)!, new Date()));
            if (!activePeriod) {
                throw new Error('No se encontró un periodo de contrato activo para el empleado.');
            }

            await addScheduledAbsence(
                employee.id, 
                activePeriod.id, 
                {
                    absenceTypeId: selectedAbsenceTypeId,
                    startDate: format(selectedDateRange.from, 'yyyy-MM-dd'),
                    endDate: format(selectedDateRange.to, 'yyyy-MM-dd'),
                }, 
                employee,
                false
            );
            
            toast({ title: 'Ausencia Programada', description: `Se ha guardado la ausencia para ${employee.name}.` });
            resetForm();
            refreshData();
            onOpenChange(false);

        } catch (error) {
            console.error("Error programming absence:", error);
            toast({ title: 'Error', description: error instanceof Error ? error.message : "No se pudo guardar la ausencia.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Agendar Ausencia
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-fit">
                <DialogHeader>
                    <DialogTitle>Programar Nueva Ausencia</DialogTitle>
                    <DialogDescription>
                        Selecciona el empleado, tipo de ausencia y el rango de fechas.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddAbsenceSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="employee-select-dialog">Empleado</Label>
                            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                <SelectTrigger id="employee-select-dialog"><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                                <SelectContent>
                                    {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="absence-select-dialog">Tipo de Ausencia</Label>
                            <Select value={selectedAbsenceTypeId} onValueChange={setSelectedAbsenceTypeId}>
                                <SelectTrigger id="absence-select-dialog"><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                                <SelectContent>
                                    {absenceTypes.sort((a,b) => a.name.localeCompare(b.name)).map(at => <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Rango de Fechas de la Ausencia</Label>
                        <div className="rounded-md border flex justify-center">
                            <DayPicker
                                mode="range"
                                selected={selectedDateRange}
                                onSelect={setSelectedDateRange}
                                locale={es}
                                modifiers={dayPickerModifiers}
                                modifiersStyles={dayPickerModifiersStyles}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                            Guardar Ausencia
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
