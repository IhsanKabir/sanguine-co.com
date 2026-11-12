/**
 * Cookie that marks a browser as the shop's own: set when Admin is opened,
 * read when visit events are written (src/lib/events.ts), so the owner's own
 * browsing stays out of the traffic numbers in Admin, Behaviour.
 */
export const STAFF_COOKIE = "ssg_staff";
export const STAFF_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;
