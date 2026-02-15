const axios = require("axios");
const { solana, solanaConnections, apiKey } = require("../config");

async function fetchDevSolBalance(publicKey) {
  const pubKey = new solana.PublicKey(publicKey);
  const lamports = await solanaConnections.dev.getBalance(pubKey);
  return lamports / solana.LAMPORTS_PER_SOL;
}

async function fetchBalance(publicKey) {
  const { data } = await axios.get(
    `https://api.helius.xyz/v0/addresses/${publicKey}/balances?api-key=${apiKey}`
  );
  return data;
}

function parseMainnetBalance(raw) {

  const balance = raw.nativeBalance / solana.LAMPORTS_PER_SOL  
  const sol = [{mint: "So11111111111111111111111111111111111111112", amount: balance, symbol: "SOL", decimals: 0}]

  const tokens = raw.tokens.map(token => ({
    mint: token.mint,
    amount: token.amount,
    symbol: token.symbol ?? "UNKNOWN",
    decimals: token.decimals ?? 0,
  }));


  return {
    balance,
    tokens: [...sol, ...tokens]
  };
}

module.exports = {
  fetchDevSolBalance,
  fetchBalance,
  parseMainnetBalance,
};
