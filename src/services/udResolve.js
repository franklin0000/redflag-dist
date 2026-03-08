/**
 * Unstoppable Domains on-chain resolution
 * Resolves .web3 / .crypto / .nft domains to wallet addresses
 * using the UD ProxyReader contract on Polygon — no API key needed.
 */
import { keccak256, encodePacked, toBytes, createPublicClient, http, fallback } from 'viem';
import { polygon } from 'wagmi/chains';

// UD ProxyReader contract on Polygon mainnet
const PROXY_READER = '0xA3f32c8cd786dc089Bd1fC175F2707223aeE5d00';

const proxyReaderAbi = [
    {
        name: 'getMany',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'keys', type: 'string[]' },
            { name: 'tokenId', type: 'uint256' },
        ],
        outputs: [{ name: 'values', type: 'string[]' }],
    },
];

/** Compute UD/ENS namehash for a domain string */
function namehash(name) {
    let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (!name) return node;
    const labels = name.split('.').reverse();
    for (const label of labels) {
        const labelHash = keccak256(toBytes(label));
        node = keccak256(encodePacked(['bytes32', 'bytes32'], [node, labelHash]));
    }
    return node;
}

const ANKR_KEY = import.meta.env.VITE_ANKR_KEY;
const DRPC_KEY = import.meta.env.VITE_DRPC_KEY;

let client = null;
function getClient() {
    if (!client) {
        client = createPublicClient({
            chain: polygon,
            transport: fallback([
                ...(ANKR_KEY ? [http(`https://rpc.ankr.com/polygon/${ANKR_KEY}`)] : []),
                ...(DRPC_KEY ? [http(`https://lb.drpc.live/polygon/${DRPC_KEY}`)] : []),
                http('https://polygon.llamarpc.com'),
                http('https://1rpc.io/matic'),
                http('https://polygon-bor-rpc.publicnode.com'),
            ]),
        });
    }
    return client;
}

/**
 * Resolve a UD domain to a Polygon wallet address
 * @param {string} domain  e.g. "redflag.web3"
 * @returns {Promise<string|null>}  "0x..." address or null
 */
export async function resolveUDDomain(domain) {
    try {
        const tokenId = BigInt(namehash(domain));
        const keys = [
            'crypto.MATIC.version.MATIC.address', // Polygon native
            'crypto.MATIC.address',                // MATIC generic
            'crypto.ETH.address',                  // ETH fallback
        ];

        const values = await getClient().readContract({
            address: PROXY_READER,
            abi: proxyReaderAbi,
            functionName: 'getMany',
            args: [keys, tokenId],
        });

        // Return first non-empty address found
        return values.find(v => v && v.startsWith('0x')) || null;
    } catch {
        return null;
    }
}
