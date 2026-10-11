// Self-hosted mode: the Base44 managed SDK is replaced by the local
// self-hosted client, which talks to the bundled Express + SQLite server.
//
// The platform-managed AuthContext.jsx imports { base44 } from this file and
// cannot be edited, so we re-export the self-hosted client here. This routes
// every base44.* call (auth, entities, integrations, functions) to the local
// server while keeping AuthContext's import line intact.
export { base44 } from '@/api/selfHostedClient';
export { default } from '@/api/selfHostedClient';