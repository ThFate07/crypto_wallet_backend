const axios = require("axios");
const { apiKey, SOL_MINT, alchemy_api } = require("../config");
const { response } = require("express");
const { error } = require("console");

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

function loadPrices(wallets, tokenPrices) {
  let finalWallets = wallets.map(wallet => {
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
  });

  return finalWallets;
}

async function fetchEthPrices(contractAddresses) {
  const url = `https://api.g.alchemy.com/prices/v1/${alchemy_api}/tokens/by-address`;
  const headers = { "Content-Type": "application/json" };
  //   const data = { addresses: [{ network: "eth-mainnet", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" }] };
  const data = {
    addresses: 
      Array.from(contractAddresses).map(address => ({
        address
      })),
  };

  const response = await axios.post(url, data, {headers});

  if (response?.error) throw new Error(response.error)
  if (!response?.data) throw new Error("Error fetching eth token price");

  return response.data.data.map(token => ({address: token.address, value: token.prices[0].value}) )

}

module.exports = { fetchSolanaPrices, loadPrices, fetchEthPrices };
