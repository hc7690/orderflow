/**
 * OrderFlow — Firebase Client Module
 *
 * Re-exports client-safe Firebase config only.
 * Tidak mengimpor admin atau server-side modules.
 */

export { app, auth } from "./config";
