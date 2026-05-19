require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGO_URI;
const express = require("express");
const app = express();
app.use(express.json());

const client = new MongoClient(uri, {
  ServerApi: {
    version: ServerApiVersion.v1,
    serverApi: true,
    deprecationErrors: true,
  },
});
async function connectDB() {
  try {
    await client.connect();

    console.log("succesfully deployment");
  } catch (error) {
    console.log(error);
  }
}

async function startServer() {
  try {
    await connectDB().catch(console.dir);
    app.listen(3000, () => {
      console.log("server running port 3000");
    });
  } catch (err) {
    console.log("failed to connect", error);
  }
}

app.use((req, res, next) => {
  res.set(`Access-Control-Allow-Origin`, `*`);

  if (req.method === `OPTIONS`) {
    res.set(`Access-Control-Allow-Methods`, `GET,POST,PATCH,DELETE`);
    res.set(`Access-Control-Allow-Headers`, `Content-Type`);
    return res.sendStatus(204);
  }

  next();
});

startServer();
const db = client.db(process.env.MONGO_DB_NAME);
const posts = db.collection("posts");

// function valid ID

function validID(id) {
  if (!id || !ObjectId.isValid(id)) {
    return false;
  }
  return true;
}

function validString(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }
  return true;
}

/* =============== GET =============== */

app.get("/", async (req, res) => {
  const allPosts = await posts.find().toArray();
  res.json(allPosts);
});

app.get("/posts", async (req, res) => {
  try {
    let { authors, date } = req.query;
    console.log("authors", authors, "date", date);

    //======== Get all authors ============//

    if (!date && !authors) {
      const allPosts = await posts.find().toArray();
      return res.status(200).json(allPosts);
    }

    if (authors && !validString(authors)) {
      return res.status(400).json({
        message: "authors value must to be a string ",
      });
    }

    if (authors && authors === "all") {
      const allAuthors = await posts.distinct("author");
      return res.status(200).json({
        autores: allAuthors,
      });
    }
    //======== Get by date ============//
    if (date && !validString(date)) {
      return res.status(400).json({
        message: "value date has to be a string",
      });
    }
    if (date && date !== "recent" && date !== "oldest") {
      return res.status(400).json({
        message: "only valid values are 'recent' or 'oldest' ",
      });
    }

    //======== recent date ============//
    if (date === "recent") {
      console.log(authors);
      let query = {};
      let sortDate = { createdAt: -1 };
      const recentDates = await posts.find(query).sort(sortDate).toArray();
      console.log(recentDates);

      return res.status(200).json(recentDates);
    }
    //======== oldest date ============//

    if (date === "oldest") {
      console.log(authors);
      let query = {};
      let sortDate = { createdAt: 1 };
      const oldestDate = await posts.find(query).sort(sortDate).toArray();
      console.log(oldestDate);
      return res.status(200).json(oldestDate);
    }
  } catch (err) {
    return res.status(500).json({
      message: "error with the server",
    });
  }
});

//======== Get by Id ============//
app.get("/posts/id/:id", async (req, res) => {
  try {
    let { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "id without value",
      });
    }

    if (!validID(id)) {
      return res.status(404).json({
        message: "id empty",
      });
    }
    const postId = new ObjectId(id);
    const foundPost = await posts.findOne({ _id: postId });
    if (!postId) {
      return res.status(404).json({
        message: "post not found",
      });
    }
    return res.status(200).json({ foundPost });
  } catch (err) {
    return res.status(500).json({
      message: "error server",
    });
  }
});

//======== Get by authorName ============//
app.get("/posts/author/:authorName", async (req, res) => {
  try {
    let { authorName } = req.params;

    if (!authorName) {
      return res.status(400).json({
        message: "authorName without value",
      });
    }

    if (!validString(authorName)) {
      return res.status(404).json({
        message: "please fill input with string value",
      });
    }

    let authorNameClean = authorName.toLowerCase().trim();

    let authorPost = await posts.find({ author: authorNameClean }).toArray();
    console.log(authorPost);
    if (authorPost.length === 0) {
      return res.status(404).json({
        message: "there no are comments",
      });
    }
    return res.status(200).json({
      data: authorPost,
    });
  } catch (err) {
    return res.status(500).json({
      message: "server error",
    });
  }
});

/* =============== POST =============== */
app.post("/posts", async (req, res) => {
  let { author, content } = req.body;

  if (!author || !content) {
    return res.status(400).json({
      message: "author or content without value",
    });
  }

  if (!validString(author) || !validString(content)) {
    return res.status(400).json({
      message: "dosn't exist information in comment or author",
    });
  }

  try {
    const newPost = {
      author: author.toLowerCase().trim(),
      content,
      likes: 0,
      comments: 0,
      createdAt: new Date(),
    };

    const post = await posts.insertOne(newPost);

    //control if it was insert the post/ document to bd
    if (!post.acknowledged) {
      return res.status(400).json({
        message: "error to add post",
      });
    }
    //insertedId represents de Id genered
    return res.status(201).json({
      message: "post created",
      _id: post.insertedId,
    });
  } catch (err) {
    return res.status(500).json({
      error: "missing data",
    });
  }
});

/* ===============  DELETE =============== */

app.delete("/posts/:id", async (req, res) => {
  try {
    let { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "invalid id",
      });
    }

    // 3)convertirlo al dato Id
    const objectId = new ObjectId(id);

    //4) pedir a Mongo que lo elimine
    const deleteResult = await posts.deleteOne({ _id: objectId });

    //5 revisar que paso

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        message: "post not found to deleted",
      });
    }
  } catch (err) {
    return res.status(500).json({
      error: "error to delete post",
    });
  }
});

/* =============== PATCH =============== */

app.patch("/posts/update/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let { content } = req.body;

    if (!id || !content) {
      return res.status(400).json({
        message: "id or content without value",
      });
    }

    //1) Control 1 => Validar si es valido el id

    if (!validID(id)) {
      return res.status(400).json({
        message: "Invalid ID",
      });
    }

    //3) control 3 => validar que exista el dato => undefined/ null === false

    if (!validString(content)) {
      return res.status(400).json({
        message: "please fill the comment with a string value ",
      });
    }

    const objectId = new ObjectId(id);
    console.log(objectId);
    const searchedPost = await posts.findOneAndUpdate(
      { _id: objectId },
      { $set: { content: content } },
      { returnDocument: "after" },
    );

    //si no encontro el documento a la hora de hacer la modificacion

    if (!searchedPost) {
      return res.status(404).json({
        message: "post not found",
      });
    }
    return res.status(200).json({
      message: "updated succesfully",
      data: searchedPost,
    });
  } catch (err) {
    return res.status(500).json({
      message: "error to modify",
    });
  }
});

////=============== LIKES ================////
app.patch("/posts/:id/like", async (req, res) => {
  try {
    let { id } = req.params;

    //control to check if the _id is Valid
    if (!validID(id)) {
      return res.status(400).json({
        message: "id not valid, please check your id",
      });
    }

    let postId = new ObjectId(id);

    let searchedPost = await posts.findOneAndUpdate(
      { _id: postId },
      { $inc: { likes: 1 } },
      { returnDocument: "after" },
    );

    if (!searchedPost) {
      return res.status(404).json({
        message: "sorry the user couldn't be found to be updated",
      });
    }
    return res.status(200).json({
      message: searchedPost,
    });
  } catch (err) {
    return res.status(500).json({
      message: "error with the request",
    });
  }
});
