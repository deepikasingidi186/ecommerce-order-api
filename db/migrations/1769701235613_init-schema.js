exports.up = (pgm) => {
  pgm.createTable("users", {
    id: { type: "serial", primaryKey: true },
    email: { type: "varchar(255)", notNull: true, unique: true },
    password: { type: "varchar(255)", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("products", {
    id: { type: "serial", primaryKey: true },
    name: { type: "varchar(255)", notNull: true },
    price: { type: "decimal(10,2)", notNull: true },
    stock: { type: "integer", notNull: true },
  });

  pgm.addConstraint("products", "stock_non_negative", {
    check: "stock >= 0",
  });

  pgm.createTable("orders", {
    id: { type: "serial", primaryKey: true },
    user_id: {
      type: "integer",
      references: "users",
      onDelete: "cascade",
    },
    status: { type: "varchar(50)", notNull: true },
    total_amount: { type: "decimal(10,2)" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("order_items", {
    id: { type: "serial", primaryKey: true },
    order_id: {
      type: "integer",
      references: "orders",
      onDelete: "cascade",
    },
    product_id: {
      type: "integer",
      references: "products",
    },
    quantity: { type: "integer", notNull: true },
    price: { type: "decimal(10,2)", notNull: true },
  });

  pgm.createTable("payments", {
    id: { type: "serial", primaryKey: true },
    order_id: {
      type: "integer",
      references: "orders",
      onDelete: "cascade",
    },
    amount: { type: "decimal(10,2)" },
    status: { type: "varchar(50)" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("payments");
  pgm.dropTable("order_items");
  pgm.dropTable("orders");
  pgm.dropTable("products");
  pgm.dropTable("users");
};
