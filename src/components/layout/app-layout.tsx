
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  LogOut,
  Bell,
  Menu,
  ListChecks,
  Plane,
  User,
  CalendarCheck,
  PlaneTakeoff,
  HelpCircle,
  Mail,
  MessageSquareWarning,
  CalendarClock,
  Home
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { useAuth } from '@/hooks/useAuth';
import { useDataProvider } from '@/hooks/use-data-provider';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-is-mobile';


export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, appUser, viewMode, setViewMode, loading: authLoading } = useAuth();
  const { unconfirmedWeeksDetails, employeeRecord, loading: dataLoading, unreadMessageCount, pendingCorrectionRequestCount } = useDataProvider();
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  useEffect(() => {
    if (authLoading || !appUser) return;
  
    const employeePages = ['/my-profile', '/my-schedule', '/my-messages', '/help'];
    const adminPages = ['/home', '/dashboard', '/schedule', '/employees', '/listings', '/vacations', '/calendar', '/messages', '/settings'];
  
    if (appUser.trueRole === 'admin') {
      if (viewMode === 'employee' && adminPages.some(p => pathname.startsWith(p))) {
        router.replace('/my-profile');
      } else if (viewMode === 'admin' && employeePages.some(p => pathname.startsWith(p))) {
        router.replace('/home');
      }
    } else if (appUser.trueRole === 'employee') {
      // For regular employees, ensure they don't access admin pages.
      const isAccessingAdminPage = adminPages.some(p => pathname.startsWith(p));
      if (isAccessingAdminPage) {
        router.replace('/my-profile');
      }
    }
  }, [viewMode, appUser, pathname, router, authLoading]);

  const getInitials = (name: string | undefined | null, email: string | undefined | null): string => {
    if (name) {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (email) {
        const emailPrefix = email.split('@')[0];
        return emailPrefix.substring(0, 2).toUpperCase();
    }
    return 'U';
  }


  const adminNavItems = [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/schedule', label: 'Horario', icon: CalendarDays, notification: pendingCorrectionRequestCount > 0 },
    { href: '/employees', label: 'Empleados', icon: Users },
    { href: '/listings', label: 'Formularios', icon: ListChecks },
    { href: '/vacations', label: 'Vacaciones', icon: Plane },
    { href: '/settings', label: 'Ajustes', icon: Settings },
  ];
  
  const employeeMenuItems = [
    { href: '/my-profile', label: 'Ficha', icon: User },
    { href: '/my-schedule', label: 'Presencias', icon: CalendarCheck },
    { href: '/my-messages', label: 'Mensajes', icon: Mail, notification: unreadMessageCount > 0 },
    { href: '/help', label: 'Ayuda', icon: HelpCircle },
  ];

  // The mobile nav will contain all items
  const mobileAdminNavItems = [
    { href: '/home', label: 'Inicio', icon: Home },
    ...adminNavItems,
  ];

  const menuItems = viewMode === 'admin' ? (isMobile ? mobileAdminNavItems : adminNavItems) : employeeMenuItems;

  const MainNav = ({className, isMobileNav}: {className?: string, isMobileNav?: boolean}) => (
    <nav className={cn("flex gap-1", isMobileNav ? "flex-col items-stretch" : 'justify-center items-center')}>
      {menuItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        if (isMobileNav) {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                'flex items-center justify-between p-3 rounded-md transition-colors text-lg',
                isActive ? 'bg-muted font-semibold' : 'hover:bg-muted'
              )}
            >
              <span>{item.label}</span>
              {item.notification && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                </span>
              )}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center justify-center gap-1 p-2 rounded-md transition-colors relative',
              'flex-col text-center h-16 w-16 sm:h-auto sm:w-auto',
              isActive
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
            {item.notification && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 inset-x-0 flex h-20 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6 z-10">
        
        {viewMode === 'admin' && (
          <Link href="/home" className="flex items-center gap-2 font-semibold">
              <Image src="/logo.png" alt="Logo" width={70} height={70} className="h-[70px] w-[70px]" />
          </Link>
        )}
        
        <div className={cn(
            "flex-1 justify-center",
            viewMode === 'admin' ? 'hidden md:flex' : 'flex'
        )}>
            <MainNav isMobileNav={false} />
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
             {viewMode === 'admin' && (
              <TooltipProvider>
                <div className="flex items-center gap-1">
                   <Link
                        href="/calendar"
                        className={cn(
                            'flex items-center justify-center gap-1 p-2 rounded-md transition-colors relative flex-col text-center h-16 w-16 sm:h-auto sm:w-auto',
                            pathname.startsWith('/calendar')
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                    >
                        <CalendarClock className="h-5 w-5" />
                        <span className="text-xs font-medium">Calendario</span>
                    </Link>
                  <Link
                        href="/messages"
                        className={cn(
                            'flex items-center justify-center gap-1 p-2 rounded-md transition-colors relative flex-col text-center h-16 w-16 sm:h-auto sm:w-auto',
                            pathname.startsWith('/messages')
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                    >
                        <Mail className="h-5 w-5" />
                        <span className="text-xs font-medium">Mensajes</span>
                        {unreadMessageCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                            </span>
                        )}
                    </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="relative">
                                  <Bell className="h-5 w-5" />
                                  {unconfirmedWeeksDetails.length > 0 && (
                                      <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                                      </span>
                                  )}
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-80">
                              <DropdownMenuLabel>Semanas Anteriores Sin Confirmar</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {unconfirmedWeeksDetails.length > 0 ? (
                                  unconfirmedWeeksDetails.map(detail => (
                                      <TooltipProvider key={detail.weekId}>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Link href={`/schedule?week=${detail.weekId}`} passHref>
                                                      <DropdownMenuItem>
                                                          Semana del {format(parseISO(detail.weekId), 'd MMM, yyyy', { locale: es })}
                                                      </DropdownMenuItem>
                                                  </Link>
                                              </TooltipTrigger>
                                              <TooltipContent side="left">
                                                  <p className='font-medium'>Empleados pendientes:</p>
                                                  <ul className="list-disc pl-4 text-muted-foreground">
                                                      {detail.employeeNames.map(name => <li key={name}>{name}</li>)}
                                                  </ul>
                                              </TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  ))
                              ) : (
                                  <DropdownMenuItem disabled>No hay semanas pendientes.</DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TooltipTrigger>
                    <TooltipContent>Notificaciones</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(employeeRecord?.name, user?.email)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                    {appUser?.trueRole === 'admin' && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <span>Cambiar Vista</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setViewMode('admin')}>Administrador</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setViewMode('employee')}>Empleado</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {isMobile && viewMode === 'admin' && (
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menú</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex flex-col">
                    <Link href="/home" className="flex items-center gap-2 font-semibold mb-4">
                        <Image src="/logo.png" alt="Logo" width={60} height={60} className="h-14 w-14" />
                        <span className="text-xl">Control Horario</span>
                    </Link>
                    <MainNav isMobileNav={true} />
                </SheetContent>
              </Sheet>
            )}
        </div>
      </header>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
