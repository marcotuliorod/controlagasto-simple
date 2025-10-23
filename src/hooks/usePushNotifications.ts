import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  const subscribe = async () => {
    if (!isSupported) {
      toast.error('Push notifications não são suportadas neste navegador');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error('Permissão de notificações negada');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        await saveSubscription(existingSubscription);
        toast.success('Notificações já estão ativadas');
        return;
      }

      // Subscribe to push notifications
      // Note: In production, you would get the VAPID public key from your backend
      const vapidKey = urlBase64ToUint8Array(
        // This is a placeholder - in production, use your actual VAPID public key
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmrEC_qEkdS_ixj3YmzYMa8' +
        'YEJEYj5LxWR1kZF8B6l1LjcQ9zNQ0'
      );
      
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey.buffer as ArrayBuffer,
      });

      setSubscription(newSubscription);
      setIsSubscribed(true);
      await saveSubscription(newSubscription);
      toast.success('Notificações ativadas com sucesso!');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Erro ao ativar notificações');
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      await deleteSubscription(subscription);
      setSubscription(null);
      setIsSubscribed(false);
      toast.success('Notificações desativadas');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Erro ao desativar notificações');
    }
  };

  const saveSubscription = async (subscription: PushSubscription) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // In a real implementation, you would save this to your database
    // For now, we'll just store it in localStorage
    localStorage.setItem('push-subscription', JSON.stringify(subscription));
  };

  const deleteSubscription = async (subscription: PushSubscription) => {
    // In a real implementation, you would delete this from your database
    localStorage.removeItem('push-subscription');
  };

  return {
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
