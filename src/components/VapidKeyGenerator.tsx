import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Key, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
  instructions: string[];
}

export function VapidKeyGenerator() {
  const [keys, setKeys] = useState<VapidKeys | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<{ public: boolean; private: boolean }>({
    public: false,
    private: false,
  });

  const generateKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-vapid-keys");
      
      if (error) throw error;
      
      setKeys(data);
      toast.success("Chaves VAPID geradas com sucesso!");
    } catch (error: any) {
      console.error("Error generating VAPID keys:", error);
      toast.error("Erro ao gerar chaves VAPID: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "public" | "private") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [type]: true });
      toast.success(`Chave ${type === "public" ? "pública" : "privada"} copiada!`);
      setTimeout(() => setCopied({ ...copied, [type]: false }), 2000);
    } catch (error) {
      toast.error("Erro ao copiar para área de transferência");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Configuração de Notificações Push</CardTitle>
            <CardDescription>
              Gere e configure as chaves VAPID para habilitar notificações push
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!keys ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Para habilitar notificações push, você precisa gerar chaves VAPID e configurá-las no sistema.
              </AlertDescription>
            </Alert>
            <Button onClick={generateKeys} disabled={loading} className="w-full">
              {loading ? "Gerando..." : "Gerar Chaves VAPID"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Chaves geradas com sucesso! Siga as instruções abaixo:
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Chave Pública (Public Key)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keys.publicKey}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(keys.publicKey, "public")}
                  >
                    {copied.public ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta chave será usada no código frontend
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Chave Privada (Private Key)</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keys.privateKey}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(keys.privateKey, "private")}
                  >
                    {copied.private ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta chave deve ser guardada como secret no backend
                </p>
              </div>
            </div>

            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-medium">Próximos passos:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {keys.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </AlertDescription>
            </Alert>

            <Button onClick={() => setKeys(null)} variant="outline" className="w-full">
              Gerar Novas Chaves
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
