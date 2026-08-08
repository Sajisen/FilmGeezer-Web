function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value) + " UTC";
}

function renderEmailShell(input: {
  eyebrow: string;
  title: string;
  bodyHtml: string;
  footerText?: string;
}): string {
  const footerText =
    input.footerText ??
    "This is an automated FilmGeezer message. If you need help, reply to this email or contact FilmGeezer Support.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dbe3ef;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,.08);">
            <tr>
              <td style="padding:28px 30px;background:linear-gradient(135deg,#071426,#0d2038);color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#7dd3fc;">${escapeHtml(input.eyebrow)}</div>
                <div style="margin-top:8px;font-size:28px;line-height:1.18;font-weight:800;">${escapeHtml(input.title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">${input.bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:20px 30px;border-top:1px solid #e5e7eb;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;">
                ${escapeHtml(footerText)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderButton(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 4px;"><tr><td style="border-radius:12px;background:#0ea5e9;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function renderCode(code: string): string {
  return `<div style="margin:22px 0;padding:18px 20px;border:1px solid #bae6fd;border-radius:16px;background:#f0f9ff;text-align:center;font-size:30px;font-weight:800;letter-spacing:.28em;color:#075985;">${escapeHtml(code)}</div>`;
}

function paragraph(value: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#334155;">${escapeHtml(value)}</p>`;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function createEmailVerificationTemplate(input: {
  displayName: string;
  verificationCode: string;
  expiresAt: Date;
}): EmailTemplate {
  const subject = "Verify your FilmGeezer email";
  const expiry = formatDate(input.expiresAt);

  return {
    subject,
    html: renderEmailShell({
      eyebrow: "FilmGeezer account",
      title: "Verify your email address",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph("Use the verification code below to finish creating your FilmGeezer account.") +
        renderCode(input.verificationCode) +
        paragraph(`This code expires at ${expiry}. If you did not create this account, you can ignore this message.`),
    }),
    text: [
      `Hi ${input.displayName},`,
      "",
      "Use this verification code to finish creating your FilmGeezer account:",
      input.verificationCode,
      "",
      `This code expires at ${expiry}.`,
      "If you did not create this account, you can ignore this message.",
    ].join("\n"),
  };
}

export function createExistingAccountRegistrationNoticeTemplate(input: {
  attemptedAt: Date;
  signInUrl: string;
}): EmailTemplate {
  const subject = "A FilmGeezer registration attempt used your email";
  const attemptedAt = formatDate(input.attemptedAt);

  return {
    subject,
    html: renderEmailShell({
      eyebrow: "FilmGeezer security",
      title: "Your email is already connected to FilmGeezer",
      bodyHtml:
        paragraph("Someone tried to register a FilmGeezer account using this email address.") +
        paragraph(`No account settings were changed. The attempt occurred at ${attemptedAt}. If this was you, sign in to continue.`) +
        renderButton("Sign in to FilmGeezer", input.signInUrl),
    }),
    text: [
      "Someone tried to register a FilmGeezer account using this email address.",
      "No account settings were changed.",
      `Attempted at: ${attemptedAt}`,
      `Sign in: ${input.signInUrl}`,
    ].join("\n"),
  };
}

export function createPasswordResetTemplate(input: {
  displayName: string;
  resetUrl: string;
  expiresAt: Date;
}): EmailTemplate {
  const subject = "Reset your FilmGeezer password";
  const expiry = formatDate(input.expiresAt);

  return {
    subject,
    html: renderEmailShell({
      eyebrow: "FilmGeezer security",
      title: "Reset your password",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph("We received a request to reset your FilmGeezer password. Use the secure button below to continue.") +
        renderButton("Reset password", input.resetUrl) +
        paragraph(`This link expires at ${expiry} and can be used only once. If you did not request a reset, you can ignore this email.`),
    }),
    text: [
      `Hi ${input.displayName},`,
      "",
      "Use this secure link to reset your FilmGeezer password:",
      input.resetUrl,
      "",
      `This link expires at ${expiry} and can be used only once.`,
      "If you did not request a reset, you can ignore this email.",
    ].join("\n"),
  };
}

export function createEmailChangeVerificationTemplate(input: {
  displayName: string;
  verificationCode: string;
  expiresAt: Date;
}): EmailTemplate {
  const subject = "Verify your new FilmGeezer email";
  const expiry = formatDate(input.expiresAt);

  return {
    subject,
    html: renderEmailShell({
      eyebrow: "FilmGeezer account security",
      title: "Confirm your new email address",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph("Enter this code in FilmGeezer to confirm that you control this new email address.") +
        renderCode(input.verificationCode) +
        paragraph(`This code expires at ${expiry}. Your current account email remains unchanged until verification succeeds.`),
    }),
    text: [
      `Hi ${input.displayName},`,
      "",
      `Verification code: ${input.verificationCode}`,
      `Expires at: ${expiry}`,
      "Your current account email remains unchanged until verification succeeds.",
    ].join("\n"),
  };
}

export function createEmailChangedNoticeTemplate(input: {
  displayName: string;
  newEmail: string;
  changedAt: Date;
}): EmailTemplate {
  const subject = "Your FilmGeezer email address changed";

  return {
    subject,
    html: renderEmailShell({
      eyebrow: "FilmGeezer security",
      title: "Your account email was changed",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(`Your FilmGeezer account email was changed to ${input.newEmail} at ${formatDate(input.changedAt)}.`) +
        paragraph("If you did not make this change, contact FilmGeezer Support immediately."),
    }),
    text: [
      `Hi ${input.displayName},`,
      `Your FilmGeezer account email was changed to ${input.newEmail} at ${formatDate(input.changedAt)}.`,
      "If you did not make this change, contact FilmGeezer Support immediately.",
    ].join("\n\n"),
  };
}

export function createAccountDeactivatedNoticeTemplate(input: {
  displayName: string;
  deactivatedAt: Date;
}): EmailTemplate {
  const subject = "Your FilmGeezer account was deactivated";

  return {
    subject,
    html: renderEmailShell({
      eyebrow: "FilmGeezer account",
      title: "Account deactivated",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(`Your FilmGeezer account was deactivated at ${formatDate(input.deactivatedAt)} and active sessions were signed out.`) +
        paragraph("Your account data was not permanently deleted. Contact FilmGeezer Support if you need controlled account recovery."),
    }),
    text: [
      `Hi ${input.displayName},`,
      `Your FilmGeezer account was deactivated at ${formatDate(input.deactivatedAt)} and active sessions were signed out.`,
      "Your account data was not permanently deleted. Contact FilmGeezer Support if you need controlled account recovery.",
    ].join("\n\n"),
  };
}

export function createWelcomeTemplate(input: {
  displayName: string;
  publicAppUrl: string;
}): EmailTemplate {
  const subject = "Welcome to FilmGeezer";

  return {
    subject,
    html: renderEmailShell({
      eyebrow: "Welcome to FilmGeezer",
      title: "Your FilmGeezer account is ready",
      bodyHtml:
        paragraph(`Hi ${input.displayName}, welcome to FilmGeezer.`) +
        paragraph("Discover movies, TV series, anime and K-dramas, keep the titles you love in your Watchlist, and shape recommendations around what you actually enjoy.") +
        renderButton("Start exploring", input.publicAppUrl) +
        paragraph("You can adjust your entertainment preferences from your account whenever you want."),
    }),
    text: [
      `Hi ${input.displayName}, welcome to FilmGeezer.`,
      "",
      "Discover movies, TV series, anime and K-dramas, keep the titles you love in your Watchlist, and shape recommendations around what you actually enjoy.",
      `Start exploring: ${input.publicAppUrl}`,
    ].join("\n"),
  };
}

export function createAccountSupportReplyTemplate(input: {
  displayName: string;
  referenceId: string;
  subject: string;
  conversationUrl: string;
}): EmailTemplate {
  const emailSubject = `FilmGeezer Support replied — ${input.referenceId}`;

  return {
    subject: emailSubject,
    html: renderEmailShell({
      eyebrow: "FilmGeezer Support",
      title: "You have a new support reply",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(`FilmGeezer Support replied to your request “${input.subject}” (${input.referenceId}).`) +
        paragraph("For privacy, open FilmGeezer to read the reply and continue the conversation.") +
        renderButton("Open support conversation", input.conversationUrl),
    }),
    text: [
      `Hi ${input.displayName},`,
      `FilmGeezer Support replied to “${input.subject}” (${input.referenceId}).`,
      `Open the conversation: ${input.conversationUrl}`,
    ].join("\n\n"),
  };
}

export function createGuestSupportReplyTemplate(input: {
  displayName: string;
  referenceId: string;
  subject: string;
  replyBody: string;
  contactUrl: string;
}): EmailTemplate {
  const emailSubject = `FilmGeezer Support reply — ${input.referenceId}`;
  const safeReplyBody = escapeHtml(input.replyBody).replaceAll("\n", "<br />");

  return {
    subject: emailSubject,
    html: renderEmailShell({
      eyebrow: "FilmGeezer Support",
      title: "We replied to your support request",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(`This reply is for your request “${input.subject}” (${input.referenceId}).`) +
        `<div style="margin:20px 0;padding:18px 20px;border-left:4px solid #0ea5e9;background:#f8fafc;border-radius:12px;color:#1e293b;font-size:15px;line-height:1.75;">${safeReplyBody}</div>` +
        paragraph("You can reply directly to this email if you need further help, or submit a new request from FilmGeezer Contact.") +
        renderButton("Open FilmGeezer Contact", input.contactUrl),
      footerText:
        "This message was sent because a FilmGeezer administrator replied to a support request submitted with this email address.",
    }),
    text: [
      `Hi ${input.displayName},`,
      `FilmGeezer Support replied to “${input.subject}” (${input.referenceId}).`,
      "",
      input.replyBody,
      "",
      "You can reply directly to this email if you need further help.",
      `FilmGeezer Contact: ${input.contactUrl}`,
    ].join("\n"),
  };
}