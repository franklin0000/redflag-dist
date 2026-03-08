
import { createPublicClient, http } from 'viem';
import { polygon, polygonAmoy } from 'viem/chains';

// ═══════════════════════════════════════════════════════
//  CONFIGURATION
//  Set DEMO_MODE = true  → Any connected wallet gets badge (no real NFT needed)
//  Set DEMO_MODE = false → Real on-chain check against REDFLAG_NFT_CONTRACT
// ═══════════════════════════════════════════════════════
const DEMO_MODE = false;

// ── Real Contract ────────────────────────────────────────
// Replace with the real Amoy testnet contract address after deployment
const REDFLAG_NFT_CONTRACT_AMOY = "0x0000000000000000000000000000000000000000"; // TODO: deploy & paste here
const REDFLAG_NFT_CONTRACT_MAINNET = "0x0000000000000000000000000000000000000000"; // TODO: mainnet eventually

// Which network to check
const USE_TESTNET = true;
const nftContract = USE_TESTNET ? REDFLAG_NFT_CONTRACT_AMOY : REDFLAG_NFT_CONTRACT_MAINNET;

// ── ABI for ERC-721 balanceOf ─────────────────────────────
const abi721 = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
    },
];

// ── Public Client (reads from blockchain, free) ───────────
const publicClient = createPublicClient({
    chain: USE_TESTNET ? polygonAmoy : polygon,
    transport: http()
});

/**
 * Check if a wallet holds a "RedFlag Citizenship" NFT.
 *
 * DEMO_MODE = true  → returns true for any connected wallet (instant badge).
 * DEMO_MODE = false → real on-chain check against the deployed ERC-721 contract.
 */
export const checkNftOwnership = async (walletAddress) => {
    try {
        if (!walletAddress) return false;

        // ── DEMO MODE ──────────────────────────────────────
        if (DEMO_MODE) {
            console.log('🎭 DEMO MODE: NFT badge granted to', walletAddress);
            // Simulate a short delay for authenticity
            await new Promise(resolve => setTimeout(resolve, 800));
            return true;
        }

        // ── REAL ON-CHAIN CHECK ────────────────────────────
        console.log('🔍 Checking NFT on-chain for:', walletAddress);
        const balance = await publicClient.readContract({
            address: nftContract,
            abi: abi721,
            functionName: 'balanceOf',
            args: [walletAddress]
        });

        console.log('NFT Balance:', balance.toString());
        return balance > 0n;

    } catch (error) {
        console.error('NFT Check Failed:', error);
        return false;
    }
};

/**
 * Returns a short display string of the connected wallet address.
 * e.g. "0x1234...abcd"
 */
export const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
