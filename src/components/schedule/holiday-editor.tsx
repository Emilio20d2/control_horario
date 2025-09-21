
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyData } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface HolidayEditorProps {
    dayData: DailyData;
    holidayType: string;
    onHolidayChange: (field: string, value: any) => void;
    disabled: boolean;
}

export const HolidayEditor: React.FC<HolidayEditorProps> = ({ dayData, holidayType, onHolidayChange, disabled }) => {
    const workedOnHoliday = (dayData.workedHours || 0) > 0;
    
    if (holidayType !== 'Apertura') {
        return null;
    }

    return (
       <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" disabled={disabled}>
                    <CalendarIcon className={cn("h-5 w-5", dayData.doublePay ? 'text-accent' : 'text-muted-foreground')} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-4 p-4">
                <div className="flex items-center space-x-2">
                    <Checkbox id="doublePay" checked={dayData.doublePay} onCheckedChange={(checked) => onHolidayChange('doublePay', !!checked)} disabled={!workedOnHoliday} />
                    <Label htmlFor="doublePay" className={cn("text-sm font-medium", !workedOnHoliday && "text-muted-foreground")}>
                        Marcar como Pago Doble
                    </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                   Si marcas esta opción, las horas trabajadas no se sumarán a la bolsa de festivos.
                </p>
            </PopoverContent>
        </Popover>
    );
};
