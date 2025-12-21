/**
 * Demonstration of Feature with Background and multiple Scenarios
 * This test file shows the new feature file format support
 */

import { beforeAll, afterAll } from "vitest";
import { story } from "vitest-story";
import Database from "better-sqlite3";
import fs from "fs";
import "../steps/shopping_cart_steps";
import "../steps/feature_flag_steps";

let db: Database.Database;
let dbPath: string;

beforeAll(async () => {
  dbPath = __dirname + `/shopping_cart_feature_test_${Date.now()}.db`;
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
  Feature: Shopping Cart 

  Background: 
    Given a SQLite database is running
    And a user is registered with email "john.doe@example.com" and password "password123"
    When the user logs in with email "john.doe@example.com" and password "password123"
    Then the user should be authenticated
    
  Scenario: User adds items to shopping cart and completes purchase
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

  Scenario: Prices extract independently when feature flag is enabled
    Given I start extracting prices
    And the "USE_EXTRACTION_DATA_MODEL" feature flag is enabled
    And AI extracts prices for "Tim's Cabinetry":
      """yaml
      materials:
        - name: Oak Wood
          price: 150.00
          unit: board_foot
        - name: Pine Wood
          price: 80.00
          unit: board_foot
      labor:
        hourly_rate: 75.00
        minimum_hours: 2
      """
    Then "Tim's Cabinetry" has prices extracted
`();
