use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::{Base64VecU8, U128};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near_bindgen, AccountId, Balance, CryptoHash, Gas, PanicOnDefault, Promise, Timestamp,
};
use sha2::{Digest, Sha256};

/// Gas for cross-contract calls
const GAS_FOR_FT_TRANSFER: Gas = Gas(10_000_000_000_000);

/// HTLC states
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub enum HTLCState {
    Active,
    Completed,
    Refunded,
    Expired,
}

/// Cross-chain swap order structure
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SwapOrder {
    /// Order hash from source chain
    pub order_hash: Base64VecU8,
    /// Maker on source chain
    pub src_maker: String,
    /// Source chain identifier
    pub src_chain: String,
    /// Source token identifier  
    pub src_token: String,
    /// Source amount
    pub src_amount: U128,
    /// Recipient on NEAR
    pub dst_recipient: AccountId,
    /// NEAR token (contract account or "NEAR" for native)
    pub dst_token: String,
    /// Amount to be released on NEAR
    pub dst_amount: U128,
    /// Hash lock for HTLC
    pub hash_lock: Base64VecU8,
    /// Timelock timestamp (nanoseconds)
    pub timelock: Timestamp,
    /// Current state
    pub state: HTLCState,
    /// Block timestamp when created
    pub created_at: Timestamp,
    /// Resolver account who deposited funds
    pub resolver: AccountId,
}

/// NEAR Escrow Contract for Cross-Chain Swaps
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NEAREscrow {
    /// Contract owner
    pub owner: AccountId,
    /// Active swap orders indexed by order hash
    pub swap_orders: UnorderedMap<Base64VecU8, SwapOrder>,
    /// Deposits for each order (order_hash -> amount)
    pub deposits: LookupMap<Base64VecU8, Balance>,
    /// Supported source chains
    pub supported_chains: LookupMap<String, bool>,
    /// Minimum timelock duration (nanoseconds)
    pub min_timelock: Timestamp,
    /// Maximum timelock duration (nanoseconds)  
    pub max_timelock: Timestamp,
}

#[near_bindgen]
impl NEAREscrow {
    /// Initialize the contract
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            swap_orders: UnorderedMap::new(b"s".to_vec()),
            deposits: LookupMap::new(b"d".to_vec()),
            supported_chains: LookupMap::new(b"c".to_vec()),
            min_timelock: 3_600_000_000_000, // 1 hour in nanoseconds
            max_timelock: 86_400_000_000_000, // 24 hours in nanoseconds
        }
    }

    /// Initialize with supported chains
    #[init]
    pub fn new_with_chains(owner: AccountId, supported_chains: Vec<String>) -> Self {
        let mut contract = Self::new(owner);
        for chain in supported_chains {
            contract.supported_chains.insert(&chain, &true);
        }
        contract
    }

    /// Create a new HTLC for incoming swap from source chain
    #[payable]
    pub fn create_htlc(
        &mut self,
        order_hash: Base64VecU8,
        src_maker: String,
        src_chain: String,
        src_token: String,
        src_amount: U128,
        dst_recipient: AccountId,
        dst_token: String,
        hash_lock: Base64VecU8,
        timelock: Timestamp,
    ) {
        // Validate parameters
        assert!(
            self.supported_chains.get(&src_chain).unwrap_or(false),
            "Unsupported source chain"
        );
        assert!(
            timelock > env::block_timestamp() + self.min_timelock,
            "Timelock too short"
        );
        assert!(
            timelock < env::block_timestamp() + self.max_timelock,
            "Timelock too long"
        );
        assert!(
            !self.swap_orders.get(&order_hash).is_some(),
            "Order already exists"
        );
        assert!(hash_lock.0.len() == 32, "Invalid hash lock length");

        let deposit_amount = env::attached_deposit();
        assert!(deposit_amount > 0, "Must attach deposit");

        // Create swap order
        let swap_order = SwapOrder {
            order_hash: order_hash.clone(),
            src_maker,
            src_chain,
            src_token,
            src_amount,
            dst_recipient,
            dst_token,
            dst_amount: U128(deposit_amount),
            hash_lock,
            timelock,
            state: HTLCState::Active,
            created_at: env::block_timestamp(),
            resolver: env::predecessor_account_id(),
        };

        // Store order and deposit
        self.swap_orders.insert(&order_hash, &swap_order);
        self.deposits.insert(&order_hash, &deposit_amount);

        env::log_str(&format!(
            "HTLC created: order_hash={:?}, amount={}, timelock={}",
            order_hash, deposit_amount, timelock
        ));
    }

    /// Complete the HTLC by revealing the secret
    pub fn complete_htlc(&mut self, order_hash: Base64VecU8, secret: Base64VecU8) {
        let mut swap_order = self
            .swap_orders
            .get(&order_hash)
            .expect("Order not found");

        assert_eq!(swap_order.state, HTLCState::Active, "Order not active");
        assert!(
            env::block_timestamp() <= swap_order.timelock,
            "HTLC expired"
        );

        // Verify secret matches hash lock
        let secret_hash = Sha256::digest(&secret.0);
        assert_eq!(
            secret_hash.as_slice(),
            swap_order.hash_lock.0.as_slice(),
            "Invalid secret"
        );

        // Update state
        swap_order.state = HTLCState::Completed;
        self.swap_orders.insert(&order_hash, &swap_order);

        // Get deposit amount
        let amount = self.deposits.get(&order_hash).expect("Deposit not found");
        self.deposits.remove(&order_hash);

        // Transfer to recipient
        if swap_order.dst_token == "NEAR" {
            // Native NEAR transfer
            Promise::new(swap_order.dst_recipient.clone()).transfer(amount);
        } else {
            // FT transfer (would need to call FT contract)
            // For now, just transfer NEAR - in production would call FT contract
            Promise::new(swap_order.dst_recipient.clone()).transfer(amount);
        }

        env::log_str(&format!(
            "HTLC completed: order_hash={:?}, secret={:?}, amount={}",
            order_hash, secret, amount
        ));
    }

    /// Refund the HTLC after timelock expires
    pub fn refund_htlc(&mut self, order_hash: Base64VecU8) {
        let mut swap_order = self
            .swap_orders
            .get(&order_hash)
            .expect("Order not found");

        assert_eq!(swap_order.state, HTLCState::Active, "Order not active");
        assert!(
            env::block_timestamp() > swap_order.timelock,
            "HTLC not expired"
        );

        // Update state
        swap_order.state = HTLCState::Refunded;
        self.swap_orders.insert(&order_hash, &swap_order);

        // Get deposit amount
        let amount = self.deposits.get(&order_hash).expect("Deposit not found");
        self.deposits.remove(&order_hash);

        // Refund to resolver
        Promise::new(swap_order.resolver.clone()).transfer(amount);

        env::log_str(&format!(
            "HTLC refunded: order_hash={:?}, amount={}",
            order_hash, amount
        ));
    }

    /// Get swap order details
    pub fn get_swap_order(&self, order_hash: Base64VecU8) -> Option<SwapOrder> {
        self.swap_orders.get(&order_hash)
    }

    /// Check if HTLC is active
    pub fn is_htlc_active(&self, order_hash: Base64VecU8) -> bool {
        if let Some(order) = self.swap_orders.get(&order_hash) {
            order.state == HTLCState::Active && env::block_timestamp() <= order.timelock
        } else {
            false
        }
    }

    /// Get all active orders (for monitoring)
    pub fn get_active_orders(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<SwapOrder> {
        let start = from_index.unwrap_or(0) as usize;
        let limit = limit.unwrap_or(10) as usize;

        self.swap_orders
            .values()
            .skip(start)
            .take(limit)
            .filter(|order| order.state == HTLCState::Active)
            .collect()
    }

    /// Verify hash lock matches secret
    pub fn verify_secret(&self, secret: Base64VecU8, hash_lock: Base64VecU8) -> bool {
        let secret_hash = Sha256::digest(&secret.0);
        secret_hash.as_slice() == hash_lock.0.as_slice()
    }

    // Owner functions

    /// Add supported chain (owner only)
    pub fn add_supported_chain(&mut self, chain: String) {
        self.assert_owner();
        self.supported_chains.insert(&chain, &true);
    }

    /// Remove supported chain (owner only)
    pub fn remove_supported_chain(&mut self, chain: String) {
        self.assert_owner();
        self.supported_chains.insert(&chain, &false);
    }

    /// Update timelock limits (owner only)
    pub fn update_timelock_limits(&mut self, min_timelock: Timestamp, max_timelock: Timestamp) {
        self.assert_owner();
        assert!(min_timelock < max_timelock, "Invalid timelock limits");
        self.min_timelock = min_timelock;
        self.max_timelock = max_timelock;
    }

    /// Emergency withdrawal (owner only)
    pub fn emergency_withdraw(&mut self, amount: U128) {
        self.assert_owner();
        Promise::new(self.owner.clone()).transfer(amount.0);
    }

    /// Transfer ownership (owner only)
    pub fn transfer_ownership(&mut self, new_owner: AccountId) {
        self.assert_owner();
        self.owner = new_owner;
    }

    // View functions

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn is_chain_supported(&self, chain: String) -> bool {
        self.supported_chains.get(&chain).unwrap_or(false)
    }

    pub fn get_timelock_limits(&self) -> (Timestamp, Timestamp) {
        (self.min_timelock, self.max_timelock)
    }

    // Private functions

    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only owner can call this method"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, MockedBlockchain};

    fn get_context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor);
        builder
    }

    #[test]
    fn test_contract_creation() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());

        let contract = NEAREscrow::new(accounts(0));
        assert_eq!(contract.get_owner(), accounts(0));
    }

    #[test]
    fn test_verify_secret() {
        let mut context = get_context(accounts(0));
        testing_env!(context.build());

        let contract = NEAREscrow::new(accounts(0));
        let secret = Base64VecU8(b"test_secret".to_vec());
        let hash = Sha256::digest(&secret.0);
        let hash_lock = Base64VecU8(hash.to_vec());

        assert!(contract.verify_secret(secret, hash_lock));
    }
}