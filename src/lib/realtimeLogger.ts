/**
 * Utility for logging Supabase Realtime events in a structured way
 */

const LOG_PREFIX = '[Realtime]';

export const realtimeLogger = {
  subscribe: (channelName: string) => {
    if (import.meta.env.DEV) {
      console.log(`${LOG_PREFIX} 📡 Subscribed to channel:`, channelName);
    }
  },

  change: (channelName: string, event: string, payload: unknown) => {
    if (import.meta.env.DEV) {
      console.log(`${LOG_PREFIX} 🔄 [${channelName}] ${event}:`, payload);
    }
  },

  unsubscribe: (channelName: string) => {
    if (import.meta.env.DEV) {
      console.log(`${LOG_PREFIX} 🔌 Unsubscribed from channel:`, channelName);
    }
  },

  error: (channelName: string, error: unknown) => {
    console.error(`${LOG_PREFIX} ❌ [${channelName}] Error:`, error);
  },

  status: (channelName: string, status: string) => {
    if (import.meta.env.DEV) {
      console.log(`${LOG_PREFIX} 📊 [${channelName}] Status:`, status);
    }
  },
};
