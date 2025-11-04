

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, Loader2, PlaneTakeoff, Info, CalendarClock, Hourglass, Calendar as CalendarIcon, CheckCircle, Trash2, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDataProvider } from '@/hooks/use-data-provider';
import { collection, query, orderBy, addDoc, serverTimestamp, setDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import type { Message, VacationCampaign, AbsenceType, Holiday, CorrectionRequest, Employee, Conversation } from '@/lib/types';
import { format, isWithinInterval, parseISO, isValid, getYear, parse } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { addScheduledAbsence, updateDocument } from '@/lib/services/employeeService';
import { DateRange, DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { deleteSubcollectionDocument } from '@/lib/services/firestoreService';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-is-mobile';

function ChatView({ conversation }: { conversation: Conversation }) {
    const { appUser, reauthenticateWithPassword } = useAuth();
    const { refreshData, correctionRequests } = useDataProvider();
    const [newMessage, setNewMessage] = useState('');
    const viewportRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [password, setPassword] = useState('');
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

    const [messagesSnapshot, messagesLoading] = useCollectionData(
        conversation ? query(collection(db, 'conversations', conversation.id, 'messages'), orderBy('timestamp', 'asc')) : null
    );

    useEffect(() => {
        if (conversation && appUser && !conversation.readBy?.includes(appUser.id)) {
            updateDoc(doc(db, 'conversations', conversation.id), {
                readBy: [...(conversation.readBy || []), appUser.id],
            });
        }
    }, [conversation, appUser]);

    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
    }, [messagesSnapshot, messagesLoading]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
        }
    }, [newMessage]);

    const formattedMessages = useMemo(() => {
        if (!messagesSnapshot) return [];
        return messagesSnapshot.map(docData => {
            return {
                id: docData.id,
                ...docData,
                timestamp: docData.timestamp?.toDate()
            } as Message;
        });
    }, [messagesSnapshot]);

    const handleSendMessage = async (e: React.FormEvent, customMessage?: string) => {
        e.preventDefault();
        const messageText = customMessage || newMessage;

        if (messageText.trim() === '' || !conversation.id || !appUser) return;

        if (!customMessage) setNewMessage('');

        await updateDoc(doc(db, 'conversations', conversation.id), {
            lastMessageText: messageText,
            lastMessageTimestamp: serverTimestamp(),
            unreadByEmployee: true,
            readBy: [appUser.id]
        });

        await addDoc(collection(db, 'conversations', conversation.id, 'messages'), {
            text: messageText,
            senderId: 'admin',
            timestamp: serverTimestamp()
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as unknown as React.FormEvent);
        }
    }

    const quickResponses = [
        "Se ha revisado y corregido tu solicitud.",
        "Recibido, lo revisaremos.",
        "De acuerdo, gracias por avisar.",
        "La solicitud no procede."
    ];
    
     const handleResolveRequest = async (weekId: string) => {
        if (!conversation) return;
        
        const requestId = `${weekId}_${conversation.employeeId}`;
        
        try {
            await updateDocument('correctionRequests', requestId, { status: 'resolved' });
            refreshData(); // To update the local state of correctionRequests
            toast({ title: 'Solicitud marcada como realizada.' });
        } catch (error) {
            console.error("Error resolving request:", error);
            toast({ title: "Error", description: "No se pudo actualizar el estado de la solicitud.", variant: "destructive" });
        }
    };

    const RenderMessage = ({ message }: { message: Message }) => {
        const isCorrectionRequest = message.text.startsWith('SOLICITUD DE CORRECCIÓN');
        let weekId = '';
        if (isCorrectionRequest) {
            const dateMatch = message.text.match(/Semana: (\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch && dateMatch[1]) {
                try {
                    const parsedDate = parse(dateMatch[1], 'dd/MM/yyyy', new Date());
                    if (isValid(parsedDate)) {
                        weekId = format(parsedDate, 'yyyy-MM-dd');
                    }
                } catch (e) {
                    console.error("Error parsing date from correction request message:", e);
                }
            }
        }

        const request = isCorrectionRequest && weekId
            ? correctionRequests.find(r => r.id === `${weekId}_${conversation.employeeId}`) 
            : null;

        const isResolved = request?.status === 'resolved';

        return (
            <div className={cn('flex items-end gap-2 group', message.senderId === 'admin' ? 'justify-end' : 'justify-start')}>
                {message.senderId !== 'admin' && <Avatar className="h-8 w-8 border-2 border-foreground"><AvatarFallback>{conversation.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>}
                <div className={cn(
                    'max-w-[90%] p-3 rounded-lg shadow-sm',
                    message.senderId === 'admin' ? 'bg-gradient-to-br from-primary to-blue-400 text-primary-foreground' : 'bg-gradient-to-br from-muted to-transparent'
                )}>
                    {isCorrectionRequest && isResolved && (
                        <p className="text-xs font-bold text-green-600">[REALIZADA]</p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    {message.timestamp && (
                        <p className="text-xs opacity-70 mt-1 text-right">
                            {format(message.timestamp, 'dd/MM/yy HH:mm')}
                        </p>
                    )}
                     {isCorrectionRequest && !isResolved && weekId && (
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            className="mt-2 h-7 text-xs bg-green-200 text-green-900 hover:bg-green-300"
                            onClick={() => handleResolveRequest(weekId)}
                        >
                           <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Realizada
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
        <Card className="flex flex-col h-full bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-background">
            <CardHeader className="p-4 border-b">
                <div className="flex items-center gap-4">
                    <Avatar><AvatarFallback>{conversation.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                    <div>
                        <h2 className="text-lg font-bold">{conversation.employeeName}</h2>
                        <Link href={`/employees/${conversation.employeeId}`} className="text-xs text-muted-foreground hover:underline">Ver ficha del empleado</Link>
                    </div>
                </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4" viewportRef={viewportRef}>
                <div className="space-y-4">
                {messagesLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    formattedMessages.map((message) => (
                        <RenderMessage key={message.id} message={message} />
                    ))
                )}
                </div>
            </ScrollArea>
            <CardFooter className="p-4 border-t bg-background flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                    {quickResponses.map(text => (
                        <Button key={text} variant="outline" size="sm" onClick={(e) => handleSendMessage(e, text)}>{text}</Button>
                    ))}
                </div>
                <form onSubmit={handleSendMessage} className="relative flex items-end w-full">
                    <Textarea
                        ref={textareaRef}
                        placeholder="Escribe tu mensaje..."
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
        </>
    );
}


export default function AdminMessagesPage() {
    const { conversations, loading, appUser } = useDataProvider();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const isMobile = useIsMobile();

    const selectedConversation = useMemo(() => {
        if (!selectedConversationId) return null;
        return conversations.find(c => c.id === selectedConversationId);
    }, [selectedConversationId, conversations]);

    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id);
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-5rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (isMobile) {
         if (selectedConversation) {
            return (
                <div className="p-4 h-full">
                     <Button onClick={() => setSelectedConversationId(null)} variant="outline" className="mb-4">Volver a la lista</Button>
                    <ChatView conversation={selectedConversation} />
                </div>
            )
        }
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold tracking-tight font-headline mb-4">Conversaciones</h1>
                <div className="space-y-2">
                    {conversations.map(conv => (
                        <Card key={conv.id} onClick={() => handleSelectConversation(conv.id)} className="cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <Avatar><AvatarFallback>{conv.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                                    <div>
                                        <p className="font-semibold">{conv.employeeName}</p>
                                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">{conv.lastMessageText}</p>
                                    </div>
                                </div>
                                {appUser && !conv.readBy?.includes(appUser.id) && <div className="h-3 w-3 rounded-full bg-destructive" />}
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline">Mensajería</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-[calc(100vh-10rem)]">
                <Card className="lg:col-span-1 flex flex-col h-full bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg">Conversaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                        <ScrollArea className="h-full">
                            <div className="p-2 space-y-1">
                                {conversations.map(conv => (
                                    <button
                                        key={conv.id}
                                        onClick={() => handleSelectConversation(conv.id)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-md text-left w-full",
                                            selectedConversationId === conv.id ? "bg-muted" : "hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar><AvatarFallback>{conv.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                                            <div className="truncate">
                                                <p className="font-semibold truncate">{conv.employeeName}</p>
                                                <p className="text-sm text-muted-foreground truncate">{conv.lastMessageText}</p>
                                            </div>
                                        </div>
                                        {appUser && !conv.readBy?.includes(appUser.id) && (
                                            <div className="h-3 w-3 rounded-full bg-destructive flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <div className="lg:col-span-2 h-full">
                    {selectedConversation ? (
                        <ChatView conversation={selectedConversation} />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground bg-muted/30 rounded-lg">
                            <Users className="h-16 w-16 mb-4" />
                            <h3 className="text-xl font-semibold">Selecciona una conversación</h3>
                            <p>Elige una conversación de la lista para ver los mensajes.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
