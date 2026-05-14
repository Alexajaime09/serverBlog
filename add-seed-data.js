require("dotenv").config();
const { MongoClient } = require("mongodb");
const seedData = require("./seed-data.js");

//1 )crear la funcion
async function addSeedData() {
  //2) procesar el archivo env y acceder a la constante MONGO_URI
  const uri = process.env.MONGO_URI;
  //crear un nuevo cliente con el metodo MongoCliente con el
  //con el file => uri
  const client = new MongoClient(uri);
  //conectar al cliente
  await client.connect();
  //crear la base de datos
  const db = client.db("blogLikes");
  //crear la collection
  const result = await db.collection("posts").insertMany(seedData);
  console.log(`Inserted ${result.insertedCount}ports.`);
  await client.close();
}

addSeedData();
