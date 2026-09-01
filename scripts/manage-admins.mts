/**
 * List, deactivate, reactivate, rename, change the password of, or delete
 * admin accounts.
 *
 * Deactivating is the default advice: it revokes access immediately while
 * leaving the audit trail intact, so past actions still show who performed
 * them. Deleting removes the account entirely and orphans those entries, which
 * is only appropriate for an account that never did anything.
 *
 * Run: npm run admin:manage
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

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

/**
 * Prompting that works both interactively and with piped input.
 *
 * A readline interface over a pipe closes as soon as the input ends, which
 * kills any question asked after the first await. So when stdin is not a
 * terminal the answers are read up front and served from a queue instead.
 */
const isInteractive = stdin.isTTY === true;
const rl = isInteractive ? createInterface({ input: stdin, output: stdout }) : null;

let pipedAnswers: string[] = [];
if (!isInteractive) {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  pipedAnswers = Buffer.concat(chunks)
    .toString('utf8')
    .split(String.fromCharCode(10))
    .map((line) => line.replace(String.fromCharCode(13), ''));
}

async function ask(prompt: string): Promise<string> {
  if (rl) return rl.question(prompt);
  const answer = pipedAnswers.shift() ?? '';
  stdout.write(`${prompt}${answer}
`);
  return answer;
}

function closePrompt() {
  rl?.close();
}

async function listAdmins() {
  const admins = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { auditLogs: true } },
    },
  });

  if (admins.length === 0) {
    console.log('\nNo admin accounts exist. Create one with: npm run admin:create');
    return admins;
  }

  console.log('\nAdmin accounts:');
  admins.forEach((admin, index) => {
    console.log(
      `  ${index + 1}. ${admin.email}  (${admin.displayName})` +
        `\n     ${admin.role}  ${admin.isActive ? 'ACTIVE' : 'DEACTIVATED'}` +
        `  ${admin._count.auditLogs} recorded action(s)` +
        `  created ${admin.createdAt.toLocaleDateString('en-GB')}`,
    );
  });
  return admins;
}

const admins = await listAdmins();
if (admins.length === 0) {
  await prisma.$disconnect();
  process.exit(0);
}



console.log('\nWhat would you like to do?');
console.log('  [1] Deactivate an account (revoke access, keep the audit trail)');
console.log('  [2] Reactivate an account');
console.log('  [3] Delete an account permanently');
console.log('  [4] Change the display name');
console.log('  [5] Set a new password');
console.log('  [6] Nothing, just exit');

const choice = (await ask('Choose a number: ')).trim();

if (choice === '6' || choice === '') {
  closePrompt();
  await prisma.$disconnect();
  process.exit(0);
}

const emailAnswer = (await ask('Email of the account: ')).trim().toLowerCase();
const target = await prisma.adminUser.findUnique({ where: { email: emailAnswer } });

if (!target) {
  console.error(`No admin account with ${emailAnswer}.`);
  closePrompt();
  await prisma.$disconnect();
  process.exit(1);
}

// Refuse to remove the last way in. Locking yourself out of the admin panel
// would need another CLI run to fix, and it is an easy mistake to make.
const activeCount = await prisma.adminUser.count({ where: { isActive: true } });
const isRemoving = choice === '1' || choice === '3';
if (isRemoving && target.isActive && activeCount <= 1) {
  console.error(
    '\nThat is the only active admin account. Create another one first, ' +
      'otherwise nobody will be able to sign in.',
  );
  closePrompt();
  await prisma.$disconnect();
  process.exit(1);
}

if (choice === '1') {
  await prisma.adminUser.update({
    where: { id: target.id },
    data: { isActive: false },
  });
  // Also revoke any live session, so access ends now rather than when the
  // current token happens to expire.
  await supabase.auth.admin.signOut(target.authUserId).catch(() => {});
  console.log(`\n${target.email} deactivated. They can no longer sign in.`);
  console.log('Their past actions remain in the audit log.');
} else if (choice === '2') {
  await prisma.adminUser.update({
    where: { id: target.id },
    data: { isActive: true },
  });
  console.log(`\n${target.email} reactivated.`);
} else if (choice === '3') {
  const confirm = (
    await ask(`\nType the email again to permanently delete ${target.email}: `)
  )
    .trim()
    .toLowerCase();

  if (confirm !== target.email) {
    console.error('Did not match. Nothing was deleted.');
    closePrompt();
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.adminUser.delete({ where: { id: target.id } });
  const { error } = await supabase.auth.admin.deleteUser(target.authUserId);
  console.log(
    `\n${target.email} deleted.` +
      (error ? `\nWarning: the Supabase auth user could not be removed - ${error.message}` : ''),
  );
} else if (choice === '4') {
  const newName = (await ask('New display name: ')).trim();
  if (newName.length < 2) {
    console.error('A display name is required.');
  } else {
    await prisma.adminUser.update({
      where: { id: target.id },
      data: { displayName: newName },
    });
    console.log(`\nDisplay name changed to "${newName}".`);
  }
} else if (choice === '5') {
  const newPassword = (await ask('New password (min 12 characters): ')).trim();
  if (newPassword.length < 12) {
    console.error('Password must be at least 12 characters. Nothing changed.');
  } else {
    const { error } = await supabase.auth.admin.updateUserById(
      target.authUserId,
      { password: newPassword },
    );
    if (error) {
      console.error(`Could not change the password: ${error.message}`);
    } else {
      // Existing sessions keep working after a password change, so end them
      // deliberately - the usual reason to change a password is that the old
      // one is no longer trusted.
      await supabase.auth.admin.signOut(target.authUserId).catch(() => {});
      console.log(
        `\nPassword changed for ${target.email}. Any signed-in sessions have been ended.`,
      );
    }
  }
} else {
  console.error('Unrecognised choice.');
}

closePrompt();
await listAdmins();
await prisma.$disconnect();
