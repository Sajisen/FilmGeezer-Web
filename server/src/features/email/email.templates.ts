import {
  FILMGEEZER_EMAIL_LOGO_CONTENT_ID,
} from "./email.brand.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatUtcDate(value: Date): string {
  return (
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(value) + " UTC"
  );
}

function formatRemainingTime(
  expiresAt: Date,
  referenceAt = new Date(),
): string {
  const millisecondsRemaining = Math.max(
    0,
    expiresAt.getTime() - referenceAt.getTime(),
  );

  if (millisecondsRemaining <= 60_000) {
    return "less than 1 minute";
  }

  const minutesRemaining = Math.ceil(
    millisecondsRemaining / 60_000,
  );

  return minutesRemaining === 1
    ? "about 1 minute"
    : `about ${minutesRemaining} minutes`;
}

function createPublicUrl(
  publicAppUrl: string,
  pathname: string,
): string {
  return new URL(
    pathname,
    `${publicAppUrl.replace(/\/$/, "")}/`,
  ).toString();
}

function renderPreheader(value: string): string {
  return `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">${escapeHtml(value)}&#8204;&nbsp;&#847;&nbsp;&#8204;&nbsp;&#847;&nbsp;&#8204;&nbsp;&#847;&nbsp;</div>`;
}

function renderEmailShell(input: {
  publicAppUrl: string;
  eyebrow: string;
  title: string;
  previewText: string;
  bodyHtml: string;
  footerText?: string;
}): string {
  const homeUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/",
    );
  const contactUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/contact",
    );
  const logoUrl =
    `cid:${FILMGEEZER_EMAIL_LOGO_CONTENT_ID}`;
  const footerText =
    input.footerText ??
    "This is an automated FilmGeezer account message. Replies are directed to FilmGeezer Support.";
  const copyrightYear =
    new Date().getUTCFullYear();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .fg-email-outer { padding: 12px 8px !important; }
        .fg-email-card { border-radius: 18px !important; }
        .fg-email-header { padding: 22px 20px 24px !important; }
        .fg-email-body { padding: 24px 20px 22px !important; }
        .fg-email-footer { padding: 18px 20px 20px !important; }
        .fg-email-title { font-size: 25px !important; line-height: 1.2 !important; }
        .fg-email-brand-name { font-size: 17px !important; }
        .fg-email-code { font-size: 28px !important; letter-spacing: .22em !important; padding: 17px 12px !important; }
        .fg-email-button a { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef4f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;-webkit-text-size-adjust:100%;">
    ${renderPreheader(input.previewText)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="fg-email-outer" style="width:100%;background:#eef4f8;padding:28px 14px;">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="fg-email-card" style="width:100%;max-width:660px;background:#ffffff;border:1px solid #dbe5ef;border-radius:22px;overflow:hidden;box-shadow:0 14px 42px rgba(15,23,42,.08);">
            <tr>
              <td class="fg-email-header" style="padding:26px 32px 28px;background-color:#071426;color:#ffffff;border-bottom:3px solid #0ea5e9;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="52" valign="middle" style="width:52px;padding:0 12px 0 0;">
                      <img src="${escapeHtml(logoUrl)}" width="46" height="46" alt="" style="display:block;width:46px;height:46px;border:0;border-radius:12px;outline:none;text-decoration:none;" />
                    </td>
                    <td valign="middle" style="padding:0;">
                      <div class="fg-email-brand-name" style="font-size:18px;line-height:1.2;font-weight:800;letter-spacing:.01em;color:#ffffff;">FilmGeezer</div>
                      <div style="margin-top:3px;font-size:11px;line-height:1.35;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#7dd3fc;">Discover what to watch next</div>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:24px;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#7dd3fc;">${escapeHtml(input.eyebrow)}</div>
                <div class="fg-email-title" style="margin-top:7px;font-size:29px;line-height:1.18;font-weight:800;letter-spacing:-.015em;color:#ffffff;">${escapeHtml(input.title)}</div>
              </td>
            </tr>

            <tr>
              <td class="fg-email-body" style="padding:30px 32px 28px;background:#ffffff;">
                ${input.bodyHtml}
              </td>
            </tr>

            <tr>
              <td class="fg-email-footer" style="padding:20px 32px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.65;">
                <div style="margin-bottom:10px;font-size:13px;font-weight:700;">
                  <a href="${escapeHtml(homeUrl)}" style="color:#0369a1;text-decoration:none;">Visit FilmGeezer</a>
                  <span style="padding:0 8px;color:#cbd5e1;">•</span>
                  <a href="${escapeHtml(contactUrl)}" style="color:#0369a1;text-decoration:none;">Contact Support</a>
                </div>
                <div>${escapeHtml(footerText)}</div>
                <div style="margin-top:8px;color:#94a3b8;">© ${copyrightYear} FilmGeezer</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderButton(
  label: string,
  href: string,
): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" class="fg-email-button" style="margin:24px 0 6px;"><tr><td style="border-radius:12px;background:#0ea5e9;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;line-height:1.2;">${escapeHtml(label)}</a></td></tr></table>`;
}

function renderCode(code: string): string {
  return `<div class="fg-email-code" style="margin:22px 0;padding:18px 20px;border:1px solid #bae6fd;border-radius:16px;background:#eef9ff;text-align:center;font-family:'Courier New',Courier,monospace;font-size:31px;line-height:1.25;font-weight:800;letter-spacing:.28em;color:#075985;white-space:nowrap;">${escapeHtml(code)}</div>`;
}

function paragraph(value: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.72;color:#334155;">${escapeHtml(value)}</p>`;
}

function renderExpiry(
  expiresAt: Date,
  noun: "code" | "link",
): string {
  return `<div style="margin:20px 0 16px;padding:15px 16px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff;color:#334155;">
    <div style="font-size:14px;line-height:1.55;font-weight:700;color:#0f172a;">This ${noun} expires in ${escapeHtml(formatRemainingTime(expiresAt))}.</div>
    <div style="margin-top:4px;font-size:12px;line-height:1.55;color:#64748b;">For reference: ${escapeHtml(formatUtcDate(expiresAt))}.</div>
  </div>`;
}

function renderSecurityNotice(
  message: string,
  supportUrl: string,
): string {
  return `<div style="margin:20px 0 2px;padding:16px 17px;border-left:4px solid #38bdf8;border-radius:12px;background:#f1f8fd;color:#334155;font-size:14px;line-height:1.65;">
    <strong style="color:#0f172a;">Didn't do this?</strong><br />
    ${escapeHtml(message)} <a href="${escapeHtml(supportUrl)}" style="color:#0369a1;font-weight:700;text-decoration:none;">contact FilmGeezer Support</a>.
  </div>`;
}

function renderEventDetails(
  rows: Array<{
    label: string;
    value: string;
  }>,
): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">${rows
    .map(
      (row) => `<tr>
        <td valign="top" style="padding:8px 14px 8px 16px;font-size:12px;line-height:1.55;font-weight:700;color:#64748b;white-space:nowrap;">${escapeHtml(row.label)}</td>
        <td valign="top" style="padding:8px 16px 8px 0;font-size:13px;line-height:1.55;color:#0f172a;word-break:break-word;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("")}</table>`;
}

function renderWelcomeHighlights(): string {
  const items = [
    [
      "Discover",
      "Explore movies, TV series, anime and K-dramas from one place.",
    ],
    [
      "Save",
      "Keep the films and series you love together in your Watchlist.",
    ],
    [
      "Personalize",
      "Shape recommendations around what you actually enjoy.",
    ],
  ];

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 4px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">${items
    .map(
      ([title, description], index) => `<tr>
        <td style="padding:15px 16px;${index > 0 ? "border-top:1px solid #e5eff8;" : ""}">
          <div style="font-size:13px;line-height:1.45;font-weight:800;color:#075985;">${escapeHtml(title)}</div>
          <div style="margin-top:3px;font-size:13px;line-height:1.6;color:#475569;">${escapeHtml(description)}</div>
        </td>
      </tr>`,
    )
    .join("")}</table>`;
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
  publicAppUrl: string;
}): EmailTemplate {
  return {
    subject: "Verify your FilmGeezer email",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow: "FilmGeezer account",
      title: "Verify your email address",
      previewText:
        "Use your verification code to finish creating your FilmGeezer account.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "Use the verification code below to finish creating your FilmGeezer account.",
        ) +
        renderCode(input.verificationCode) +
        renderExpiry(
          input.expiresAt,
          "code",
        ) +
        paragraph(
          "If you did not create this account, you can safely ignore this message.",
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      "",
      "Use this verification code to finish creating your FilmGeezer account:",
      input.verificationCode,
      "",
      `This code expires in ${formatRemainingTime(input.expiresAt)}.`,
      `For reference: ${formatUtcDate(input.expiresAt)}.`,
      "If you did not create this account, you can safely ignore this message.",
    ].join("\n"),
  };
}

export function createExistingAccountRegistrationNoticeTemplate(input: {
  attemptedAt: Date;
  signInUrl: string;
  publicAppUrl: string;
}): EmailTemplate {
  return {
    subject:
      "A FilmGeezer registration attempt used your email",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow: "FilmGeezer security",
      title:
        "Your email is already connected to FilmGeezer",
      previewText:
        "No account settings were changed by this registration attempt.",
      bodyHtml:
        paragraph(
          "Someone tried to register a FilmGeezer account using this email address.",
        ) +
        paragraph(
          "No account settings were changed. If this was you, sign in to continue with your existing account.",
        ) +
        renderEventDetails([
          {
            label: "Attempted",
            value: formatUtcDate(
              input.attemptedAt,
            ),
          },
        ]) +
        renderButton(
          "Sign in to FilmGeezer",
          input.signInUrl,
        ),
    }),
    text: [
      "Someone tried to register a FilmGeezer account using this email address.",
      "No account settings were changed.",
      `Attempted at: ${formatUtcDate(input.attemptedAt)}`,
      `Sign in: ${input.signInUrl}`,
    ].join("\n"),
  };
}

export function createPasswordResetTemplate(input: {
  displayName: string;
  resetUrl: string;
  expiresAt: Date;
  publicAppUrl: string;
}): EmailTemplate {
  return {
    subject:
      "Reset your FilmGeezer password",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow: "FilmGeezer security",
      title: "Reset your password",
      previewText:
        "Use the secure FilmGeezer reset link before it expires.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "We received a request to reset your FilmGeezer password. Use the secure button below to continue.",
        ) +
        renderButton(
          "Reset password",
          input.resetUrl,
        ) +
        renderExpiry(
          input.expiresAt,
          "link",
        ) +
        paragraph(
          "The link can be used only once. If you did not request a password reset, you can safely ignore this email.",
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      "",
      "Use this secure link to reset your FilmGeezer password:",
      input.resetUrl,
      "",
      `This link expires in ${formatRemainingTime(input.expiresAt)}.`,
      `For reference: ${formatUtcDate(input.expiresAt)}.`,
      "The link can be used only once.",
      "If you did not request a password reset, you can safely ignore this email.",
    ].join("\n"),
  };
}

export function createEmailChangeVerificationTemplate(input: {
  displayName: string;
  verificationCode: string;
  expiresAt: Date;
  publicAppUrl: string;
}): EmailTemplate {
  return {
    subject:
      "Verify your new FilmGeezer email",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow:
        "FilmGeezer account security",
      title:
        "Confirm your new email address",
      previewText:
        "Use this code to confirm your new FilmGeezer email address.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "Enter this code in FilmGeezer to confirm that you control this new email address.",
        ) +
        renderCode(
          input.verificationCode,
        ) +
        renderExpiry(
          input.expiresAt,
          "code",
        ) +
        paragraph(
          "Your current account email remains unchanged until verification succeeds.",
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      "",
      `Verification code: ${input.verificationCode}`,
      `This code expires in ${formatRemainingTime(input.expiresAt)}.`,
      `For reference: ${formatUtcDate(input.expiresAt)}.`,
      "Your current account email remains unchanged until verification succeeds.",
    ].join("\n"),
  };
}

export function createEmailChangedNoticeTemplate(input: {
  displayName: string;
  newEmail: string;
  changedAt: Date;
  publicAppUrl: string;
}): EmailTemplate {
  const contactUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/contact",
    );

  return {
    subject:
      "Your FilmGeezer email address changed",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow: "FilmGeezer security",
      title:
        "Your account email was changed",
      previewText:
        "Your FilmGeezer account email address was updated.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "Your FilmGeezer account email address was changed successfully.",
        ) +
        renderEventDetails([
          {
            label: "New email",
            value: input.newEmail,
          },
          {
            label: "Changed",
            value: formatUtcDate(
              input.changedAt,
            ),
          },
        ]) +
        renderSecurityNotice(
          "If you did not make this change, secure your account and",
          contactUrl,
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      "Your FilmGeezer account email address was changed successfully.",
      `New email: ${input.newEmail}`,
      `Changed: ${formatUtcDate(input.changedAt)}`,
      `If you did not make this change, contact FilmGeezer Support immediately: ${contactUrl}`,
    ].join("\n\n"),
  };
}

export function createAccountDeactivatedNoticeTemplate(input: {
  displayName: string;
  deactivatedAt: Date;
  publicAppUrl: string;
}): EmailTemplate {
  const contactUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/contact",
    );

  return {
    subject:
      "Your FilmGeezer account was deactivated",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow: "FilmGeezer account",
      title: "Account deactivated",
      previewText:
        "Your FilmGeezer account was deactivated and active sessions were signed out.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "Your FilmGeezer account was deactivated and active sessions were signed out.",
        ) +
        renderEventDetails([
          {
            label: "Deactivated",
            value: formatUtcDate(
              input.deactivatedAt,
            ),
          },
        ]) +
        paragraph(
          "Your account data was not permanently deleted. Contact FilmGeezer Support if you need controlled account recovery.",
        ) +
        renderButton(
          "Contact FilmGeezer Support",
          contactUrl,
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      `Your FilmGeezer account was deactivated at ${formatUtcDate(input.deactivatedAt)} and active sessions were signed out.`,
      "Your account data was not permanently deleted.",
      `Contact FilmGeezer Support: ${contactUrl}`,
    ].join("\n\n"),
  };
}

export function createPasswordChangedNoticeTemplate(input: {
  displayName: string;
  changedAt: Date;
  publicAppUrl: string;
}): EmailTemplate {
  const accountUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/account",
    );
  const contactUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/contact",
    );

  return {
    subject:
      "Your FilmGeezer password was changed",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow:
        "FilmGeezer account security",
      title: "Your password was changed",
      previewText:
        "Your FilmGeezer password was changed and existing sessions were signed out.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "Your FilmGeezer password was changed successfully. For your protection, existing FilmGeezer sessions were signed out and your current session was refreshed.",
        ) +
        renderEventDetails([
          {
            label: "Changed",
            value: formatUtcDate(
              input.changedAt,
            ),
          },
        ]) +
        renderButton(
          "Review account security",
          accountUrl,
        ) +
        renderSecurityNotice(
          "If you did not change your password, secure your email account and",
          contactUrl,
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      "Your FilmGeezer password was changed successfully.",
      "For your protection, existing FilmGeezer sessions were signed out and your current session was refreshed.",
      `Changed: ${formatUtcDate(input.changedAt)}`,
      `Review account security: ${accountUrl}`,
      `If you did not change your password, contact FilmGeezer Support immediately: ${contactUrl}`,
    ].join("\n\n"),
  };
}

export function createGoogleSignInConnectedNoticeTemplate(input: {
  displayName: string;
  connectedAt: Date;
  publicAppUrl: string;
}): EmailTemplate {
  const accountUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/account?section=security",
    );
  const contactUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/contact",
    );

  return {
    subject:
      "Google sign-in was connected to your FilmGeezer account",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow:
        "FilmGeezer account security",
      title: "Google sign-in connected",
      previewText:
        "Google is now a sign-in method for your FilmGeezer account.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "Google sign-in was connected to your FilmGeezer account. You can now use Continue with Google to access this same FilmGeezer account.",
        ) +
        renderEventDetails([
          {
            label: "Connected",
            value: formatUtcDate(
              input.connectedAt,
            ),
          },
        ]) +
        renderButton(
          "Review account security",
          accountUrl,
        ) +
        renderSecurityNotice(
          "If you did not connect Google sign-in, secure your account and",
          contactUrl,
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      "Google sign-in was connected to your FilmGeezer account.",
      "You can now use Continue with Google to access this same FilmGeezer account.",
      `Connected: ${formatUtcDate(input.connectedAt)}`,
      `Review account security: ${accountUrl}`,
      `If you did not connect Google sign-in, contact FilmGeezer Support immediately: ${contactUrl}`,
    ].join("\n\n"),
  };
}

export function createPasswordAddedNoticeTemplate(input: {
  displayName: string;
  addedAt: Date;
  publicAppUrl: string;
}): EmailTemplate {
  const accountUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/account?section=security",
    );
  const contactUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/contact",
    );

  return {
    subject:
      "A FilmGeezer password was added to your account",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow:
        "FilmGeezer account security",
      title: "A password was added",
      previewText:
        "A FilmGeezer password was added as a new sign-in method for your account.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "A FilmGeezer password was added to your account. You can now sign in with your FilmGeezer email and password as well as any other connected sign-in method.",
        ) +
        renderEventDetails([
          {
            label: "Added",
            value: formatUtcDate(
              input.addedAt,
            ),
          },
        ]) +
        renderButton(
          "Review account security",
          accountUrl,
        ) +
        renderSecurityNotice(
          "If you did not add this password, secure your account and",
          contactUrl,
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      "A FilmGeezer password was added to your account.",
      "You can now sign in with your FilmGeezer email and password as well as any other connected sign-in method.",
      `Added: ${formatUtcDate(input.addedAt)}`,
      `Review account security: ${accountUrl}`,
      `If you did not add this password, contact FilmGeezer Support immediately: ${contactUrl}`,
    ].join("\n\n"),
  };
}

export function createPasswordResetCompletedNoticeTemplate(input: {
  displayName: string;
  resetAt: Date;
  publicAppUrl: string;
}): EmailTemplate {
  const signInUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/login",
    );
  const contactUrl =
    createPublicUrl(
      input.publicAppUrl,
      "/contact",
    );

  return {
    subject:
      "Your FilmGeezer password was reset",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow:
        "FilmGeezer account security",
      title: "Your password was reset",
      previewText:
        "Your FilmGeezer password reset completed successfully.",
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          "Your FilmGeezer password reset completed successfully. All active FilmGeezer sessions were signed out, so sign in again using your new password.",
        ) +
        renderEventDetails([
          {
            label: "Reset",
            value: formatUtcDate(
              input.resetAt,
            ),
          },
        ]) +
        renderButton(
          "Sign in to FilmGeezer",
          signInUrl,
        ) +
        renderSecurityNotice(
          "If you did not reset your password, secure your email account and",
          contactUrl,
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      "Your FilmGeezer password reset completed successfully.",
      "All active FilmGeezer sessions were signed out. Sign in again using your new password.",
      `Reset: ${formatUtcDate(input.resetAt)}`,
      `Sign in: ${signInUrl}`,
      `If you did not reset your password, contact FilmGeezer Support immediately: ${contactUrl}`,
    ].join("\n\n"),
  };
}

export function createWelcomeTemplate(input: {
  displayName: string;
  publicAppUrl: string;
}): EmailTemplate {
  return {
    subject: "Welcome to FilmGeezer",
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow:
        "Welcome to FilmGeezer",
      title:
        "Your FilmGeezer account is ready",
      previewText:
        "Your account is ready — discover, save and personalize what you watch next.",
      bodyHtml:
        paragraph(
          `Hi ${input.displayName}, welcome to FilmGeezer.`,
        ) +
        paragraph(
          "Your account is ready. FilmGeezer brings discovery, your Watchlist and personalized suggestions together in one place.",
        ) +
        renderWelcomeHighlights() +
        renderButton(
          "Start exploring",
          input.publicAppUrl,
        ) +
        paragraph(
          "You can adjust your entertainment preferences from your account whenever you want.",
        ),
    }),
    text: [
      `Hi ${input.displayName}, welcome to FilmGeezer.`,
      "",
      "Your account is ready.",
      "Discover movies, TV series, anime and K-dramas.",
      "Keep the films and series you love together in your Watchlist.",
      "Shape recommendations around what you actually enjoy.",
      `Start exploring: ${input.publicAppUrl}`,
    ].join("\n"),
  };
}

export function createAccountSupportReplyTemplate(input: {
  displayName: string;
  referenceId: string;
  subject: string;
  conversationUrl: string;
  replyCount: number;
  publicAppUrl: string;
}): EmailTemplate {
  const emailSubject =
    `FilmGeezer Support replied — ${input.referenceId}`;
  const replySummary =
    input.replyCount === 1
      ? "a new reply"
      : `${input.replyCount} new replies`;
  const title =
    input.replyCount === 1
      ? "You have a new support reply"
      : `You have ${input.replyCount} new support replies`;

  return {
    subject: emailSubject,
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow: "FilmGeezer Support",
      title,
      previewText:
        `FilmGeezer Support posted ${replySummary} in request ${input.referenceId}.`,
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          `FilmGeezer Support posted ${replySummary} in your request “${input.subject}” (${input.referenceId}).`,
        ) +
        paragraph(
          "For privacy, open FilmGeezer to read the conversation and continue from where you left off.",
        ) +
        renderButton(
          "Open support conversation",
          input.conversationUrl,
        ),
    }),
    text: [
      `Hi ${input.displayName},`,
      `FilmGeezer Support posted ${replySummary} in “${input.subject}” (${input.referenceId}).`,
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
  publicAppUrl: string;
}): EmailTemplate {
  const emailSubject =
    `FilmGeezer Support reply — ${input.referenceId}`;
  const safeReplyBody =
    escapeHtml(
      input.replyBody,
    ).replaceAll(
      "\n",
      "<br />",
    );

  return {
    subject: emailSubject,
    html: renderEmailShell({
      publicAppUrl: input.publicAppUrl,
      eyebrow: "FilmGeezer Support",
      title:
        "We replied to your support request",
      previewText:
        `FilmGeezer Support replied to request ${input.referenceId}.`,
      bodyHtml:
        paragraph(`Hi ${input.displayName},`) +
        paragraph(
          `This reply is for your request “${input.subject}” (${input.referenceId}).`,
        ) +
        `<div style="margin:20px 0;padding:18px 20px;border-left:4px solid #0ea5e9;background:#f8fafc;border-radius:12px;color:#1e293b;font-size:15px;line-height:1.75;">${safeReplyBody}</div>` +
        paragraph(
          "You can reply directly to this email if you need further help, or submit a new request from FilmGeezer Contact.",
        ) +
        renderButton(
          "Open FilmGeezer Contact",
          input.contactUrl,
        ),
      footerText:
        "This message was sent because a FilmGeezer administrator replied to a support request submitted with this email address. Replies are directed to FilmGeezer Support.",
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
