/* ============================================================
   NOTIFICACIONES — configuración central
   ------------------------------------------------------------
   Fase 1: solo el recordatorio LOCAL de misiones diarias (no depende de
   ningún servidor). Las notificaciones push reales (ej. solicitud de
   amistad con la app cerrada) quedan pendientes a propósito — necesitan
   Firebase Cloud Messaging + un endpoint nuevo en el backend (Cloudflare
   Worker) que no vive en este repositorio.
   ============================================================ */

export const DAILY_REMINDER_ENABLED = true;
// Id fijo — programar de nuevo con el MISMO id reemplaza el aviso anterior en vez de duplicarlo
// (ver ensureDailyMissionReminderScheduled en dailyRewardNotifications.js).
export const DAILY_REMINDER_ID = 1001;
export const DAILY_REMINDER_TITLE = "🎯 Misiones diarias listas";
export const DAILY_REMINDER_BODY = "Ya podés reclamar tus misiones diarias de hoy.";
