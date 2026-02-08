const express = require("express");
const router = express.Router();

const { SOL_MINT} = require("../config");
const { buildWallet } = require("../services/wallet");
const { fetchPrices, loadPrices } = require("../services/prices");


router.post("/fetch-wallet-details", async (req, res) => {
  const { wallets } = req.body;
  if (!wallets) return res.status(400).json({ message: "no wallets found" });

  try {
    
    const collector = {
      Solana: new Set([SOL_MINT]),
      Ethereum: new Set(["Eth"]),
    };

    const walletWithData = await Promise.all(wallets.map(w => buildWallet(w, collector)));

    // const tokenPrices = await fetchPrices(collector.Solana);
    // const walletWithPrices = await loadPrices(walletWithData, tokenPrices);

    return res.status(200).json({ message: "successfull" });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: "error occured", error: {message: err.message || err.data, status: err.status} });
  }
});

module.exports = router;
