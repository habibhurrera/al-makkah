'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const credentials = z.object({
  email: z.email('Enter your email address'),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginState = { error: string | null };

/**
 * Admin sign-in.
 *
 * Authenticating with Supabase is not enough. After the password check we
 * require an active AdminUser row for that auth id; without one the session is
 * signed straight back out. A Supabase account on its own grants nothing.
 */
export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const ip = clientIp(await headers());

  // Slow down credential stuffing. Deliberately tight - a real admin signs in
  // a handful of times a day.
  const limit = await rateLimit(`login:${ip}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return {
      error: `Too many sign-in attempts. Try again in ${Math.ceil(
        limit.retryAfterSeconds / 60,
      )} minutes.`,
    };
  }

  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });

  // One message for both a wrong password and an unknown account, so the form
  // cannot be used to discover which email addresses exist.
  if (error || !data.user) {
    return { error: 'Incorrect email or password.' };
  }

  const admin = await prisma.adminUser.findUnique({
    where: { authUserId: data.user.id },
    select: { isActive: true },
  });

  if (!admin || !admin.isActive) {
    await supabase.auth.signOut();
    return { error: 'Incorrect email or password.' };
  }

  redirect('/admin');
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
