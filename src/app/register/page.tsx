
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { createUserAccount } from '@/lib/actions/userActions';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: 'Error en la contraseña',
        description: 'Las contraseñas no coinciden.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
        const result = await createUserAccount({ email, password });
        if (result.success) {
            toast({
                title: '¡Registro completado!',
                description: 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
            });
            router.push('/login');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error en el registro',
        description: error instanceof Error ? error.message : 'No se pudo completar el registro.',
        variant: 'destructive',
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Image src="/logo.png" alt="Logo de la aplicación" width={112} height={112} />
            </div>
          <CardTitle className="text-2xl font-bold font-headline">Crear Cuenta</CardTitle>
          <CardDescription>Regístrate con el email que tienes registrado en INET</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu.email@ejemplo.com"
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
             <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Registrarse'}
            </Button>
          </form>
            <div className="mt-4 text-center text-sm">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/login" className="underline">
                    Inicia Sesión
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
