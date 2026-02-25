const axios = require("axios");
const { solana, solanaConnections, apiKey, ANKR_API } = require("../config");
const { LAMPORTS_PER_SOL } = require("@solana/web3.js");

const DEVNET_RPC_ENDPOINTS = [
  solanaConnections.dev.rpcEndpoint,
  "https://api.devnet.solana.com",
  "https://rpc.ankr.com/solana_devnet",
];

async function fetchDevBalanceFromRpc(endpoint, pubKey) {
  const { data } = await axios.post(
    endpoint,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [pubKey.toBase58(), { commitment: "confirmed" }],
    },
    {
      timeout: 8000,
      headers: { "Content-Type": "application/json" },
    },
  );

  if (data?.error) {
    throw new Error(data.error.message || "RPC returned error");
  }

  const lamports = data?.result?.value;
  if (typeof lamports !== "number") {
    throw new Error("Invalid getBalance response");
  }

  return lamports / solana.LAMPORTS_PER_SOL;
}

async function fetchDevSolBalance(publicKey) {
  const pubKey = new solana.PublicKey(publicKey);

  let lastError;
  for (const endpoint of DEVNET_RPC_ENDPOINTS) {
    try {
      return await fetchDevBalanceFromRpc(endpoint, pubKey);
    } catch (error) {
      lastError = error;
    }
  }

  console.warn(`Devnet balance unavailable for ${publicKey}: ${lastError?.message || "Unknown error"}`);
  return 0;
}

async function fetchBalance(publicKey) {
  const { data } = await axios.get(`https://api.helius.xyz/v0/addresses/${publicKey}/balances?api-key=${apiKey}`);
  return data;
}

function parseMainnetBalance(raw) {
  const balance = raw.nativeBalance / solana.LAMPORTS_PER_SOL;
  const sol = [{ mint: "So11111111111111111111111111111111111111112", amount: balance, symbol: "SOL", decimals: 0 }];

  const tokens = raw.tokens.map(token => ({
    mint: token.mint,
    amount: token.amount,
    symbol: token.symbol ?? "UNKNOWN",
    decimals: token.decimals ?? 0,
  }));

  return {
    balance,
    tokens: [...sol, ...tokens],
  };
}

async function requestAirdrop(publicKey) {
  try {
    // Validate publicKey is valid base58
    const pubKey = new solana.PublicKey(publicKey);
    const pubKeyString = pubKey.toBase58();

    const url = `https://rpc.ankr.com/solana_devnet/${ANKR_API}`;
    const data = {
      jsonrpc: "2.0",
      id: 1,
      method: "requestAirdrop",
      params: [pubKeyString, LAMPORTS_PER_SOL],
    };
    const headers = { "Content-Type": "application/json" };
    
    const response = await axios.post(url, data, { 
      headers,
      timeout: 10000 
    });

    if (response.data?.error) { 
      console.warn("Airdrop RPC error:", response.data.error)
      throw new Error(`JSON-RPC error (${response.data.error.code}): ${response.data.error.message}`)
    }

    if (!response.data?.result) {
      throw new Error("No transaction signature returned from airdrop")
    }

    return response.data;
  } catch (error) {
    if (error.message?.includes("Invalid public key")) {
      throw new Error("Invalid public key format")
    }
    throw error;
  }
}

module.exports = {
  fetchDevSolBalance,
  fetchBalance,
  parseMainnetBalance,
  requestAirdrop,
};
