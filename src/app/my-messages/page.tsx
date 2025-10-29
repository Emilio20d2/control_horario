
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, Loader2, Info, Calendar as CalendarIcon, Edit, PlusCircle, Trash2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDataProvider } from '@/hooks/use-data-provider';
import { collection, query, orderBy, addDoc, serverTimestamp, setDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import type { Message, VacationCampaign, Employee, AbsenceType, ScheduledAbsence } from '@/lib/types';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, eachDayOfInterval, isAfter, differenceInDays } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { addScheduledAbsence } from '@/lib/services/employeeService';


export default function MyMessagesPage() {
    const { employeeRecord, loading, conversations, vacationCampaigns, absenceTypes, holidays, refreshData, calculateEmployeeVacations } = useDataProvider();
    const [newMessage, setNewMessage] = useState('');
    const conversationId = employeeRecord?.id;
    const viewportRef = useRef<HTMLDivElement>(null);
    const autoReplyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMobile = useIsMobile();
    const { toast } = useToast();

    // State for vacation request modal
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestStep, setRequestStep] = useState(0);
    const [selectedAbsenceTypeId, setSelectedAbsenceTypeId] = useState('');
    const [selectedDateRanges, setSelectedDateRanges] = useState<DateRange[]>([]);
    const [currentRange, setCurrentRange] = useState<DateRange | undefined>(undefined);

    const activeCampaign = useMemo(() => {
        const now = new Date();
        return vacationCampaigns.find(c => 
            c.isActive &&
            isWithinInterval(now, {
                start: startOfDay((c.submissionStartDate as Timestamp).toDate()),
                end: endOfDay((c.submissionEndDate as Timestamp).toDate())
            })
        );
    }, [vacationCampaigns]);

    const campaignAbsenceTypes = useMemo(() => {
      if (!activeCampaign) return [];
      return absenceTypes.filter(at => activeCampaign.allowedAbsenceTypeIds.includes(at.id));
    }, [activeCampaign, absenceTypes]);

    const campaignIncludesSpecialAbsences = useMemo(() => {
        if (!campaignAbsenceTypes) return false;
        const specialNames = ['Excedencia', 'Permiso no retribuido'];
        return campaignAbsenceTypes.some(at => specialNames.includes(at.name));
    }, [campaignAbsenceTypes]);

    const alreadyRequestedAbsenceTypeIds = useMemo(() => {
        if (!employeeRecord || !activeCampaign) return new Set<string>();

        const requestedIds = new Set<string>();
        const campaignAbsenceTypeSet = new Set(activeCampaign.allowedAbsenceTypeIds);

        employeeRecord.employmentPeriods.forEach(period => {
            period.scheduledAbsences?.forEach(absence => {
                if (
                    campaignAbsenceTypeSet.has(absence.absenceTypeId) &&
                    absence.originalRequest?.startDate // Check if it originates from a request
                ) {
                    requestedIds.add(absence.absenceTypeId);
                }
            });
        });
        return requestedIds;

    }, [employeeRecord, activeCampaign]);


    useEffect(() => {
        if(isRequesting) {
            setRequestStep(campaignIncludesSpecialAbsences ? 0 : 1);
            setSelectedAbsenceTypeId('');
            setSelectedDateRanges([]);
            setCurrentRange(undefined);
        }
    }, [isRequesting, campaignIncludesSpecialAbsences]);

    const conversation = useMemo(() => {
        if (!conversationId) return null;
        return conversations.find(c => c.id === conversationId);
    }, [conversations, conversationId]);

    const [messagesSnapshot, messagesLoading] = useCollectionData(
        conversationId ? query(collection(db, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'asc')) : null
    );

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


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !conversationId || !employeeRecord) return;
        
        const messageText = newMessage;
        setNewMessage('');

        await sendMessage(messageText);
        
        if (autoReplyTimeoutRef.current) {
            clearTimeout(autoReplyTimeoutRef.current);
        }

        autoReplyTimeoutRef.current = setTimeout(() => {
            const autoReplyText = `Hola ${employeeRecord.name.split(' ')[0]}, hemos recibido tu consulta. Un responsable la revisará y te responderá por este mismo medio tan pronto como sea posible. Gracias por tu paciencia.`;
            sendBotMessage(autoReplyText, true);
        }, 30000); // 30 second delay
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

    const sendBotMessage = async (text: string, unreadByEmployee: boolean) => {
        if (!conversationId) return;
        const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
        const botMessageData = {
            text,
            senderId: 'admin',
            timestamp: serverTimestamp()
        };
        await addDoc(messagesColRef, botMessageData);

        const convDocRef = doc(db, 'conversations', conversationId);
        await updateDoc(convDocRef, {
            lastMessageText: text,
            lastMessageTimestamp: serverTimestamp(),
            unreadByEmployee: unreadByEmployee,
        });
    }

    const handleSubmitRequest = async () => {
        const absenceType = campaignAbsenceTypes.find(at => at.id === selectedAbsenceTypeId);
        if (!employeeRecord || selectedDateRanges.length === 0 || !absenceType || !activeCampaign) {
            toast({ title: "Datos incompletos", description: "Selecciona al menos un periodo de fechas para enviar la solicitud.", variant: "destructive" });
            return;
        }
    
        const activePeriod = employeeRecord.employmentPeriods.find(p => !p.endDate || isAfter(parseISO(p.endDate as string), new Date()));
        if (!activePeriod) {
            toast({ title: 'Error', description: 'No tienes un periodo laboral activo para solicitar ausencias.', variant: 'destructive' });
            return;
        }
    
        // --- VALIDATION FOR VACATIONS ---
        if (absenceType.name === 'Vacaciones') {
            const currentYear = (activeCampaign.absenceStartDate as Timestamp).toDate().getFullYear();
            const { vacationDaysAvailable } = calculateEmployeeVacations(employeeRecord, currentYear, 'programmed');
            
            const newlyRequestedDays = selectedDateRanges.reduce((acc, range) => {
                if (range.from && range.to) {
                    return acc + differenceInDays(range.to, range.from) + 1;
                }
                return acc;
            }, 0);
    
            if (newlyRequestedDays > vacationDaysAvailable) {
                toast({
                    variant: "destructive",
                    title: "Días de vacaciones excedidos",
                    description: `Estás intentando solicitar ${newlyRequestedDays} días, pero solo tienes ${vacationDaysAvailable} días disponibles en total. Ajusta tu solicitud.`,
                });
                return;
            }
    
            // Identify if this is the first or second campaign of the year
            const allCampaignsThisYear = vacationCampaigns
                .filter(c => (c.absenceStartDate as Timestamp).toDate().getFullYear() === currentYear)
                .sort((a,b) => (a.submissionStartDate as Timestamp).toDate().getTime() - (b.submissionStartDate as Timestamp).toDate().getTime());
            
            const isFirstCampaign = allCampaignsThisYear.length > 0 && allCampaignsThisYear[0].id === activeCampaign.id;
            const isSecondCampaign = allCampaignsThisYear.length > 1 && allCampaignsThisYear[1].id === activeCampaign.id;
    
            if (isFirstCampaign) {
                let campaignLimit = 10;
                if (vacationDaysAvailable < 31) {
                    const adjustedLimit = vacationDaysAvailable - 21;
                    if (adjustedLimit < campaignLimit) {
                         if (newlyRequestedDays > adjustedLimit) {
                            toast({
                                variant: "destructive",
                                title: "Límite de primera campaña ajustado",
                                description: `Debido a tu saldo de días, para poder disfrutar de 21 días en verano, ahora solo puedes solicitar un máximo de ${adjustedLimit} días.`,
                            });
                            return;
                        }
                        campaignLimit = adjustedLimit;
                    }
                }
                 if (newlyRequestedDays > campaignLimit) {
                    toast({
                       variant: "destructive",
                       title: `Límite de la primera campaña excedido (${campaignLimit} días)`,
                       description: `En esta campaña solo puedes solicitar un máximo de ${campaignLimit} días de vacaciones. Has solicitado ${newlyRequestedDays}.`,
                   });
                   return;
               }
            }
    
            if (isSecondCampaign && newlyRequestedDays > 21) {
                toast({
                    variant: "destructive",
                    title: "Límite de la segunda campaña excedido",
                    description: `En esta campaña solo puedes solicitar un máximo de 21 días de vacaciones. Has solicitado ${newlyRequestedDays}.`,
                });
                return;
            }
        }
    
        setIsRequesting(false); // Close dialog immediately
    
        try {
            for (const range of selectedDateRanges) {
                if (range.from && range.to) {
                    const originalRequestPayload = {
                        startDate: format(range.from, 'yyyy-MM-dd'),
                        endDate: format(range.to, 'yyyy-MM-dd'),
                    };
                    const absencePayload = {
                        absenceTypeId: absenceType.id,
                        ...originalRequestPayload,
                    };

                    // Create the original request record (for the report)
                    await addScheduledAbsence(employeeRecord.id, activePeriod.id, absencePayload, employeeRecord, originalRequestPayload, false);
                    
                    // Create the definitive, editable record (for the planner)
                    await addScheduledAbsence(employeeRecord.id, activePeriod.id, absencePayload, employeeRecord, originalRequestPayload, true);
                }
            }
            
            await refreshData();
            
            toast({ title: "Solicitud de Ausencia Guardada", description: "Tus periodos de ausencia se han guardado correctamente." });
    
            const formattedRanges = selectedDateRanges.map(range => 
                `del ${format(range.from!, 'dd/MM/yyyy')} al ${format(range.to!, 'dd/MM/yyyy')}`
            ).join(', ');
            await sendMessage(`Confirmación de solicitud de ${absenceType.name} para los periodos: ${formattedRanges}.`);
    
        } catch (error) {
            console.error("Error saving scheduled absences:", error);
            toast({ title: "Error al guardar la solicitud", description: "No se pudieron guardar tus ausencias. Inténtalo de nuevo.", variant: "destructive" });
        }
    }
    
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

    const renderChatHeader = () => {
        if (activeCampaign) {
            return (
                <div className="flex flex-col items-start gap-4 w-full">
                    <div>
                        <h2 className="text-lg font-bold">{activeCampaign.title}</h2>
                        <p className="text-sm text-muted-foreground">{activeCampaign.description}</p>
                    </div>
                    <Button size="sm" onClick={() => setIsRequesting(true)} className="self-end">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Hacer Solicitud
                    </Button>
                </div>
            )
        }
        return (
            <div className="flex items-center gap-4">
                <Avatar className="border-2 border-foreground"><AvatarFallback>D</AvatarFallback></Avatar>
                <div>
                    <h2 className="text-lg font-bold">Dirección</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        Este servicio de mensajería es exclusivamente para incidencias relacionadas con el control de horas semanales o con esta aplicación.
                        {'\n'}Para cualquier otra consulta, ponte en contacto directamente con Dirección.
                    </p>
                </div>
            </div>
        )
    }
    
    const openingHolidays = holidays.filter(h => h.type === 'Apertura').map(h => h.date as Date);
    const otherHolidays = holidays.filter(h => h.type !== 'Apertura').map(h => h.date as Date);
    const employeeAbsenceDays = employeeRecord?.employmentPeriods.flatMap(p => p.scheduledAbsences || []).flatMap(a => a.endDate ? eachDayOfInterval({start: a.startDate, end: a.endDate}) : [a.startDate]) || [];

    const requestDialogModifiers = { 
        opening: openingHolidays, 
        other: otherHolidays,
        employeeAbsence: employeeAbsenceDays,
    };
    const requestDialogModifiersStyles = { 
        opening: { backgroundColor: '#a7f3d0' }, 
        other: { backgroundColor: '#fecaca' },
        employeeAbsence: { backgroundColor: '#dbeafe' },
    };


    const RequestDialogContent = () => {
        const fromDate = activeCampaign ? (activeCampaign.absenceStartDate as Timestamp).toDate() : undefined;
        const toDate = activeCampaign ? (activeCampaign.absenceEndDate as Timestamp).toDate() : undefined;
        
        const handleSelectRange = (range: DateRange | undefined) => {
            if (range?.from && !range.to) {
                // If only the 'from' date is selected, set it and wait for the 'to' date
                setCurrentRange({ from: range.from, to: undefined });
            } else if (range?.from && range.to) {
                // If both are selected, finalize the range
                setSelectedDateRanges(prev => [...prev, { from: range.from, to: range.to }]);
                setCurrentRange(undefined); // Reset for the next selection
            } else {
                // If the selection is cleared
                setCurrentRange(undefined);
            }
        };

        const handleRemoveRange = (index: number) => {
            setSelectedDateRanges(prev => prev.filter((_, i) => i !== index));
        };

        const hasAlreadyRequested = selectedAbsenceTypeId ? alreadyRequestedAbsenceTypeIds.has(selectedAbsenceTypeId) : false;

        return (
            <div className="flex flex-col gap-4">
                {requestStep === 0 && (
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>¡Atención!</AlertTitle>
                            <AlertDescription>
                                Esta campaña incluye "Excedencia" o "Permiso no retribuido", los cuales afectan a tus días de vacaciones disponibles.
                                <br/><br/>
                                <strong className='font-bold'>Recomendación:</strong> Solicita primero tus periodos de Excedencia/Permiso no retribuido y después, en una nueva solicitud, tus Vacaciones.
                                <br/><br/>
                                <strong className='font-bold'>IMPORTANTE: Recuerda que también debes realizar esta misma solicitud a través de la app de INET.</strong>
                            </AlertDescription>
                        </Alert>
                        <Button onClick={() => setRequestStep(1)} className='w-full'>Continuar</Button>
                    </div>
                )}
                {requestStep === 1 && (
                    <div className="space-y-4">
                         <h3 className="font-semibold text-center">Paso 1: Elige el tipo de ausencia</h3>
                        <Select value={selectedAbsenceTypeId} onValueChange={setSelectedAbsenceTypeId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                            <SelectContent>
                                {campaignAbsenceTypes.map(at => (
                                    <SelectItem key={at.id} value={at.id} disabled={alreadyRequestedAbsenceTypeIds.has(at.id)}>
                                        {at.name} {alreadyRequestedAbsenceTypeIds.has(at.id) && "(Ya solicitado)"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedAbsenceTypeId && (
                            <Alert variant={hasAlreadyRequested ? "destructive" : "default"}>
                                <Info className="h-4 w-4" />
                                <AlertTitle>{hasAlreadyRequested ? "Solicitud Duplicada" : "Puedes Continuar"}</AlertTitle>
                                <AlertDescription>
                                    {hasAlreadyRequested 
                                    ? "Ya has realizado una solicitud para este tipo de ausencia en esta campaña. Solo se permite una solicitud por tipo."
                                    : "Solo se permite una solicitud por tipo de ausencia y por campaña."
                                    }
                                </AlertDescription>
                            </Alert>
                        )}
                        <Button onClick={() => setRequestStep(2)} disabled={!selectedAbsenceTypeId || hasAlreadyRequested}>Siguiente</Button>
                    </div>
                )}
                {requestStep === 2 && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-center">Paso 2: Elige los periodos</h3>
                        <Calendar
                            mode="range"
                            selected={currentRange}
                            onSelect={handleSelectRange}
                            locale={es}
                            className="rounded-md border p-0"
                            fromDate={fromDate}
                            toDate={toDate}
                            disabled={[{ before: fromDate, after: toDate }, ...otherHolidays]}
                            modifiers={requestDialogModifiers}
                            modifiersStyles={requestDialogModifiersStyles}
                        />
                         <div className="space-y-2">
                             <h4 className="font-semibold text-sm">Periodos Seleccionados:</h4>
                             {selectedDateRanges.length === 0 ? (
                                 <p className="text-xs text-muted-foreground">Aún no has seleccionado ningún periodo.</p>
                             ) : (
                                <ul className="space-y-1">
                                    {selectedDateRanges.map((range, index) => (
                                        <li key={index} className="flex items-center justify-between text-xs border rounded-md p-1.5">
                                            <span>
                                                {range.from ? format(range.from, 'dd/MM/yy') : ''} - {range.to ? format(range.to, 'dd/MM/yy') : ''}
                                            </span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemoveRange(index)}>
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                             )}
                         </div>
                         <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setRequestStep(1)}>Anterior</Button>
                            <Button onClick={() => setRequestStep(3)} disabled={selectedDateRanges.length === 0}>Siguiente</Button>
                         </div>
                    </div>
                )}
                {requestStep === 3 && (
                    <div className="space-y-4 text-center">
                         <h3 className="font-semibold">Paso 3: Confirma tu solicitud</h3>
                         <div className="p-4 rounded-md border bg-muted space-y-2">
                            <p><strong>Tipo:</strong> {campaignAbsenceTypes.find(at => at.id === selectedAbsenceTypeId)?.name}</p>
                            {selectedDateRanges.map((range, index) => (
                                <p key={index}><strong>Periodo {index + 1}:</strong> {range.from ? format(range.from, 'PPP', {locale: es}) : ''} al {range.to ? format(range.to, 'PPP', {locale: es}) : ''}</p>
                            ))}
                         </div>
                         <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setRequestStep(2)}>Anterior</Button>
                            <Button onClick={handleSubmitRequest}>Confirmar y Enviar</Button>
                         </div>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 h-full">
            <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Mis Mensajes
                </h1>
            </div>
            
            <Card className="flex flex-col flex-grow h-[calc(100vh-12rem)]">
                <div className="p-4 border-b">
                    {renderChatHeader()}
                </div>
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
                <div className="p-4 border-t bg-background space-y-4">
                    <form onSubmit={handleSendMessage} className="relative">
                        <Input 
                            placeholder="Escribe tu mensaje para cualquier otra consulta..." 
                            className="pr-12 h-10" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <Button type="submit" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8">
                            <SendHorizonal className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </Card>

            {isMobile ? (
                 <Drawer open={isRequesting} onOpenChange={setIsRequesting}>
                    <DrawerContent>
                        <DrawerHeader className="text-left">
                            <DrawerTitle>{activeCampaign?.title}</DrawerTitle>
                             <DrawerDescription>
                                Solicitud de ausencias para el periodo del {activeCampaign ? format((activeCampaign.absenceStartDate as Timestamp).toDate(), 'dd/MM') : ''} al {activeCampaign ? format((activeCampaign.absenceEndDate as Timestamp).toDate(), 'dd/MM/yyyy') : ''}.
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4 overflow-y-auto"><RequestDialogContent /></div>
                        <DrawerFooter className="pt-2">
                            <DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={isRequesting} onOpenChange={setIsRequesting}>
                    <DialogContent className="max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{activeCampaign?.title}</DialogTitle>
                            <DialogDescription>
                                Solicitud de ausencias para el periodo del {activeCampaign ? format((activeCampaign.absenceStartDate as Timestamp).toDate(), 'dd/MM') : ''} al {activeCampaign ? format((activeCampaign.absenceEndDate as Timestamp).toDate(), 'dd/MM/yyyy') : ''}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="overflow-y-auto -mr-6 pr-6">
                            <RequestDialogContent />
                        </div>
                    </DialogContent>
                </Dialog>
            )}

        </div>
    );
}

    



    

    