import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function Health() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    const results: HealthCheck[] = [];

    // Check 1: Browser Info
    try {
      const userAgent = navigator.userAgent;
      const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
      results.push({
        name: 'Navegador',
        status: 'ok',
        message: isSafari ? 'Safari detectado' : 'Outro navegador',
        details: userAgent
      });
    } catch (error) {
      results.push({
        name: 'Navegador',
        status: 'error',
        message: 'Erro ao detectar navegador',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check 2: Service Worker
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        results.push({
          name: 'Service Worker',
          status: registration ? 'ok' : 'warning',
          message: registration ? 'Registrado' : 'Não registrado',
          details: registration?.active?.scriptURL
        });
      } else {
        results.push({
          name: 'Service Worker',
          status: 'warning',
          message: 'Não suportado',
          details: 'Service Worker API não disponível'
        });
      }
    } catch (error) {
      results.push({
        name: 'Service Worker',
        status: 'error',
        message: 'Erro ao verificar',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check 3: Supabase Connection
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      results.push({
        name: 'Conexão Backend',
        status: 'ok',
        message: 'Conectado',
        details: 'Query bem-sucedida'
      });
    } catch (error) {
      results.push({
        name: 'Conexão Backend',
        status: 'error',
        message: 'Erro de conexão',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check 4: Auth Status
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      results.push({
        name: 'Autenticação',
        status: data.session ? 'ok' : 'warning',
        message: data.session ? 'Sessão ativa' : 'Sem sessão',
        details: data.session?.user?.email
      });
    } catch (error) {
      results.push({
        name: 'Autenticação',
        status: 'error',
        message: 'Erro ao verificar',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check 5: LocalStorage
    try {
      localStorage.setItem('health_check', 'ok');
      const test = localStorage.getItem('health_check');
      localStorage.removeItem('health_check');
      results.push({
        name: 'LocalStorage',
        status: test === 'ok' ? 'ok' : 'error',
        message: test === 'ok' ? 'Funcionando' : 'Não funciona',
        details: 'Teste de leitura/escrita'
      });
    } catch (error) {
      results.push({
        name: 'LocalStorage',
        status: 'error',
        message: 'Não disponível',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setChecks(results);
    setIsLoading(false);
  };

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    const variants = {
      ok: 'default',
      error: 'destructive',
      warning: 'secondary'
    } as const;
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const overallStatus = checks.every(c => c.status === 'ok') ? 'ok' : 
                        checks.some(c => c.status === 'error') ? 'error' : 'warning';

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Diagnóstico do Sistema</h1>
          <p className="text-muted-foreground">
            Verificação de saúde dos componentes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status Geral</CardTitle>
              <CardDescription>
                {isLoading ? 'Verificando...' : 'Verificação concluída'}
              </CardDescription>
            </div>
            {!isLoading && getStatusBadge(overallStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Executando verificações...</p>
          ) : (
            checks.map((check, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(check.status)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{check.name}</p>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                  {check.details && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">
                        Detalhes
                      </summary>
                      <pre className="mt-1 p-2 bg-muted rounded overflow-auto">
                        {check.details}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plataforma:</span>
            <span className="font-mono">{navigator.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Idioma:</span>
            <span className="font-mono">{navigator.language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Online:</span>
            <span className="font-mono">{navigator.onLine ? 'Sim' : 'Não'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cookies:</span>
            <span className="font-mono">{navigator.cookieEnabled ? 'Habilitados' : 'Desabilitados'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
