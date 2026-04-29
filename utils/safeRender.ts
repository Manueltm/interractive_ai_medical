// utils/safeRender.ts
export function safeRenderObject(obj: any): string {
  if (obj === null || obj === undefined) {
    return '';
  }
  
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => safeRenderObject(item)).join(', ');
  }
  
  if (typeof obj === 'object') {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return '[Object object]';
    }
  }
  
  return String(obj);
}

// Debug utility to log what we're trying to render
export function debugRenderValue(value: any, context: string): void {
  console.log(`[${context}] Rendering value:`, value);
  console.log(`[${context}] Value type:`, typeof value);
  console.log(`[${context}] Is array:`, Array.isArray(value));
  console.log(`[${context}] Is object:`, typeof value === 'object');
  
  if (typeof value === 'object' && value !== null) {
    console.log(`[${context}] Object keys:`, Object.keys(value));
  }
}

// Safe array to string conversion
export function safeArrayToString(array: any[]): string {
  if (!Array.isArray(array)) {
    return safeRenderObject(array);
  }
  
  return array.map(item => {
    if (typeof item === 'object') {
      return safeRenderObject(item);
    }
    return String(item);
  }).join(', ');
}