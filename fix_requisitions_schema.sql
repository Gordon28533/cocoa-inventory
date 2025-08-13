-- Fix the requisitions table schema to properly handle item_id as VARCHAR
-- This script modifies the requisitions table to ensure compatibility with inventory item IDs

-- First, drop the foreign key constraint
ALTER TABLE requisitions DROP FOREIGN KEY requisitions_ibfk_1;

-- Ensure item_id is VARCHAR(50) to match inventory.id
ALTER TABLE requisitions MODIFY COLUMN item_id VARCHAR(50);

-- Re-add the foreign key constraint
ALTER TABLE requisitions 
ADD CONSTRAINT fk_requisitions_inventory 
FOREIGN KEY (item_id) REFERENCES inventory(id);

-- Add an index on item_id for better performance
CREATE INDEX idx_requisitions_item_id ON requisitions(item_id);

-- Verify the changes
SHOW CREATE TABLE requisitions;