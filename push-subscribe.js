/**
 * push-subscribe.js
 * Registers the user's browser for Web Push notifications.
 * Include this script on app.html (after supabase-config.js).
 */
(function () {
  'use strict';

  const VAPID_PUBLIC_KEY = 'BPmyrMW1NiZqb25DVlE69C-7Gg1_oRE6atsluY-MJSlk16Dp-aU2LawmxNaRAHMVCk4aXNG8BSEr1D4QuO66jzE';
  const API_BASE = (typeof VPS_API !== 'undefined' ? VPS_API : 'https://api.afrahtafreeh.site');

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  async function getUserId() {
    try {
      if (window._supabase) {
        const { data: { session } } = await window._supabase.auth.getSession();
        return session?.user?.id || null;
      }
    } catch (_) {}
    return null;
  }

  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const reg = await navigator.serviceWorker.ready;

      // Check existing subscription
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        // Request new subscription
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const userId    = await getUserId();
      const userAgent = navigator.userAgent;

      await fetch(API_BASE + '/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription, userAgent })
      });

    } catch (err) {
      // Silent — push subscription is best-effort
      console.warn('Push subscription error:', err.message);
    }
  }

  async function askForPushPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      await subscribeToPush();
      return;
    }
    if (Notification.permission === 'denied') return;

    // Ask after a short delay so it doesn't feel intrusive
    setTimeout(async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
      }
    }, 3000);
  }

  // Run when the page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', askForPushPermission);
  } else {
    askForPushPermission();
  }

  // Expose for manual re-subscribe (e.g. from a settings toggle)
  window.requestPushPermission = askForPushPermission;
})();
