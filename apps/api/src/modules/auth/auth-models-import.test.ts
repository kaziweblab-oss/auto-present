import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

describe('auth model ESM compatibility', () => {
  it('imports and reuses registered auth models without OverwriteModelError', async () => {
    const first = await import('./auth.models.js');
    const second = await import('./auth.models.js');

    expect(first.UserModel).toBe(second.UserModel);
    expect(first.UserModel).toBe(mongoose.models.User);
    expect(first.AuthSessionModel).toBe(mongoose.models.AuthSession);
  });
});
