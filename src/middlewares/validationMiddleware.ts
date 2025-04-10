export function validationMiddleware(content: string): boolean {
    // Maximum paste length (1000 characters)
    const MAX_LENGTH = 1000;
  
    // Basic sanitization: remove any HTML tags (XSS protection)
    const sanitizedContent = content.replace(/<[^>]*>/g, "");
  
    // Check if the content is too long or empty
    if (sanitizedContent.length === 0 || sanitizedContent.length > MAX_LENGTH) {
      return false;
    }
  
    return true;
  }
  