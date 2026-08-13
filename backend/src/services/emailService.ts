type EmailMessage = { to: string; subject: string; text: string; html: string };

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (process.env.EMAIL_PROVIDER === 'resend') {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new Error('Email service is not configured');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, ...message }),
    });
    if (!response.ok) {
      let resData: any = {};
      try { resData = await response.json(); } catch (e) {}
      
      const safeError = new Error(resData.message || 'Email delivery failed');
      (safeError as any).provider = 'resend';
      (safeError as any).status = response.status;
      (safeError as any).providerCode = resData.name || resData.code;
      throw safeError;
    }
    return;
  }
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.NODE_ENV !== 'production') console.info(`[email preview] ${message.subject} -> ${message.to}`);
  else throw new Error('Email service is not configured');
}
