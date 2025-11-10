

'use client';

import { useDataProvider } from '@/hooks/use-data-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, addWeeks, startOfWeek, endOfWeek, isAfter, isSameDay, isBefore, isValid, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, Mail, User, Info, CalendarRange, UserCheck, MessageCircle, Bell, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Employee, ScheduledAbsence, AbsenceType } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { getUniversalAdminCredentials } from '@/lib/auth/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

export default function HomePage() {
    const { 
        loading, 
        conversations, 
        employees, 
        absenceTypes,
        employeeRecord,
        unconfirmedWeeksDetails
    } = useDataProvider();
    const { appUser } = useAuth();
    
    const [selectedEvent, setSelectedEvent] = useState<{ employee: Employee; absence: ScheduledAbsence; absenceType: AbsenceType } | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

    const safeParseDate = useCallback((date: any): Date | null => {
        if (!date) return null;
        if (date instanceof Date) return date;
        if (date.toDate && typeof date.toDate === 'function') return date.toDate();
        if (typeof date === 'string') {
            const parsed = parseISO(date);
            return isValid(parsed) ? parsed : null;
        }
        return null;
    }, []);
    
    const unreadConversations = useMemo(() => {
        if (!appUser || appUser.role !== 'admin') return [];
        return conversations.filter(c => !c.readBy?.includes(appUser.id)).slice(0, 5);
    }, [conversations, appUser]);
    
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        const next5WeeksStart = startOfWeek(now, { weekStartsOn: 1 });
        const next5WeeksEnd = endOfWeek(addWeeks(now, 4), { weekStartsOn: 1 });
    
        const events: { employee: Employee; absence: ScheduledAbsence; absenceType: AbsenceType }[] = [];
    
        const activeEmployees = employees.filter(emp => 
            emp.employmentPeriods.some(p => !p.endDate || isAfter(p.endDate as Date, now))
        );
    
        activeEmployees.forEach(emp => {
            (emp.employmentPeriods || []).forEach(p => {
                (p.scheduledAbsences || []).forEach(a => {
                    const startDate = a.startDate as Date;
                    
                    if (!a.id || !startDate || !isValid(startDate)) return;
                    
                    const effectiveEndDate = a.endDate && isValid(a.endDate) ? a.endDate as Date : startDate;
    
                    if (isBefore(effectiveEndDate, next5WeeksStart) || isAfter(startDate, next5WeeksEnd)) {
                        return;
                    }
    
                    const absenceType = absenceTypes.find(at => at.id === a.absenceTypeId);
                    if (absenceType) {
                        const isDuplicate = events.some(e => 
                            e.employee.id === emp.id &&
                            e.absence.id === a.id
                        );
                        
                        if (!isDuplicate) {
                             events.push({ employee: emp, absence: a, absenceType });
                        }
                    }
                });
            });
        });
        
        return events.sort((a,b) => (a.absence.startDate as Date).getTime() - (b.absence.startDate as Date).getTime());
    
    }, [employees, absenceTypes]);

    const welcomeName = useMemo(() => {
        if (employeeRecord?.name) {
            return employeeRecord.name.split(' ')[0];
        }

        if (appUser?.email) {
            const universalEmail = getUniversalAdminCredentials().normalizedEmail;
            if (appUser.email.toLowerCase() === universalEmail) {
                return 'Admin';
            }
            return appUser.email.split('@')[0] ?? 'Admin';
        }

        return 'Admin';
    }, [employeeRecord, appUser]);

    const handleOpenDetails = (event: { employee: Employee; absence: ScheduledAbsence; absenceType: AbsenceType }) => {
        setSelectedEvent(event);
        setIsDetailDialogOpen(true);
    };

    if (loading) {
        return (
            <div className="p-4 md:p-6 grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }
    
    const oldestUnconfirmedWeek = unconfirmedWeeksDetails.length > 0 ? unconfirmedWeeksDetails[unconfirmedWeeksDetails.length - 1] : null;

    return (
        <>
            <div className="flex flex-col gap-6 p-4 md:p-8 h-full">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-headline">
                        ¡Hola, {welcomeName}!
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Aquí tienes un resumen de tus tareas pendientes.
                    </p>
                </div>
                <div className="grid gap-6 auto-rows-fr sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    
                    <Card className="flex flex-col bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/30 dark:to-background">
                        <CardHeader className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-destructive/10 p-3 rounded-full">
                                    <Bell className="h-6 w-6 text-destructive" />
                                </div>
                                <CardTitle>Semanas Pendientes</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow p-4">
                             {oldestUnconfirmedWeek ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                     <p className="text-sm text-muted-foreground font-semibold">Semana del {format(parseISO(oldestUnconfirmedWeek.weekId), 'dd/MM/yyyy')}</p>
                                     <div className="text-7xl font-bold text-destructive">
                                        {oldestUnconfirmedWeek.employeeNames.length}
                                     </div>
                                     <p className="text-muted-foreground">empleados sin confirmar</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center text-muted-foreground pt-4">
                                    <CheckCircle className="h-10 w-10 text-green-500 mb-2"/>
                                    <p className="font-semibold">¡Todo al día!</p>
                                    <p className="text-sm">No hay semanas pendientes.</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex-col gap-2 border-t p-4">
                            {oldestUnconfirmedWeek ? (
                                <>
                                    <Button asChild className="w-full">
                                        <Link href={`/schedule?week=${oldestUnconfirmedWeek.weekId}`}>
                                            Revisar
                                        </Link>
                                    </Button>
                                    {unconfirmedWeeksDetails.length > 1 && (
                                        <p className="text-xs text-muted-foreground">
                                            y {unconfirmedWeeksDetails.length - 1} otra(s) semana(s) pendiente(s).
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground text-center">Buen trabajo manteniendo los registros actualizados.</p>
                            )}
                        </CardFooter>
                    </Card>

                    <Card className="flex flex-col bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
                        <CardHeader className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Mensajes Sin Leer</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow p-3 space-y-2">
                            {unreadConversations.length > 0 ? (
                                <ScrollArea className="h-full pr-2">
                                    <div className="space-y-2">
                                        {unreadConversations.map(conv => (
                                            <Link key={conv.id} href={`/messages?conversationId=${conv.id}`}>
                                                <div className="flex items-center justify-between p-3 rounded-md border bg-background/50 hover:bg-muted">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarFallback>{conv.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold text-sm">{conv.employeeName}</p>
                                                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{conv.lastMessageText}</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex flex-col items-center text-center text-muted-foreground pt-4">
                                    <CheckCircle className="h-10 w-10 text-green-500 mb-2"/>
                                    <p className="font-semibold">¡Bandeja de entrada al día!</p>
                                    <p className="text-sm">No hay mensajes nuevos.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
                        <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-3 rounded-full">
                                <CalendarClock className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Próximos Eventos</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow p-3 space-y-2">
                            {upcomingEvents.length > 0 ? (
                                <ScrollArea className="h-full pr-2">
                                    <div className="space-y-2">
                                        {upcomingEvents.map((event, index) => {
                                            const startDate = event.absence.startDate as Date;
                                            const endDate = event.absence.endDate as Date;
                                            const isSingleDay = !endDate || isSameDay(startDate, endDate);
                                            
                                            return (
                                                <div 
                                                    key={`${event.absence.id}-${index}`} 
                                                    className="flex items-start gap-4 p-3 rounded-md border cursor-pointer hover:bg-black/5" 
                                                    style={{ backgroundColor: `${event.absenceType.color}20` }}
                                                    onClick={() => handleOpenDetails(event)}
                                                >
                                                    <div className="text-center w-20 shrink-0">
                                                        <p className="font-bold text-sm text-black">{format(startDate, 'dd MMM', { locale: es })}</p>
                                                        {!isSingleDay && endDate && (
                                                            <p className="text-xs text-black">al {format(endDate, 'dd MMM', { locale: es })}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm text-black">{event.employee.name}</p>
                                                        <p className="text-xs font-medium text-black">{event.absenceType.name}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex flex-col items-center text-center text-muted-foreground pt-4">
                                    <CheckCircle className="h-10 w-10 text-green-500 mb-2"/>
                                    <p className="font-semibold">¡Todo tranquilo!</p>
                                    <p className="text-sm">No hay ausencias programadas.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalle de la Ausencia</DialogTitle>
                        <DialogDescription>Revisa la información de la ausencia programada.</DialogDescription>
                    </DialogHeader>
                    {selectedEvent && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <p><strong>Empleado:</strong> {selectedEvent.employee.name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Info className="h-5 w-5 text-muted-foreground" />
                                <p><strong>Tipo:</strong> {selectedEvent.absenceType.name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <CalendarRange className="h-5 w-5 text-muted-foreground" />
                                <p>
                                    <strong>Periodo Completo:</strong> {format(safeParseDate(selectedEvent.absence.startDate)!, 'dd/MM/yyyy', {locale: es})} - {selectedEvent.absence.endDate ? format(safeParseDate(selectedEvent.absence.endDate)!, 'dd/MM/yyyy', {locale: es}) : 'Indefinido'}
                                </p>
                            </div>
                            {selectedEvent.absence.communicatedTo && (
                                <div className="flex items-center gap-3">
                                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                                    <p><strong>Comunicado a:</strong> {selectedEvent.absence.communicatedTo}</p>
                                </div>
                            )}
                            {selectedEvent.absence.notes && (
                                <div className="flex items-start gap-3">
                                    <MessageCircle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p><strong>Notas Adicionales:</strong></p>
                                        <p className="text-muted-foreground whitespace-pre-wrap">{selectedEvent.absence.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary">Cerrar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
