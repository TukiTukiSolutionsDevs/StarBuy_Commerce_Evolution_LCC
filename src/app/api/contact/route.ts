import { type NextRequest } from 'next/server';

type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactPayload;
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return Response.json(
        { success: false, error: 'Name, email, and message are required.' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email.trim())) {
      return Response.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    if (message.trim().length < 10) {
      return Response.json(
        { success: false, error: 'Message must be at least 10 characters.' },
        { status: 400 },
      );
    }

    // Structured log (captured by any log aggregator in production)
    console.log(
      '[contact-form]',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject?.trim() || 'General',
        message: message.trim(),
      }),
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/contact] error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
