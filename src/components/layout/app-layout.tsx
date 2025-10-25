
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
  const { user, logout } = useAuth();
  const { unconfirmedWeeksDetails, appUser, employeeRecord, viewMode, setViewMode, loading: dataLoading, unreadMessageCount } = useDataProvider();
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  useEffect(() => {
    if (!appUser || !appUser.trueRole) return;
    
    const employeePages = ['/my-profile', '/my-schedule', '/my-messages', '/help'];
    const adminPages = ['/dashboard', '/schedule', '/employees', '/listings', '/vacations', '/messages', '/settings'];

    if (appUser.trueRole === 'admin') {
      if (viewMode === 'employee' && !employeePages.some(p => pathname.startsWith(p))) {
        router.replace('/my-profile');
      } 
      else if (viewMode === 'admin' && employeePages.some(p => pathname.startsWith(p))) {
        router.replace('/dashboard');
      }
    }
  }, [viewMode, appUser, pathname, router]);

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


  const adminMenuItems = [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/schedule', label: 'Horario', icon: CalendarDays },
    { href: '/employees', label: 'Empleados', icon: Users },
    { href: '/listings', label: 'Listados', icon: ListChecks },
    { href: '/vacations', label: 'Vacaciones', icon: Plane },
    { href: '/messages', label: 'Mensajes', icon: Mail, notification: unreadMessageCount > 0 },
    { href: '/settings', label: 'Ajustes', icon: Settings },
  ];
  
  const employeeMenuItems = [
    { href: '/my-profile', label: 'Mi Ficha', icon: User },
    { href: '/my-schedule', label: 'Mis Presencias', icon: CalendarCheck },
    { href: '/my-messages', label: 'Mis Mensajes', icon: Mail, notification: unreadMessageCount > 0 },
    { href: '/help', label: 'Ayuda', icon: HelpCircle },
  ];

  const isAdminView = appUser?.role === 'admin';
  const menuItems = isAdminView ? adminMenuItems : employeeMenuItems;

  const MainNav = ({className, isMobileNav}: {className?: string, isMobileNav?: boolean}) => (
    <nav className={className}>
        {menuItems.map((item) => {
             const isActive = pathname.startsWith(item.href);

            return (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobileNav && setMobileNavOpen(false)}
                    className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-base md:text-sm font-medium transition-colors relative',
                        isMobileNav && 'text-foreground',
                        isActive
                            ? 'bg-primary text-white font-semibold'
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    {!isMobileNav && <span>{item.label}</span>}
                     {isMobileNav && <span className="text-lg">{item.label}</span>}
                    {item.notification && (
                         <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                        </span>
                    )}
                </Link>
            )
        })}
    </nav>
  );

  if (dataLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Cargando datos...</p>
                <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                    <div className="h-full bg-primary animate-pulse w-full"></div>
                </div>
            </div>
        </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 inset-x-0 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6 z-10">
        
        <div className="flex items-center gap-2">
            {isMobile && isAdminView ? (
                 <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Abrir menú</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col">
                        <Link href={isAdminView ? "/dashboard" : "/my-profile"} className="flex items-center gap-2 font-semibold mb-4">
                            <Image src="/logo.png" alt="Logo" width={40} height={40} className="h-10 w-10" />
                            <span>Control Horario</span>
                        </Link>
                        <MainNav className="flex flex-col gap-2" isMobileNav={true} />
                    </SheetContent>
                </Sheet>
            ) : (
                 <Link href={isAdminView ? "/dashboard" : "/my-profile"} className="flex items-center gap-2 font-semibold">
                    <Image src="/logo.png" alt="Logo" width={40} height={40} className="h-10 w-10" />
                 </Link>
            )}
        </div>
        
        <div className={cn("flex-1 justify-center", isMobile ? (isAdminView ? "hidden" : "flex") : "flex")}>
             <MainNav className="flex items-center gap-1" />
        </div>
        
        <div className="flex items-center gap-4 ml-auto">
            {isAdminView && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full relative">
                          <Bell className="h-5 w-5" />
                          {unconfirmedWeeksDetails.length > 0 && (
                              <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                              </span>
                          )}
                          <span className="sr-only">Alternar notificaciones</span>
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
        </div>
      </header>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

    

    