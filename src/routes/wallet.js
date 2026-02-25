const express = require("express");
const router = express.Router();

const { SOL_MINT } = require("../config");
const { buildWallet } = require("../services/wallet");
const { loadPrices, fetchSolanaPrices, fetchEthPrices } = require("../services/prices");
const { requestAirdrop } = require("../services/solana");

function toSafeErrorPayload(error) {
  return {
    message: error?.message || "Unknown error",
    status: error?.status || error?.response?.status,
    details: error?.response?.data,
  };
}

router.post("/fetch-wallet-details", async (req, res) => {
  const { wallets } = req.body;
  if (!wallets) return res.status(400).json({ message: "no wallets found" });

  try {
    const collector = {
      Solana: new Set([SOL_MINT]),
      Ethereum: new Set(["Eth"]),
    };

    const walletWithData = await Promise.all(wallets.map(w => buildWallet(w, collector)));

    const solTokenPrices = await fetchSolanaPrices(collector.Solana);
    const ethTokenPrices = await fetchEthPrices(collector.Ethereum);

    const walletWithPrices = await loadPrices(walletWithData, solTokenPrices, ethTokenPrices);

    return res.status(200).json({ message: "successfull", walletWithPrices });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "error occured", error: toSafeErrorPayload(err) });
  }
});

router.post("/requestSolAirdrop", async (req, res) => {
  try {
    const { pubKey } = req.body;
    if (!pubKey) return res.status(400).json({ message: "no public key found" });
    const result = await requestAirdrop(pubKey);
    return res.status(200).json({ message: "successfull", result });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "error occured", error: toSafeErrorPayload(error) });
  }
});

module.exports = router;
