/**
 * Admin Chat Page
 *
 * The chat is now a floating widget accessible from the admin sidebar.
 * Redirect to the main admin dashboard.
 */

import { redirect } from 'next/navigation';

export default function AdminChatPage() {
  redirect('/admin');
}
