const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const express = require('express');
const  cors = require('cors');
dotenv.config()

const e = require('express');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const app = express()
const port = process.env.PORT || 5000 ;
app.use(cors())
app.use(express.json())
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
)


const verifyToken = async(req,res,next)=>{
  const authHeader = req?.headers.authorization
  if(!authHeader){
    return res.status(401).json({messege:"Unauthorized"})
  }
  const token = authHeader.split(" ")[1]
  if(!token){
    return res.status(401).json({messege:"Unauthorized"})
  }

  try {
    const {payload} = await jwtVerify(token,JWKS)
    next()
  } catch (error) {
    return res.status(401).json({messege:"Forbidden"})
  }
}


async function run() {
  try {
    await client.connect();
    const db = client.db("mediqueue")
    const mediqueueCollection = db.collection("tutors")
    const bookingCollection = db.collection("booking")



  app.patch("/tutors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await mediqueueCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  });

  app.delete("/tutors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await mediqueueCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  });

    app.patch("/tutors/:id",async (req,res)=>{
      const {id} = req.params
      const updatedata = req.body

      const result = await mediqueueCollection.updateOne(
        {_id: new ObjectId(id)},
        {$set:updatedata}
      )
      res.json(result)
    })

    app.delete("/tutors/:id",async(req,res)=>{
      const {id} = req.params
      const result = await mediqueueCollection.deleteOne({_id: new ObjectId(id)})
      res.json(result)
    })

    app.get("/tutors/:id", (req,res,next)=>{
      const header = req.headers.authorization
      if(header === "looged in"){
        next()
      }else{
        res.status(401).json({massage:"Unauthorized"})
      }
    }, async(req,res)=>{
      const {id} = req.params
      const result = await mediqueueCollection.findOne({_id: new ObjectId(id)})
      res.json(result)
    })

    
    app.get("/tutors",async(req,res)=>{
      const result = await mediqueueCollection.find().toArray()
      res.json(result)
    })


  
    app.get("/booking/:userId", async (req, res) => {
    try {
    const { userId } = req.params;
    const result = await bookingCollection.find({ userID: userId }).toArray();
    
    res.json(result);
    } catch (err) {
    res.status(500).json({ error: err.message });
    }
    });

   app.delete("/booking/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


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

  app.get("/availableTutors",async(req,res)=>{
    const result = await mediqueueCollection.find().limit(6).toArray()
    res.json(result)
  })



    app.post("/tutors", async(req,res)=>{
      const tutorsData = req.body
      const result = await mediqueueCollection.insertOne(tutorsData)
      res.json(result)

    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is Running Fine!')
})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
