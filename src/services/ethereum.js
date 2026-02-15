const { url } = require("inspector");
const { alchemy_api, ethProviders} = require("../config/index");
const ethers = require("ethers");
const axios = require('axios');

const ethTokenMetadataCache = new Map();

function buildEthCollector(collector, tokens) { 
  tokens.forEach(token => { 
    collector.Ethereum.add(token.mint)
  })
}

async function getEthTokens(publicKey) {
  const URL = `https://eth-mainnet.g.alchemy.com/v2/${alchemy_api}`
  const data = {jsonrpc: "2.0", id: 1, method: "alchemy_getTokenBalances", params: [publicKey, "erc20"]}
  const headers = {"Content-Type": "application/json"}
  const response = await axios.post(URL, data, {headers})
  

  if (!response?.data.result) throw Error("fetching eth token failed, no result found")
  
  const tokenBalances = response.data.result.tokenBalances || []
  
  return tokenBalances
}

async function getEthBalance(publicKey, network) {
  const balanceWei = await ethProviders[network].getBalance(publicKey);
  return Number(ethers.formatEther(balanceWei));
}



function normalizeEthTokens(tokens){  
  const normalizedTokens = tokens.map(token => { 
    
    // normalize hex 
    const contract = token.contractAddress.toLowerCase();
    const tokenMetadata = ethTokenMetadataCache.get(contract);

    const amount = Number(BigInt(token.tokenBalance));
    const symbol = tokenMetadata.symbol === "WETH" ? "ETH" : tokenMetadata.symbol;
    const decimals = tokenMetadata.decimals

    return { 
      mint: token.contractAddress,
      amount,
      symbol,
      decimals
    }
  })

  return normalizedTokens
}

async function fetchEthTokensMetadata(tokens) { 
  
  for (let token of tokens) {

    const contract = token.contractAddress.toLowerCase();
    if (ethTokenMetadataCache.has(contract)) { 
      continue
    }

    const URL = `https://eth-mainnet.g.alchemy.com/v2/${alchemy_api}`
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getTokenMetadata",
      params: [contract]
    };

    const { data } =  await axios.post(URL, payload);



    if (data.error) throw new Error(data.error.message);
    if (!data?.result) throw new Error("error fetching ethereum token metadata");

    ethTokenMetadataCache.set(contract, {
      decimals: data.result.decimals ?? 18,
      symbol: data.result.symbol ?? 'UKNOWN'
    })
    

  };
  
}

module.exports = {
  getEthBalance,
  getEthTokens,
  fetchEthTokensMetadata,
  normalizeEthTokens,
  buildEthCollector
};
