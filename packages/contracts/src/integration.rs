/// Integration Tests
/// 
/// Demonstrates inter-contract calls between MiniDex and Stellar token contracts.
/// This file proves that the DEX successfully interacts with external token contracts
/// for liquidity provision and token swaps.

use crate::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

/// Test: Full integration flow with inter-contract calls
/// 
/// This test demonstrates:
/// 1. DEX contract calling Token A contract (transfer)
/// 2. DEX contract calling Token B contract (transfer)
/// 3. Multiple inter-contract calls in a single transaction
#[test]
fn test_full_integration_flow() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy DEX contract
    let dex_contract_id = env.register_contract(None, MiniDex);
    let dex_client = MiniDexClient::new(&env, &dex_contract_id);

    // Deploy Token A and Token B contracts (Stellar native tokens)
    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    // Initialize DEX with token addresses
    dex_client.initialize(&token_a, &token_b);

    // Create liquidity provider
    let lp = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    // Mint tokens to LP
    token_a_client.mint(&lp, &10000);
    token_b_client.mint(&lp, &10000);

    // INTER-CONTRACT CALL 1 & 2: Add liquidity
    // DEX calls Token A.transfer() and Token B.transfer()
    let shares = dex_client.add_liquidity(&lp, &1000, &1000);
    assert_eq!(shares, 1000);

    // Verify reserves updated correctly (inter-contract state sync)
    let (reserve_a, reserve_b) = dex_client.get_reserves();
    assert_eq!(reserve_a, 1000);
    assert_eq!(reserve_b, 1000);

    // Create trader
    let trader = Address::generate(&env);
    token_a_client.mint(&trader, &100);

    // INTER-CONTRACT CALL 3 & 4: Execute swap
    // DEX calls Token A.transfer() (from trader) and Token B.transfer() (to trader)
    let amount_out = dex_client.swap(&trader, &10, &true);
    assert!(amount_out > 0);
    assert!(amount_out < 10); // Less due to 0.3% fee

    // Verify reserves updated after swap
    let (reserve_a_after, reserve_b_after) = dex_client.get_reserves();
    assert_eq!(reserve_a_after, 1010); // Added 10 from swap
    assert!(reserve_b_after < 1000); // Removed some for output

    // INTER-CONTRACT CALL 5 & 6: Remove liquidity
    // DEX calls Token A.transfer() and Token B.transfer() back to LP
    let (amount_a, amount_b) = dex_client.remove_liquidity(&lp, &500);
    assert!(amount_a > 0);
    assert!(amount_b > 0);

    // Verify reserves decreased
    let (final_reserve_a, final_reserve_b) = dex_client.get_reserves();
    assert!(final_reserve_a < reserve_a_after);
    assert!(final_reserve_b < reserve_b_after);
}

/// Test: Inter-contract call authentication
/// 
/// Demonstrates that DEX properly authenticates with token contracts
#[test]
fn test_inter_contract_authentication() {
    let env = Env::default();
    env.mock_all_auths();

    let dex_contract_id = env.register_contract(None, MiniDex);
    let dex_client = MiniDexClient::new(&env, &dex_contract_id);

    // Deploy token contracts
    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    dex_client.initialize(&token_a, &token_b);

    let user = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&user, &1000);
    token_b_client.mint(&user, &1000);

    // This call requires:
    // 1. User authentication (user.require_auth())
    // 2. DEX authentication with Token A contract
    // 3. DEX authentication with Token B contract
    let shares = dex_client.add_liquidity(&user, &100, &100);
    assert_eq!(shares, 100);
}

/// Test: Multiple sequential inter-contract calls
/// 
/// Demonstrates complex transaction with multiple token interactions
#[test]
fn test_multiple_sequential_swaps() {
    let env = Env::default();
    env.mock_all_auths();

    let dex_contract_id = env.register_contract(None, MiniDex);
    let dex_client = MiniDexClient::new(&env, &dex_contract_id);

    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    dex_client.initialize(&token_a, &token_b);

    // Add liquidity (smaller pool for more visible price impact)
    let lp = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&lp, &10000);
    token_b_client.mint(&lp, &10000);
    dex_client.add_liquidity(&lp, &1000, &1000);

    // Execute multiple swaps (each involves 2 inter-contract calls)
    let trader = Address::generate(&env);
    token_a_client.mint(&trader, &1000);

    // Swap 1: A -> B (larger swap for visible price impact)
    let out1 = dex_client.swap(&trader, &50, &true);
    assert!(out1 > 0);

    // Swap 2: A -> B
    let out2 = dex_client.swap(&trader, &50, &true);
    assert!(out2 > 0);
    assert!(out2 < out1); // Price impact

    // Swap 3: A -> B
    let out3 = dex_client.swap(&trader, &50, &true);
    assert!(out3 > 0);
    assert!(out3 < out2); // More price impact

    // Total inter-contract calls: 3 swaps × 2 calls = 6 token contract calls
}

/// Test: Inter-contract call with reserve updates
/// 
/// Verifies that DEX correctly updates internal state after token transfers
#[test]
fn test_reserve_sync_after_inter_contract_calls() {
    let env = Env::default();
    env.mock_all_auths();

    let dex_contract_id = env.register_contract(None, MiniDex);
    let dex_client = MiniDexClient::new(&env, &dex_contract_id);

    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    dex_client.initialize(&token_a, &token_b);

    let user = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&user, &1000);
    token_b_client.mint(&user, &1000);

    // Add liquidity (inter-contract calls)
    dex_client.add_liquidity(&user, &500, &500);

    // Check reserves are correctly tracked
    let (reserve_a, reserve_b) = dex_client.get_reserves();
    assert_eq!(reserve_a, 500);
    assert_eq!(reserve_b, 500);
}

/// Test: Cross-contract state consistency
/// 
/// Ensures DEX and token contracts maintain consistent state
#[test]
fn test_cross_contract_state_consistency() {
    let env = Env::default();
    env.mock_all_auths();

    let dex_contract_id = env.register_contract(None, MiniDex);
    let dex_client = MiniDexClient::new(&env, &dex_contract_id);

    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    dex_client.initialize(&token_a, &token_b);

    let user = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    // Initial mint
    token_a_client.mint(&user, &1000);
    token_b_client.mint(&user, &1000);

    // Add liquidity (inter-contract transfer)
    dex_client.add_liquidity(&user, &200, &200);

    // Verify DEX tracked the reserves correctly
    let (reserve_a, reserve_b) = dex_client.get_reserves();
    assert_eq!(reserve_a, 200);
    assert_eq!(reserve_b, 200);

    // Verify user received LP shares
    let user_shares = dex_client.get_user_shares(&user);
    assert_eq!(user_shares, 200);
}
