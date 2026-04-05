import { recoverPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const { email } = body;

    if (!email) {
      return Response.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    const { success, errors } = await recoverPassword(email.trim());

    if (!success || errors.length > 0) {
      const message = errors[0]?.message ?? 'Could not process recovery request.';
      return Response.json({ success: false, error: message }, { status: 422 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/auth/recover] error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
