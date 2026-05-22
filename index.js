const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// ---------------- MongoDB ----------------
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ---------------- MAIN ----------------
async function run() {
  try {
    await client.connect();
    console.log("MongoDB Connected Successfully");

    const db = client.db("mediqueue");
    const mediqueueCollection = db.collection("tutors");
    const bookingCollection = db.collection("booking");

    // ---------------- TUTORS ----------------

    app.get("/tutors", async (req, res) => {
      try {
        const { search } = req.query;

        let query = {};

        if (search) {
          query = {
            name: { $regex: search, $options: "i" },
          };
        }

        const result = await mediqueueCollection.find(query).toArray();
        res.json(result || []);
      } catch (err) {
        res.status(500).json([]);
      }
    });

    app.get("/tutors/:id", async (req, res) => {
      try {
        const result = await mediqueueCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        res.json(result || null);
      } catch (err) {
        res.status(500).json(null);
      }
    });

    app.post("/tutors", async (req, res) => {
      try {
        const result = await mediqueueCollection.insertOne(req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.patch("/tutors/:id", async (req, res) => {
      try {
        const result = await mediqueueCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );

        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.delete("/tutors/:id", async (req, res) => {
      try {
        const result = await mediqueueCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/availableTutors", async (req, res) => {
      try {
        const result = await mediqueueCollection.find().limit(6).toArray();
        res.json(result || []);
      } catch (err) {
        res.status(500).json([]);
      }
    });

    // ---------------- BOOKING ----------------

    app.post("/booking", async (req, res) => {
      try {
        const bookingData = req.body;
        const { tutorId } = bookingData;

        const bookingResult = await bookingCollection.insertOne(bookingData);

        if (bookingResult.insertedId && tutorId) {
          await mediqueueCollection.updateOne(
            { _id: new ObjectId(tutorId) },
            { $inc: { totalSlot: -1 } }
          );
        }

        res.json(bookingResult);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/booking/:userId", async (req, res) => {
      try {
        const result = await bookingCollection
          .find({ userID: req.params.userId })
          .toArray();

        res.json(result || []);
      } catch (err) {
        res.status(500).json([]);
      }
    });

    app.delete("/booking/:bookingId", async (req, res) => {
      try {
        const result = await bookingCollection.deleteOne({
          _id: new ObjectId(req.params.bookingId),
        });

        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    console.log("API Ready 🚀");
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

// ---------------- ROOT ----------------
app.get("/", (req, res) => {
  res.send("Server is Running Fine!");
});

// ---------------- START ----------------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});