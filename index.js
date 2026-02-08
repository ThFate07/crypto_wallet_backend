const express = require("express");
require("dotenv").config();
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});


const walletRouter = require("./src/routes/wallet");
app.use(walletRouter);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
