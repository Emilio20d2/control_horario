
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { sendPasswordResetEmail } from '@/lib/actions/userActions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const result = await sendPasswordResetEmail(email);
        if (result.success) {
            toast({
                title: 'Petición enviada',
                description: result.message,
            });
            setSubmitted(true);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo procesar la solicitud.',
        variant: 'destructive',
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/30 dark:to-background">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Image src="/logo.png" alt="Logo de la aplicación" width={112} height={112} />
            </div>
          <CardTitle className="text-2xl font-bold font-headline">Recuperar Contraseña</CardTitle>
          <CardDescription>
            {submitted
              ? 'Revisa tu bandeja de entrada (y la de spam).'
              : 'Introduce tu email para recibir un enlace de recuperación.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
             <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                    Se ha enviado un enlace a <strong>{email}</strong> si la cuenta existe.
                </p>
                <Button variant="outline" asChild className="w-full">
                    <Link href="/login">Volver a Iniciar Sesión</Link>
                </Button>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
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
                <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enviar Enlace'}
                </Button>
            </form>
          )}
          {!submitted && (
             <div className="mt-4 text-center text-sm">
                <Link href="/login" className="underline">
                    Volver a Iniciar Sesión
                </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
