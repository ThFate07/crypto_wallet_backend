require("dotenv").config();
const solana = require("@solana/web3.js");
const ether = require('ethers')

const apiKey = process.env.HELIUS_API;
const alchemy_api = process.env.ALCHEMY_API
const ANKR_API = process.env.ANKR_API;

const main = new solana.Connection(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, "confirmed");
const dev = new solana.Connection("https://api.devnet.solana.com", "confirmed");

const mainProvider = new ether.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${alchemy_api}`);
const devProvider = new ether.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${alchemy_api}`);

const ethProviders = { 
    'main': mainProvider,
    'dev': devProvider
}

const CHAIN = {
  solana: "Solana",
  ethereum: "Ethereum",
};

const SOL_MINT = "So11111111111111111111111111111111111111112";
const ETH_MINT = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

module.exports = {
  apiKey,
  solana,
  solanaConnections: { main, dev },
  CHAIN,
  SOL_MINT,
  alchemy_api,
  ethProviders,
  ETH_MINT,
  ANKR_API
};
