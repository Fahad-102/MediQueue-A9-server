const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const express = require('express');
const  cors = require('cors');
dotenv.config()

const e = require('express');
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
  }
});
async function run() {
  try {
    await client.connect();
    const db = client.db("mediqueue")
    const mediqueueCollection = db.collection("tutors")


    app.patch("/tutors/:id",async (req,res)=>{
      const {id} = req.params
      const updatedata = req.body

      const result = await mediqueueCollection.updateOne(
        {_id: new ObjectId(id)},
        {$set:updatedata}
      )
      res.json(result)
    })

    app.get("/tutors/:id", async(req,res)=>{
      const {id} = req.params
      const result = await mediqueueCollection.findOne({_id: new ObjectId(id)})
      res.json(result)
    })

    
    app.get("/tutors",async(req,res)=>{
      const result = await mediqueueCollection.find().toArray()
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
