
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // The redirect is handled by the root page.tsx now
      router.push('/');
    } catch (error) {
        console.error(error);
        let description = 'Las credenciales no son correctas. Por favor, inténtalo de nuevo.';
        if (error instanceof FirebaseError) {
          if (error.code === 'auth/api-key-not-valid') {
            description = 'Error de configuración: La API Key de Firebase no es válida. Revisa tu archivo .env.local.';
          } else if (error.code === 'auth/invalid-credential') {
            description = 'Email o contraseña incorrectos. Verifica tus credenciales.';
          }
        }
        toast({
            title: 'Error de autenticación',
            description: description,
            variant: 'destructive',
          });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Image src="/logo.png" alt="Logo de la aplicación" width={112} height={112} />
            </div>
          <CardTitle className="text-2xl font-bold font-headline">Iniciar Sesión</CardTitle>
          <CardDescription>Accede a tu panel de Control Horario</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Acceder'}
            </Button>
          </form>
            <div className="mt-4 text-center text-sm">
                ¿No tienes una cuenta?{' '}
                <Link href="/register" className="underline">
                    Regístrate
                </Link>
            </div>
            <div className="mt-2 text-center text-sm">
                 <Link href="/forgot-password" className="underline text-sm text-muted-foreground hover:text-primary">
                    ¿Olvidaste tu contraseña?
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
