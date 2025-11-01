
'use client';

import { useDataProvider } from '@/hooks/use-data-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, addWeeks, startOfWeek, endOfWeek, isAfter, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Employee, ScheduledAbsence } from '@/lib/types';


export default function HomePage() {
    const { 
        loading, 
        unconfirmedWeeksDetails, 
        conversations, 
        employees, 
        absenceTypes
    } = useDataProvider();

    const unreadConversations = useMemo(() => {
        return conversations.filter(c => c.unreadByAdmin).slice(0, 5);
    }, [conversations]);
    
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        const next5WeeksStart = startOfWeek(now, { weekStartsOn: 1 });
        const next5WeeksEnd = endOfWeek(addWeeks(now, 4), { weekStartsOn: 1 });

        const events: { weekId: string; employee: Employee; absence: ScheduledAbsence; absenceType: any }[] = [];

        employees.forEach(emp => {
            (emp.employmentPeriods || []).forEach(p => {
                (p.scheduledAbsences || []).forEach(a => {
                    const startDate = a.startDate;
                    if (!startDate || !a.endDate) return;

                    const absenceInterval = { start: startDate, end: a.endDate };
                    if (isAfter(absenceInterval.end, next5WeeksStart) && isAfter(next5WeeksEnd, absenceInterval.start)) {
                        const absenceType = absenceTypes.find(at => at.id === a.absenceTypeId);
                        if (absenceType) {
                            const weekId = format(startOfWeek(startDate, {weekStartsOn: 1}), 'yyyy-MM-dd');
                            events.push({ weekId, employee: emp, absence: a, absenceType });
                        }
                    }
                });
            });
        });
        
        return events.sort((a,b) => a.absence.startDate.getTime() - b.absence.startDate.getTime());

    }, [employees, absenceTypes]);


    if (loading) {
        return (
            <div className="p-4 md:p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline">Inicio</h1>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Semanas Pendientes de Confirmar
                        </CardTitle>
                        <CardDescription>Semanas pasadas que requieren tu atención.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        {unconfirmedWeeksDetails.length > 0 ? (
                            <ScrollArea className="h-48">
                                <div className="space-y-2">
                                    {unconfirmedWeeksDetails.map(detail => (
                                        <div key={detail.weekId} className="flex items-center justify-between p-2 rounded-md border">
                                            <div>
                                                <p className="font-semibold text-sm">Semana del {format(parseISO(detail.weekId), 'dd/MM/yyyy', { locale: es })}</p>
                                                <p className="text-xs text-muted-foreground">{detail.employeeNames.join(', ')}</p>
                                            </div>
                                            <Button asChild variant="secondary" size="sm">
                                                <Link href={`/schedule?week=${detail.weekId}`}>Revisar</Link>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>¡Ninguna semana pendiente!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            Mensajes Sin Leer
                        </CardTitle>
                        <CardDescription>Conversaciones con mensajes nuevos de empleados.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        {unreadConversations.length > 0 ? (
                             <ScrollArea className="h-48">
                                <div className="space-y-2">
                                    {unreadConversations.map(conv => (
                                        <Link key={conv.id} href="/messages">
                                            <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted">
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarFallback>{conv.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-sm">{conv.employeeName}</p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{conv.lastMessageText}</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>Bandeja de entrada al día.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-primary" />
                            Próximos Eventos en la Agenda
                        </CardTitle>
                        <CardDescription>Ausencias programadas en las próximas 5 semanas.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                         {upcomingEvents.length > 0 ? (
                             <ScrollArea className="h-48">
                                <div className="space-y-2">
                                    {upcomingEvents.map((event, index) => (
                                        <div key={index} className="flex items-start gap-4 p-3 rounded-md border" style={{ backgroundColor: `${event.absenceType.color}20`}}>
                                            <div className="text-center w-16 shrink-0">
                                                <p className="font-bold text-sm capitalize">{format(event.absence.startDate, 'E', { locale: es })}</p>
                                                <p className="text-xs text-muted-foreground">{format(event.absence.startDate, 'dd MMM', { locale: es })}</p>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{event.employee.name}</p>
                                                <p className="text-xs font-medium" style={{color: event.absenceType.color ? event.absenceType.color : 'inherit'}}>{event.absenceType.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                         ) : (
                             <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>No hay ausencias programadas.</p>
                            </div>
                         )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
