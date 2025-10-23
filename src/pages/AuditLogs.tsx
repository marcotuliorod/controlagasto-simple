import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";

const AuditLogs = () => {
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");

  const { logs, isLoading } = useAuditLogs({
    entity: entityFilter || undefined,
    action: actionFilter || undefined,
    limit: 200,
  });

  const actionCounts = logs?.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const entityCounts = logs?.reduce((acc, log) => {
    acc[log.entity] = (acc[log.entity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 pb-24 md:pb-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Audit Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Histórico de todas as ações realizadas na plataforma
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Ações por Tipo
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {actionCounts?.CREATE || 0}
                </div>
                <div className="text-xs text-muted-foreground">Criações</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">
                  {actionCounts?.UPDATE || 0}
                </div>
                <div className="text-xs text-muted-foreground">Edições</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {actionCounts?.DELETE || 0}
                </div>
                <div className="text-xs text-muted-foreground">Exclusões</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Registros por Entidade
            </div>
            <div className="space-y-2">
              {Object.entries(entityCounts || {}).map(([entity, count]) => (
                <div key={entity} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{entity}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex gap-4 items-center">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as Entidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Entidades</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
              <SelectItem value="category">Categorias</SelectItem>
              <SelectItem value="account">Contas</SelectItem>
              <SelectItem value="goal">Metas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as Ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Ações</SelectItem>
              <SelectItem value="CREATE">Criações</SelectItem>
              <SelectItem value="UPDATE">Edições</SelectItem>
              <SelectItem value="DELETE">Exclusões</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <AuditLogViewer key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhum registro de auditoria encontrado
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AuditLogs;
