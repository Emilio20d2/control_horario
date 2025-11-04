
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getYear, isAfter, parseISO, endOfWeek, eachDayOfInterval, format, isSameDay, getISODay, isBefore, getISOWeekYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DailyData, WeeklyRecord, Employee, CorrectionRequest } from '@/lib/types';
import { Loader2, MessageSquareWarning, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { setDocument } from '@/lib/services/firestoreService';
import { Timestamp, collection, addDoc, serverTimestamp, getDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ConfirmedWeek {
    weekId: string;
    weekData: WeeklyRecord['weekData'][string];
    initialBalances: { ordinary: number; holiday: number; leave: number; };
    impact: { ordinary: number; holiday: number; leave: number; };
}

const CorrectionRequestDialog = ({ open, onOpenChange, weekId, employee, onSubmitted }: { open: boolean, onOpenChange: (open: boolean) => void, weekId: string, employee: Employee, onSubmitted: () => void }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const sendMessage = async (text: string) => {
        if (!employee) return;
        const conversationId = employee.id;
        
        const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
        const userMessageData = {
            text: text,
            senderId: employee.id,
            timestamp: serverTimestamp()
        };

        const convDocRef = doc(db, 'conversations', conversationId);
        const convDoc = await getDoc(convDocRef);

        if (!convDoc.exists()) {
            await setDoc(convDocRef, {
                employeeId: employee.id,
                employeeName: employee.name,
                lastMessageText: text,
                lastMessageTimestamp: serverTimestamp(),
                unreadByAdmin: true,
                unreadByEmployee: false,
            });
        } else {
             await updateDoc(convDocRef, {
                lastMessageText: text,
                lastMessageTimestamp: serverTimestamp(),
                unreadByAdmin: true,
                unreadByEmployee: false,
            });
        }

        await addDoc(messagesColRef, userMessageData);
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            toast({ title: "Motivo requerido", description: "Por favor, explica el motivo de la corrección.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const requestId = `${weekId}_${employee.id}`;
            const requestData: Omit<CorrectionRequest, 'id'> = {
                weekId,
                employeeId: employee.id,
                employeeName: employee.name,
                reason: reason.trim(),
                status: 'pending',
                requestedAt: Timestamp.now(),
            };
            await setDocument('correctionRequests', requestId, requestData);

            const weekStartDateFormatted = format(parseISO(weekId), 'dd/MM/yyyy', { locale: es });
            const messageText = `SOLICITUD DE CORRECCIÓN\n\nSemana: ${weekStartDateFormatted}\nMotivo: ${reason.trim()}`;
            await sendMessage(messageText);

            toast({ title: "Solicitud enviada", description: "Tu solicitud de corrección ha sido enviada al administrador." });
            onSubmitted();
            onOpenChange(false);
            setReason('');
        } catch (error) {
            console.error("Error submitting correction request:", error);
            toast({ title: "Error", description: "No se pudo enviar la solicitud. Inténtalo de nuevo.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Solicitar Corrección</DialogTitle>
                    <DialogDescription>
                        Semana del {format(parseISO(weekId), 'dd/MM/yyyy', { locale: es })}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>¡Atención!</AlertTitle>
                        <AlertDescription>
                            Antes de enviar una corrección, asegúrate de haber contrastado tus presencias con los datos registrados en INET.
                        </AlertDescription>
                    </Alert>
                    <Textarea
                        placeholder="Explica el motivo por el que crees que hay un error. Ej: Faltan horas en el día martes, trabajé de 8 a 14 y solo figuran 4 horas."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Enviar Solicitud
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};


const ConfirmedWeekCard: React.FC<{ employee: Employee } & ConfirmedWeek> = ({ employee, weekId, weekData, initialBalances, impact }) => {
    const { 
        absenceTypes,
        holidays,
        getEffectiveWeeklyHours,
        refreshData,
    } = useDataProvider();
    const [dialogOpen, setDialogOpen] = useState(false);

    const weekStartDate = parseISO(weekId);
    const weekDays = eachDayOfInterval({ start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 }) });

    const activePeriod = employee ? employee.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), weekStartDate)) : null;
    const effectiveWeeklyHours = employee && activePeriod ? (weekData.weeklyHoursOverride ?? getEffectiveWeeklyHours(activePeriod, weekStartDate)) : 40;

    let totalWeeklyComputableHours = 0;
    for (const dayKey of Object.keys(weekData.days || {}).sort()) {
        const dayDate = parseISO(dayKey);
        const dayData = weekData.days[dayKey];
        const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
        
        if (getISODay(dayDate) !== 7) {
            totalWeeklyComputableHours += dayData.workedHours;
            if (absenceType && absenceType.computesToWeeklyHours) {
                totalWeeklyComputableHours += dayData.absenceHours;
            }
        }
    }
    totalWeeklyComputableHours -= (weekData.totalComplementaryHours || 0);

    const weekLabel = `Computadas: ${totalWeeklyComputableHours.toFixed(2)}h / Teóricas: ${effectiveWeeklyHours.toFixed(2)}h`;

    const renderBalanceRow = (label: string, initialVal: number, impactVal: number) => {
        const finalVal = initialVal + impactVal;
        return (
            <div className="grid grid-cols-4 gap-2 text-xs">
                <span className="font-semibold col-span-1">{label}</span>
                <span className="text-right font-mono col-span-1">{initialVal.toFixed(2)}h</span>
                <span className={cn("text-right font-mono font-bold col-span-1", impactVal > 0 ? "text-blue-600" : impactVal < 0 ? "text-red-600" : "")}>
                    {(impactVal >= 0 ? '+' : '') + impactVal.toFixed(2)}h
                </span>
                <span className="text-right font-mono font-bold col-span-1">{finalVal.toFixed(2)}h</span>
            </div>
        );
    };

    return (
        <>
            <CorrectionRequestDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen}
                weekId={weekId}
                employee={employee}
                onSubmitted={refreshData}
            />
            <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                         <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-1">
                            <span className="text-base font-bold">
                                {format(weekStartDate, 'dd/MM/yyyy', { locale: es })} - {format(endOfWeek(weekStartDate, {weekStartsOn:1}), 'dd/MM/yyyy', {locale:es})}
                            </span>
                            <span className="text-sm font-mono font-medium text-muted-foreground">{weekLabel}</span>
                        </CardTitle>
                        <Button variant="secondary" size="sm" onClick={() => setDialogOpen(true)}>
                            <MessageSquareWarning className="mr-2 h-4 w-4"/>
                            Solicitar Corrección
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col md:grid md:grid-cols-3 gap-4 px-2 sm:px-4 md:px-6 pt-0">
                    <div className="md:col-span-2 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px] p-1 text-xs">Día</TableHead>
                                    <TableHead className="w-[70px] p-1 text-xs">Fecha</TableHead>
                                    <TableHead className="text-right p-1 text-xs">Trab.</TableHead>
                                    <TableHead className="p-1 text-xs">Aus.</TableHead>
                                    <TableHead className="text-right p-1 text-xs">H. Aus.</TableHead>
                                    <TableHead className="text-right p-1 text-xs">H. Lib.</TableHead>
                                    <TableHead className="text-center p-1 text-xs">P. Doble</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {weekDays.map(day => {
                                    const dayKey = format(day, 'yyyy-MM-dd');
                                    const dayData = weekData.days[dayKey];
                                    if (!dayData) return null;

                                    const absenceName = dayData.absence === 'ninguna' ? '' : (absenceTypes.find(at => at.abbreviation === dayData.absence)?.abbreviation || dayData.absence);
                                    const holiday = holidays.find(h => isSameDay(h.date, day));

                                    return (
                                        <TableRow 
                                            key={dayKey}
                                            className={cn(
                                                holiday?.type === 'Apertura' && 'bg-green-100',
                                                holiday && holiday.type !== 'Apertura' && 'bg-blue-100',
                                                !holiday && dayData.absence !== 'ninguna' && 'bg-destructive/10'
                                            )}
                                        >
                                            <TableCell className="font-semibold p-1 text-xs">{format(day, 'E', { locale: es })}</TableCell>
                                            <TableCell className="p-1 text-xs">{format(day, 'dd/MM/yy', { locale: es })}</TableCell>
                                            <TableCell className="text-right p-1 text-xs font-mono">{dayData.workedHours > 0 ? dayData.workedHours.toFixed(2) : ''}</TableCell>
                                            <TableCell className="p-1 text-xs">{absenceName}</TableCell>
                                            <TableCell className="text-right p-1 text-xs font-mono">{dayData.absenceHours > 0 ? dayData.absenceHours.toFixed(2) : ''}</TableCell>
                                            <TableCell className="text-right p-1 text-xs font-mono">{dayData.leaveHours > 0 ? dayData.leaveHours.toFixed(2) : ''}</TableCell>
                                            <TableCell className="text-center p-1 text-xs">{dayData.doublePay ? 'Sí' : ''}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="space-y-2 border rounded-md p-3 bg-muted/20 mx-4 sm:mx-0 md:mx-4">
                        <div className="grid grid-cols-4 gap-2 text-xs font-bold text-muted-foreground">
                            <span className="col-span-1">Bolsa</span>
                            <span className="text-right col-span-1">Inicial</span>
                            <span className="text-right col-span-1">Impacto</span>
                            <span className="text-right col-span-1">Final</span>
                        </div>
                        {renderBalanceRow("Ordinaria", initialBalances.ordinary, impact.ordinary)}
                        {renderBalanceRow("Festivos", initialBalances.holiday, impact.holiday)}
                        {renderBalanceRow("Libranza", initialBalances.leave, impact.leave)}
                        
                        {(weekData.totalComplementaryHours ?? 0) > 0 && (
                            <div className="pt-2 text-xs grid grid-cols-4 gap-2">
                                <span className="font-semibold col-span-3">H. Complem.:</span>
                                <span className="text-right font-mono font-bold col-span-1">{weekData.totalComplementaryHours?.toFixed(2)}h</span>
                            </div>
                        )}
                        {weekData.generalComment && (
                            <div className="pt-2">
                                <p className="text-xs font-semibold">Comentarios:</p>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{weekData.generalComment}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );
};

export default function MySchedulePage() {
    const { employeeRecord: employee, loading, weeklyRecords, getEmployeeBalancesForWeek, calculateBalancePreview, getWeekId } = useDataProvider();
    const [processedWeeks, setProcessedWeeks] = useState<ConfirmedWeek[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isProcessing, setIsProcessing] = useState(true);

    const availableYears = useMemo(() => {
        if (!weeklyRecords) return [new Date().getFullYear()];
        const years = new Set(Object.keys(weeklyRecords).map(id => getISOWeekYear(parseISO(id))));
        const currentYear = new Date().getFullYear();
        if (!years.has(currentYear)) years.add(currentYear);
        years.add(currentYear + 1);
        return Array.from(years).filter(y => y >= 2025).sort((a, b) => b - a);
    }, [weeklyRecords]);
    
    useEffect(() => {
        if (loading) {
            setIsProcessing(true);
            return;
        }
        if (!employee) {
            setIsProcessing(false);
            return;
        }

        const processWeeks = async () => {
            setIsProcessing(true);
            const confirmedWeeks: ConfirmedWeek[] = [];
            const sortedWeekIds = Object.keys(weeklyRecords)
                .filter(weekId => {
                    const weekDate = parseISO(weekId);
                    const isoYear = getISOWeekYear(weekDate);
                    // Special case for 2025: include the week of 2024-12-30
                    if (selectedYear === 2025) {
                        return isoYear === 2025;
                    }
                    return isoYear === selectedYear;
                })
                .sort();

            for (const weekId of sortedWeekIds) {
                const weekData = weeklyRecords[weekId]?.weekData?.[employee.id];
                
                if (weekData?.confirmed) {
                    const initialBalances = getEmployeeBalancesForWeek(employee.id, weekId);
                    const impact = await calculateBalancePreview(employee.id, weekData.days, initialBalances, weekData.weeklyHoursOverride, weekData.totalComplementaryHours);
                    if (impact) {
                        confirmedWeeks.push({
                            weekId,
                            weekData,
                            initialBalances,
                            impact,
                        });
                    }
                }
            }
            setProcessedWeeks(confirmedWeeks);
            setIsProcessing(false);
        };
        
        processWeeks();

    }, [loading, employee, weeklyRecords, selectedYear, getEmployeeBalancesForWeek, calculateBalancePreview]);
    

    if (loading) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                 <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }
    
    if (!employee) {
        return (
             <div className="flex flex-col gap-6 p-4 md:p-6">
                <h1 className="text-2xl font-bold tracking-tight font-headline">Mis Presencias Confirmadas</h1>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>No se ha podido encontrar tu ficha de empleado. Por favor, contacta con un administrador.</p>
                    </CardContent>
                 </Card>
            </div>
        )
    }
    
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight font-headline">Mis Presencias Confirmadas</h1>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Seleccionar año..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(y => (
                           <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-4">
                {isProcessing ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : processedWeeks.length > 0 ? (
                    processedWeeks.map((week) => (
                        <ConfirmedWeekCard key={week.weekId} employee={employee} {...week} />
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No tienes semanas confirmadas para el año {selectedYear}.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
    

    