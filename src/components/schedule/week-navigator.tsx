
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { subWeeks, addWeeks, format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeekNavigatorProps {
    currentDate: Date;
    onWeekChange: (date: Date) => void;
    onDateSelect: (date: Date) => void;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({ currentDate, onWeekChange, onDateSelect }) => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
 
    const formatRange = (start: Date, end: Date): string => {
        const startDay = format(start, 'd');
        const startMonth = format(start, 'MMMM', { locale: es });
        const endDay = format(end, 'd');
        const endMonth = format(end, 'MMMM', { locale: es });
        const year = format(end, 'yyyy');
        if (startMonth === endMonth) return `${startDay} - ${endDay} de ${startMonth}, ${year}`;
        return `${startDay} de ${startMonth} - ${endDay} de ${endMonth}, ${year}`;
    }
 
    return (
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => onWeekChange(subWeeks(currentDate, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="text-lg font-semibold text-center w-80">{formatRange(start, end)}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={currentDate} onSelect={(date) => onDateSelect(date || new Date())} initialFocus locale={es} />
            </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" onClick={() => onWeekChange(addWeeks(currentDate, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
};
