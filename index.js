const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const submittedAssignments = database.collection("submittedAssignments");

    app.get("/assignments", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const difficulty = req.query.difficulty;
      const query = { difficulty: difficulty };
      // console.log(page, size, difficulty);
      // console.log(difficulty);
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

    app.get("/pending", async (req, res) => {
      const query = { obtainedMarks: "" };
      const result = await submittedAssignments.find(query).toArray();
      res.send(result);
    });

    app.get("/mySubmission", async (req, res) => {
      const email = req.query.email;
      const query = { submitterEmail: email };
      const result = await submittedAssignments.find(query).toArray();
      res.send(result);
    });

    app.get("/assignment", async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };

      // console.log(id);
      const result = await assignments.findOne(query);
      res.send(result);
    });

    app.get("/totalAssignments", async (req, res) => {
      const difficulty = req.query.difficulty;
      // console.log(difficulty);
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

    app.post("/assignments", async (req, res) => {
      const assignment = req.body;
      const result = await assignments.insertOne(assignment);
      // console.log(assignment);
      res.send(result);
    });

    app.post("/submission", async (req, res) => {
      const submission = req.body;
      console.log(submission);
      const result = await submittedAssignments.insertOne(submission);
      res.send(result);
    });

    app.put("/assignment", async (req, res) => {
      const id = req.query.id;
      const assignment = req.body;
      const filter = { _id: new ObjectId(id) };
      // console.log(id);
      const options = { upsert: true };
      const updatedAssignment = {
        $set: {
          title: assignment.title,
          marks: assignment.marks,
          description: assignment.description,
          url: assignment.url,
          difficulty: assignment.difficulty,
          deadline: assignment.deadline,
        },
      };

      // console.log(updatedAssignment);

      const result = await assignments.updateOne(
        filter,
        updatedAssignment,
        options
      );
      res.send(result);
    });

    app.patch("/submission", async (req, res) => {
      const marksAndFeedback = req.body;
      const id = marksAndFeedback.id;
      const filter = { _id: new ObjectId(id) };
      // console.log(id);
      const options = { upsert: false };
      const updatedSubmission = {
        $set: {
          obtainedMarks: marksAndFeedback.obtainedMarks,
          feedback: marksAndFeedback.feedback,
          status: marksAndFeedback.status,
        },
      };

      console.log("This is filter:", filter);

      const result = await submittedAssignments.updateOne(
        filter,
        updatedSubmission,
        options
      );
      res.send(result);
    });

    app.delete("/assignments", async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      // console.log(query);
      const result = await assignments.deleteOne(query);
      res.send(result);
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
