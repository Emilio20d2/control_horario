

'use client';

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WeeklyScheduleData, DaySchedule } from "@/lib/types";
import { InputStepper } from "../ui/input-stepper";

const weekDays = [
    { id: 'mon', label: 'Lunes' },
    { id: 'tue', label: 'Martes' },
    { id: 'wed', label: 'Miércoles' },
    { id: 'thu', label: 'Jueves' },
    { id: 'fri', label: 'Viernes' },
    { id: 'sat', label: 'Sábado' },
    { id: 'sun', label: 'Domingo' },
];

const shiftTurnos = [
    { id: 'turn1', label: 'Turno 1' },
    { id: 'turn2', label: 'Turno 2' },
    { id: 'turn3', label: 'Turno 3' },
    { id: 'turn4', label: 'Turno 4' },
];


interface WeeklyScheduleEditorProps {
    value?: WeeklyScheduleData;
    onChange: (value: WeeklyScheduleData) => void;
}

export function WeeklyScheduleEditor({ value, onChange }: WeeklyScheduleEditorProps) {

    const handleDayChange = (turnId: keyof WeeklyScheduleData['shifts'], dayId: string, newHours: number) => {
        if (!value) return;

        const newShifts = { ...value.shifts };
        const currentDay = newShifts[turnId]?.[dayId] || { hours: 0, isWorkDay: false };
        
        newShifts[turnId] = {
            ...newShifts[turnId],
            [dayId]: { 
                ...currentDay,
                hours: newHours,
                isWorkDay: newHours > 0
            }
        };
        onChange({ ...value, shifts: newShifts });
    };

    const calculateTotalTurnHours = (turn: Record<string, DaySchedule>) => {
        if (!turn) return 0;
        return Object.values(turn).reduce((acc, day) => acc + (day.isWorkDay ? day.hours : 0), 0);
    }
    
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Turno</TableHead>
                    {weekDays.map(day => <TableHead key={day.id}>{day.label}</TableHead>)}
                    <TableHead className="text-right">Total Turno</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {shiftTurnos.map(turn => {
                    const turnData = value?.shifts?.[turn.id as keyof typeof value.shifts];
                    const totalTurnHours = calculateTotalTurnHours(turnData);

                    return (
                        <TableRow key={turn.id}>
                            <TableCell className="font-medium">{turn.label}</TableCell>
                            {weekDays.map(day => {
                                const dayData = turnData?.[day.id] || { isWorkDay: false, hours: 0 };
                                return (
                                <TableCell key={day.id} className="p-2 min-w-[120px]">
                                    <InputStepper
                                        value={dayData.hours}
                                        onChange={(v) => handleDayChange(turn.id as keyof typeof value.shifts, day.id, v)}
                                    />
                                </TableCell>
                            )})}
                            <TableCell className="text-right font-bold text-lg align-middle">
                                {totalTurnHours.toFixed(2)}h
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
      </div>
    );
}
