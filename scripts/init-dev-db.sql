DROP DATABASE IF EXISTS `CMC_Inventory`;
CREATE DATABASE `CMC_Inventory` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `CMC_Inventory`;

CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staffName VARCHAR(100) NOT NULL UNIQUE,
    staffId VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'stores', 'hod', 'deputy_hod', 'account', 'account_manager', 'it_manager') NOT NULL,
    department_id INT NULL,
    isActive TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE inventory (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE requisitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    requested_by INT NOT NULL,
    department VARCHAR(100) NOT NULL,
    department_id INT NOT NULL,
    quantity INT NOT NULL,
    status ENUM(
        'pending',
        'branch_account_approved',
        'hod_approved',
        'it_approved',
        'account_approved',
        'ho_account_approved',
        'rejected',
        'fulfilled'
    ) NOT NULL DEFAULT 'pending',
    unique_code VARCHAR(100) NOT NULL,
    is_it_item TINYINT(1) NOT NULL DEFAULT 0,
    branch_account_approved_by INT NULL,
    ho_account_approved_by INT NULL,
    hod_approved_by INT NULL,
    it_approved_by INT NULL,
    account_approved_by INT NULL,
    fulfilled_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_requisitions_item FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_requisitions_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_requisitions_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_requisitions_branch_account FOREIGN KEY (branch_account_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_requisitions_ho_account FOREIGN KEY (ho_account_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_requisitions_hod FOREIGN KEY (hod_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_requisitions_it FOREIGN KEY (it_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_requisitions_account FOREIGN KEY (account_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_requisitions_fulfilled FOREIGN KEY (fulfilled_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_requisitions_batch_id ON requisitions(batch_id);
CREATE INDEX idx_requisitions_status ON requisitions(status);
CREATE INDEX idx_requisitions_requested_by ON requisitions(requested_by);
CREATE INDEX idx_requisitions_department_id ON requisitions(department_id);

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    requisition_id VARCHAR(100) NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO departments (name, description) VALUES
    ('Head Office', 'Head office approvals and fulfillment'),
    ('Tema Takeover Center', 'Tema branch operations'),
    ('Kumasi Takeover Center', 'Kumasi branch operations'),
    ('Takoradi Takeover Center', 'Takoradi branch operations'),
    ('IT', 'Information Technology'),
    ('HR', 'Human Resources'),
    ('Finance', 'Finance Department'),
    ('Stores', 'Stores Department');

INSERT INTO users (staffName, staffId, password, role, department_id, isActive) VALUES
    ('admin', 'ADMIN001', '$2b$10$fw77eZ/awDO2eWah/sOnK.yZzDAAQ13W.zeW4hJpbjfKy4XweRGfW', 'admin', 1, 1),
    ('stores_ho', 'STORE001', '$2b$10$fw77eZ/awDO2eWah/sOnK.yZzDAAQ13W.zeW4hJpbjfKy4XweRGfW', 'stores', 1, 1),
    ('account_ho', 'ACCT001', '$2b$10$fw77eZ/awDO2eWah/sOnK.yZzDAAQ13W.zeW4hJpbjfKy4XweRGfW', 'account_manager', 1, 1),
    ('branch_account', 'BRACC001', '$2b$10$fw77eZ/awDO2eWah/sOnK.yZzDAAQ13W.zeW4hJpbjfKy4XweRGfW', 'account', 2, 1),
    ('branch_hod', 'HOD001', '$2b$10$fw77eZ/awDO2eWah/sOnK.yZzDAAQ13W.zeW4hJpbjfKy4XweRGfW', 'hod', 2, 1),
    ('branch_user', 'USER001', '$2b$10$fw77eZ/awDO2eWah/sOnK.yZzDAAQ13W.zeW4hJpbjfKy4XweRGfW', 'user', 2, 1);

INSERT INTO inventory (id, name, category, type, quantity) VALUES
    ('GEN001', 'A4 Paper', 'General Stock', 'Stationery', 250),
    ('GEN002', 'Stapler Pins', 'General Stock', 'Stationery', 100),
    ('IT001', 'USB Keyboard', 'General Stock', 'IT Accessory', 20),
    ('STN001', 'Blue Pens', 'Stationery Stock', 'Consumable', 300);
