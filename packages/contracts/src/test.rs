use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    // Create mock token addresses
    let token_a = Address::generate(&env);
    let token_b = Address::generate(&env);

    // Initialize the contract
    client.initialize(&token_a, &token_b);

    // Verify reserves are 0
    let (reserve_a, reserve_b) = client.get_reserves();
    assert_eq!(reserve_a, 0);
    assert_eq!(reserve_b, 0);

    // Verify total shares is 0
    let total_shares = client.get_total_shares();
    assert_eq!(total_shares, 0);
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_initialize_twice_fails() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    let token_a = Address::generate(&env);
    let token_b = Address::generate(&env);

    client.initialize(&token_a, &token_b);
    // Should panic on second initialization
    client.initialize(&token_a, &token_b);
}

#[test]
fn test_add_liquidity_first_provider() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    // Register mock tokens
    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    // Initialize DEX
    client.initialize(&token_a, &token_b);

    // Create user and mint tokens
    let user = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&user, &1000);
    token_b_client.mint(&user, &1000);

    // Add liquidity
    let shares = client.add_liquidity(&user, &100, &100);

    // Verify shares minted (sqrt(100 * 100) = 100)
    assert_eq!(shares, 100);

    // Verify reserves updated
    let (reserve_a, reserve_b) = client.get_reserves();
    assert_eq!(reserve_a, 100);
    assert_eq!(reserve_b, 100);

    // Verify user shares
    let user_shares = client.get_user_shares(&user);
    assert_eq!(user_shares, 100);

    // Verify total shares
    let total_shares = client.get_total_shares();
    assert_eq!(total_shares, 100);
}

#[test]
fn test_add_liquidity_second_provider() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    // Register mock tokens
    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    client.initialize(&token_a, &token_b);

    // First provider
    let user1 = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&user1, &1000);
    token_b_client.mint(&user1, &1000);
    client.add_liquidity(&user1, &100, &100);

    // Second provider
    let user2 = Address::generate(&env);
    token_a_client.mint(&user2, &1000);
    token_b_client.mint(&user2, &1000);
    
    let shares = client.add_liquidity(&user2, &50, &50);

    // Verify shares: (50 * 100) / 100 = 50
    assert_eq!(shares, 50);

    // Verify reserves
    let (reserve_a, reserve_b) = client.get_reserves();
    assert_eq!(reserve_a, 150);
    assert_eq!(reserve_b, 150);

    // Verify total shares
    let total_shares = client.get_total_shares();
    assert_eq!(total_shares, 150);
}

#[test]
fn test_remove_liquidity() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    // Register mock tokens
    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    client.initialize(&token_a, &token_b);

    // Add liquidity
    let user = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&user, &1000);
    token_b_client.mint(&user, &1000);
    client.add_liquidity(&user, &100, &100);

    // Remove half the liquidity
    let (amount_a, amount_b) = client.remove_liquidity(&user, &50);

    // Verify amounts: (50 * 100) / 100 = 50 each
    assert_eq!(amount_a, 50);
    assert_eq!(amount_b, 50);

    // Verify reserves
    let (reserve_a, reserve_b) = client.get_reserves();
    assert_eq!(reserve_a, 50);
    assert_eq!(reserve_b, 50);

    // Verify user shares
    let user_shares = client.get_user_shares(&user);
    assert_eq!(user_shares, 50);

    // Verify total shares
    let total_shares = client.get_total_shares();
    assert_eq!(total_shares, 50);
}

#[test]
fn test_swap_a_to_b() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    // Register mock tokens
    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    client.initialize(&token_a, &token_b);

    // Add initial liquidity
    let lp = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&lp, &10000);
    token_b_client.mint(&lp, &10000);
    client.add_liquidity(&lp, &1000, &1000);

    // Swap 10 A for B
    let user = Address::generate(&env);
    token_a_client.mint(&user, &100);

    let amount_out = client.swap(&user, &10, &true);

    // Calculate expected: (10 * 997 * 1000) / (1000 * 1000 + 10 * 997) = 9
    assert!(amount_out > 0);
    assert!(amount_out < 10); // Should be less due to fee

    // Verify reserves updated
    let (reserve_a, reserve_b) = client.get_reserves();
    assert_eq!(reserve_a, 1010); // 1000 + 10
    assert_eq!(reserve_b, 1000 - amount_out);
}

#[test]
fn test_swap_b_to_a() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    // Register mock tokens
    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    client.initialize(&token_a, &token_b);

    // Add initial liquidity
    let lp = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&lp, &10000);
    token_b_client.mint(&lp, &10000);
    client.add_liquidity(&lp, &1000, &1000);

    // Swap 10 B for A
    let user = Address::generate(&env);
    token_b_client.mint(&user, &100);

    let amount_out = client.swap(&user, &10, &false);

    // Verify output
    assert!(amount_out > 0);
    assert!(amount_out < 10);

    // Verify reserves updated
    let (reserve_a, reserve_b) = client.get_reserves();
    assert_eq!(reserve_a, 1000 - amount_out);
    assert_eq!(reserve_b, 1010); // 1000 + 10
}

#[test]
#[should_panic(expected = "Insufficient liquidity")]
fn test_swap_with_no_liquidity_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    let token_a = Address::generate(&env);
    let token_b = Address::generate(&env);

    client.initialize(&token_a, &token_b);

    let user = Address::generate(&env);
    // Should panic - no liquidity
    client.swap(&user, &10, &true);
}

#[test]
fn test_constant_product_maintained() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MiniDex);
    let client = MiniDexClient::new(&env, &contract_id);

    // Register mock tokens
    let token_a_admin = Address::generate(&env);
    let token_b_admin = Address::generate(&env);
    let token_a = env.register_stellar_asset_contract_v2(token_a_admin.clone()).address();
    let token_b = env.register_stellar_asset_contract_v2(token_b_admin.clone()).address();

    client.initialize(&token_a, &token_b);

    // Add liquidity
    let lp = Address::generate(&env);
    let token_a_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_a);
    let token_b_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_b);

    token_a_client.mint(&lp, &10000);
    token_b_client.mint(&lp, &10000);
    client.add_liquidity(&lp, &1000, &1000);

    let (reserve_a_before, reserve_b_before) = client.get_reserves();
    let k_before = reserve_a_before * reserve_b_before;

    // Perform swap
    let user = Address::generate(&env);
    token_a_client.mint(&user, &100);
    client.swap(&user, &10, &true);

    let (reserve_a_after, reserve_b_after) = client.get_reserves();
    let k_after = reserve_a_after * reserve_b_after;

    // k should increase or stay same (due to fees)
    assert!(k_after >= k_before);
}

#[test]
fn test_integer_sqrt() {
    // Test the integer square root helper function
    assert_eq!(integer_sqrt(0), 0);
    assert_eq!(integer_sqrt(1), 1);
    assert_eq!(integer_sqrt(4), 2);
    assert_eq!(integer_sqrt(9), 3);
    assert_eq!(integer_sqrt(16), 4);
    assert_eq!(integer_sqrt(100), 10);
    assert_eq!(integer_sqrt(10000), 100);
    
    // Test non-perfect squares
    assert_eq!(integer_sqrt(5), 2);
    assert_eq!(integer_sqrt(8), 2);
    assert_eq!(integer_sqrt(15), 3);
    assert_eq!(integer_sqrt(99), 9);
}
