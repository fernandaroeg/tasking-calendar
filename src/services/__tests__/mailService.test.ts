import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mailService } from '../mailService';

describe('MailService', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubEnv('VITE_MAILTRAP_API_TOKEN', 'your_mailtrap_api_token');
    vi.stubEnv('VITE_MAILTRAP_SENDER_EMAIL', 'no-reply@ibermex.com.mx');
    vi.stubEnv('VITE_MAILTRAP_SENDER_NAME', 'Ibermex Cal');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('debe registrar el correo en la consola (Mock) si el token es el de prueba', async () => {
    const success = await mailService.sendWelcomeEmail('nuevo@ibermex.com.mx', 'user');
    expect(success).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('debe enviar correo de asignación de proyecto en consola (Mock) si el token es de prueba', async () => {
    const success = await mailService.sendProjectAssignmentEmail('colaborador@ibermex.com.mx', 'Proyecto Test');
    expect(success).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
