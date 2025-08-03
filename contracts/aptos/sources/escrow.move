/// Cross-chain escrow contract for Aptos supporting HTLC functionality
/// Enables secure swaps between Ethereum and Aptos using hash time-locked contracts
module escrow::cross_chain_escrow {
    use std::error;
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_std::hash;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_std::table::{Self, Table};

    //
    // Errors
    //
    
    /// Order already exists
    const EORDER_EXISTS: u64 = 1;
    /// Order not found
    const EORDER_NOT_FOUND: u64 = 2;
    /// Order not active
    const EORDER_NOT_ACTIVE: u64 = 3;
    /// HTLC expired
    const EHTLC_EXPIRED: u64 = 4;
    /// HTLC not expired
    const EHTLC_NOT_EXPIRED: u64 = 5;
    /// Invalid secret
    const EINVALID_SECRET: u64 = 6;
    /// Invalid timelock
    const EINVALID_TIMELOCK: u64 = 7;
    /// Unsupported chain
    const EUNSUPPORTED_CHAIN: u64 = 8;
    /// Insufficient balance
    const EINSUFFICIENT_BALANCE: u64 = 9;
    /// Only owner
    const EONLY_OWNER: u64 = 10;
    /// Invalid hash length
    const EINVALID_HASH_LENGTH: u64 = 11;
    /// Contract paused
    const ECONTRACT_PAUSED: u64 = 12;
    /// Invalid amount
    const EINVALID_AMOUNT: u64 = 13;

    //
    // Constants
    //
    
    /// Minimum timelock duration (1 hour in seconds)
    const MIN_TIMELOCK_DURATION: u64 = 3600;
    /// Maximum timelock duration (24 hours in seconds)
    const MAX_TIMELOCK_DURATION: u64 = 86400;
    /// Minimum deposit amount (0.01 APT)
    const MIN_DEPOSIT_AMOUNT: u64 = 1000000; // 0.01 APT in octas

    //
    // Structs
    //

    /// HTLC states
    const HTLC_STATE_ACTIVE: u8 = 0;
    const HTLC_STATE_COMPLETED: u8 = 1;
    const HTLC_STATE_REFUNDED: u8 = 2;
    const HTLC_STATE_EXPIRED: u8 = 3;

    /// Cross-chain swap order
    struct SwapOrder has key, store, copy, drop {
        /// Order hash from source chain
        order_hash: vector<u8>,
        /// Source chain maker address
        src_maker: String,
        /// Source chain identifier
        src_chain: String,
        /// Source token identifier
        src_token: String,
        /// Source amount
        src_amount: u64,
        /// Destination recipient on Aptos
        dst_recipient: address,
        /// Destination token type
        dst_token: String,
        /// Amount to be released on Aptos
        dst_amount: u64,
        /// Hash lock for HTLC (32 bytes)
        hash_lock: vector<u8>,
        /// Timelock timestamp (seconds)
        timelock: u64,
        /// Current state
        state: u8,
        /// Block timestamp when created
        created_at: u64,
        /// Resolver account who deposited funds
        resolver: address,
    }

    /// Global escrow state
    struct EscrowState has key {
        /// Contract owner
        owner: address,
        /// Active swap orders indexed by order hash
        swap_orders: Table<vector<u8>, SwapOrder>,
        /// Supported source chains
        supported_chains: Table<String, bool>,
        /// Minimum timelock duration
        min_timelock: u64,
        /// Maximum timelock duration
        max_timelock: u64,
        /// Total orders created
        total_orders: u64,
        /// Contract paused state
        is_paused: bool,
        /// Service fee rate (basis points, e.g., 100 = 1%)
        fee_rate: u64,
        /// Collected fees
        collected_fees: u64,
    }

    /// AptosCoin deposits for orders
    struct CoinDeposits has key {
        deposits: Table<vector<u8>, Coin<AptosCoin>>,
    }

    /// Fee collection resource
    struct FeeCollection has key {
        fees: Coin<AptosCoin>,
    }

    //
    // Events
    //

    #[event]
    struct HTLCCreated has drop, store {
        order_hash: vector<u8>,
        src_maker: String,
        src_chain: String,
        src_amount: u64,
        dst_recipient: address,
        dst_amount: u64,
        hash_lock: vector<u8>,
        timelock: u64,
        resolver: address,
    }

    #[event]
    struct HTLCCompleted has drop, store {
        order_hash: vector<u8>,
        secret: vector<u8>,
        recipient: address,
        amount: u64,
    }

    #[event]
    struct HTLCRefunded has drop, store {
        order_hash: vector<u8>,
        resolver: address,
        amount: u64,
    }

    #[event]
    struct ContractPaused has drop, store {
        is_paused: bool,
    }

    #[event]
    struct FeeRateUpdated has drop, store {
        old_rate: u64,
        new_rate: u64,
    }

    #[event]
    struct EmergencyWithdrawal has drop, store {
        owner: address,
        amount: u64,
    }

    //
    // Helper Functions
    //

    /// Generate SHA3-256 hash (using available hash functions)
    fun sha3_256(data: vector<u8>): vector<u8> {
        hash::sha3_256(data)
    }

    //
    // Functions
    //

    /// Initialize the escrow contract
    public entry fun initialize(account: &signer, supported_chains: vector<String>) {
        let account_addr = signer::address_of(account);
        
        // Create global state
        let escrow_state = EscrowState {
            owner: account_addr,
            swap_orders: table::new(),
            supported_chains: table::new(),
            min_timelock: MIN_TIMELOCK_DURATION,
            max_timelock: MAX_TIMELOCK_DURATION,
            total_orders: 0,
            is_paused: false,
            fee_rate: 100, // 1% default fee
            collected_fees: 0,
        };

        // Initialize supported chains
        let i = 0;
        while (i < vector::length(&supported_chains)) {
            let chain = *vector::borrow(&supported_chains, i);
            table::add(&mut escrow_state.supported_chains, chain, true);
            i = i + 1;
        };

        // Create coin deposits storage
        let coin_deposits = CoinDeposits {
            deposits: table::new(),
        };

        // Create fee collection
        let fee_collection = FeeCollection {
            fees: coin::zero<AptosCoin>(),
        };

        move_to(account, escrow_state);
        move_to(account, coin_deposits);
        move_to(account, fee_collection);
    }

    /// Create a new HTLC for incoming swap from source chain
    public entry fun create_htlc(
        account: &signer,
        escrow_addr: address,
        order_hash: vector<u8>,
        src_maker: String,
        src_chain: String,
        src_token: String,
        src_amount: u64,
        dst_recipient: address,
        dst_token: String,
        hash_lock: vector<u8>,
        timelock: u64,
        deposit_amount: u64,
    ) acquires EscrowState, CoinDeposits {
        let resolver_addr = signer::address_of(account);
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        let coin_deposits = borrow_global_mut<CoinDeposits>(escrow_addr);

        // Check if contract is paused
        assert!(!escrow_state.is_paused, error::unavailable(ECONTRACT_PAUSED));

        // Validate parameters
        assert!(
            table::contains(&escrow_state.supported_chains, src_chain),
            error::invalid_argument(EUNSUPPORTED_CHAIN)
        );
        
        assert!(
            deposit_amount >= MIN_DEPOSIT_AMOUNT,
            error::invalid_argument(EINVALID_AMOUNT)
        );

        let current_time = timestamp::now_seconds();
        assert!(
            timelock > current_time + escrow_state.min_timelock,
            error::invalid_argument(EINVALID_TIMELOCK)
        );
        assert!(
            timelock < current_time + escrow_state.max_timelock,
            error::invalid_argument(EINVALID_TIMELOCK)
        );
        assert!(
            !table::contains(&escrow_state.swap_orders, order_hash),
            error::already_exists(EORDER_EXISTS)
        );
        assert!(
            vector::length(&hash_lock) == 32,
            error::invalid_argument(EINVALID_HASH_LENGTH)
        );

        // Withdraw coins from resolver account
        let deposit_coins = coin::withdraw<AptosCoin>(account, deposit_amount);

        // Create swap order
        let swap_order = SwapOrder {
            order_hash,
            src_maker,
            src_chain,
            src_token,
            src_amount,
            dst_recipient,
            dst_token,
            dst_amount: deposit_amount,
            hash_lock,
            timelock,
            state: HTLC_STATE_ACTIVE,
            created_at: current_time,
            resolver: resolver_addr,
        };

        // Store order and deposit
        table::add(&mut escrow_state.swap_orders, order_hash, swap_order);
        table::add(&mut coin_deposits.deposits, order_hash, deposit_coins);
        escrow_state.total_orders = escrow_state.total_orders + 1;

        // Emit event
        event::emit(HTLCCreated {
            order_hash,
            src_maker,
            src_chain,
            src_amount,
            dst_recipient,
            dst_amount: deposit_amount,
            hash_lock,
            timelock,
            resolver: resolver_addr,
        });
    }

    /// Complete the HTLC by revealing the secret
    public entry fun complete_htlc(
        _account: &signer,
        escrow_addr: address,
        order_hash: vector<u8>,
        secret: vector<u8>,
    ) acquires EscrowState, CoinDeposits {
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        let coin_deposits = borrow_global_mut<CoinDeposits>(escrow_addr);

        assert!(
            table::contains(&escrow_state.swap_orders, order_hash),
            error::not_found(EORDER_NOT_FOUND)
        );

        let swap_order = table::borrow_mut(&mut escrow_state.swap_orders, order_hash);
        
        assert!(
            swap_order.state == HTLC_STATE_ACTIVE,
            error::invalid_state(EORDER_NOT_ACTIVE)
        );
        assert!(
            timestamp::now_seconds() <= swap_order.timelock,
            error::invalid_state(EHTLC_EXPIRED)
        );

        // Verify secret matches hash lock
        let secret_hash = sha3_256(secret);
        assert!(
            secret_hash == swap_order.hash_lock,
            error::invalid_argument(EINVALID_SECRET)
        );

        // Update state
        swap_order.state = HTLC_STATE_COMPLETED;

        // Get deposit and transfer to recipient
        let deposit_coins = table::remove(&mut coin_deposits.deposits, order_hash);
        let amount = coin::value(&deposit_coins);
        
        coin::deposit(swap_order.dst_recipient, deposit_coins);

        // Emit event
        event::emit(HTLCCompleted {
            order_hash,
            secret,
            recipient: swap_order.dst_recipient,
            amount,
        });
    }

    /// Refund the HTLC after timelock expires
    public entry fun refund_htlc(
        _account: &signer,
        escrow_addr: address,
        order_hash: vector<u8>,
    ) acquires EscrowState, CoinDeposits {
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        let coin_deposits = borrow_global_mut<CoinDeposits>(escrow_addr);

        assert!(
            table::contains(&escrow_state.swap_orders, order_hash),
            error::not_found(EORDER_NOT_FOUND)
        );

        let swap_order = table::borrow_mut(&mut escrow_state.swap_orders, order_hash);
        
        assert!(
            swap_order.state == HTLC_STATE_ACTIVE,
            error::invalid_state(EORDER_NOT_ACTIVE)
        );
        assert!(
            timestamp::now_seconds() > swap_order.timelock,
            error::invalid_state(EHTLC_NOT_EXPIRED)
        );

        // Update state
        swap_order.state = HTLC_STATE_REFUNDED;

        // Get deposit and refund to resolver
        let deposit_coins = table::remove(&mut coin_deposits.deposits, order_hash);
        let amount = coin::value(&deposit_coins);
        
        coin::deposit(swap_order.resolver, deposit_coins);

        // Emit event
        event::emit(HTLCRefunded {
            order_hash,
            resolver: swap_order.resolver,
            amount,
        });
    }

    //
    // View functions
    //

    #[view]
    public fun get_swap_order(escrow_addr: address, order_hash: vector<u8>): SwapOrder acquires EscrowState {
        let escrow_state = borrow_global<EscrowState>(escrow_addr);
        assert!(
            table::contains(&escrow_state.swap_orders, order_hash),
            error::not_found(EORDER_NOT_FOUND)
        );
        *table::borrow(&escrow_state.swap_orders, order_hash)
    }

    #[view]
    public fun is_htlc_active(escrow_addr: address, order_hash: vector<u8>): bool acquires EscrowState {
        let escrow_state = borrow_global<EscrowState>(escrow_addr);
        if (table::contains(&escrow_state.swap_orders, order_hash)) {
            let order = table::borrow(&escrow_state.swap_orders, order_hash);
            order.state == HTLC_STATE_ACTIVE && timestamp::now_seconds() <= order.timelock
        } else {
            false
        }
    }

    #[view]
    public fun verify_secret(secret: vector<u8>, hash_lock: vector<u8>): bool {
        let secret_hash = sha3_256(secret);
        secret_hash == hash_lock
    }

    #[view]
    public fun get_owner(escrow_addr: address): address acquires EscrowState {
        let escrow_state = borrow_global<EscrowState>(escrow_addr);
        escrow_state.owner
    }

    #[view]
    public fun is_chain_supported(escrow_addr: address, chain: String): bool acquires EscrowState {
        let escrow_state = borrow_global<EscrowState>(escrow_addr);
        if (table::contains(&escrow_state.supported_chains, chain)) {
            *table::borrow(&escrow_state.supported_chains, chain)
        } else {
            false
        }
    }

    #[view]
    public fun get_timelock_limits(escrow_addr: address): (u64, u64) acquires EscrowState {
        let escrow_state = borrow_global<EscrowState>(escrow_addr);
        (escrow_state.min_timelock, escrow_state.max_timelock)
    }

    #[view]
    public fun get_total_orders(escrow_addr: address): u64 acquires EscrowState {
        let escrow_state = borrow_global<EscrowState>(escrow_addr);
        escrow_state.total_orders
    }

    #[view]
    public fun is_contract_paused(escrow_addr: address): bool acquires EscrowState {
        let escrow_state = borrow_global<EscrowState>(escrow_addr);
        escrow_state.is_paused
    }

    //
    // Owner functions
    //

    /// Add supported chain (owner only)
    public entry fun add_supported_chain(
        account: &signer,
        escrow_addr: address,
        chain: String,
    ) acquires EscrowState {
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        assert!(
            signer::address_of(account) == escrow_state.owner,
            error::permission_denied(EONLY_OWNER)
        );
        
        if (table::contains(&escrow_state.supported_chains, chain)) {
            *table::borrow_mut(&mut escrow_state.supported_chains, chain) = true;
        } else {
            table::add(&mut escrow_state.supported_chains, chain, true);
        };
    }

    /// Remove supported chain (owner only)
    public entry fun remove_supported_chain(
        account: &signer,
        escrow_addr: address,
        chain: String,
    ) acquires EscrowState {
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        assert!(
            signer::address_of(account) == escrow_state.owner,
            error::permission_denied(EONLY_OWNER)
        );
        
        if (table::contains(&escrow_state.supported_chains, chain)) {
            *table::borrow_mut(&mut escrow_state.supported_chains, chain) = false;
        };
    }

    /// Update timelock limits (owner only)
    public entry fun update_timelock_limits(
        account: &signer,
        escrow_addr: address,
        min_timelock: u64,
        max_timelock: u64,
    ) acquires EscrowState {
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        assert!(
            signer::address_of(account) == escrow_state.owner,
            error::permission_denied(EONLY_OWNER)
        );
        assert!(
            min_timelock < max_timelock,
            error::invalid_argument(EINVALID_TIMELOCK)
        );
        
        escrow_state.min_timelock = min_timelock;
        escrow_state.max_timelock = max_timelock;
    }

    /// Transfer ownership (owner only)
    public entry fun transfer_ownership(
        account: &signer,
        escrow_addr: address,
        new_owner: address,
    ) acquires EscrowState {
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        assert!(
            signer::address_of(account) == escrow_state.owner,
            error::permission_denied(EONLY_OWNER)
        );
        
        escrow_state.owner = new_owner;
    }

    /// Pause/unpause contract (owner only)
    public entry fun set_contract_paused(
        account: &signer,
        escrow_addr: address,
        is_paused: bool,
    ) acquires EscrowState {
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        assert!(
            signer::address_of(account) == escrow_state.owner,
            error::permission_denied(EONLY_OWNER)
        );
        
        escrow_state.is_paused = is_paused;
        
        event::emit(ContractPaused {
            is_paused,
        });
    }

    /// Update fee rate (owner only)
    public entry fun update_fee_rate(
        account: &signer,
        escrow_addr: address,
        new_fee_rate: u64,
    ) acquires EscrowState {
        let escrow_state = borrow_global_mut<EscrowState>(escrow_addr);
        assert!(
            signer::address_of(account) == escrow_state.owner,
            error::permission_denied(EONLY_OWNER)
        );
        assert!(
            new_fee_rate <= 1000, // Max 10%
            error::invalid_argument(EINVALID_AMOUNT)
        );
        
        let old_rate = escrow_state.fee_rate;
        escrow_state.fee_rate = new_fee_rate;
        
        event::emit(FeeRateUpdated {
            old_rate,
            new_rate: new_fee_rate,
        });
    }

    /// Emergency withdrawal (owner only) - simplified implementation
    public entry fun emergency_withdraw(
        account: &signer,
        escrow_addr: address,
        amount: u64,
    ) acquires EscrowState, FeeCollection {
        let escrow_state = borrow_global<EscrowState>(escrow_addr);
        assert!(
            signer::address_of(account) == escrow_state.owner,
            error::permission_denied(EONLY_OWNER)
        );
        
        let fee_collection = borrow_global_mut<FeeCollection>(escrow_addr);
        let available_amount = coin::value(&fee_collection.fees);
        assert!(
            amount <= available_amount,
            error::invalid_argument(EINSUFFICIENT_BALANCE)
        );
        
        let withdrawal = coin::extract(&mut fee_collection.fees, amount);
        coin::deposit(signer::address_of(account), withdrawal);
        
        event::emit(EmergencyWithdrawal {
            owner: signer::address_of(account),
            amount,
        });
    }
}