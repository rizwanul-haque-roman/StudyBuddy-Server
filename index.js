const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://studybuddy-org.web.app",
      "https://studybuddy-org.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uzy5irc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    const database = client.db("studyBuddy");
    const assignments = database.collection("assignments");

    app.get("/assignments", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const difficulty = req.query.difficulty;
      const query = { difficulty: difficulty };
      // console.log(page, size, difficulty);
      console.log(difficulty);
      if (difficulty === "" || difficulty === "all") {
        const result = await assignments
          .find()
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      } else {
        const result = await assignments
          .find(query)
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      }
    });

    app.get("/featured", async (req, res) => {
      const query = { deadline: "23/05/2024" };
      const result = await assignments.find(query).toArray();
      res.send(result);
    });

    app.post("/assignments", async (req, res) => {
      const assignment = req.body;
      const result = await assignments.insertOne(assignment);
      console.log(assignment);
      res.send(result);
    });

    app.get("/totalAssignments", async (req, res) => {
      const difficulty = req.query.difficulty;
      console.log(difficulty);
      if (difficulty === "" || difficulty === "all") {
        const count = await assignments.estimatedDocumentCount();
        res.send({ count });
      } else {
        const count = await assignments.countDocuments({
          difficulty: difficulty,
        });
        res.send({ count });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
