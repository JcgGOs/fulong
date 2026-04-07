/**
 * Load .env files from project .pi and user ~/.pi directories
 * Loads in cascade order: project .pi/.env -> ~/.pi/.env
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExtensionAPI } from '@mariozechner/pi-tui';

export default function (pi: ExtensionAPI) {
  const envFiles: string[] = [];

  // 1. Load project .pi/.env if exists
  const projectPiEnv = path.join(process.cwd(), '.pi', '.env');
  if (fs.existsSync(projectPiEnv)) {
    envFiles.push(projectPiEnv);
  }

  // 2. Load user ~/.pi/.env if exists
  const userPiEnv = path.join(process.env.HOME || process.env.USERPROFILE || '', '.pi', '.env');
  if (fs.existsSync(userPiEnv)) {
    envFiles.push(userPiEnv);
  }

  // Load and parse .env files
  for (const envFile of envFiles) {
    try {
      const content = fs.readFileSync(envFile, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Parse KEY=VALUE
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          
          // Set environment variable
          process.env[key] = cleanValue;
        }
      }
    } catch (err) {
      console.error(`[env] Failed to load ${envFile}:`, err);
    }
  }

  // Log loaded files
  if (envFiles.length > 0) {
    console.log(`[env] Loaded: ${envFiles.join(' -> ')}`);
  }
}
