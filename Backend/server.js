import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables with absolute path
dotenv.config({ path: join(__dirname, '..', '.env') });

if (process.env.NODE_ENV !== 'production') {
  console.log('Loaded environment variables for development.');
}

// Environment variables loaded successfully

const app = express();

// Middleware
app.use(cors());
app.use(json());
app.use(helmet());
app.use(morgan('dev'));

// Serve static files from React build
app.use(express.static(join(__dirname, '..', 'build')));

// Rate limiting for login attempts
const loginAttempts = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 0, resetTime: now + windowMs });
  }

  const attempts = loginAttempts.get(ip);
  
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }

  if (attempts.count >= maxAttempts) {
    return res.status(429).json({ 
      error: 'Too many login attempts. Please try again later.',
      retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
    });
  }

  attempts.count++;
  next();
}

// Database connection
let db = null;

async function connectToDatabase() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      console.error('Missing required database environment variables');
      return false;
    }

    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME
    });

    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Middleware to require authentication and attach user info
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Generate a unique code for requisition pickup
function generateUniqueCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char hex code
}

// JWT Admin Middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Database check middleware
function requireDatabase(req, res, next) {
  if (!db) {
    return res.status(503).json({ error: "Database not available" });
  }
  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/login', rateLimit, requireDatabase, async (req, res) => {
  const { staffName, password } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE staffName = ?',
      [staffName]
    );
    if (rows.length > 0) {
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const token = jwt.sign(
          { id: user.id, staffName: user.staffName, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '2h' }
        );
        return res.json({ success: true, token, role: user.role, department_id: user.department_id });
      }
    }
    res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// List all users (admin only)
app.get('/users', requireAdmin, requireDatabase, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, staffName, staffId, role, department_id FROM users ORDER BY staffName');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update a user (admin only)
app.put('/users/:id', requireAdmin, requireDatabase, async (req, res) => {
  const { id } = req.params;
  const { staffName, staffId, password, role, department_id } = req.body;
  try {
    let updateFields = [];
    let params = [];
    if (staffName) { updateFields.push('staffName = ?'); params.push(staffName); }
    if (staffId) { updateFields.push('staffId = ?'); params.push(staffId); }
    if (role) { updateFields.push('role = ?'); params.push(role); }
    if (department_id !== undefined) { updateFields.push('department_id = ?'); params.push(department_id || null); }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      params.push(hashedPassword);
    }
    if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    await db.execute(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user (admin only)
app.delete('/users/:id', requireAdmin, requireDatabase, async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update POST /users to use staffName+staffId as password if not provided, and only allow certain roles
app.post('/users', requireAdmin, requireDatabase, async (req, res) => {
  let { staffName, staffId, password, role, department_id } = req.body;
  const allowedRoles = ['hod', 'deputy_hod', 'stores', 'user', 'admin', 'account_manager', 'it_manager'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    if (!password) {
      password = `${staffName}${staffId}`;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (staffName, staffId, password, role, department_id) VALUES (?, ?, ?, ?, ?)',
      [staffName, staffId, hashedPassword, role, department_id || null]
    );
    res.status(201).json({ success: true, message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example protected route (for testing)
app.get('/protected', requireAdmin, (req, res) => {
  res.json({ message: "You are an admin!" });
});

// Inventory API endpoints
app.get('/items', requireDatabase, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM inventory ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.post('/items', requireDatabase, async (req, res) => {
  const { id, name, category, type, quantity } = req.body;
  // Input validation
  if (!id || !name || !category || !type || typeof quantity !== 'number' || quantity < 0) {
    return res.status(400).json({ error: 'Invalid item data' });
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO inventory (id, name, category, type, quantity) VALUES (?, ?, ?, ?, ?)',
      [id, name, category, type, quantity]
    );
    const newItem = { id, name, category, type, quantity };
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

app.put('/items/:id', requireDatabase, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  // Input validation
  if (typeof quantity !== 'number' || quantity < 0) {
    return res.status(400).json({ error: 'Invalid quantity value' });
  }
  try {
    await db.execute(
      'UPDATE inventory SET quantity = ? WHERE id = ?',
      [quantity, id]
    );
    res.json({ success: true, message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete an item (stores and admin allowed)
app.delete('/items/:id', requireAuth, requireDatabase, async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  if (!(user.role === 'stores' || user.role === 'admin')) {
    return res.status(403).json({ error: 'Not authorized to delete items' });
  }
  try {
    await db.execute('DELETE FROM inventory WHERE id = ?', [id]);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451)) {
      return res.status(400).json({ error: 'Cannot delete item that is referenced by requisitions' });
    }
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// POST /requisitions - Create a new requisition (multi-item support)
app.post('/requisitions', requireAuth, requireDatabase, async (req, res) => {
  const { items, department, department_id, is_it_item } = req.body;
  const requested_by = req.user.id;
  // Input validation
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items selected' });
  }
  if (!department && !department_id) {
    return res.status(400).json({ error: 'Department is required' });
  }
  for (const item of items) {
    if (!item.id || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({ error: 'Invalid item in requisition' });
    }
  }
  const unique_code = generateUniqueCode();
  const batch_id = crypto.randomBytes(6).toString('hex'); // 12-char batch id
  try {
    // Handle both department string and department_id for backward compatibility
    let finalDepartment = department;
    let finalDepartmentId = department_id;
    
    if (department_id && !department) {
      // If only department_id is provided, get the department name
      const [deptRows] = await db.execute('SELECT name FROM departments WHERE id = ?', [department_id]);
      if (deptRows.length === 0) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
      finalDepartment = deptRows[0].name;
    } else if (department && !department_id) {
      // If only department name is provided, get the department_id
      const [deptRows] = await db.execute('SELECT id FROM departments WHERE name = ?', [department]);
      if (deptRows.length === 0) {
        return res.status(400).json({ error: 'Invalid department name' });
      }
      finalDepartmentId = deptRows[0].id;
    }
    
    for (const item of items) {
      // Convert item code to item ID if needed
      let itemId = item.id;
      if (typeof itemId === 'string' && /^[A-Z]{3}\d{3}$/.test(itemId)) {
        // If it's a string like 'STN002', keep as string
        // Your database should have item_id as VARCHAR, not INT
      }
      
      await db.execute(
        `INSERT INTO requisitions (item_id, requested_by, department, department_id, quantity, status, unique_code, is_it_item, batch_id)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [itemId, requested_by, finalDepartment, finalDepartmentId, item.quantity, unique_code, !!is_it_item, batch_id]
      );
    }
    await logAudit(requested_by, 'create_requisition', batch_id);
    res.status(201).json({ success: true, batch_id, unique_code });
  } catch (error) {
    console.error('Error creating requisition:', error);
    res.status(500).json({ error: 'Failed to create requisition' });
  }
});

// GET /requisitions - List all requisitions (optionally filter by status/role)
app.get('/requisitions', requireAuth, requireDatabase, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM requisitions ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch requisitions' });
  }
});

// PUT /requisitions/:id/approve - Approve at each step (supports batch)
app.put('/requisitions/:id/approve', requireAuth, requireDatabase, async (req, res) => {
  const { id } = req.params;
  const { batch_id } = req.body;
  const user = req.user;
  try {
    let requisitions;
    if (batch_id) {
      const [rows] = await db.execute('SELECT * FROM requisitions WHERE batch_id = ?', [batch_id]);
      requisitions = rows;
      if (!requisitions.length) return res.status(404).json({ error: 'Batch not found' });
    } else {
      const [[requisition]] = await db.execute('SELECT * FROM requisitions WHERE id = ?', [id]);
      if (!requisition) return res.status(404).json({ error: 'Requisition not found' });
      requisitions = [requisition];
    }
    let nextStatus = null, updateField = null, action = null;
    const first = requisitions[0];
    // Branch account approval (after stores submits)
    if (first.status === 'pending' && user.role === 'account' && first.department !== 'Head Office') {
      nextStatus = 'branch_account_approved';
      updateField = 'branch_account_approved_by';
      action = 'branch_account_approve';
    // Head office account approval (after branch account)
    } else if (first.status === 'branch_account_approved' && user.role === 'account_manager' && first.department !== 'Head Office') {
      nextStatus = 'ho_account_approved';
      updateField = 'ho_account_approved_by';
      action = 'ho_account_approve';
    // Head office stores fulfillment (after HO account approval)
    } else if (first.status === 'ho_account_approved' && user.role === 'stores' && first.department === 'Head Office') {
      nextStatus = 'fulfilled';
      updateField = 'fulfilled_by';
      action = 'fulfill';
    // Existing logic for HOD, IT, etc.
    } else if (first.status === 'pending' && (user.role === 'hod' || user.role === 'deputy_hod')) {
      nextStatus = first.is_it_item ? 'hod_approved' : 'hod_approved';
      updateField = 'hod_approved_by';
      action = 'hod_approve';
    } else if (first.status === 'hod_approved' && first.is_it_item && user.role === 'it_manager') {
      nextStatus = 'it_approved';
      updateField = 'it_approved_by';
      action = 'it_approve';
    } else if ((first.status === 'hod_approved' && !first.is_it_item && user.role === 'account_manager') ||
               (first.status === 'it_approved' && user.role === 'account_manager')) {
      nextStatus = 'account_approved';
      updateField = 'account_approved_by';
      action = 'account_approve';
    } else {
      return res.status(403).json({ error: 'Not authorized to approve at this step' });
    }
    const ids = requisitions.map(r => r.id);
    await db.execute(
      `UPDATE requisitions SET status = ?, ${updateField} = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
      [nextStatus, user.id, ...ids]
    );
    await logAudit(user.id, action, batch_id || id);
    res.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error('Error approving requisition:', error);
    res.status(500).json({ error: 'Failed to approve requisition' });
  }
});

// PUT /requisitions/:id/fulfill - Fulfill requisition (Stores, with unique code check, supports batch)
app.put('/requisitions/:id/fulfill', requireAuth, requireDatabase, async (req, res) => {
  const { id } = req.params;
  const { unique_code, batch_id } = req.body;
  const user = req.user;
  try {
    let requisitions;
    if (batch_id) {
      const [rows] = await db.execute('SELECT * FROM requisitions WHERE batch_id = ?', [batch_id]);
      requisitions = rows;
      if (!requisitions.length) return res.status(404).json({ error: 'Batch not found' });
    } else {
      const [[requisition]] = await db.execute('SELECT * FROM requisitions WHERE id = ?', [id]);
      if (!requisition) return res.status(404).json({ error: 'Requisition not found' });
      requisitions = [requisition];
    }
    if (user.role !== 'stores') return res.status(403).json({ error: 'Only stores can fulfill' });
    const first = requisitions[0];
    if (!(first.status === 'ho_account_approved' || first.status === 'account_approved')) {
      return res.status(400).json({ error: 'Not ready for fulfillment' });
    }
    if (first.unique_code !== unique_code) return res.status(400).json({ error: 'Invalid unique code' });
    const ids = requisitions.map(r => r.id);
    await db.execute(
      `UPDATE requisitions SET status = 'fulfilled', fulfilled_by = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
      [user.id, ...ids]
    );
    await logAudit(user.id, 'fulfill', batch_id || id);
    res.json({ success: true, status: 'fulfilled' });
  } catch (error) {
    console.error('Error fulfilling requisition:', error);
    res.status(500).json({ error: 'Failed to fulfill requisition' });
  }
});

// GET /requisitions/code/:code - Lookup requisition by unique code
app.get('/requisitions/code/:code', requireDatabase, async (req, res) => {
  const { code } = req.params;
  try {
    const [[requisition]] = await db.execute('SELECT * FROM requisitions WHERE unique_code = ?', [code]);
    if (!requisition) return res.status(404).json({ error: 'Requisition not found' });
    res.json(requisition);
  } catch (error) {
    console.error('Error fetching requisition by code:', error);
    res.status(500).json({ error: 'Failed to fetch requisition' });
  }
});

// GET /audit-logs - Admins can view audit logs
app.get('/audit-logs', requireAdmin, requireDatabase, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT l.*, u.staffName FROM audit_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.timestamp DESC LIMIT 200'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Department Management Endpoints
// GET /departments - Get all departments
app.get('/departments', requireDatabase, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM departments ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /departments - Add new department (admin only)
app.post('/departments', requireAdmin, requireDatabase, async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    res.status(201).json({ 
      success: true, 
      id: result.insertId, 
      name, 
      description: description || null,
      message: 'Department created successfully' 
    });
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Department name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create department' });
    }
  }
});

// PUT /departments/:id - Update department (admin only)
app.put('/departments/:id', requireAdmin, requireDatabase, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  try {
    await db.execute(
      'UPDATE departments SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
    res.json({ success: true, message: 'Department updated successfully' });
  } catch (error) {
    console.error('Error updating department:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Department name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update department' });
    }
  }
});

// DELETE /departments/:id - Delete department (admin only)
app.delete('/departments/:id', requireAdmin, requireDatabase, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if department is being used in requisitions
    const [requisitions] = await db.execute(
      'SELECT COUNT(*) as count FROM requisitions WHERE department_id = ?',
      [id]
    );
    if (requisitions[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete department that has associated requisitions' 
      });
    }
    
    await db.execute('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// Change password endpoint for authenticated users
app.post('/change-password', requireAuth, requireDatabase, async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new password are required.' });
  }
  try {
    // Get current hashed password
    const [[user]] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    // Hash and update new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// Get current user info
app.get('/me', requireAuth, requireDatabase, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.execute('SELECT id, staffName, role, department_id FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Dummy /ws route to prevent 404 errors
app.get('/ws', (req, res) => {
  res.status(200).send('WebSocket endpoint not implemented.');
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'build', 'index.html'));
});

async function ensureSchema() {
  if (!db) return;
  try {
    // Check current type of requisitions.item_id
    const [rows] = await db.execute(
      `SELECT DATA_TYPE, COLUMN_TYPE FROM information_schema.columns 
       WHERE table_schema = DATABASE() AND table_name = 'requisitions' AND column_name = 'item_id'`
    );
    const itemIdType = rows && rows[0] ? String(rows[0].DATA_TYPE || '').toLowerCase() : null;
    if (itemIdType && !itemIdType.startsWith('varchar')) {
      console.log('Altering requisitions.item_id to VARCHAR(50)...');
      // Find FK constraint if exists
      const [fkRows] = await db.execute(
        `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requisitions' AND COLUMN_NAME = 'item_id' AND REFERENCED_TABLE_NAME IS NOT NULL`
      );
      if (fkRows.length) {
        const fkName = fkRows[0].CONSTRAINT_NAME;
        console.log(`Dropping foreign key constraint ${fkName} on requisitions.item_id...`);
        await db.execute(`ALTER TABLE requisitions DROP FOREIGN KEY \`${fkName}\``);
      }
      await db.execute(`ALTER TABLE requisitions MODIFY item_id VARCHAR(50) NOT NULL`);
      // Optionally re-add FK if inventory.id is varchar
      const [invCol] = await db.execute(
        `SELECT DATA_TYPE FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'inventory' AND column_name = 'id'`
      );
      const invType = invCol && invCol[0] ? String(invCol[0].DATA_TYPE || '').toLowerCase() : null;
      if (invType && invType.startsWith('varchar')) {
        console.log('Re-adding foreign key for requisitions.item_id -> inventory.id');
        await db.execute(
          `ALTER TABLE requisitions
           ADD CONSTRAINT fk_requisitions_item FOREIGN KEY (item_id) REFERENCES inventory(id)
           ON UPDATE CASCADE ON DELETE RESTRICT`
        );
      }
      console.log('Schema update for requisitions.item_id complete.');
    }
  } catch (err) {
    console.error('Schema check/update failed:', err);
  }
}

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('🚀 Starting server...');
  // Try to connect to database
  await connectToDatabase();
  // Ensure schema is compatible with alphanumeric item IDs
  await ensureSchema();
  // Start the server regardless of database connection
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database status: ${db ? 'Connected' : 'Disconnected'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Login endpoint: http://localhost:${PORT}/login`);
  });
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Audit log helper
async function logAudit(userId, action, requisitionId) {
  try {
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, requisition_id) VALUES (?, ?, ?)',
      [userId, action, requisitionId]
    );
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}

// Start the server
startServer().catch(console.error);

// Package.json scripts
// "start-backend": "node backend/server.js"