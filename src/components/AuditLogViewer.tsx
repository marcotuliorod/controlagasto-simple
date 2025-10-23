import { useState } from "react";
import { AuditLog } from "@/hooks/useAuditLogs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLogViewerProps {
  log: AuditLog;
}

const actionIcons = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
};

const actionColors = {
  CREATE: "bg-green-500/10 text-green-500 border-green-500/20",
  UPDATE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
};

const entityLabels: Record<string, string> = {
  expense: "Despesa",
  category: "Categoria",
  account: "Conta",
  goal: "Meta",
};

export const AuditLogViewer = ({ log }: AuditLogViewerProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const ActionIcon = actionIcons[log.action];

  const getChangedFields = () => {
    if (log.action === "CREATE") return null;
    if (log.action === "DELETE") return null;
    if (!log.before_data || !log.after_data) return null;

    const changes: Array<{ field: string; before: any; after: any }> = [];
    const beforeData = log.before_data;
    const afterData = log.after_data;

    Object.keys(afterData).forEach((key) => {
      if (
        key !== "updated_at" &&
        key !== "created_at" &&
        JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key])
      ) {
        changes.push({
          field: key,
          before: beforeData[key],
          after: afterData[key],
        });
      }
    });

    return changes.length > 0 ? changes : null;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "number") return value.toLocaleString("pt-BR");
    if (typeof value === "string") {
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
          return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
        } catch {
          return value;
        }
      }
      return value;
    }
    return JSON.stringify(value);
  };

  const changes = getChangedFields();

  return (
    <>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${actionColors[log.action]}`}>
              <ActionIcon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {log.action}
                </Badge>
                <span className="text-sm font-medium">{entityLabels[log.entity]}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
              </p>

              {changes && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {changes.length} campo(s) alterado(s)
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(true)}
            className="ml-2"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ActionIcon className="h-5 w-5" />
              Detalhes do Audit Log
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ação</p>
                <Badge className={actionColors[log.action]}>{log.action}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entidade</p>
                <p className="text-sm font-semibold">{entityLabels[log.entity]}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                <p className="text-sm">
                  {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID da Entidade</p>
                <p className="text-xs font-mono">{log.entity_id}</p>
              </div>
            </div>

            {log.action === "UPDATE" && changes && changes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Alterações</h3>
                <div className="space-y-3">
                  {changes.map((change, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                      <p className="text-sm font-medium mb-2">{change.field}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Antes:</span>
                          <p className="mt-1 font-mono bg-red-500/10 p-2 rounded">
                            {formatValue(change.before)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Depois:</span>
                          <p className="mt-1 font-mono bg-green-500/10 p-2 rounded">
                            {formatValue(change.after)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {log.action === "CREATE" && log.after_data && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Dados Criados</h3>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                  {JSON.stringify(log.after_data, null, 2)}
                </pre>
              </div>
            )}

            {log.action === "DELETE" && log.before_data && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Dados Excluídos</h3>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                  {JSON.stringify(log.before_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
