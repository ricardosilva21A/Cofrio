import { CLEAR_CLIPBOARD_ALARM, LOCK_ALARM, SESSION_KEY } from "./constants";

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === LOCK_ALARM) {
    await chrome.storage.session.remove(SESSION_KEY);
  }
  if (alarm.name === CLEAR_CLIPBOARD_ALARM) {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: "Limpar a password copiada da área de transferência.",
    });
  }
});
