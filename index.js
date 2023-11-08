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
    origin: [
      "https://incredible-selkie-d11477.netlify.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
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

app.get("/api/v1", async (req, res) => {
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
const userOrderCollection = database.collection("usersOrders");
const userAddNewFoodsCollection = database.collection("allUserAddedANewFoods");
const userInfoCollection = database.collection("userInfo");

async function run() {
  try {
    // post by  jwt
    app.post("/api/v1/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign({ data: user }, process.env.SEC, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          // secure: false,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // remove cookies
    app.post("/api/v1/removeCookie", async (req, res) => {
      res
        .clearCookie("token", { maxAge: 0, sameSite: "none", secure: true })
        .send({ success: true });
      // .clearCookie("token", { maxAge: 0, secure: false })
      // .send({ success: true });
    });

    // user info stored when user registered
    app.post("/api/v1/registerUserInfo" , async(req, res)=>{
      const info  = req.body
      const result = await userInfoCollection.insertOne(info)
      res.send(result)
    })

    // get foodItems by email , category , pagination , sorting, foodCount
    app.get("/api/v1/foodItems", async (req, res) => {
      // console.log(req.query);
      const email = req.query.email;
      const category = req.query.category;
      const sortFild = req.query.sortFild;
      const sortOrder = req.query.sortOrder;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const skip = (page - 1) * size;
      const search = req.query.search;

      let queryObj = {};
      let sortObj = {};

      if (email) {
        queryObj.email = email;
      }
      if (category) {
        queryObj.category = new RegExp("^" + category + "$", "i");
      }
      if (search) {
        queryObj.food_name = { $regex: search, $options: "i" };
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

      res.send({ result, count });
    });

    // update foodItemsCollection
    app.put("/api/v1/foodItems", async (req, res) => {
      const id = req.body._id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          category: req.body.category,
          price: req.body.price,
          image: req.body.image,
          rating: req.body.rating,
          stored_date: req.body.stored_date,
          food_origin: req.body.food_origin,
          description: req.body.description,
          quantity: req.body.quantity,
          food_name: req.body.food_name,
          email: req.body.email,
        },
      };

      const result = await foodItemsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // post by specific user AddAFoodItems by profile
    app.post("/api/v1/foodItems", async (req, res) => {
      const info = req.body;
      const result = await foodItemsCollection.insertOne(info);
      res.send(result);
    });

    // post by new collection and  user add a  new food
    app.post("/api/v1/userAddNewFoods", async (req, res) => {
      const info = req.body;
      const result = await userAddNewFoodsCollection.insertOne(info);
      res.send(result);
    });

    //  get user Added a new items api and query by email
    app.get("/api/v1/userAddNewFoods", verifyToken, async (req, res) => {
      const userEmail = req.query.email;
      let queryObj = {};
      if (userEmail) {
        queryObj.email = userEmail;
      }
      const result = await userAddNewFoodsCollection.find(queryObj).toArray();
      res.send(result);
    });

    // update userAddNewFoods
    app.put("/api/v1/userAddNewFoods", async (req, res) => {
      const id = req.body._id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          category: req.body.category,
          price: req.body.price,
          image: req.body.image,
          rating: req.body.rating,
          stored_date: req.body.stored_date,
          food_origin: req.body.food_origin,
          description: req.body.description,
          quantity: req.body.quantity,
          food_name: req.body.food_name,
          email: req.body.email,
        },
      };

      const result = await userAddNewFoodsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // get sorting by topSell
    app.get("/api/v1/topSellFood", async (req, res) => {
      const query = {};
      const options = {
        projection: { image: 1, price: 1, category: 1, food_name: 1 },
      };
      const result = await foodItemsCollection
        .find(query, options)
        .sort({ total_purchase: "desc" })
        .toArray();

      const topSell = result.slice(0, 6);

      res.send(topSell);
    });

    // get one item by _id
    app.get("/api/v1/foodItems/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await foodItemsCollection.findOne(query);
      res.send(result);
    });

    // post by new collection by userOrderCollection
    app.post("/api/v1/allOrders", async (req, res) => {
      const info = req.body;
      const result = await userOrderCollection.insertOne(info);
      res.send(result);
    });

    // get allOrdersCollection  api and  query by email specific user
    app.get("/api/v1/allOrders", verifyToken, async (req, res) => {
      const email = req?.query?.email;
      let queryObj = {};
      if (email) {
        queryObj.email = email;
      }
      const result = await userOrderCollection.find(queryObj).toArray();
      res.send(result);
    });
    // get allOrdersCollection  api and  query by email specific user
    app.delete("/api/v1/allOrders/:_id", async (req, res) => {
      const id = req.params._id;
      const query = { _id: new ObjectId(id) };
      const result = await userOrderCollection.deleteOne(query);
      res.send(result);
    });

    // patch by total_purchase food
    app.patch("/api/v1/foodItems/:_id", async (req, res) => {
      const info = req.body.total_purchase;
      const id = req.params._id;

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      // Specify the update to set a value for the plot field
      const updateDoc = {
        $set: {
          total_purchase: info,
        },
      };
      const result = await foodItemsCollection.updateOne(
        filter,
        updateDoc,
        options
      );

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
