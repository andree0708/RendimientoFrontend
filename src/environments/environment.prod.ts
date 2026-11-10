export const environment = {
  production: true,
  apiUrl: '/api/v1',
  // Relative path: WebSocketService resolves it against the current origin,
  // using wss:// automatically when the page is served over HTTPS.
  wsUrl: '/ws',
};
