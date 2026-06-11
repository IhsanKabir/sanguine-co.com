"use server";

import { z } from "zod";
import { sendEmail, addBrevoContact } from "@/lib/email/brevo";
import { newsletterWelcomeEmail } from "@/lib/email/templates";
import { captureError } from "@/lib/monitoring";

import { SITE_URL } from "@/lib/site-url";

const schema = z.object({ email: z.string().email().max(200) });

export async function subscribeNewsletter(input: { email: string }): Promise<{ ok: boolean }> {
  const { email } = schema.parse(input);

  const listId = process.env.BREVO_NEWSLETTER_LIST_ID
    ? parseInt(process.env.BREVO_NEWSLETTER_LIST_ID, 10)
    : null;

  // Fire both in parallel; neither blocks the other.
  const tasks: Promise<unknown>[] = [
    sendEmail({
      to: email,
      subject: newsletterWelcomeEmail(SITE_URL).subject,
      html: newsletterWelcomeEmail(SITE_URL).html,
    }),
  ];

  if (listId && !isNaN(listId)) {
    tasks.push(addBrevoContact(email, listId));
  }

  try {
    await Promise.all(tasks);
  } catch (e) {
    captureError(e, { where: "subscribeNewsletter", email });
    // Still return ok — the UX should not fail over an email send error.
  }

  return { ok: true };
}
