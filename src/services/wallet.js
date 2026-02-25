const { CHAIN } = require("../config");
const { fetchBalance, fetchDevSolBalance, parseMainnetBalance } = require("./solana");
const { getEthBalance, getEthTokens, normalizeEthTokens, buildEthCollector, fetchEthTokensMetadata } = require("./ethereum");

function buildSolanaCollector(collector, tokens) {
  tokens.forEach(token => {
    collector.Solana.add(token.mint);
  });
}

async function buildSolanaWallet(w, collector) {
  const data = await fetchBalance(w.publicKey);
  const mainNet = parseMainnetBalance(data);

  const devNetBalance = await fetchDevSolBalance(w.publicKey)
  const devNet = {
    balance: devNetBalance,
    tokens: [{ mint: "So11111111111111111111111111111111111111112", amount: devNetBalance, symbol: "SOL", decimals: 0 }],
  };

  buildSolanaCollector(collector, mainNet.tokens);

  return {
    ...w,
    mainNet,
    devNet,
  };
}

async function buildEthWallet(w, collector) {

  const mainBalance = await getEthBalance(w.publicKey, "main");
  const tokens = await getEthTokens(w.publicKey);

  await fetchEthTokensMetadata(tokens);
  const normalizedTokens = normalizeEthTokens(tokens);

  const mainNet = {
    balance: mainBalance,
    tokens: normalizedTokens,
  };


  // fetch devnet balance
  const DevBalance = await getEthBalance(w.publicKey, 'dev')
  const devNet = { 
    balance: DevBalance,
    tokens: [{mint: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', amount: DevBalance, symbol: 'ETH', decimals: 18}]
  }


  // build collector
  buildEthCollector(collector, normalizedTokens)

  return { ...w, mainNet, devNet };
}

async function buildWallet(w, collector) {
  if (!w.publicKey) throw Error("public key error");
  if (!Object.values(CHAIN).includes(w.chain)) throw Error("unknown chain");

  if (w.chain === CHAIN.solana) {
    return buildSolanaWallet(w, collector);
  }

  return buildEthWallet(w, collector);
}

module.exports = { buildWallet };
