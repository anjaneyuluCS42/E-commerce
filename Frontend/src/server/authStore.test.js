import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createAuthStore } from './authStore';

describe('createAuthStore', () => {
  let tempDbPath;

  beforeEach(() => {
    tempDbPath = path.join(os.tmpdir(), `auth-store-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
  });

  it('registers a new user and hashes the password', () => {
    const store = createAuthStore(tempDbPath);

    const result = store.registerUser({
      username: 'alice',
      email: 'alice@example.com',
      password: 'secret123',
    });

    expect(result.user.username).toBe('alice');
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user.passwordHash).toBeUndefined();
    expect(fs.existsSync(tempDbPath)).toBe(true);
  });

  it('allows login only with the correct password', () => {
    const store = createAuthStore(tempDbPath);
    store.registerUser({ username: 'bob', email: 'bob@example.com', password: 'pass1234' });

    const success = store.loginUser({ email: 'bob@example.com', password: 'pass1234' });
    const failure = () => store.loginUser({ email: 'bob@example.com', password: 'wrong' });

    expect(success.user.email).toBe('bob@example.com');
    expect(success.accessToken).toBeTruthy();
    expect(failure).toThrow('Invalid email or password');
  });
});
