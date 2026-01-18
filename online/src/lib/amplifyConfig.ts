import { Amplify } from 'aws-amplify';

export function configureAmplify() {
  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: import.meta.env.VITE_APPSYNC_ENDPOINT,
        region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
        defaultAuthMode: 'apiKey',
        apiKey: import.meta.env.VITE_APPSYNC_API_KEY,
      },
    },
  });
}
