-- Fix item_id column type in requisitions table
USE cocoa_inventory;

-- First, remove the foreign key constraint if it exists
ALTER TABLE requisitions DROP FOREIGN KEY IF EXISTS requisitions_ibfk_1;

-- Change item_id column from INT to VARCHAR(50)
ALTER TABLE requisitions MODIFY COLUMN item_id VARCHAR(50);

-- Re-add the foreign key constraint
ALTER TABLE requisitions ADD CONSTRAINT fk_requisitions_item_id 
FOREIGN KEY (item_id) REFERENCES inventory(id);