export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // SMTP not configured — skip silently in dev
    return;
  }
  // Real SMTP implementation would go here
  // For now, log that we would send
  console.log(`[email] Would send to ${input.to}: ${input.subject}`);
}
