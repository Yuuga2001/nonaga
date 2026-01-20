// Simple GraphQL client without aws-amplify dependency
// This provides better compatibility with older mobile browsers

const APPSYNC_ENDPOINT = import.meta.env.VITE_APPSYNC_ENDPOINT;
const APPSYNC_API_KEY = import.meta.env.VITE_APPSYNC_API_KEY;

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(APPSYNC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': APPSYNC_API_KEY,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// WebSocket subscription for real-time updates
export function createSubscription(
  query: string,
  variables: Record<string, unknown>,
  onData: (data: unknown) => void,
  onError: (error: Error) => void
): { unsubscribe: () => void } {
  // AppSync real-time endpoint
  const realtimeEndpoint = APPSYNC_ENDPOINT
    .replace('https://', 'wss://')
    .replace('/graphql', '/graphql/realtime');

  const header = btoa(JSON.stringify({
    host: new URL(APPSYNC_ENDPOINT).host,
    'x-api-key': APPSYNC_API_KEY,
  }));

  const payload = btoa(JSON.stringify({}));

  const wsUrl = `${realtimeEndpoint}?header=${header}&payload=${payload}`;

  let ws: WebSocket | null = null;
  let subscriptionId: string | null = null;
  let keepAliveTimeout: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    ws = new WebSocket(wsUrl, ['graphql-ws']);

    ws.onopen = () => {
      // Send connection init
      ws?.send(JSON.stringify({
        type: 'connection_init',
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'connection_ack':
          // Connection established, send subscription
          subscriptionId = generateSubscriptionId();
          ws?.send(JSON.stringify({
            id: subscriptionId,
            type: 'start',
            payload: {
              data: JSON.stringify({
                query,
                variables,
              }),
              extensions: {
                authorization: {
                  host: new URL(APPSYNC_ENDPOINT).host,
                  'x-api-key': APPSYNC_API_KEY,
                },
              },
            },
          }));
          break;

        case 'ka':
          // Keep-alive, reset timeout
          if (keepAliveTimeout) {
            clearTimeout(keepAliveTimeout);
          }
          keepAliveTimeout = setTimeout(() => {
            // Connection timed out, reconnect
            ws?.close();
            connect();
          }, 300000); // 5 minutes
          break;

        case 'data':
          if (message.payload?.data) {
            onData(message.payload.data);
          }
          break;

        case 'error':
          onError(new Error(message.payload?.errors?.[0]?.message || 'Subscription error'));
          break;
      }
    };

    ws.onerror = () => {
      onError(new Error('WebSocket connection error'));
    };

    ws.onclose = () => {
      // Connection closed
      if (keepAliveTimeout) {
        clearTimeout(keepAliveTimeout);
      }
    };
  };

  connect();

  return {
    unsubscribe: () => {
      if (keepAliveTimeout) {
        clearTimeout(keepAliveTimeout);
      }
      if (ws && subscriptionId) {
        ws.send(JSON.stringify({
          id: subscriptionId,
          type: 'stop',
        }));
        ws.close();
      }
    },
  };
}

function generateSubscriptionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
