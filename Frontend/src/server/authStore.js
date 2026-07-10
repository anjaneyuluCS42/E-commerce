import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DEFAULT_DB_PATH = path.join(process.cwd(), 'src', 'server', 'auth.db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  const [salt, hash] = storedValue.split(':');
  const derivedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return derivedHash === hash;
}

function ensureDbFile(dbPath) {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
  }
}

function parseDbEntries(dbPath) {
  ensureDbFile(dbPath);
  const contents = fs.readFileSync(dbPath, 'utf8');
  if (!contents.trim()) return [];
  return contents
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, username, email, passwordHash] = line.split('|');
      return { id, username, email, passwordHash };
    });
}

function writeDbEntries(dbPath, users) {
  const content = users.map((user) => `${user.id}|${user.username}|${user.email}|${user.passwordHash}`).join('\n');
  fs.writeFileSync(dbPath, content);
}

export function createAuthStore(dbPath = DEFAULT_DB_PATH) {
  ensureDbFile(dbPath);
  const users = parseDbEntries(dbPath);

  return {
    registerUser({ username, email, password }) {
      const existingUser = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const newUser = {
        id: `${Date.now()}-${users.length + 1}`,
        username,
        email,
        passwordHash: hashPassword(password),
      };

      users.push(newUser);
      writeDbEntries(dbPath, users);

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
        },
      };
    },

    loginUser({ email, password }) {
      const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw new Error('Invalid email or password');
      }

      const accessToken = crypto.randomBytes(24).toString('hex');
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        accessToken,
      };
    },
  };
}

export const authStore = createAuthStore();
