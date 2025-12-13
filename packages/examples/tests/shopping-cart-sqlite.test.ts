import { beforeAll, afterAll } from "vitest";
import { story } from "vitest-story";
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import "../steps/shopping_cart_steps";

let db: Database.Database;
let dbPath: string;

beforeAll(async () => {
  const tempDir = os.tmpdir();
  dbPath = __dirname + `/shopping_cart_test_${Date.now()}.db`;
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
  db.close();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});

story`
  Scenario: User adds items to shopping cart and completes purchase
    Given a SQLite database is running
    And a user is registered with email "john.doe@example.com" and password "password123"
    When the user logs in with email "john.doe@example.com" and password "password123"
    Then the user should be authenticated

    When the user adds a product with id "prod_001" and quantity 2 to their cart
    And the user adds a product with id "prod_002" and quantity 1 to their cart
    Then the user's cart should contain 2 items
    Then the cart total should be calculated correctly

    When the user updates the quantity of product "prod_001" to 3
    Then the cart should reflect the updated quantity
    Then the cart total should be recalculated

    When the user removes product "prod_002" from their cart
    Then the cart should contain only 1 item
    Then the remaining item should be "prod_001" with quantity 3

    When the user completes the purchase
    Then an order should be created with the cart items
    Then the user's cart should be empty
`();

story`
  Scenario: User authentication failure scenarios
    Given a SQLite database is running
    And a user is registered with email "jane.smith@example.com" and password "securepass"

    When the user attempts to log in with email "jane.smith@example.com" and wrong password "wrongpass"
    Then the login should fail with error "Invalid credentials"

    When the user attempts to log in with non-existent email "nonexistent@example.com" and password "password"
    Then the login should fail with error "User not found"
`();

story`
  Scenario: Cart persistence across sessions
    Given a SQLite database is running
    And a user is registered with email "persistent.user@example.com" and password "persist123"
    When the user logs in with email "persistent.user@example.com" and password "persist123"
    And the user adds a product with id "prod_003" and quantity 5 to their cart

    # Simulate session end and new login
    When the user logs out
    And the user logs in again with email "persistent.user@example.com" and password "persist123"
    Then the user's cart should still contain the previously added items
    And the cart should have 1 item with product "prod_003" and quantity 5
`();
