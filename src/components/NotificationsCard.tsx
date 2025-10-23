import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, TrendingDown, AlertTriangle, X } from "lucide-react";
import { useNotifications, useMarkAsRead } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function NotificationsCard() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id);
    } catch (error) {
      toast.error("Erro ao marcar como lida");
    }
  };

  const unreadNotifications = notifications?.filter((n) => !n.read) || [];

  if (isLoading) {
    return (
      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold">Alertas Financeiros</h2>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!unreadNotifications.length) {
    return null; // Don't show card if no unread notifications
  }

  return (
    <Card className="p-6 shadow-card border-warning/50">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-warning" />
        <h2 className="text-xl font-semibold">Alertas Financeiros</h2>
        <Badge variant="destructive" className="ml-auto">
          {unreadNotifications.length}
        </Badge>
      </div>
      <div className="space-y-3">
        {unreadNotifications.map((notification) => {
          const payload = notification.payload;
          const isIncrease = payload.type === "increase";
          const isNew = payload.type === "new_category";

          return (
            <div
              key={notification.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20"
            >
              <div className="flex-shrink-0 mt-0.5">
                {isNew ? (
                  <AlertTriangle className="w-5 h-5 text-warning" />
                ) : isIncrease ? (
                  <TrendingUp className="w-5 h-5 text-destructive" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-success" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">{payload.category_name}</p>
                {isNew ? (
                  <p className="text-xs text-muted-foreground">
                    Nova categoria de gasto detectada: R${" "}
                    {payload.current_amount?.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {isIncrease ? "Aumento" : "Redução"} de{" "}
                      {Math.abs(payload.variation_percent).toFixed(1)}% comparado ao mês
                      anterior
                    </p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-muted-foreground">
                        Anterior: R${" "}
                        {payload.previous_amount?.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        Atual: R${" "}
                        {payload.current_amount?.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkAsRead(notification.id)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
