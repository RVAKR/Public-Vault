/**
 * main.ts — Entry point
 */

import './style.css';
import { initToast } from './ui';
import { vault } from './store';
import { renderAuth, renderApp } from './app';

const root = document.getElementById('app')!;

initToast();

// Auto-redirect if already unlocked (page refresh)
if (vault.isSetup) {
  renderAuth(root);
} else {
  renderAuth(root);
}
