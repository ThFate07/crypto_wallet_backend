const express = require("express");
require("dotenv").config();
const axios = require("axios");
const app = express();
const api_key = process.env.HELIUS_API;
const solana = require("@solana/web3.js");
const cors = require("cors");

app.use(express.json());
app.use(cors())

const port = 3000;

const main = new solana.Connection(`https://mainnet.helius-rpc.com/?api-key=${api_key}`, "confirmed");
const dev = new solana.Connection("https://api.devnet.solana.com", "confirmed");
const solanaConnections = {
  main,
  dev,
};
const SOL_MINT = "So11111111111111111111111111111111111111112";

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function fetchDevSolBalance(publicKey) {
  const pubKey = new solana.PublicKey(publicKey);
  const lamports = await solanaConnections.dev.getBalance(pubKey);
  return lamports / solana.LAMPORTS_PER_SOL;
}

async function fetchBalance(publicKey) {
  const { data } = await axios.get(`https://api.helius.xyz/v0/addresses/${publicKey}/balances?api-key=${api_key}`);
  return data;
}

function parseMainnetBalance(raw) {
  const tokens = raw.tokens.map(token => ({mint: token.mint, amount: token.amount, symbol: token.symbol ?? undefined, decimals: token.decimals ?? 0}))

  return { 
    solBalance: raw.nativeBalance / solana.LAMPORTS_PER_SOL,
    tokens,
  }
}

function collectMintAddress(tokens,uniqueMintAddress) { 
  tokens.forEach(t => {
    uniqueMintAddress.add(t.mint)
  })
}
async function buildWallet(w, uniqueMintAddress) { 
  {
      if (!w.publicKey) throw Error("public key error");

      // fetch wallet balance
      const data = await fetchBalance(w.publicKey);

      // manipulate obj to insert data
      const mainNet =  parseMainnetBalance(data);
      const devNet = {
        solBalance: await fetchDevSolBalance(w.publicKey),
        tokens: [],
      };

      collectMintAddress(mainNet.tokens, uniqueMintAddress);

      
      return {
        ...w,
        mainNet,
        devNet,
      };
    }
}
async function fetchWalletTokens(wallets) {
  // keep track of uniqueMintAddress
  const uniqueMintAddresses = new Set(["So11111111111111111111111111111111111111112"]);

  const walletWithData = await Promise.all(
    wallets.map(async w => buildWallet(w, uniqueMintAddresses)),
  );

  return { walletWithData, uniqueMintAddresses };
}

async function fetchPrices(mintAddresses) {
  // fetch all token prices
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
  const response = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${api_key}`, data, {
    headers: { "Content-Type": "application/json" },
  });

  // return tokenPrices obj with mint address as the key
  for (let token of response.data.result) {
    tokenPrices[token.id] = token.token_info;
  }

  return tokenPrices;
}

async function loadPrices(wallets, tokenPrices) {
  try {
    let finalWallets = wallets.map(wallet => {
      //devnet
      const devNet = wallet.devNet;
      const mainNet = wallet.mainNet;

      devNet.totalBalance = devNet.solBalance * tokenPrices[SOL_MINT].price_info.price_per_token;

      let totalBalance = mainNet.solBalance * tokenPrices[SOL_MINT].price_info.price_per_token;

      mainNet.tokens.forEach(token => {
        const priceInfo = tokenPrices[token.mint]?.price_info;
        if (priceInfo) {
          let price = priceInfo.price_per_token;
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
  } catch (err) {
    throw err;
  }
}

app.post("/fetch-wallet-details", async (req, res) => {
  const { wallets } = req.body;
  if (!wallets) return res.status(400).json({ message: "no wallets found" });

  try {
    const { walletWithData, uniqueMintAddresses } = await fetchWalletTokens(wallets);
    const tokenPrices = await fetchPrices(uniqueMintAddresses);
    const walletWithPrices = await loadPrices(walletWithData, tokenPrices);

    return res.status(200).json({ message: "successfull", walletWithPrices });
  } catch (err) {
    return res.status(500).json({ message: "error occured", error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
