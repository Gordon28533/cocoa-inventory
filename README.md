# Cocoa Inventory Management System

A comprehensive inventory management system built with React frontend and Node.js backend, designed for Cocoa Marketing Company to manage stock, requisitions, and user access control.

## Features

- **User Authentication & Authorization**: Role-based access control (Admin, HOD, IT Manager, Account Manager, Stores, Staff)
- **Inventory Management**: Add, edit, and track inventory items across different categories
- **Requisition System**: Multi-step approval workflow for item requests
- **Department Management**: Create and manage departments
- **Audit Logging**: Track all system activities
- **Stock Alerts**: Automatic low stock notifications
- **Real-time Dashboard**: Live inventory status and user-friendly interface

## Prerequisites

- Node.js 16+ 
- MySQL 8.0+
- npm or yarn

## Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd cocoa-inventory
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd Backend
npm install
cd ..
```

### 3. Database Setup
```sql
-- Create database
CREATE DATABASE cocoa_inventory;

-- Import schema
mysql -u your_username -p cocoa_inventory < database_schema_update.sql
```

### 4. Environment Configuration
Copy the `.env.example` file to `.env` and update the values:
```bash
cp .env.example .env
```

Then edit the `.env` file with your specific configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=cocoa_inventory

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here

# Server Configuration
PORT=5000
NODE_ENV=development
```

> **IMPORTANT**: Never commit your `.env` file to version control. It contains sensitive information.

### 5. Build Frontend
```bash
npm run build
```

## Available Scripts

### Development
```bash
# Start frontend development server
npm start

# Start backend server
npm run start-backend

# Run both frontend and backend
npm run dev
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm run start-backend

# Build and deploy
npm run build-and-deploy
```

### Testing
```bash
# Run frontend tests
npm test

# Run backend tests (requires server running)
npm run test:backend
```

### Code Quality
```bash
# Lint and fix code
npm run lint
```

## Project Structure

```
cocoa-inventory/
├── .github/                # GitHub configuration
│   └── workflows/          # GitHub Actions workflows
├── Backend/                # Node.js backend server
│   ├── server.js           # Main server file
│   └── *.test.js           # Backend tests
├── src/
│   ├── Component/          # React components
│   ├── Pages/              # Page components
│   ├── data/               # Static data files
│   └── styles.css          # Global styles
├── public/                 # Static assets
├── scripts/                # Deployment scripts
├── .env.example            # Example environment variables
├── CODE_OF_CONDUCT.md      # Community standards
├── CONTRIBUTING.md         # Contribution guidelines
└── database_schema_update.sql  # Database schema
```

## API Endpoints

### Authentication
- `POST /login` - User login
- `GET /health` - Health check

### Users (Admin Only)
- `GET /users` - List all users
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Inventory
- `GET /items` - List all inventory items
- `POST /items` - Add new item
- `PUT /items/:id` - Update item quantity

### Requisitions
- `POST /requisitions` - Create requisition
- `GET /requisitions` - List requisitions
- `PUT /requisitions/:id/approve` - Approve requisition
- `PUT /requisitions/:id/fulfill` - Fulfill requisition

### Departments
- `GET /departments` - List departments
- `POST /departments` - Create department
- `PUT /departments/:id` - Update department
- `DELETE /departments/:id` - Delete department

## User Roles

- **Admin**: Full system access, user management, audit logs
- **HOD**: Approve requisitions for their department
- **IT Manager**: Approve IT-related requisitions
- **Account Manager**: Final approval for non-IT items
- **Stores**: Fulfill approved requisitions
- **Staff**: Create requisitions, view inventory

## Testing

The project includes comprehensive tests for both frontend and backend:

- **Frontend Tests**: React components and user interactions
- **Backend Tests**: API endpoints and authentication
- **Integration Tests**: End-to-end functionality

Run tests with:
```bash
npm test
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment
```bash
# Use deployment script
./deploy.sh

# Or on Windows
deploy.bat
```

## Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting on login attempts
- Secure error handling
- Environment variable protection

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

We also have a [Code of Conduct](./CODE_OF_CONDUCT.md) that we expect all contributors to follow.

### GitHub Integration

This project uses GitHub Actions for continuous integration and deployment:

- **Automated Testing**: All pull requests and pushes to the main branch are automatically tested
- **Automated Deployment**: Changes to the main branch are automatically deployed to the production server
- **Code Quality Checks**: Linting and code style checks are performed automatically

To set up GitHub Actions for deployment, you need to configure the following secrets in your GitHub repository:
- `HOST`: The hostname or IP address of your deployment server
- `USERNAME`: The SSH username for your deployment server
- `SSH_KEY`: The private SSH key for authentication

## License

This project is proprietary software for Cocoa Marketing Company.

## Support

For support and questions, contact the development team.
