/**
 * Creates an AL-MAKKAH admin account.
 *
 * This is the ONLY way an admin can come into existence. There is no sign-up
 * page, and public sign-ups are disabled in Supabase Auth, so an account
 * cannot be created through the website by anyone.
 *
 * Two things must both be true for someone to reach the admin panel:
 *   1. a Supabase Auth user exists, and
 *   2. an AdminUser row links that user id to a role and isActive = true.
 *
 * This script creates both, in that order, and rolls back the auth user if the
 * database row fails - so a half-created account can never linger.
 *
 * Run: npm run admin:create
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';

loadEnv({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!url || !serviceKey || !databaseUrl) {
  console.error('Missing environment variables. Check .env.local.');
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });

const email = (await rl.question('Admin email: ')).trim().toLowerCase();
const displayName = (await rl.question('Display name: ')).trim();
const password = (await rl.question('Password (min 12 characters): ')).trim();
const roleAnswer = (
  await rl.question('Role [1] super admin  [2] admin (default 1): ')
).trim();
rl.close();

const role = roleAnswer === '2' ? 'ADMIN' : 'SUPER_ADMIN';

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('That does not look like an email address.');
  process.exit(1);
}
if (!displayName) {
  console.error('A display name is required.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const existing = await prisma.adminUser.findUnique({ where: { email } });
if (existing) {
  console.error(`An admin with ${email} already exists.`);
  await prisma.$disconnect();
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // no confirmation email needed; this is a trusted path
});

if (error || !data.user) {
  console.error(`Could not create the auth user: ${error?.message}`);
  await prisma.$disconnect();
  process.exit(1);
}

try {
  await prisma.adminUser.create({
    data: { authUserId: data.user.id, email, displayName, role },
  });
} catch (dbError) {
  // Leave nothing behind: an auth user with no AdminUser row could sign in
  // and see a confusing dead end.
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error(`Could not create the admin record: ${(dbError as Error).message}`);
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`\nCreated ${role} for ${email}.`);
console.log('Sign in at /admin/login');
await prisma.$disconnect();
