/** localStorage key for the cookie choice. Lives outside the "use client"
 *  CookieConsent module so the server layout can read the plain string. */
export const CONSENT_KEY = "ssg-cookie-consent-v1";

/** Inline, parser-blocking: marks <html> before the banner paints, so a
 *  visitor who already chose never sees it flash. */
export const CONSENT_BOOT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(CONSENT_KEY)}))document.documentElement.classList.add("cc-done")}catch(e){}`;
