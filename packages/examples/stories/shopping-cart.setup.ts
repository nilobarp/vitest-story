/**
 * Setup file for shopping-cart.story
 * This provides the database setup needed by the shopping cart scenarios
 */

import { beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";

let db: Database.Database;
let dbPath: string;

beforeAll(async () => {
  dbPath = `/tmp/shopping_cart_story_${Date.now()}.db`;
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  db = new Database(dbPath);

  // Create tables
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE products (id TEXT PRIMARY KEY, name TEXT, price REAL, description TEXT);
    CREATE TABLE carts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, items TEXT, total REAL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, items TEXT, total REAL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id));
  `);

  process.env.DB_PATH = dbPath;
}, 60000);

afterAll(async () => {
  if (db) db.close();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});
