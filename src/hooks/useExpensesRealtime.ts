import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtimeLogger } from '@/lib/realtimeLogger';

interface UseExpensesRealtimeOptions {
  /**
   * Callback chamado quando há uma mudança na tabela expenses
   */
  onUpdate: () => void;
  
  /**
   * Nome do canal (único por componente para evitar conflitos)
   */
  channelName: string;
  
  /**
   * Se deve habilitar o realtime (default: true)
   */
  enabled?: boolean;
}

/**
 * Hook centralizado para subscrições Realtime da tabela expenses
 * 
 * Resolve o problema de "WebSocket is closed before connection established"
 * ao adicionar um delay no cleanup do canal e usar ref para mounted state.
 * 
 * @example
 * ```tsx
 * useExpensesRealtime({
 *   channelName: 'dashboard-expenses',
 *   onUpdate: () => loadData(),
 * });
 * ```
 */
export const useExpensesRealtime = ({
  onUpdate,
  channelName,
  enabled = true,
}: UseExpensesRealtimeOptions) => {
  const mountedRef = useRef(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'expenses',
        },
        (payload) => {
          if (!mountedRef.current) {
            realtimeLogger.status(channelName, 'Ignoring change (unmounted)');
            return;
          }

          realtimeLogger.change(
            channelName,
            payload.eventType || 'UNKNOWN',
            payload
          );

          // Chamar callback apenas se componente ainda está montado
          onUpdate();
        }
      )
      .subscribe((status) => {
        realtimeLogger.status(channelName, status);
        
        if (status === 'SUBSCRIBED') {
          realtimeLogger.subscribe(channelName);
        }
      });

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      
      // ⚡ FIX CRITICAL: Delay cleanup para evitar erro "WebSocket is closed"
      // Isso acontece quando o componente desmonta rapidamente (ex: navegação)
      setTimeout(() => {
        if (channelRef.current) {
          realtimeLogger.unsubscribe(channelName);
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }, 100);
    };
  }, [channelName, onUpdate, enabled]);
};
