/**
 * Required External Modules
 */
const express = require("express");
const path = require("path");
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = require('url');
const { get } = require("http");

/**
 * App Variables
 */
const app = express();
const port = process.env.port || 3000;

/**
 *  App Configuration
 */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

/**
 * Database Connection
 */
// Connection URL
const mongodbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ratnh.gcp.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

MongoClient.connect(mongodbUrl, { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err)
  console.log("Connected successfully to server");
  const db = client.db(process.env.DB_NAME);
  const wordsCollection = db.collection('words');

  /**
   * Routes Definitions
   */
  app.get('/', (req, res) => {
    res.status(200).send('working properly');
  });

  app.get('/word', (req, res) => {
    const queryParams = url.parse(req.url, true).query;
    console.log(queryParams);
    if (!queryParams['word'])
      return res.status(422).json({ error : 'need string param to specify the word requested like so : word=<yourWord>' });
    wordsCollection.findOne(queryParams, (err, obj) => {
      if (err) {
        console.log('/word get, find : ', err);
        return res.json({ error : 'error while querying database' });
      } else {
        return res.status(200).json({ success : obj });
      }
    });
  });

  app.post('/word', (req, res) => {
    console.log(req.body);
    if (!req.body['word'] || !req.body['translation'])
      return res.status(422).json({ error: 'need exactly 2 two params : a word and a translation' });
    // TODO : VERIFIE INPUT
    wordsCollection.insertOne(req.body, (err, result) => {
      if (err) {
        // TODO : check HTTP code
        console.log('/word post, insertOne : ', err)
        return res.status(500).json({ error: 'could not save to database' });
      }
      return res.status(201).json({ succes : 'successfully created one entry : ' + result })
    });
  });

  app.delete('/word', (req, res) => {
    // TODO : CHECK PARAMS
    wordsCollection.deleteOne(req.body, (err, result) => {
      if (err) {
        // TODO : check HTTP code
        console.log('/word delete, deleteOne : ', err)
        return res.status(500).json({ error: 'could not delete entry' });
      }
      if (!result.deletedCount)
        return res.status(404).json({ error: 'cannot delete, entry not found' });
      return res.status(200).json({ succes : 'successfully deleted one entry : ' + result })
    });
  });

  /**
   * Server Activation
   */
  app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
  });

  // client.close();
});



