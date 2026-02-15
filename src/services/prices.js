const axios = require("axios");
const { apiKey, SOL_MINT, alchemy_api, CHAIN, ETH_MINT } = require("../config");
const { response } = require("express");

async function fetchSolanaPrices(mintAddresses) {
  const data = {
    jsonrpc: "2.0",
    id: "1",
    method: "getAssetBatch",
    params: {
      ids: Array.from(mintAddresses),
      options: {
        showUnverifiedCollections: false,
        showCollectionMetadata: false,
        showFungible: false,
        showInscription: false,
      },
    },
  };

  const tokenPrices = {};
  const response = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, data, {
    headers: { "Content-Type": "application/json" },
  });

  for (let token of response.data.result) {
    tokenPrices[token.id] = token.token_info;
  }

  return tokenPrices;
}

function loadSolanaPrices(wallet, tokenPrices) {
  const devNet = wallet.devNet;
  const mainNet = wallet.mainNet;

  const solPrice = tokenPrices[SOL_MINT]?.price_info?.price_per_token ?? 0;
  devNet.totalBalance = devNet.balance * solPrice;

  let totalBalance = mainNet.balance * solPrice;

  mainNet.tokens.forEach(token => {
    const priceInfo = tokenPrices[token.mint]?.price_info;
    if (priceInfo) {
      const price = priceInfo.price_per_token;
      totalBalance += (token.amount / 10 ** token.decimals) * price;

      if (!token.symbol) {
        token.symbol = tokenPrices[token.mint].symbol;
      }
    }
  });

  mainNet.totalBalance = totalBalance;

  return {
    ...wallet,
    devNet,
    mainNet,
  };
}

function loadPrices(wallets, solTokenPrices, ethTokenPrices) {
  let finalWallets = wallets.map(wallet => {
    if (wallet.chain === CHAIN.solana) {
      return loadSolanaPrices(wallet, solTokenPrices);
    }

    return loadEthPrices(wallet, ethTokenPrices);
  });

  return finalWallets;
}

function loadEthPrices(wallet, ethTokenPrices) {
  let { mainNet, devNet } = wallet;

  devNet.totalBalance = devNet.balance * ethTokenPrices[ETH_MINT].value;
  let mainNetTotalBalance = mainNet.balance * ethTokenPrices[ETH_MINT].value;
  
  for (let token of mainNet.tokens) { 
    mainNetTotalBalance += ( token.amount / 10 ** token.decimals ) * ethTokenPrices[token.mint].value;
  }

  mainNet.totalBalance = mainNetTotalBalance;

  return { 
    ...wallet,
    mainNet,
    devNet
  }
}

function filterEmptyPriceAddresses(data) {
  return data.filter(tokens => tokens.prices.length);
}

async function fetchEthPrices(contractAddresses) {
  const url = `https://api.g.alchemy.com/prices/v1/${alchemy_api}/tokens/by-address`;
  const headers = { "Content-Type": "application/json" };
  const body = {
    addresses: Array.from(contractAddresses).map(address => ({
      address,
      network: "eth-mainnet",
    })),
  };

  const { data } = await axios.post(url, body, { headers });

  if (response?.error) throw new Error(response.error);
  if (!data) throw new Error("Error fetching eth token price");

  return filterEmptyPriceAddresses(data.data).reduce((acc, token) => {
    acc[token.address] = { value: token.prices[0].value };
    return acc;
  }, {});
}

module.exports = { fetchSolanaPrices, loadPrices, fetchEthPrices };
