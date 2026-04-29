export function extractVapiError(err: any): {
  message: string;
  statusCode: number | null;
  isRetryable: boolean;
} {
  console.log('🔍 extractVapiError input:', JSON.stringify(err, null, 2));
  
  let statusCode: number | null = null;
  let message = 'Unknown error';
  
  // Try to extract status code from multiple paths
  if (err?.error?.statusCode) statusCode = err.error.statusCode;
  else if (err?.statusCode) statusCode = err.statusCode;
  else if (err?.response?.status) statusCode = err.response.status;
  else if (err?.status) statusCode = err.status;
  
  // Try to extract message from various paths
  if (err?.error?.message?.message) message = err.error.message.message;
  else if (err?.error?.message) message = err.error.message;
  else if (err?.message?.message) message = err.message.message;
  else if (err?.message) message = err.message;
  else if (err?.error) message = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
  else if (typeof err === 'string') message = err;
  
  const lowerMessage = message.toLowerCase();
  
  // SUPER AGGRESSIVE retry check - ANY auth, key, or rate limit error is retryable
  const isRetryable = 
    // Status codes that always indicate retryable errors
    statusCode === 401 ||
    statusCode === 402 ||  // Added 402 (Payment Required) - could be billing issue on one account
    statusCode === 403 ||
    statusCode === 429 ||
    statusCode === 500 ||  // Server errors might be account-specific
    statusCode === 502 ||
    statusCode === 503 ||
    // Specific error messages that indicate account issues
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('invalid key') ||
    lowerMessage.includes('invalid api key') ||
    lowerMessage.includes('private key') ||  // ADDED: catches "using private key" message
    lowerMessage.includes('public key') ||   // ADDED: catches key-related messages
    lowerMessage.includes('api key') ||      // ADDED: generic key error
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('concurrent') ||
    lowerMessage.includes('limit') ||
    lowerMessage.includes('exhausted') ||
    lowerMessage.includes('billing') ||      // ADDED: billing issues might be account-specific
    lowerMessage.includes('quota') ||
    lowerMessage.includes('daily') ||
    lowerMessage.includes('payment') ||      // ADDED: payment issues
    lowerMessage.includes('subscription');    // ADDED: subscription issues
  
  console.log(`📊 extractVapiError result: statusCode=${statusCode}, isRetryable=${isRetryable}, message="${message.substring(0, 100)}"`);
  
  return { message, statusCode, isRetryable };
}