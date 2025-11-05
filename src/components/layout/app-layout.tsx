
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
  Wrench,
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
  Home,
  BookUser
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
  const { employeeRecord, loading: dataLoading, unreadMessageCount, pendingCorrectionRequestCount, unconfirmedWeeksDetails, conversations } = useDataProvider();
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

  const unreadConversationsForAdmin = (conversations || []).filter(c => appUser && !c.readBy?.includes(appUser.id)).length;


  const adminNavItemsMain = [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/schedule', label: 'Horario', icon: CalendarDays, notification: pendingCorrectionRequestCount > 0 },
    { href: '/employees', label: 'Empleados', icon: Users },
    { href: '/listings', label: 'Formularios', icon: ListChecks },
    { href: '/vacations', label: 'Vacaciones', icon: Plane },
    { href: '/settings', label: 'Ajustes', icon: Wrench },
  ];

  const adminNavItemsRight = [
    { href: '/calendar', label: 'Calendario', icon: CalendarClock },
    { href: '/messages', label: 'Mensajes', icon: Mail, notification: unreadConversationsForAdmin > 0 },
  ]
  
  const employeeMenuItems = [
    { href: '/my-profile', label: 'Ficha', icon: User },
    { href: '/my-schedule', label: 'Presencias', icon: CalendarCheck },
    { href: '/my-messages', label: 'Mensajes', icon: Mail, notification: unreadMessageCount > 0 },
    { href: '/help', label: 'Ayuda', icon: HelpCircle },
  ];

  const menuItems = viewMode === 'admin' ? [...adminNavItemsMain, ...adminNavItemsRight] : employeeMenuItems;

  const NavLink = ({ item, isMobileNav }: {item: typeof menuItems[0], isMobileNav?: boolean}) => {
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
          <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
          </div>
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
          'flex-col text-center h-auto w-16 sm:h-auto sm:w-auto',
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
  };

  const MainNav = ({ isMobileNav }: { isMobileNav?: boolean }) => {
    if (isMobileNav) {
      return (
        <nav className="flex flex-col items-stretch gap-1">
          {menuItems.map(item => <NavLink key={item.href} item={item} isMobileNav />)}
        </nav>
      );
    }
  
    if (viewMode === 'employee') {
      return (
        <nav className="flex items-center justify-center gap-1">
          {employeeMenuItems.map(item => <NavLink key={item.href} item={item} />)}
        </nav>
      );
    }
  
    return (
      <div className="flex w-full items-center justify-between">
        <nav className="flex items-center gap-1">
          {adminNavItemsMain.map(item => <NavLink key={item.href} item={item} />)}
        </nav>
        <nav className="flex items-center gap-1">
          {adminNavItemsRight.map(item => <NavLink key={item.href} item={item} />)}
        </nav>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 inset-x-0 flex h-20 shrink-0 items-center gap-4 border-b bg-gradient-to-l from-primary/10 to-background px-4 md:px-6 z-10">
        
        <Link href={viewMode === 'admin' ? '/home' : '/my-profile'} className="flex items-center gap-2 font-semibold">
            <Image src="/logo.png" alt="Logo" width={70} height={70} className="h-[70px] w-[70px]" />
        </Link>
        
        <div className={cn(
            "flex-1",
            isMobile ? 'hidden' : 'flex'
        )}>
            <MainNav isMobileNav={false} />
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
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
            {isMobile && (
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menú</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex flex-col">
                    <Link href={viewMode === 'admin' ? '/home' : '/my-profile'} className="flex items-center gap-2 font-semibold mb-4" onClick={() => setMobileNavOpen(false)}>
                        <Image src="/logo.png" alt="Logo" width={60} height={60} className="h-14 w-14" />
                        <span className="text-xl">Control Horario</span>
                    </Link>
                    <MainNav isMobileNav={true} />
                </SheetContent>
              </Sheet>
            )}
        </div>
      </header>
      <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-t from-primary/10 to-transparent">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
