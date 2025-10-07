
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from './label';

interface InputStepperProps {
  id?: string;
  label?: string;
  value?: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export function InputStepper({
  id,
  label,
  value,
  onChange,
  step = 0.25,
  min = -Infinity,
  max = Infinity,
  disabled = false,
  className,
  inputClassName,
}: InputStepperProps) {
  const [inputValue, setInputValue] = React.useState(value === undefined ? '' : String(value));

  React.useEffect(() => {
    setInputValue(value === undefined ? '' : String(value));
  }, [value]);

  const roundToNearestQuarter = (num: number) => {
    return Math.round(num * 4) / 4;
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '' || rawValue === '-') {
        onChange(0);
        return;
    }
    const newValue = parseFloat(rawValue);
     if (!isNaN(newValue)) {
        const roundedValue = roundToNearestQuarter(newValue);
        onChange(Math.max(min, Math.min(max, roundedValue)));
    } else {
        setInputValue(value === undefined ? '' : String(value));
    }
  }

  const handleStep = (direction: 'increment' | 'decrement') => {
    const currentValue = typeof value === 'number' ? value : 0;
    let newValue = currentValue + (direction === 'increment' ? step : -step);
    newValue = roundToNearestQuarter(newValue);
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  return (
    <div className={cn('space-y-1 w-full', className)}>
      {label && <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>}
      <div className='relative flex items-center'>
        <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-0 h-full w-6 rounded-r-none"
            onClick={() => handleStep('decrement')}
            disabled={disabled || value === undefined || value <= min}
        >
            <Minus className="h-3 w-3" />
        </Button>
        <Input
            id={id}
            type="number"
            value={inputValue}
            onBlur={handleBlur}
            onChange={handleManualChange}
            disabled={disabled}
            step={step}
            placeholder="0.00"
            className={cn("h-8 sm:h-9 w-full pl-7 pr-7 text-right text-[11px] sm:text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", inputClassName)}
        />
        <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-0 h-full w-6 rounded-l-none"
            onClick={() => handleStep('increment')}
            disabled={disabled || value === undefined || value >= max}
        >
            <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

    