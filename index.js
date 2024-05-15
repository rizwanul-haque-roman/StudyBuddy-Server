const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
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
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uzy5irc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/**
 * =============================================
 *          custom middleware
 * =============================================
 */

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }

    req.user = decoded;
    next();
  });

  // next();
};

async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    /**
     * =============================================
     *           Auth Related API (JWT)
     * =============================================
     */
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("Generating token for:", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      // console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });
    /**
     * =============================================
     *            DATABASE & COLLECTION
     * =============================================
     */

    const database = client.db("studyBuddy");
    const assignments = database.collection("assignments");
    const submittedAssignments = database.collection("submittedAssignments");

    /**
     * =============================================
     *                GET API
     * =============================================
     */

    app.get("/assignments", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const difficulty = req.query.difficulty;
      const query = { difficulty: difficulty };
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

    app.get("/pending", verifyToken, async (req, res) => {
      const email = req.query.email;

      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidded access" });
      }

      const query = { obtainedMarks: "" };
      const result = await submittedAssignments.find(query).toArray();
      res.send(result);
    });

    app.get("/mySubmission", verifyToken, async (req, res) => {
      const email = req.query.email;

      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidded access" });
      }

      const query = { submitterEmail: email };
      const result = await submittedAssignments.find(query).toArray();
      res.send(result);
    });

    app.get("/assignment", async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignments.findOne(query);
      res.send(result);
    });

    app.get("/totalAssignments", async (req, res) => {
      const difficulty = req.query.difficulty;
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

    /**
     * =============================================
     *                POST API
     * =============================================
     */

    app.post("/assignments", async (req, res) => {
      const assignment = req.body;
      const result = await assignments.insertOne(assignment);
      res.send(result);
    });

    app.post("/submission", async (req, res) => {
      const submission = req.body;
      const result = await submittedAssignments.insertOne(submission);
      res.send(result);
    });

    /**
     * =============================================
     *            PUT & PATCH API
     * =============================================
     */

    app.put("/assignment", async (req, res) => {
      const id = req.query.id;
      const assignment = req.body;
      const filter = { _id: new ObjectId(id) };
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
      const options = { upsert: false };
      const updatedSubmission = {
        $set: {
          obtainedMarks: marksAndFeedback.obtainedMarks,
          feedback: marksAndFeedback.feedback,
          status: marksAndFeedback.status,
        },
      };

      const result = await submittedAssignments.updateOne(
        filter,
        updatedSubmission,
        options
      );
      res.send(result);
    });

    /**
     * =============================================
     *                DELETE API
     * =============================================
     */

    app.delete("/assignments", async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
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
