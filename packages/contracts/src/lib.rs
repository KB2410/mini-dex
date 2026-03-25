#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

/// Integer square root using Babylonian method
/// Required because floating-point math is not allowed in Soroban WASM
pub fn integer_sqrt(y: i128) -> i128 {
    if y > 3 {
        let mut z = y;
        let mut x = y / 2 + 1;
        while x < z {
            z = x;
            x = (y / x + x) / 2;
        }
        z
    } else if y != 0 {
        1
    } else {
        0
    }
}

/// Storage keys for the DEX contract
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenA,
    TokenB,
    ReserveA,
    ReserveB,
    TotalShares,
    UserShare(Address),
    Initialized,
}

/// Main DEX contract
#[contract]
pub struct MiniDex;

#[contractimpl]
impl MiniDex {
    /// Initialize the DEX with two token addresses
    /// Can only be called once
    pub fn initialize(env: Env, token_a: Address, token_b: Address) {
        // Check if already initialized
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("Contract already initialized");
        }

        // Store token addresses
        env.storage().instance().set(&DataKey::TokenA, &token_a);
        env.storage().instance().set(&DataKey::TokenB, &token_b);
        
        // Initialize reserves to 0
        env.storage().instance().set(&DataKey::ReserveA, &0i128);
        env.storage().instance().set(&DataKey::ReserveB, &0i128);
        
        // Initialize total shares to 0
        env.storage().instance().set(&DataKey::TotalShares, &0i128);
        
        // Mark as initialized
        env.storage().instance().set(&DataKey::Initialized, &true);
    }

    /// Add liquidity to the pool
    /// Returns the number of LP shares minted
    pub fn add_liquidity(
        env: Env,
        user: Address,
        amount_a: i128,
        amount_b: i128,
    ) -> i128 {
        // Require user authentication
        user.require_auth();

        // Validate amounts
        if amount_a <= 0 || amount_b <= 0 {
            panic!("Amounts must be positive");
        }

        // Get token addresses
        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();

        // Get current reserves
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();
        let total_shares: i128 = env.storage().instance().get(&DataKey::TotalShares).unwrap();

        // Calculate shares to mint
        let shares = if total_shares == 0 {
            // First liquidity provider: shares = sqrt(amount_a * amount_b)
            // Use integer square root (no floating point allowed in WASM)
            integer_sqrt(amount_a * amount_b)
        } else {
            // Subsequent providers: maintain ratio
            // shares = min(amount_a * total_shares / reserve_a, amount_b * total_shares / reserve_b)
            let shares_a = (amount_a * total_shares) / reserve_a;
            let shares_b = (amount_b * total_shares) / reserve_b;
            if shares_a < shares_b { shares_a } else { shares_b }
        };

        if shares <= 0 {
            panic!("Insufficient liquidity minted");
        }

        // Transfer tokens from user to contract
        let token_a_client = soroban_sdk::token::Client::new(&env, &token_a);
        let token_b_client = soroban_sdk::token::Client::new(&env, &token_b);
        
        token_a_client.transfer(&user, &env.current_contract_address(), &amount_a);
        token_b_client.transfer(&user, &env.current_contract_address(), &amount_b);

        // Update reserves
        env.storage().instance().set(&DataKey::ReserveA, &(reserve_a + amount_a));
        env.storage().instance().set(&DataKey::ReserveB, &(reserve_b + amount_b));

        // Update total shares
        env.storage().instance().set(&DataKey::TotalShares, &(total_shares + shares));

        // Update user shares
        let user_shares_key = DataKey::UserShare(user.clone());
        let current_user_shares: i128 = env
            .storage()
            .persistent()
            .get(&user_shares_key)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&user_shares_key, &(current_user_shares + shares));

        shares
    }

    /// Remove liquidity from the pool
    /// Returns (amount_a, amount_b) withdrawn
    pub fn remove_liquidity(env: Env, user: Address, shares: i128) -> (i128, i128) {
        // Require user authentication
        user.require_auth();

        // Validate shares
        if shares <= 0 {
            panic!("Shares must be positive");
        }

        // Get user shares
        let user_shares_key = DataKey::UserShare(user.clone());
        let user_shares: i128 = env
            .storage()
            .persistent()
            .get(&user_shares_key)
            .unwrap_or(0);

        if user_shares < shares {
            panic!("Insufficient shares");
        }

        // Get reserves and total shares
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();
        let total_shares: i128 = env.storage().instance().get(&DataKey::TotalShares).unwrap();

        // Calculate amounts to return
        let amount_a = (shares * reserve_a) / total_shares;
        let amount_b = (shares * reserve_b) / total_shares;

        if amount_a <= 0 || amount_b <= 0 {
            panic!("Insufficient liquidity burned");
        }

        // Get token addresses
        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();

        // Transfer tokens back to user
        let token_a_client = soroban_sdk::token::Client::new(&env, &token_a);
        let token_b_client = soroban_sdk::token::Client::new(&env, &token_b);
        
        token_a_client.transfer(&env.current_contract_address(), &user, &amount_a);
        token_b_client.transfer(&env.current_contract_address(), &user, &amount_b);

        // Update reserves
        env.storage().instance().set(&DataKey::ReserveA, &(reserve_a - amount_a));
        env.storage().instance().set(&DataKey::ReserveB, &(reserve_b - amount_b));

        // Update total shares
        env.storage().instance().set(&DataKey::TotalShares, &(total_shares - shares));

        // Update user shares
        env.storage()
            .persistent()
            .set(&user_shares_key, &(user_shares - shares));

        (amount_a, amount_b)
    }

    /// Swap tokens using constant product formula (x * y = k)
    /// Applies 0.3% fee
    /// path_is_a_to_b: true = swap A for B, false = swap B for A
    /// Returns amount_out
    pub fn swap(
        env: Env,
        user: Address,
        amount_in: i128,
        path_is_a_to_b: bool,
    ) -> i128 {
        // Require user authentication
        user.require_auth();

        // Validate amount
        if amount_in <= 0 {
            panic!("Amount must be positive");
        }

        // Get reserves
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();

        if reserve_a <= 0 || reserve_b <= 0 {
            panic!("Insufficient liquidity");
        }

        // Calculate amount_out using constant product formula with 0.3% fee
        // amount_out = (amount_in * 997 * reserve_out) / (reserve_in * 1000 + amount_in * 997)
        let (reserve_in, reserve_out, token_in, token_out) = if path_is_a_to_b {
            let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
            let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
            (reserve_a, reserve_b, token_a, token_b)
        } else {
            let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
            let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
            (reserve_b, reserve_a, token_b, token_a)
        };

        let amount_in_with_fee = amount_in * 997;
        let numerator = amount_in_with_fee * reserve_out;
        let denominator = (reserve_in * 1000) + amount_in_with_fee;
        let amount_out = numerator / denominator;

        if amount_out <= 0 {
            panic!("Insufficient output amount");
        }

        // Transfer token_in from user to contract
        let token_in_client = soroban_sdk::token::Client::new(&env, &token_in);
        token_in_client.transfer(&user, &env.current_contract_address(), &amount_in);

        // Transfer token_out from contract to user
        let token_out_client = soroban_sdk::token::Client::new(&env, &token_out);
        token_out_client.transfer(&env.current_contract_address(), &user, &amount_out);

        // Update reserves
        if path_is_a_to_b {
            env.storage().instance().set(&DataKey::ReserveA, &(reserve_a + amount_in));
            env.storage().instance().set(&DataKey::ReserveB, &(reserve_b - amount_out));
        } else {
            env.storage().instance().set(&DataKey::ReserveB, &(reserve_b + amount_in));
            env.storage().instance().set(&DataKey::ReserveA, &(reserve_a - amount_out));
        }

        amount_out
    }

    /// Get reserve amounts
    pub fn get_reserves(env: Env) -> (i128, i128) {
        let reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0);
        let reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0);
        (reserve_a, reserve_b)
    }

    /// Get user LP shares
    pub fn get_user_shares(env: Env, user: Address) -> i128 {
        let user_shares_key = DataKey::UserShare(user);
        env.storage()
            .persistent()
            .get(&user_shares_key)
            .unwrap_or(0)
    }

    /// Get total LP shares
    pub fn get_total_shares(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
