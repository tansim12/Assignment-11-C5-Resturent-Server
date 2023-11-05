const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "User Unauthorize" });
  }
  jwt.verify(token, process.env.SEC, (error, decoded) => {
    if (error) {
      return res.status(403).send({ message: "User Unauthorize" });
    } else {
      req.user = decoded;
      next();
    }
  });
};

app.get("/", async (req, res) => {
  res.send("Assignment 11 C5 is running");
});

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.qmivnkm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // post by  jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign({ data: user }, process.env.SEC, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`port is running by ${port}`);
});
