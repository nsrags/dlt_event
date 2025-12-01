-- Create mint_transactions table
CREATE TABLE IF NOT EXISTS mint_transactions (
  id SERIAL PRIMARY KEY,
  contract_address VARCHAR(255) NOT NULL,
  contract_name VARCHAR(255),
  wallet_address VARCHAR(255) NOT NULL,
  amount VARCHAR(100) NOT NULL,
  request_id_1 VARCHAR(255),
  request_status_1 VARCHAR(50),
  request_id_2 VARCHAR(255),
  request_status_2 VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_contract_address ON mint_transactions(contract_address);
CREATE INDEX IF NOT EXISTS idx_timestamp ON mint_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_address ON mint_transactions(wallet_address);

-- Add comments for documentation
COMMENT ON TABLE mint_transactions IS 'Stores mint transaction history from the digital wallet application';
COMMENT ON COLUMN mint_transactions.contract_address IS 'The token contract address where tokens were minted';
COMMENT ON COLUMN mint_transactions.contract_name IS 'Human-readable name of the token contract';
COMMENT ON COLUMN mint_transactions.wallet_address IS 'Wallet address that received the minted tokens';
COMMENT ON COLUMN mint_transactions.amount IS 'Amount of tokens minted (in wei format)';
COMMENT ON COLUMN mint_transactions.request_id_1 IS 'Request ID for the first mint operation (WALLET_ADDRESS)';
COMMENT ON COLUMN mint_transactions.request_status_1 IS 'Status of the first mint operation (SUCCESS/FAILURE)';
COMMENT ON COLUMN mint_transactions.request_id_2 IS 'Request ID for the second mint operation (MMF_TOKEN_WALLET_ADDRESS)';
COMMENT ON COLUMN mint_transactions.request_status_2 IS 'Status of the second mint operation (SUCCESS/FAILURE)';
COMMENT ON COLUMN mint_transactions.metadata IS 'Additional metadata in JSON format (wallet addresses, timestamps, etc.)';
