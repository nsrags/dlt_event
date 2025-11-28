
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

// Create a PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'digitalwallet',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 50, // Maximum number of clients in the pool
  idleTimeoutMillis: 50000,
  connectionTimeoutMillis: 20000,
  ssl: {
    ca: fs.readFileSync(process.env.PG_CA_CERT_PATH).toString(),
    rejectUnauthorized: false,
  }
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Initialize database tables
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create mint_transactions table if it doesn't exist
    // Schema simplified per requirement: primary key = wallet_address
    await client.query(`
      CREATE TABLE IF NOT EXISTS mint_transactions (
        wallet_address VARCHAR(255) PRIMARY KEY,
        contract_address VARCHAR(255) NOT NULL,
        token_symbol VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
    `);

    // Create index for faster queries on contract_address and timestamp
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mint_contract_address 
      ON mint_transactions(contract_address);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mint_timestamp 
      ON mint_transactions(timestamp DESC);
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to save mint transaction
export async function saveMintTransaction(data) {
  // Only accept { contractAddress, walletAddress, tokenSymbol }
  const client = await pool.connect();
  try {
    const {
      contractAddress,
      walletAddress,
      tokenSymbol = null,
      metadata = {}
    } = data;

    // Use upsert so wallet_address is unique primary key
    const result = await client.query(
      `INSERT INTO mint_transactions 
       (wallet_address, contract_address, token_symbol, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wallet_address) DO UPDATE SET
         contract_address = EXCLUDED.contract_address,
         token_symbol = EXCLUDED.token_symbol,
         metadata = EXCLUDED.metadata,
         timestamp = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        walletAddress,
        contractAddress,
        tokenSymbol,
        JSON.stringify(metadata)
      ]
    );

    console.log('✅ Mint transaction saved/upserted to database for wallet:', walletAddress);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error saving mint transaction:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to get mint transactions
export async function getMintTransactions(filters = {}) {
  const client = await pool.connect();
  try {
    let query = 'select wallet_address, contract_address, token_symbol from mint_transactions';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    /*if (filters.contractAddress) {
      conditions.push(`contract_address = $${paramCount++}`);
      values.push(filters.contractAddress);
    }

    if (filters.walletAddress) {
      conditions.push(`wallet_address = $${paramCount++}`);
      values.push(filters.walletAddress);
    }

    if (filters.limit) {
      conditions.push(`timestamp >= NOW() - INTERVAL '${parseInt(filters.limit)} days'`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT 100';*/

    const result = await client.query(query, values);
    console.log('✅ Fetched mint transactions from database:', result.rows);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching mint transactions:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
