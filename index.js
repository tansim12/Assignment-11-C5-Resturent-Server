const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("Assignment 11 C5 is running");
});

app.listen(port, () => {
  console.log(`port is running by ${port}`);
});
