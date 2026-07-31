/* ============================================================
   dailyRewardNotifications — recordatorio LOCAL (no push remoto) de que las
   misiones diarias ya están disponibles. Se repite todos los días a
   RESET_HOUR_LOCAL (medianoche por defecto — mismo valor que ya usa
   dailyResetClock.js, no se reinventa), sin depender de servidor ni de que
   la app esté abierta.

   Import DINÁMICO de @capacitor/local-notifications a propósito — mismo
   criterio que adsProvider.js con AdMob: en la web ese código ni se
   descarga, Vite lo separa en su propio chunk que solo se pide dentro del
   APK real.

   Es un recordatorio simple ("ya podés reclamar"), no verifica el estado
   real de las misiones en el momento de sonar — coincide con lo pedido
   ("avisar que la recompensa diaria ya está disponible"), no hace falta
   más que eso.
   ============================================================ */
import { Capacitor } from "@capacitor/core";
import { RESET_HOUR_LOCAL } from "../../config/dailyMissions.config.js";
import {
  DAILY_REMINDER_ENABLED, DAILY_REMINDER_ID, DAILY_REMINDER_TITLE, DAILY_REMINDER_BODY,
} from "../../config/notifications.config.js";

function isNativePlatform(){
  return !!(Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
}

/** Programa (o reprograma — mismo id fijo, nunca duplica) el recordatorio diario. Se puede llamar
 *  seguido sin costo (por ejemplo, cada vez que arranca una partida): si ya estaba programado,
 *  `schedule()` con el mismo id simplemente lo reemplaza por uno idéntico. */
export async function ensureDailyMissionReminderScheduled(){
  if(!DAILY_REMINDER_ENABLED || !isNativePlatform()) return { ok:false, reason:"not_native" };
  try{
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    let display = current.display;
    if(display !== "granted"){
      const requested = await LocalNotifications.requestPermissions();
      display = requested.display;
    }
    if(display !== "granted") return { ok:false, reason:"permission_denied" };
    await LocalNotifications.schedule({
      notifications: [{
        id: DAILY_REMINDER_ID,
        title: DAILY_REMINDER_TITLE,
        body: DAILY_REMINDER_BODY,
        schedule: { on: { hour: RESET_HOUR_LOCAL, minute: 0 }, repeats: true, allowWhileIdle: true },
      }],
    });
    return { ok:true };
  }catch(e){
    console.warn("[Notifications] no se pudo programar el recordatorio de misiones diarias — el juego sigue igual.", e);
    return { ok:false, reason:"error", error:e };
  }
}
