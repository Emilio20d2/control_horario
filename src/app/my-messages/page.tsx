

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, Loader2, PlaneTakeoff, Info, CalendarClock, Hourglass, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDataProvider } from '@/hooks/use-data-provider';
import { collection, query, orderBy, addDoc, serverTimestamp, setDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import type { Message, VacationCampaign, AbsenceType, Holiday } from '@/lib/types';
import { format, isWithinInterval, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { addScheduledAbsence } from '@/lib/services/employeeService';
import { DateRange, DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function MyMessagesPage() {
    const { employeeRecord, loading, conversations, vacationCampaigns, absenceTypes, getTheoreticalHoursAndTurn, holidays } = useDataProvider();
    const [newMessage, setNewMessage] = useState('');
    const conversationId = employeeRecord?.id;
    const viewportRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toast } = useToast();

    // State for vacation request dialog
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<VacationCampaign | null>(null);
    const [requestDateRange, setRequestDateRange] = useState<DateRange | undefined>(undefined);
    const [requestAbsenceTypeId, setRequestAbsenceTypeId] = useState<string>('');
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    
    // State for other requests
    const [isOtherRequestDialogOpen, setIsOtherRequestDialogOpen] = useState(false);
    const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
    const [otherRequestStep, setOtherRequestStep] = useState(1);
    const [communicatedTo, setCommunicatedTo] = useState('');
    const [otherRequestAbsenceTypeId, setOtherRequestAbsenceTypeId] = useState('');
    const [otherRequestMultipleDates, setOtherRequestMultipleDates] = useState<Date[]>([]);
    const [otherRequestNotes, setOtherRequestNotes] = useState('');
    const [medicalAppointmentTime, setMedicalAppointmentTime] = useState('');
    const [isSubmittingOtherRequest, setIsSubmittingOtherRequest] = useState(false);
    const [seniorHoursTotal, setSeniorHoursTotal] = useState(0);

    const safeParseDate = (date: any): Date | null => {
        if (!date) return null;
        if (date instanceof Date) return date;
        if (date instanceof Timestamp) return date.toDate();
        if (typeof date === 'string') {
            const parsed = parseISO(date);
            return isValid(parsed) ? parsed : null;
        }
        return null;
    };
    
    const openingHolidays = useMemo(() => holidays.filter(h => h.type === 'Apertura').map(h => h.date as Date), [holidays]);
    const otherHolidays = useMemo(() => holidays.filter(h => h.type !== 'Apertura').map(h => h.date as Date), [holidays]);
    
    const dayPickerModifiers = {
        opening: openingHolidays,
        other: otherHolidays,
        selected: otherRequestMultipleDates,
    };
    const dayPickerModifiersStyles = { 
        opening: { backgroundColor: '#a7f3d0' }, 
        other: { backgroundColor: '#fecaca' },
        selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
    };

    const conversation = useMemo(() => {
        if (!conversationId) return null;
        return conversations.find(c => c.id === conversationId);
    }, [conversations, conversationId]);

    const activeCampaign = useMemo(() => {
        const now = new Date();
        return vacationCampaigns.find(c => {
            const startDate = c.submissionStartDate instanceof Timestamp ? c.submissionStartDate.toDate() : c.submissionStartDate;
            const endDate = c.submissionEndDate instanceof Timestamp ? c.submissionEndDate.toDate() : c.submissionEndDate;
            return c.isActive && isWithinInterval(now, { start: startDate, end: endDate });
        });
    }, [vacationCampaigns]);

    const otherRequestAbsenceTypes = useMemo(() => {
        const allowedAbbreviations = new Set([
            'AP',
            'B/C',
            'DH',
            'DF',
            'DL',
            'HS',
            'RJS',
            'HM',
            'LF'
        ]);
        return absenceTypes.filter(at => allowedAbbreviations.has(at.abbreviation));
    }, [absenceTypes]);

    const [messagesSnapshot, messagesLoading] = useCollectionData(
        conversationId ? query(collection(db, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'asc')) : null
    );
    
    // Effect to calculate senior hours total
    useEffect(() => {
        const selectedAbsenceName = absenceTypes.find(at => at.id === otherRequestAbsenceTypeId)?.name;
        if (selectedAbsenceName === 'Reducción Jornada Senior' && employeeRecord && otherRequestMultipleDates.length > 0) {
            let total = 0;
            otherRequestMultipleDates.forEach(date => {
                const { weekDaysWithTheoreticalHours } = getTheoreticalHoursAndTurn(employeeRecord.id, date);
                const dayData = weekDaysWithTheoreticalHours.find(d => d.dateKey === format(date, 'yyyy-MM-dd'));
                if (dayData) {
                    total += dayData.theoreticalHours;
                }
            });
            setSeniorHoursTotal(total);
        } else {
            setSeniorHoursTotal(0);
        }
    }, [otherRequestMultipleDates, otherRequestAbsenceTypeId, employeeRecord, getTheoreticalHoursAndTurn, absenceTypes]);

     // Effect to mark conversation as read
    useEffect(() => {
        if (conversationId && conversation?.unreadByEmployee) {
            const convRef = doc(db, 'conversations', conversationId);
            updateDoc(convRef, { unreadByEmployee: false });
        }
    }, [conversationId, conversation]);

    const formattedMessages = useMemo(() => {
        if (!messagesSnapshot) return [];
        return messagesSnapshot.map(doc => {
            const data = doc;
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() // Convert Firestore Timestamp to Date
            } as Message;
        });
    }, [messagesSnapshot]);

    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
    }, [formattedMessages, messagesLoading]);

     useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`; // Set new height, max 128px (8rem)
        }
    }, [newMessage]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !conversationId || !employeeRecord) return;
        
        const messageText = newMessage;
        setNewMessage('');

        await sendMessage(messageText);
    };

    const sendMessage = async (text: string) => {
        if (!conversationId || !employeeRecord) return;
        
        const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
        const userMessageData = {
            text: text,
            senderId: employeeRecord.id,
            timestamp: serverTimestamp()
        };

        const convDocRef = doc(db, 'conversations', conversationId);
        const convDoc = await getDoc(convDocRef);

        if (!convDoc.exists()) {
            await setDoc(convDocRef, {
                employeeId: employeeRecord.id,
                employeeName: employeeRecord.name,
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
    
    const handleOpenRequestDialog = (campaign: VacationCampaign) => {
        setSelectedCampaign(campaign);
        const defaultAbsenceType = absenceTypes.find(at => at.name === 'Vacaciones');
        setRequestAbsenceTypeId(defaultAbsenceType?.id || '');
        setRequestDateRange(undefined);
        setIsRequestDialogOpen(true);
    };

    const handleOpenOtherRequestDialog = () => {
        setOtherRequestStep(1);
        setCommunicatedTo('');
        setOtherRequestAbsenceTypeId('');
        setOtherRequestMultipleDates([]);
        setOtherRequestNotes('');
        setSeniorHoursTotal(0);
        setMedicalAppointmentTime('');
        setIsOtherRequestDialogOpen(true);
    }
    
    const handleSubmitRequest = async () => {
        if (!selectedCampaign || !requestAbsenceTypeId || !requestDateRange?.from || !requestDateRange?.to || !employeeRecord) {
            toast({ title: 'Datos incompletos', description: 'Selecciona tipo de ausencia y rango de fechas.', variant: 'destructive' });
            return;
        }
    
        const activePeriod = employeeRecord.employmentPeriods.find(p => !p.endDate || isWithinInterval(new Date(), { start: safeParseDate(p.startDate)!, end: safeParseDate(p.endDate) || new Date('9999-12-31') }));
        if (!activePeriod) {
            toast({ title: 'Error', description: 'No tienes un periodo laboral activo.', variant: 'destructive' });
            return;
        }
    
        setIsSubmittingRequest(true);
        try {
            await addScheduledAbsence(employeeRecord.id, activePeriod.id, {
                absenceTypeId: requestAbsenceTypeId,
                startDate: format(requestDateRange.from, 'yyyy-MM-dd'),
                endDate: format(requestDateRange.to, 'yyyy-MM-dd'),
                notes: null,
            }, employeeRecord, true);
    
            toast({ title: 'Solicitud Enviada', description: 'Tu solicitud de ausencia ha sido registrada.' });
    
            const absenceName = absenceTypes.find(at => at.id === requestAbsenceTypeId)?.name || 'Ausencia';
            const requestMessage = `Hola,

Quiero solicitar una ausencia dentro de la campaña "${selectedCampaign.title}".

- Tipo: ${absenceName}
- Desde: ${format(requestDateRange.from, 'dd/MM/yyyy')}
- Hasta: ${format(requestDateRange.to, 'dd/MM/yyyy')}

La solicitud ha sido pre-aprobada y registrada en el planificador para su revisión.

Gracias.`;
    
            await sendMessage(requestMessage);
    
            setIsRequestDialogOpen(false);
        } catch (error) {
            console.error('Error submitting request:', error);
            toast({ title: 'Error al enviar', description: error instanceof Error ? error.message : 'No se pudo enviar la solicitud.', variant: 'destructive' });
        } finally {
            setIsSubmittingRequest(false);
        }
    };
    
    const handleSubmitOtherRequest = async () => {
        const selectedAbsenceType = absenceTypes.find(at => at.id === otherRequestAbsenceTypeId);
        
        if (!employeeRecord) {
            toast({ title: 'Error', description: 'No se pudo identificar tu ficha de empleado.', variant: 'destructive' });
            return;
        }
    
        const activePeriod = employeeRecord.employmentPeriods.find(p => !p.endDate || isWithinInterval(new Date(), { start: safeParseDate(p.startDate)!, end: safeParseDate(p.endDate) || new Date('9999-12-31') }));
        if (!activePeriod) {
            toast({ title: 'Error', description: 'No tienes un periodo laboral activo.', variant: 'destructive' });
            return;
        }
    
        if (otherRequestMultipleDates.length === 0) {
            toast({ title: 'Datos incompletos', description: 'Selecciona al menos un día para el permiso.', variant: 'destructive' });
            return;
        }

        if (selectedAbsenceType?.abbreviation === 'HM' && !medicalAppointmentTime) {
            toast({ title: 'Hora requerida', description: 'Por favor, especifica la hora de la consulta médica.', variant: 'destructive' });
            return;
        }
        
        if (selectedAbsenceType?.abbreviation !== 'RJS' && !otherRequestNotes.trim()) {
            toast({ title: 'Motivo Requerido', description: 'Por favor, explica el motivo de tu solicitud en las notas.', variant: 'destructive' });
            return;
        }

        if (!otherRequestAbsenceTypeId || !communicatedTo) {
            toast({ title: 'Datos incompletos', description: 'Completa todos los campos requeridos.', variant: 'destructive' });
            return;
        }
    
        setIsSubmittingOtherRequest(true);
        try {
            let finalNotes = otherRequestNotes;
            let extraInfoForMessage = '';

            if (selectedAbsenceType?.abbreviation === 'RJS') {
                finalNotes = `Petición de ${seniorHoursTotal.toFixed(2)} horas por reducción de jornada senior.`;
            } else if (selectedAbsenceType?.abbreviation === 'HM') {
                extraInfoForMessage = `\n- Hora Consulta: ${medicalAppointmentTime}`;
                finalNotes = `Hora Consulta: ${medicalAppointmentTime}\n${otherRequestNotes}`;
            }

            for (const day of otherRequestMultipleDates) {
                await addScheduledAbsence(
                    employeeRecord.id,
                    activePeriod.id,
                    {
                        absenceTypeId: otherRequestAbsenceTypeId,
                        startDate: format(day, 'yyyy-MM-dd'),
                        endDate: format(day, 'yyyy-MM-dd'),
                        notes: finalNotes
                    },
                    employeeRecord,
                    true
                );
            }
    
            const absenceName = selectedAbsenceType?.name || 'Ausencia';
            const datesForMessage = otherRequestMultipleDates.map(d => format(d, 'dd/MM/yyyy')).sort().join(', ');
            
            const requestMessage = `Hola,

Quiero solicitar un permiso que ya he comunicado a ${communicatedTo}.

- Tipo: ${absenceName}
- Fecha(s): ${datesForMessage}${extraInfoForMessage}
- Motivo: ${otherRequestNotes}

Gracias.`;
    
            await sendMessage(requestMessage);
            
            toast({ title: 'Solicitud Enviada', description: 'Tu petición ha sido registrada y enviada al administrador.' });
            setIsOtherRequestDialogOpen(false);
    
        } catch (error) {
            console.error('Error submitting other request:', error);
            toast({ title: 'Error al enviar', description: error instanceof Error ? error.message : 'No se pudo enviar la solicitud.', variant: 'destructive' });
        } finally {
            setIsSubmittingOtherRequest(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as unknown as React.FormEvent);
        }
    }
    
    const isSubmitOtherRequestDisabled = useMemo(() => {
        const selectedAbsenceType = absenceTypes.find(at => at.id === otherRequestAbsenceTypeId);

        if (isSubmittingOtherRequest || !otherRequestAbsenceTypeId || !communicatedTo || otherRequestMultipleDates.length === 0) {
            return true;
        }
        
        if (selectedAbsenceType?.abbreviation === 'RJS') {
            return false; // Only needs dates
        }

        if (selectedAbsenceType?.abbreviation === 'HM') {
             return !otherRequestNotes.trim() || !medicalAppointmentTime;
        }

        // For all other types
        return !otherRequestNotes.trim();

    }, [
        isSubmittingOtherRequest, 
        otherRequestAbsenceTypeId, 
        communicatedTo,
        otherRequestMultipleDates,
        otherRequestNotes,
        medicalAppointmentTime,
        absenceTypes
    ]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!employeeRecord) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6 h-full">
                 <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Mis Mensajes
                </h1>
                <Card className="flex flex-col flex-grow items-center justify-center">
                    <p className="text-muted-foreground">No se ha podido encontrar tu ficha de empleado.</p>
                </Card>
            </div>
        )
    }

    const campaignAbsenceTypes = absenceTypes.filter(at => selectedCampaign?.allowedAbsenceTypeIds.includes(at.id));

    const renderChatHeader = () => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Avatar className="border-2 border-foreground"><AvatarFallback>D</AvatarFallback></Avatar>
                    <div>
                        <h2 className="text-lg font-bold">Dirección</h2>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            Canal para comunicar incidencias sobre tus horas o la aplicación.
                        </p>
                    </div>
                </div>
                 {activeCampaign && (
                    <Alert>
                        <PlaneTakeoff className="h-4 w-4" />
                        <AlertTitle>{activeCampaign.title}</AlertTitle>
                        <AlertDescription className="flex items-center justify-between">
                            Periodo de solicitud abierto. ¡Puedes enviar tus peticiones!
                             <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleOpenRequestDialog(activeCampaign)}>Hacer Solicitud</Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-6 p-4 md:p-6 h-full">
                 <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold tracking-tight font-headline">
                        Mis Mensajes
                    </h1>
                     <Button size="sm" variant="secondary" onClick={handleOpenOtherRequestDialog}><CalendarClock className="mr-2 h-4 w-4"/>Otras Solicitudes</Button>
                </div>
                
                <Card className="flex flex-col flex-grow h-[calc(100vh-12rem)]">
                    <CardHeader className="p-4 border-b">
                        {renderChatHeader()}
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4 space-y-4" viewportRef={viewportRef}>
                        {messagesLoading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            formattedMessages.map((message, index) => (
                                <div key={index} className={cn('flex items-end gap-2', message.senderId === employeeRecord.id ? 'justify-end' : 'justify-start')}>
                                    {message.senderId !== employeeRecord.id && <Avatar className="h-8 w-8 border-2 border-foreground"><AvatarFallback>D</AvatarFallback></Avatar>}
                                    <div className={cn(
                                        'max-w-[90%] p-3 rounded-lg',
                                        message.senderId === employeeRecord.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                    )}>
                                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                                        {message.timestamp && (
                                            <p className="text-xs opacity-70 mt-1 text-right">
                                                {format(message.timestamp, 'HH:mm')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </ScrollArea>
                    <CardFooter className="p-4 border-t bg-background">
                         <form onSubmit={handleSendMessage} className="relative flex items-end w-full">
                             <Textarea
                                ref={textareaRef}
                                placeholder="Escribe tu mensaje para cualquier otra consulta..."
                                className="pr-12 resize-none flex-grow"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />
                            <Button type="submit" size="icon" className="absolute right-2 bottom-2 h-8 w-8 shrink-0">
                                <SendHorizonal className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            </div>
             <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedCampaign?.title}</DialogTitle>
                        <DialogDescription>{selectedCampaign?.description}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Tipo de Ausencia</label>
                            <Select value={requestAbsenceTypeId} onValueChange={setRequestAbsenceTypeId}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                    {campaignAbsenceTypes.map(at => (
                                        <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Periodo de la Ausencia</label>
                            <DayPicker
                                mode="range"
                                selected={requestDateRange}
                                onSelect={setRequestDateRange}
                                locale={es}
                                disabled={isSubmittingRequest}
                                fromDate={selectedCampaign ? (selectedCampaign.absenceStartDate as Timestamp).toDate() : undefined}
                                toDate={selectedCampaign ? (selectedCampaign.absenceEndDate as Timestamp).toDate() : undefined}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleSubmitRequest} disabled={isSubmittingRequest || !requestDateRange?.from}>
                            {isSubmittingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enviar Solicitud
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isOtherRequestDialogOpen} onOpenChange={setIsOtherRequestDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Solicitar Permiso</DialogTitle>
                        <DialogDescription>
                            {otherRequestStep === 1
                                ? "Confirma que has comunicado tu petición antes de continuar."
                                : "Selecciona un tipo de permiso y la fecha para enviar tu solicitud."}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {otherRequestStep === 1 ? (
                        <div className="py-4 space-y-6">
                            <div className="space-y-4">
                                <Label className="font-semibold">Antes de hacer una petición, ¿has tenido que comunicarlo a la dirección de la tienda?</Label>
                                <RadioGroup onValueChange={setCommunicatedTo} value={communicatedTo}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Arantxa Villacampa" id="r1" />
                                        <Label htmlFor="r1">Arantxa Villacampa</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rebeca Pascual" id="r2" />
                                        <Label htmlFor="r2">Rebeca Pascual</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                                <Button onClick={() => setOtherRequestStep(2)} disabled={!communicatedTo}>Siguiente</Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                             <div className="space-y-2">
                                <Label className="text-sm font-medium">Tipo de Permiso</Label>
                                <Select value={otherRequestAbsenceTypeId} onValueChange={setOtherRequestAbsenceTypeId}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                                    <SelectContent>
                                        {otherRequestAbsenceTypes.map(at => (
                                            <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {absenceTypes.find(at => at.id === otherRequestAbsenceTypeId)?.abbreviation === 'HM' && (
                                <div className="space-y-2">
                                    <Label htmlFor="appointment-time" className="text-sm font-medium">
                                        Hora de la Consulta <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea id="appointment-time" value={medicalAppointmentTime} onChange={(e) => setMedicalAppointmentTime(e.target.value)} />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Días del Permiso</Label>
                                <Button variant="outline" className="w-full justify-start text-left font-normal" onClick={() => setIsCalendarDialogOpen(true)}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {otherRequestMultipleDates.length > 0 ? `${otherRequestMultipleDates.length} día(s) seleccionado(s)` : "Seleccionar días..."}
                                </Button>
                            </div>
                            {absenceTypes.find(at => at.id === otherRequestAbsenceTypeId)?.abbreviation === 'RJS' && (
                                <Card className="mt-2 p-3 bg-muted/20">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total de Horas Solicitadas</CardTitle>
                                        <Hourglass className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{seniorHoursTotal.toFixed(2)}h</div>
                                    </CardContent>
                                </Card>
                            )}
                            {absenceTypes.find(at => at.id === otherRequestAbsenceTypeId)?.abbreviation !== 'RJS' && (
                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-sm font-medium">
                                        Motivo <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Añade aquí cualquier justificación o comentario necesario..."
                                        value={otherRequestNotes}
                                        onChange={(e) => setOtherRequestNotes(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        <span className="text-destructive">*</span> Obligatorio para este tipo de permiso.
                                    </p>
                                </div>
                            )}
                             <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setOtherRequestStep(1)}>Atrás</Button>
                                <Button onClick={handleSubmitOtherRequest} disabled={isSubmitOtherRequestDisabled}>
                                    {isSubmittingOtherRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Enviar Solicitud
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
                <DialogContent className="sm:max-w-fit">
                    <DialogHeader>
                        <DialogTitle>Seleccionar Días</DialogTitle>
                        <DialogDescription>Elige uno o varios días para tu solicitud.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex justify-center">
                        <DayPicker
                            mode="multiple"
                            min={0}
                            selected={otherRequestMultipleDates}
                            onSelect={(days) => setOtherRequestMultipleDates(days || [])}
                            locale={es}
                            modifiers={dayPickerModifiers}
                            modifiersStyles={dayPickerModifiersStyles}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsCalendarDialogOpen(false)}>Aceptar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
