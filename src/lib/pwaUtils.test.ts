import { describe, it, expect } from 'vitest';
import pkg from '../../package.json';
import fs from 'fs';
import path from 'path';

describe('PWA Configuration', () => {
  it('should have workbox dependencies installed', () => {
    expect(pkg.dependencies).toHaveProperty('workbox-precaching');
    expect(pkg.dependencies).toHaveProperty('workbox-routing');
    expect(pkg.dependencies).toHaveProperty('workbox-strategies');
    expect(pkg.dependencies).toHaveProperty('workbox-expiration');
    expect(pkg.dependencies).toHaveProperty('workbox-cacheable-response');
    expect(pkg.dependencies).toHaveProperty('workbox-core');
  });

  it('should have service worker file', () => {
    const swPath = path.resolve(__dirname, '../../public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
  });

  it('should have PWA icons', () => {
    const icon192Path = path.resolve(__dirname, '../../public/icon-192.png');
    const icon512Path = path.resolve(__dirname, '../../public/icon-512.png');
    
    expect(fs.existsSync(icon192Path)).toBe(true);
    expect(fs.existsSync(icon512Path)).toBe(true);
  });

  it('should have vite-plugin-pwa installed', () => {
    expect(pkg.dependencies).toHaveProperty('vite-plugin-pwa');
  });
});
