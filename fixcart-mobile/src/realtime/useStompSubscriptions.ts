declare const process: { env: Record<string, string | undefined> };

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { useEffect, useMemo, useRef, useState } from 'react';

type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

type Handlers = Record<string, (message: IMessage) => void>;

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8080').replace(/\/$/, '');
const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws`;

export function useStompSubscriptions(destinations: string[], handlers: Handlers, enabled = true) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const handlersRef = useRef<Handlers>(handlers);
  const destinationKey = useMemo(() => destinations.filter(Boolean).sort().join('|'), [destinations]);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const activeDestinations = destinations.filter(Boolean);
    if (!enabled || !activeDestinations.length) {
      setStatus('disconnected');
      return;
    }

    let subscriptions: StompSubscription[] = [];
    let mounted = true;

    const client = new Client({
      webSocketFactory: () => new WebSocket(WS_URL, ['v12.stomp', 'v11.stomp', 'v10.stomp']),
      reconnectDelay: 4000,
      connectionTimeout: 10000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      appendMissingNULLonIncoming: true,
      debug: () => undefined,
      onConnect: () => {
        if (!mounted) return;
        setStatus('connected');
        subscriptions = activeDestinations.map((destination) =>
          client.subscribe(destination, (message) => {
            handlersRef.current[destination]?.(message);
          })
        );
      },
      onStompError: () => {
        if (mounted) setStatus('error');
      },
      onWebSocketError: () => {
        if (mounted) setStatus('error');
      },
      onDisconnect: () => {
        if (mounted) setStatus('disconnected');
      },
      onWebSocketClose: () => {
        if (mounted) {
          setStatus((current) => (current === 'connected' || current === 'connecting' ? 'reconnecting' : current));
        }
      },
    });

    setStatus('connecting');
    client.activate();

    return () => {
      mounted = false;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      void client.deactivate();
      setStatus('disconnected');
    };
  }, [enabled, destinationKey]);

  return status;
}
