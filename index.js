const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

const database = client.db("assignment11C5");
const foodItemsCollection = database.collection("foodItems");

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

    // remove cookies
    app.post("/removeCookie", async (req, res) => {
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // get foodItems by email , category , pagination , sorting, foodCount
    app.get("/api/v1/foodItems", async (req, res) => {
      console.log(req.query);
      const email = req.query.email;
      const category = req.query.category;

      const sortFild = req.query.sortFild;
      const sortOrder = req.query.sortOrder;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const skip = (page - 1) * size;

      let queryObj = {};
      let sortObj = {};

      if (email) {
        queryObj.email = email;
      }
      if (category) {
        queryObj.category = new RegExp("^" + category + "$", "i");
      }
      if (sortFild && sortOrder) {
        sortObj[sortFild] = sortOrder;
      }

      const result = await foodItemsCollection
        .find(queryObj)
        .skip(skip)
        .limit(size)
        .sort(sortObj)
        .toArray();
      const count = await foodItemsCollection.estimatedDocumentCount();
      const topSell = await (
        await foodItemsCollection.find().sort(sortObj).toArray()
      ).slice(0, 6);
      res.send({ result, count, topSell });
    });

    // get one item by _id
    app.get("/api/v1/foodItems/:id", async (req, res) => {
      console.log(req.params.id);
      const query = { _id: new ObjectId(req.params.id) };
      const result = await foodItemsCollection.findOne(query);
      res.send(result);
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
