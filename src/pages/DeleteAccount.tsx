import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAccount() {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "EXCLUIR") {
      toast.error('Digite "EXCLUIR" para confirmar');
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: confirmText },
      });

      if (error) throw error;

      if (data?.ok) {
        toast.success("Conta excluída com sucesso");
        await supabase.auth.signOut();
        navigate("/");
      } else {
        throw new Error(data?.error || "Erro ao excluir conta");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir conta");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Excluir Conta</h1>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex items-start gap-4 p-4 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-destructive">Atenção: Esta ação é irreversível</h3>
              <p className="text-sm text-muted-foreground">
                Ao excluir sua conta, todos os seus dados serão permanentemente removidos:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                <li>Todas as suas despesas registradas</li>
                <li>Suas categorias personalizadas</li>
                <li>Suas metas financeiras</li>
                <li>Imagens de cupons fiscais armazenados</li>
                <li>Seu perfil e configurações</li>
                <li>Todas as notificações</li>
              </ul>
              <p className="text-sm text-muted-foreground font-semibold mt-4">
                Esta ação NÃO pode ser desfeita. Seus dados não poderão ser recuperados.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Se você tem certeza de que deseja excluir sua conta permanentemente,
              digite <span className="font-mono font-bold">EXCLUIR</span> no campo
              abaixo e clique no botão.
            </p>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Digite "EXCLUIR" para confirmar
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="font-mono"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== "EXCLUIR" || isDeleting}
                className="flex-1"
              >
                {isDeleting ? "Excluindo..." : "Excluir Conta Permanentemente"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            <strong>Alternativa:</strong> Se você está preocupado com privacidade,
            mas não quer perder seus dados, considere exportar seus dados antes de
            excluir sua conta. Você pode fazer isso na página de Relatórios.
          </p>
        </Card>
      </div>
    </div>
  );
}
