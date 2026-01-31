-- Users
INSERT INTO users (id, email, password, created_at) VALUES
(1, 'testuser@example.com', 'hashed_password', NOW()),
(2, 'user2@example.com', 'hashed_password', NOW());

-- Products
INSERT INTO products (id, name, price, stock) VALUES
(1, 'Laptop', 75000.00, 10),
(2, 'Mouse', 500.00, 50),
(3, 'Keyboard', 1500.00, 20),
(4, 'Headphones', 2500.00, 5),
(5, 'Out of Stock Item', 999.00, 0);
