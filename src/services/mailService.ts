/**
 * Service to handle email notifications via the Mailtrap API.
 * Follows the corporate style guide of Ibermex.
 */

import { platformService } from './platform';

/**
 * Returns the correct endpoint URL based on whether we are in Development (using Vite proxy)
 * and whether a Sandbox ID is provided.
 */
const getSendUrl = (): string => {
  const isDev = import.meta.env.DEV;
  const isTest = import.meta.env.MODE === "test";
  const sandboxId = import.meta.env.VITE_MAILTRAP_SANDBOX_ID;

  if (platformService.isNative()) {
    return platformService.getApiUrl('/api/send');
  }

  if (sandboxId && sandboxId !== "your_sandbox_id") {
    // Sandbox API URL
    return (isDev && !isTest)
      ? `/api/mailtrap/sandbox/api/send/${sandboxId}`
      : `/api/send`; // routed to Cloud Function in production
  } else {
    // Production/Sending API URL
    return (isDev && !isTest)
      ? `/api/mailtrap/send/api/send`
      : `/api/send`; // routed to Cloud Function in production
  }
};

//// Base64 representation of the complete white logo
const IBERMEX_LOGO_BASE64 = "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";

/**
 * Helper to wrap email content in a responsive, modern HTML email template
 * conforming to the Ibermex Brandbook.
 */
function wrapEmailTemplate(title: string, bodyHtml: string, actionUrl?: string, actionText?: string): string {
  // Styles for email clients (inline style definitions)
  const colors = {
    bg: "#FAF9F6",            // Off-White background
    card: "#FFFFFF",          // White card
    primary: "#FF6A52",       // Brand Coral Red
    border: "#E6E5E5",        // Secondary Gray
    text: "#1C1C1C",          // Dark Charcoal / Black
    muted: "#666666"          // Muted text
  };

  const buttonHtml = actionUrl && actionText
    ? `
      <div style="margin: 2.25rem 0; text-align: center;">
        <a href="${actionUrl}" target="_blank" style="background-color: ${colors.primary}; color: #FFFFFF; font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; font-size: 0.95rem; font-weight: bold; text-decoration: none; padding: 0.85rem 2rem; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px rgba(255, 106, 82, 0.25); transition: background-color 0.2s ease;">
          ${actionText}
        </a>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${colors.bg}; font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${colors.bg}; padding: 2rem 1rem;">
        <tr>
          <td align="center">
            <!-- Email Container -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
              
              <!-- Header Bar -->
              <tr>
                <td style="background-color: ${colors.primary}; padding: 1.5rem 2rem; text-align: left; border-bottom: 1px solid ${colors.border}; vertical-align: middle;">
                  <span style="color: #FFFFFF; font-size: 1.4rem; font-weight: 800; letter-spacing: 0.02em; vertical-align: middle; display: inline-block;">Ibermex Cal</span>
                  <img src="cid:logo_ibermex" alt="Ibermex Cal Logo" style="height: 32px; vertical-align: middle; margin-left: 12px; display: inline-block;" />
                </td>
              </tr>
              
              <!-- Content Body -->
              <tr>
                <td style="padding: 2.5rem 2.25rem; text-align: left; color: ${colors.text}; line-height: 1.6;">
                  <h1 style="margin: 0 0 1.5rem 0; font-size: 1.5rem; font-weight: 800; color: ${colors.text}; border-bottom: 2px solid ${colors.bg}; padding-bottom: 0.75rem;">
                    ${title}
                  </h1>
                  
                  <div style="font-size: 0.95rem; font-weight: 300;">
                    ${bodyHtml}
                  </div>
                  
                  ${buttonHtml}
                  
                  <hr style="border: 0; border-top: 1px solid ${colors.border}; margin: 2rem 0 1rem 0;" />
                  
                  <p style="margin: 0; font-size: 0.8rem; color: ${colors.muted}; text-align: center;">
                    Este es un mensaje automático, por favor no respondas a este correo.
                  </p>
                </td>
              </tr>
              
              <!-- Footer Section -->
              <tr>
                <td style="background-color: ${colors.bg}; padding: 1.5rem 2.25rem; text-align: center; border-top: 1px solid ${colors.border};">
                  <p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; font-weight: bold; color: ${colors.text};">
                    Grupo Ibermex
                    
                  </p>
                  <p style="margin: 0; font-size: 0.75rem; color: ${colors.muted};">
                    &copy; ${new Date().getFullYear()} Ibermex Cal. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Safe email sender helper. Logs to console (mock delivery) if no API token is configured,
 * or if a network/CORS error occurs during fetch.
 */
async function sendEmailSafe(toEmail: string, subject: string, htmlContent: string): Promise<boolean> {
  const senderEmail = import.meta.env.VITE_MAILTRAP_SENDER_EMAIL || "no-reply@calendario.grupoibermex.mx";
  const senderName = import.meta.env.VITE_MAILTRAP_SENDER_NAME || "Ibermex Cal";

  const isMock = import.meta.env.VITE_MAILTRAP_MOCK === "true" || import.meta.env.MODE === "test";

  if (isMock) {
    logMockEmail(toEmail, subject, htmlContent);
    return true;
  }

  const url = getSendUrl();
  const payload: any = {
    from: {
      email: senderEmail,
      name: senderName
    },
    to: [
      {
        email: toEmail
      }
    ],
    subject: subject,
    html: htmlContent
  };

  if (!isMock) {
    payload.attachments = [
      {
        content: IBERMEX_LOGO_BASE64,
        filename: "logo_ibermex.png",
        type: "image/png",
        disposition: "inline",
        content_id: "logo_ibermex"
      }
    ];
  }

  console.log(
    `%c[Mailtrap] Enviando correo...`,
    "font-weight: bold; color: #FF6A52; font-size: 1.1em;",
    `\n  → URL: ${url}`,
    `\n  → De: ${senderName} <${senderEmail}>`,
    `\n  → Para: ${toEmail}`,
    `\n  → Asunto: ${subject}`
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const isDev = import.meta.env.DEV;
  const isTest = import.meta.env.MODE === "test";
  if (isDev || isTest) {
    headers["Authorization"] = `Bearer ${import.meta.env.VITE_MAILTRAP_API_TOKEN || ""}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log(
        `%c[Mailtrap] ✅ Correo enviado exitosamente a ${toEmail}`,
        "font-weight: bold; color: #22c55e; font-size: 1.1em;",
        `\n  Respuesta (${response.status}): ${responseText}`
      );
      return true;
    } else {
      console.error(
        `%c[Mailtrap] ❌ Error al enviar correo (HTTP ${response.status})`,
        "font-weight: bold; color: #ef4444; font-size: 1.2em;",
        `\n  URL: ${url}`,
        `\n  Respuesta: ${responseText}`,
        `\n  Remitente: ${senderEmail}`,
        `\n\n  Posibles causas:`,
        `\n    • 401: Token inválido o expirado`,
        `\n    • 403: Token de Sandbox usado en API de Sending, o dominio no verificado`,
        `\n    • 422: Datos del correo inválidos (revisa el email remitente y destinatario)`
      );
      logMockEmail(toEmail, subject, htmlContent);
      return false;
    }
  } catch (err) {
    console.error(
      `%c[Mailtrap] ❌ Error de red/CORS al enviar correo`,
      "font-weight: bold; color: #ef4444; font-size: 1.2em;",
      `\n  URL: ${url}`,
      `\n  Error:`, err
    );
    logMockEmail(toEmail, subject, htmlContent);
    return false;
  }
}

/**
 * Log visual representation of the mail output for development and debugging.
 */
function logMockEmail(toEmail: string, subject: string, htmlContent: string): void {
  const senderEmail = import.meta.env.VITE_MAILTRAP_SENDER_EMAIL || "no-reply@ibermex.com.mx";
  const senderName = import.meta.env.VITE_MAILTRAP_SENDER_NAME || "Ibermex Cal";
  console.log(
    `%c[Mailtrap Mock Email]\n` +
    `%cRemitente:    %c${senderName} <${senderEmail}>\n` +
    `%cDestinatario: %c${toEmail}\n` +
    `%cAsunto:      %c${subject}\n` +
    `%chtml Content: \n%c${htmlContent}`,
    "font-weight: bold; font-size: 1.15em; color: #FF6A52;",
    "font-weight: bold; color: #1C1C1C;", "color: #4a5568;",
    "font-weight: bold; color: #1C1C1C;", "color: #4a5568;",
    "font-weight: bold; color: #1C1C1C;", "color: #4a5568;",
    "font-weight: bold; color: #1C1C1C;", "color: #2d3748; font-family: monospace; font-size: 0.9em; background-color: #f7fafc; padding: 0.5rem; display: block; border: 1px solid #e2e8f0; border-radius: 4px;"
  );
}

export const mailService = {
  /**
   * Sends a welcome email to a new whitelisted/pre-approved user.
   */
  async sendWelcomeEmail(toEmail: string, role: string): Promise<boolean> {
    const roleLabels: Record<string, string> = {
      master_admin: "Administrador Maestro",
      admin: "Administrador",
      user: "Colaborador"
    };
    
    const roleText = roleLabels[role] || "Colaborador";
    const appUrl = window.location.origin;

    const subject = "¡Te damos la bienvenida a Ibermex Cal!";
    const bodyHtml = `
      <p style="margin: 0 0 1rem 0;">Hola,</p>
      <p style="margin: 0 0 1rem 0;">Tu correo electrónico <strong>${toEmail}</strong> ha sido pre-aprobado para ingresar a la plataforma <strong>Ibermex Cal</strong> con el rol de <strong>${roleText}</strong>.</p>
      <p style="margin: 0 0 1.5rem 0;">Ya puedes acceder e iniciar sesión de forma rápida y segura utilizando tu cuenta de Google. Tu panel de tareas y calendarios personales están listos para que comiences a colaborar.</p>
    `;

    const htmlContent = wrapEmailTemplate(
      "¡Te damos la bienvenida a tu Calendario Ibermex!",
      bodyHtml,
      appUrl,
      "Iniciar Sesión"
    );

    return sendEmailSafe(toEmail, subject, htmlContent);
  },

  /**
   * Sends an email notification when a user is assigned to a project.
   */
  async sendProjectAssignmentEmail(toEmail: string, projectName: string): Promise<boolean> {
    const appUrl = window.location.origin;
    const subject = `Asignación de Proyecto: ${projectName}`;
    const bodyHtml = `
      <p style="margin: 0 0 1rem 0;">Hola,</p>
      <p style="margin: 0 0 1rem 0;">Te informamos que has sido asignado(a) como colaborador(a) en el proyecto <strong>${projectName}</strong> dentro de la plataforma <strong>Ibermex Cal</strong>.</p>
      <p style="margin: 0 0 1.5rem 0;">A partir de ahora, podrás visualizar las tareas del proyecto en tu calendario y gestionar tus asignaciones de forma integrada.</p>
    `;

    const htmlContent = wrapEmailTemplate(
      "¡Nuevo Proyecto Asignado!",
      bodyHtml,
      appUrl,
      "Ver en Ibermex Cal"
    );

    return sendEmailSafe(toEmail, subject, htmlContent);
  }
};
