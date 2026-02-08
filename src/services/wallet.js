const { CHAIN } = require("../config");
const { fetchBalance, fetchDevSolBalance, parseMainnetBalance } = require("./solana");
const { getEthBalance, getEthTokens, normalizeEthTokens, buildEthCollector } = require("./ethereum");

function buildSolanaCollector(collector, tokens) {
  tokens.forEach(token => {
    collector.Solana.add(token.mint);
  });
}

async function buildSolanaWallet(w, collector) {
  const data = await fetchBalance(w.publicKey);

  const mainNet = parseMainnetBalance(data);
  const devNet = {
    balance: await fetchDevSolBalance(w.publicKey),
    tokens: [],
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

  fetchEthTokensMetadata(tokens);
  const normalizedTokens = normalizeEthTokens(tokens);

  const mainNet = {
    balance: mainBalance,
    tokens: normalizedTokens,
  };


  // fetch devnet balance
  const devNet = { 
    balance: await getEthBalance(w.publicKey, 'dev'),
    tokens: []
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
