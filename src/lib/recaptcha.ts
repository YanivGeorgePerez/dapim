// src/lib/recaptcha.ts
export async function verifyRecaptcha(responseToken: string): Promise<boolean> {
    if (!responseToken) return false;
  
    // Retrieve your secret key from environment variables.
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) {
      console.error("ReCAPTCHA secret not set in environment");
      return false;
    }
  
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(responseToken)}`;
  
    try {
      const res = await fetch(verificationUrl, { method: "POST" });
      if (!res.ok) {
        console.error("Error verifying ReCAPTCHA:", res.statusText);
        return false;
      }
      const data = await res.json();
      return data.success === true;
    } catch (err) {
      console.error("ReCAPTCHA verification exception:", err);
      return false;
    }
  }
  