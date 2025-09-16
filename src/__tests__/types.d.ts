/**
 * Custom type definitions for tests
 */

import type { Tool } from 'ai';

declare module 'ai' {
  interface Tool {
    execute: (params: { input: Record<string, unknown>; context: Record<string, unknown> }) => Promise<unknown>;
  }
}