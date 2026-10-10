### 🔗 Linked issue

Refs #36497

### 📚 Description

Since vitejs/vite#22549 (Vite 8.1.1) the optimizer logs `dependency optimized: x` / `dependencies optimized: x, y` instead of `new dependencies optimized: x`, so `createViteLogger` never called `onNewDeps` and the "Vite discovered new dependencies at runtime" hint stopped showing. The reload message was still swallowed, so nothing in the terminal explained the reload.

The matcher now accepts both wordings. Added `packages/vite/test/logger.test.ts` covering the two current messages and the old one; the two current ones fail on `main`.
