import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'expense' | 'category' | 'account' | 'goal';
  entity_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface UseAuditLogsOptions {
  entity?: string;
  action?: string;
  limit?: number;
}

export const useAuditLogs = (options: UseAuditLogsOptions = {}) => {
  const { entity, action, limit = 100 } = options;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", entity, action, limit],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      let query = supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entity) {
        query = query.eq("entity", entity);
      }

      if (action) {
        query = query.eq("action", action);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
  });

  return {
    logs,
    isLoading,
  };
};
