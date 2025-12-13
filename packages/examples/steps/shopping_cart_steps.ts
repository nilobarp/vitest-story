/**
 * Shopping cart step definitions for SQLite integration tests
 * Includes user authentication and cart operations
 */

import { Given, When, Then } from "vitest-story";
import { expect } from "vitest";
import Database from "better-sqlite3";

// Define interfaces
interface IUser {
  id: number;
  email: string;
  password: string;
  createdAt: string;
}

interface IProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface ICartItem {
  productId: string;
  quantity: number;
  price: number;
}

interface ICart {
  id: number;
  userId: number;
  items: ICartItem[];
  total: number;
  updatedAt: string;
}

interface IOrder {
  id: number;
  userId: number;
  items: ICartItem[];
  total: number;
  status: string;
  createdAt: string;
}

// Sample products for testing
const sampleProducts = [
  {
    id: "prod_001",
    name: "Wireless Headphones",
    price: 99.99,
    description: "High-quality wireless headphones with noise cancellation.",
  },
  {
    id: "prod_002",
    name: "Bluetooth Speaker",
    price: 49.99,
    description: "Portable Bluetooth speaker with excellent sound quality.",
  },
  {
    id: "prod_003",
    name: "USB Cable",
    price: 12.99,
    description: "Durable USB cable for charging and data transfer.",
  },
];

// Database setup
Given("a SQLite database is running", async (ctx) => {
  const dbPath = process.env.DB_PATH || "/tmp/test.db";
  const db = new Database(dbPath);

  // Clear all tables
  db.prepare("DELETE FROM orders").run();
  db.prepare("DELETE FROM carts").run();
  db.prepare("DELETE FROM users").run();
  db.prepare("DELETE FROM products").run();

  // Insert sample products
  const insertProduct = db.prepare(
    "INSERT INTO products (id, name, price, description) VALUES (?, ?, ?, ?)"
  );
  for (const p of sampleProducts) {
    insertProduct.run(p.id, p.name, p.price, p.description);
  }

  ctx.db = db;
});

// User registration
Given(
  'a user is registered with email "{email}" and password "{password}"',
  async (ctx, params) => {
    const stmt = ctx.db.prepare(
      "INSERT INTO users (email, password) VALUES (?, ?)"
    );
    const result = stmt.run(params.email, params.password);
    ctx.currentUser = {
      id: result.lastInsertRowid,
      email: params.email,
      password: params.password,
    };
  }
);

// Authentication steps
When(
  'the user logs in with email "{email}" and password "{password}"',
  async (ctx, params) => {
    try {
      const stmt = ctx.db.prepare("SELECT * FROM users WHERE email = ?");
      const user = stmt.get(params.email);
      if (!user) {
        throw new Error("User not found");
      }
      if (user.password !== params.password) {
        throw new Error("Invalid credentials");
      }
      ctx.currentUser = user;
      ctx.authenticated = true;
      ctx.authError = undefined;
    } catch (error: any) {
      ctx.authError = error.message;
      ctx.authenticated = false;
      ctx.currentUser = undefined;
    }
  }
);

When(
  'the user attempts to log in with email "{email}" and wrong password "{password}"',
  async (ctx, params) => {
    try {
      const stmt = ctx.db.prepare("SELECT * FROM users WHERE email = ?");
      const user = stmt.get(params.email);
      if (!user) {
        throw new Error("User not found");
      }
      if (user.password !== params.password) {
        throw new Error("Invalid credentials");
      }
      ctx.currentUser = user;
      ctx.authenticated = true;
      ctx.authError = undefined;
    } catch (error: any) {
      ctx.authError = error.message;
      ctx.authenticated = false;
      ctx.currentUser = undefined;
    }
  }
);

When(
  'the user attempts to log in with non-existent email "{email}" and password "{password}"',
  async (ctx, params) => {
    try {
      const stmt = ctx.db.prepare("SELECT * FROM users WHERE email = ?");
      const user = stmt.get(params.email);
      if (!user) {
        throw new Error("User not found");
      }
      if (user.password !== params.password) {
        throw new Error("Invalid credentials");
      }
      ctx.currentUser = user;
      ctx.authenticated = true;
      ctx.authError = undefined;
    } catch (error: any) {
      ctx.authError = error.message;
      ctx.authenticated = false;
      ctx.currentUser = undefined;
    }
  }
);

Then("the user should be authenticated", (ctx) => {
  expect(ctx.authenticated).toBe(true);
  expect(ctx.currentUser).toBeDefined();
});

Then('the login should fail with error "{error}"', (ctx, params) => {
  expect(ctx.authError).toBe(params.error);
  expect(ctx.authenticated).toBe(false);
});

// Cart operations
When(
  'the user adds a product with id "{productId}" and quantity {quantity} to their cart',
  async (ctx, params) => {
    const productStmt = ctx.db.prepare("SELECT * FROM products WHERE id = ?");
    const product = productStmt.get(params.productId);
    expect(product).toBeDefined();

    const cartStmt = ctx.db.prepare("SELECT * FROM carts WHERE user_id = ?");
    let cart = cartStmt.get(ctx.currentUser.id);
    if (!cart) {
      const insertCart = ctx.db.prepare(
        "INSERT INTO carts (user_id, items, total) VALUES (?, ?, ?)"
      );
      const result = insertCart.run(ctx.currentUser.id, JSON.stringify([]), 0);
      cart = {
        id: result.lastInsertRowid,
        user_id: ctx.currentUser.id,
        items: [],
        total: 0,
      };
    } else {
      cart.items = JSON.parse(cart.items);
    }

    const existingItem = cart.items.find(
      (item) => item.productId === params.productId
    );
    if (existingItem) {
      existingItem.quantity += parseInt(params.quantity);
    } else {
      cart.items.push({
        productId: params.productId,
        quantity: parseInt(params.quantity),
        price: product.price,
      });
    }

    // Recalculate total
    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const updateCart = ctx.db.prepare(
      "UPDATE carts SET items = ?, total = ?, updated_at = datetime('now') WHERE id = ?"
    );
    updateCart.run(JSON.stringify(cart.items), cart.total, cart.id);
    ctx.currentCart = cart;
  }
);

When(
  'the user updates the quantity of product "{productId}" to {quantity}',
  async (ctx, params) => {
    const cartStmt = ctx.db.prepare("SELECT * FROM carts WHERE user_id = ?");
    const cart = cartStmt.get(ctx.currentUser.id);
    if (!cart) {
      throw new Error("Cart not found");
    }
    cart.items = JSON.parse(cart.items);

    const item = cart.items.find((item) => item.productId === params.productId);

    if (!item) {
      throw new Error("Item not found in cart");
    }

    item.quantity = parseInt(params.quantity);

    // Recalculate total
    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const updateCart = ctx.db.prepare(
      "UPDATE carts SET items = ?, total = ?, updated_at = datetime('now') WHERE id = ?"
    );
    updateCart.run(JSON.stringify(cart.items), cart.total, cart.id);
    ctx.currentCart = cart;
  }
);

When(
  'the user removes product "{productId}" from their cart',
  async (ctx, params) => {
    const cartStmt = ctx.db.prepare("SELECT * FROM carts WHERE user_id = ?");
    const cart = cartStmt.get(ctx.currentUser.id);
    if (!cart) {
      throw new Error("Cart not found");
    }
    cart.items = JSON.parse(cart.items);

    cart.items = cart.items.filter(
      (item) => item.productId !== params.productId
    );

    // Recalculate total
    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const updateCart = ctx.db.prepare(
      "UPDATE carts SET items = ?, total = ?, updated_at = datetime('now') WHERE id = ?"
    );
    updateCart.run(JSON.stringify(cart.items), cart.total, cart.id);
    ctx.currentCart = cart;
  }
);

// Cart assertions
Then("the user's cart should contain {count} items", async (ctx, params) => {
  const cartStmt = ctx.db.prepare("SELECT * FROM carts WHERE user_id = ?");
  const cart = cartStmt.get(ctx.currentUser.id);
  if (!cart) {
    throw new Error("Cart not found");
  }
  cart.items = JSON.parse(cart.items);
  expect(cart.items).toHaveLength(parseInt(params.count));
  ctx.currentCart = cart;
});

Then("the cart total should be calculated correctly", (ctx) => {
  const expectedTotal = ctx.currentCart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  expect(ctx.currentCart.total).toBe(expectedTotal);
});

Then("the cart total should be recalculated", (ctx) => {
  const expectedTotal = ctx.currentCart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  expect(ctx.currentCart.total).toBe(expectedTotal);
});
Then("the cart should reflect the updated quantity", (ctx) => {
  const item = ctx.currentCart.items.find(
    (item) => item.productId === "prod_001"
  );
  expect(item.quantity).toBe(3);
});

Then("the cart should contain only {count} item", async (ctx, params) => {
  const cartStmt = ctx.db.prepare("SELECT * FROM carts WHERE user_id = ?");
  const cart = cartStmt.get(ctx.currentUser.id);
  if (!cart) {
    throw new Error("Cart not found");
  }
  cart.items = JSON.parse(cart.items);
  expect(cart.items).toHaveLength(parseInt(params.count));
});

Then(
  'the remaining item should be "{productId}" with quantity {quantity}',
  (ctx, params) => {
    const item = ctx.currentCart.items.find(
      (item) => item.productId === params.productId
    );
    expect(item).toBeDefined();
    expect(item.quantity).toBe(parseInt(params.quantity));
  }
);

// Order completion
When("the user completes the purchase", async (ctx) => {
  const cartStmt = ctx.db.prepare("SELECT * FROM carts WHERE user_id = ?");
  const cart = cartStmt.get(ctx.currentUser.id);
  if (!cart) {
    throw new Error("Cart not found");
  }
  cart.items = JSON.parse(cart.items);
  expect(cart.items.length).toBeGreaterThan(0);

  const orderStmt = ctx.db.prepare(
    "INSERT INTO orders (user_id, items, total, status) VALUES (?, ?, ?, ?)"
  );
  const result = orderStmt.run(
    ctx.currentUser.id,
    JSON.stringify(cart.items),
    cart.total,
    "completed"
  );
  ctx.currentOrder = {
    id: result.lastInsertRowid,
    userId: ctx.currentUser.id,
    items: cart.items,
    total: cart.total,
    status: "completed",
  };

  // Clear the cart
  cart.items = [];
  cart.total = 0;
  const clearCart = ctx.db.prepare(
    "UPDATE carts SET items = ?, total = ?, updated_at = datetime('now') WHERE id = ?"
  );
  clearCart.run(JSON.stringify(cart.items), cart.total, cart.id);
  ctx.currentCart = cart;
});

Then("an order should be created with the cart items", (ctx) => {
  expect(ctx.currentOrder).toBeDefined();
  expect(ctx.currentOrder.items.length).toBeGreaterThan(0);
  expect(ctx.currentOrder.status).toBe("completed");
});

Then("the user's cart should be empty", (ctx) => {
  expect(ctx.currentCart.items).toHaveLength(0);
  expect(ctx.currentCart.total).toBe(0);
});

// Session management
When("the user logs out", (ctx) => {
  ctx.currentUser = undefined;
  ctx.authenticated = false;
});

When(
  'the user logs in again with email "{email}" and password "{password}"',
  async (ctx, params) => {
    const stmt = ctx.db.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(params.email);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.password !== params.password) {
      throw new Error("Invalid credentials");
    }
    ctx.currentUser = user;
    ctx.authenticated = true;
    ctx.authError = undefined;
  }
);

Then(
  "the user's cart should still contain the previously added items",
  async (ctx) => {
    const cartStmt = ctx.db.prepare("SELECT * FROM carts WHERE user_id = ?");
    const cart = cartStmt.get(ctx.currentUser.id);
    expect(cart).toBeDefined();
    cart.items = JSON.parse(cart.items);
    expect(cart.items.length).toBeGreaterThan(0);
    ctx.currentCart = cart;
  }
);

Then(
  'the cart should have {count} item with product "{productId}" and quantity {quantity}',
  (ctx, params) => {
    expect(ctx.currentCart.items).toHaveLength(parseInt(params.count));
    const item = ctx.currentCart.items.find(
      (item) => item.productId === params.productId
    );
    expect(item).toBeDefined();
    expect(item.quantity).toBe(parseInt(params.quantity));
  }
);
