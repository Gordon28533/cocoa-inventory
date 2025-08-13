-- Cocoa Inventory Control System: Full Database Recreate Script
-- WARNING: This will delete all existing data!

-- 1. Drop and recreate the database
DROP DATABASE IF EXISTS cocoa_inventory;
CREATE DATABASE cocoa_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cocoa_inventory;

-- 2. Departments table
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 3. Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL UNIQUE,
    staff_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'stores', 'hod') NOT NULL,
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 4. Inventory table (alphanumeric item codes as IDs)
CREATE TABLE inventory (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    type VARCHAR(100),
    description TEXT,
    quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Requisitions table (with batch_id for grouping)
CREATE TABLE requisitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50), -- for grouping multiple requisitions
    item_id VARCHAR(50),
    user_id INT,
    department_id INT,
    quantity INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'fulfilled', 'account_approved') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    unique_code VARCHAR(100), -- for pickup/fulfillment
    is_it_item BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (item_id) REFERENCES inventory(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
ALTER TABLE requisitions MODIFY item_id VARCHAR(50);
-- 6. Audit logs table
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. (Optional) Insert initial departments and admin user
INSERT INTO departments (name, description) VALUES ('IT', 'Information Technology'), ('HR', 'Human Resources'), ('Finance', 'Finance Department'), ('Stores', 'Stores Department');
-- Note: Replace 'adminpassword' with a hashed password if required by your backend
INSERT INTO users (staff_id, staff_name, password, role, department_id)
VALUES ('admin001', 'Admin User', 'adminpassword', 'admin', 1); 