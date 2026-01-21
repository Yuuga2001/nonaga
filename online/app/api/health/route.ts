import { NextResponse } from 'next/server';

// GET /api/health - Health check and env verification
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasEndpoint: !!process.env.APPSYNC_ENDPOINT,
      hasApiKey: !!process.env.APPSYNC_API_KEY,
      endpointPrefix: process.env.APPSYNC_ENDPOINT?.substring(0, 30) || 'not set',
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
