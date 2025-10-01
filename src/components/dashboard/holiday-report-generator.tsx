

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Gift, Loader2 } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HolidayReport, HolidayReportAssignment } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

export function HolidayReportGenerator() {
    const { holidays, holidayEmployees, holidayReports, loading, addHolidayReport, updateHolidayReport } = useDataProvider();
    const [selectedHolidays, setSelectedHolidays] = useState<Record<string, boolean>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeReport, setActiveReport] = useState<HolidayReport | null>(null);

    const openingHolidays = useMemo(() => {
        const currentYear = getYear(new Date());
        return holidays
            .filter(h => h.type === 'Apertura' && getYear(h.date as Date) === currentYear)
            .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
    }, [holidays]);

    const activeHolidayEmployees = useMemo(() => {
        if (!holidayEmployees) return [];
        return holidayEmployees.filter(e => e.active);
    }, [holidayEmployees]);

    useEffect(() => {
        if (holidayReports.length > 0) {
            const latestReport = [...holidayReports].sort((a, b) => (b.generationDate as Timestamp).toMillis() - (a.generationDate as Timestamp).toMillis())[0];
            setActiveReport(latestReport);
        }
    }, [holidayReports]);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        const holidayIdsToReport = Object.keys(selectedHolidays).filter(id => selectedHolidays[id]);
        if (holidayIdsToReport.length === 0) {
            alert('Selecciona al menos un festivo.');
            setIsGenerating(false);
            return;
        }

        const newReport: Omit<HolidayReport, 'id'> = {
            generationDate: Timestamp.now(),
            selectedHolidays: holidayIdsToReport,
            assignments: {},
        };
        holidayIdsToReport.forEach(holidayId => {
            const holiday = holidays.find(h => h.id === holidayId);
            if (holiday) {
                newReport.assignments[holiday.id] = {};
            }
        });

        try {
            const newReportId = await addHolidayReport(newReport);
            
            // This is optimistic, the listener will pick up the change
            setActiveReport({ ...newReport, id: newReportId }); 
            setSelectedHolidays({});
        } catch (error) {
            console.error("Error generating report: ", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAssignmentChange = async (holidayId: string, employeeId: string, value: HolidayReportAssignment) => {
        if (!activeReport) return;
    
        const updatedAssignments = { ...activeReport.assignments };
        if (!updatedAssignments[holidayId]) {
            updatedAssignments[holidayId] = {};
        }
        updatedAssignments[holidayId][employeeId] = value;
    
        try {
            await updateHolidayReport(activeReport.id, { assignments: updatedAssignments });
            // Optimistic update
            setActiveReport(prev => prev ? { ...prev, assignments: updatedAssignments } : null);
        } catch(error) {
            console.error("Error updating assignment: ", error);
        }
    };


    if (loading) {
        return <Card><CardHeader><CardTitle>Informe de Festivos</CardTitle></CardHeader><CardContent><Loader2/></CardContent></Card>
    }
    
    if (activeReport) {
        return (
            <Card className="min-w-[280px] sm:min-w-0 md:col-span-2 xl:col-span-3">
                 <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle>Informe de Festivos Activo</CardTitle>
                            <CardDescription>Generado el: {format((activeReport.generationDate as Timestamp).toDate(), 'PPP p', { locale: es })}</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => setActiveReport(null)}>Crear Nuevo Informe</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px] w-full pr-4">
                         <div className="space-y-6">
                            {activeReport.selectedHolidays.map(holidayId => {
                                const holiday = holidays.find(h => h.id === holidayId);
                                if (!holiday) return null;
                                return (
                                <div key={holidayId}>
                                    <h3 className="font-bold text-lg mb-2">{holiday.name} - {format(holiday.date as Date, 'PPP', {locale: es})}</h3>
                                    <div className="border rounded-md">
                                        {activeHolidayEmployees.map((emp, index) => (
                                            <div key={emp.id} className={`flex items-center justify-between p-3 ${index < activeHolidayEmployees.length -1 ? 'border-b' : ''}`}>
                                                <p className="font-medium text-sm">{emp.name}</p>
                                                <RadioGroup
                                                    defaultValue="ninguna"
                                                    value={activeReport.assignments[holidayId]?.[emp.id] || 'ninguna'}
                                                    onValueChange={(val) => handleAssignmentChange(holidayId, emp.id, val as HolidayReportAssignment)}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="doublePay" id={`double-${holidayId}-${emp.id}`} />
                                                        <Label htmlFor={`double-${holidayId}-${emp.id}`} className="text-sm">Pago Doble</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="dayOff" id={`dayoff-${holidayId}-${emp.id}`} />
                                                        <Label htmlFor={`dayoff-${holidayId}-${emp.id}`} className="text-sm">Día Libre</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                        ))}
                                    </div>
                                    <Separator className="my-6" />
                                </div>
                            )})}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="min-w-[280px] sm:min-w-0 md:col-span-2 xl:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nuevo Informe de Festivos</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecciona los festivos de apertura para generar el informe de compensación.</p>
                <ScrollArea className="h-48 w-full">
                    <div className="space-y-2 p-4 border rounded-md">
                        {openingHolidays.map(holiday => (
                            <div key={holiday.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={holiday.id}
                                    checked={selectedHolidays[holiday.id] || false}
                                    onCheckedChange={(checked) => setSelectedHolidays(prev => ({ ...prev, [holiday.id]: !!checked }))}
                                />
                                <Label htmlFor={holiday.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {holiday.name} - {format(holiday.date as Date, 'PPP', { locale: es })}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <Button onClick={handleGenerateReport} disabled={isGenerating || Object.values(selectedHolidays).every(v => !v)} className="w-full">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    {isGenerating ? 'Generando...' : 'Generar Informe'}
                </Button>
            </CardContent>
        </Card>
    );
}
