const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

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

// ---------------- MongoDB (Singleton) ----------------
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let isConnected = false;

async function connectDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("MongoDB Connected");
  }
  return client.db("mediqueue");
}

// ---------------- JWKS ----------------
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

// ---------------- AUTH MIDDLEWARE ----------------
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Unauthorized" });

  const token = header.split(" ")[1];
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (err) {
    console.log("JWT ERROR:", err.message);
    return res.status(403).json({ error: "Forbidden" });
  }
};

// ---------------- TUTORS ----------------
app.get("/tutors", async (req, res) => {
  try {
    const db = await connectDB();
    const mediqueueCollection = db.collection("tutors");

    const { search, subject, minPrice, maxPrice } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { tutorName: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }
    if (subject && subject !== "All") query.subject = subject;
    if (minPrice || maxPrice) {
      query.hourlyFee = {};
      if (minPrice) query.hourlyFee.$gte = Number(minPrice);
      if (maxPrice) query.hourlyFee.$lte = Number(maxPrice);
    }

    const result = await mediqueueCollection.find(query).toArray();
    res.json(result || []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/tutors/:id", verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("tutors").findOne({
      _id: new ObjectId(req.params.id),
    });
    res.json(result || null);
  } catch (err) {
    res.status(500).json(null);
  }
});

app.post("/tutors", verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("tutors").insertOne(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/tutors/:id", verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("tutors").updateOne(
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
    const db = await connectDB();
    const result = await db.collection("tutors").deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/availableTutors", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("tutors").find().limit(6).toArray();
    res.json(result || []);
  } catch (err) {
    res.status(500).json([]);
  }
});

// ---------------- BOOKING ----------------
app.post("/booking", verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const bookingData = req.body;
    const { tutorId } = bookingData;

    const bookingResult = await db.collection("booking").insertOne(bookingData);

    if (bookingResult.insertedId && tutorId) {
      await db.collection("tutors").updateOne(
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
    const db = await connectDB();
    const result = await db
      .collection("booking")
      .find({ userID: req.params.userId })
      .toArray();
    res.json(result || []);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.delete("/booking/:bookingId", verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("booking").deleteOne({
      _id: new ObjectId(req.params.bookingId),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- ROOT ----------------
app.get("/", (req, res) => {
  res.send("Server is Running Fine!");
});

// ---------------- START ----------------
// ---------------- START ----------------
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;