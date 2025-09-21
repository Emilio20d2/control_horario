

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyData, AbsenceType } from '@/lib/types';

interface AbsenceEditorProps {
    dayData: DailyData;
    absenceTypes: AbsenceType[];
    onAbsenceChange: (field: string, value: any) => void;
    disabled: boolean;
}

export const AbsenceEditor: React.FC<AbsenceEditorProps> = ({ dayData, absenceTypes, onAbsenceChange, disabled }) => {
    const sortedAbsenceTypes = [...absenceTypes].sort((a, b) => a.name.localeCompare(b.name));
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" disabled={disabled}>
                    <PlusCircle className={cn("h-5 w-5", dayData.absence !== 'ninguna' ? 'text-primary' : 'text-muted-foreground')} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Ausencia</label>
                    <Select value={dayData.absence} onValueChange={(v) => onAbsenceChange('absence', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ninguna">Sin ausencia</SelectItem>
                            {sortedAbsenceTypes.map(at => <SelectItem key={at.abbreviation} value={at.abbreviation}>{at.name} ({at.abbreviation})</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </PopoverContent>
        </Popover>
    );
};
