# PostgreSQL Database Setup for Digital Wallet

## Prerequisites

1. **Install PostgreSQL**
   - macOS: `brew install postgresql`
   - Start PostgreSQL: `brew services start postgresql`

2. **Install pg package** (already done)
   ```bash
   npm install pg
   ```

## Database Setup

### 1. Create Database

```bash
# Access PostgreSQL
psql postgres

# Create database
CREATE DATABASE digitalwallet;

# Connect to the database
\c digitalwallet

# Exit psql
\q
```

### 2. Configure Environment Variables

Add these variables to your `.env` file in the `auth-proxy` directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=digitalwallet
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 3. Start the Server

The database tables will be created automatically when you start the server:

```bash
node server.js
```

You should see:
```
✅ Connected to PostgreSQL database
✅ Database tables initialized successfully
Proxy running on port 4000
```

## Database Schema

### mint_transactions Table

| Column | Type | Description |
|--------|------|-------------|
| wallet_address | VARCHAR(255) | **Primary key** - Wallet address that minted tokens |
| contract_address | VARCHAR(255) | Token contract address |
| token_symbol | VARCHAR(255) | Token symbol/name |
| timestamp | TIMESTAMP | When the transaction was recorded (auto-updated on upsert) |
| metadata | JSONB | Additional transaction metadata |

**Note:** The table uses `wallet_address` as the primary key, so each wallet can have only one record. Subsequent mints for the same wallet will update the existing record (upsert behavior).

## API Endpoints

### Get Mint History

```bash
# Get all mint transactions
GET http://localhost:4000/api/mint/history

# Filter by contract address
GET http://localhost:4000/api/mint/history?contractAddress=0x123...

# Filter by wallet address
GET http://localhost:4000/api/mint/history?walletAddress=0x456...

# Get transactions from last N days
GET http://localhost:4000/api/mint/history?days=7
```

**Response Example:**
```json
{
  "success": true,
  "count": 5,
  "transactions": [
    {
      "wallet_address": "0x456...",
      "contract_address": "0x123...",
      "token_symbol": "MyToken",
      "timestamp": "2025-11-23T10:30:00.000Z",
      "metadata": {
        "mmfTokenWalletAddress": "0x789...",
        "timestamp": "2025-11-23T10:30:00.000Z"
      }
    }
  ]
}
```

## Useful PostgreSQL Commands

```bash
# Connect to database
psql -d digitalwallet

# View all tables
\dt

# Describe mint_transactions table
\d mint_transactions

# View all mint transactions
SELECT * FROM mint_transactions ORDER BY timestamp DESC;

# View recent mint transactions
SELECT wallet_address, contract_address, token_symbol, timestamp 
FROM mint_transactions 
ORDER BY timestamp DESC 
LIMIT 10;

# Count total mint transactions
SELECT COUNT(*) FROM mint_transactions;

# View transactions by contract
SELECT contract_address, token_symbol, COUNT(*) as total_wallets
FROM mint_transactions 
GROUP BY contract_address, token_symbol;

# Delete all records (use with caution)
DELETE FROM mint_transactions;

# Drop table (use with caution)
DROP TABLE mint_transactions;
```

## Troubleshooting

### Connection Error
If you see "connection refused" error:
```bash
# Check if PostgreSQL is running
brew services list

# Start PostgreSQL if not running
brew services start postgresql
```

### Authentication Failed
If you see "authentication failed" error:
- Check your DB_USER and DB_PASSWORD in `.env`
- Verify PostgreSQL user exists: `psql postgres -c "\du"`
- Create user if needed: `createuser -s postgres`

### Database Does Not Exist
```bash
# Create database manually
createdb digitalwallet
```

## Next Steps

1. ✅ Database is configured and running
2. ✅ Mint transactions are automatically saved
3. ✅ Query mint history via API
