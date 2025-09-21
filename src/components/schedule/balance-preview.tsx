
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface BalancePreviewDisplayProps {
    initialBalances: { ordinary: number; holiday: number; leave: number; } | null;
    preview: {
        ordinary: number;
        holiday: number;
        leave: number;
        resultingOrdinary: number;
        resultingHoliday: number;
        resultingLeave: number;
    } | null;
}

export const BalancePreviewDisplay: React.FC<BalancePreviewDisplayProps> = ({ initialBalances, preview }) => {
    
    const renderBalanceRow = (label: string, impact: number | undefined, resulting: number | undefined) => {
        const impactValue = impact ?? 0;
        return (
            <React.Fragment>
                <span className="font-medium text-left text-xs">{label}</span>
                <Badge variant={impactValue === 0 ? 'secondary' : impactValue > 0 ? 'default' : 'destructive'} className="w-14 justify-center font-mono text-xs">
                    {impact !== undefined ? `${impactValue >= 0 ? '+' : ''}${impactValue.toFixed(2)}` : '...'}
                </Badge>
                <span className='font-bold text-right font-mono text-xs'>{resulting !== undefined ? resulting.toFixed(2) : '...'}h</span>
            </React.Fragment>
        );
    };
    
    if (!preview || !initialBalances) {
        return null;
    }

    return (
        <div className="space-y-1 p-2 border rounded-md mt-2 bg-muted/20">
            <div className="grid grid-cols-3 gap-x-2 items-center font-semibold text-muted-foreground text-right text-xs">
                <span className="text-left">Bolsa</span>
                <span className='text-center'>Impacto</span>
                <span className='text-right'>Final</span>
            </div>
             <div className="grid grid-cols-3 gap-x-2 items-center text-right">
                {renderBalanceRow("Ordinaria", preview?.ordinary, preview?.resultingOrdinary)}
                {renderBalanceRow("Festivo", preview?.holiday, preview?.resultingHoliday)}
                {renderBalanceRow("Libranza", preview?.leave, preview?.resultingLeave)}
            </div>
        </div>
    );
};
