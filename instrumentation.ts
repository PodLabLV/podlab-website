import type { Instrumentation } from 'next';

export function register() {}

/** Anything a route throws without catching: log it and tell Slack (lib/alerts). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { reportError } = await import('@/lib/alerts');
  reportError(`[unhandled] ${request.method} ${request.path.split('?')[0]} (${context.routeType})`, err);
};
