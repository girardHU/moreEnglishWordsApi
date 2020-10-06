/**
 * Required External Modules
 */
const express = require('express');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const MongoClient = require('mongodb').MongoClient;
const url = require('url');

/**
 * App Variables
 */
const app = express();
const port = process.env.PORT || 3000;

/**
 * Swagger Variables
 */
// Extended : http://swagger.io/specification/#infoObject
const swaggerOptions = {
  swaggerDefinition : {
    info : {
      title : 'English Words API',
      description : 'api which records words in english with traductions',
      contact : {
        name : 'Hugo Girard'
      },
      servers : [`http://localhost:${port}`]
    }
  },
  // ['.routes/*.js']
  apis : ['server.js']
};
const swaggerDocs = swaggerJSDoc(swaggerOptions);

/**
 *  App Configuration
 */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended : true })); // for parsing application/x-www-form-urlencoded
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs)); // swagger UI middleware ?

/**
 * Database Connection
 */
// Connection URL
const mongodbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ratnh.gcp.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

MongoClient.connect(mongodbUrl, { useUnifiedTopology : true }, (err, client) => {
  if (err) return console.error(err)
  console.log("Connected successfully to server");
  const db = client.db(process.env.DB_NAME);
  const wordsCollection = db.collection('words');

  /**
   * Routes Definitions
   */
  app.get('/', (req, res) => {
    res.status(200).json({ success : 'welcome to the EnglishWordsAPI' });
  });
  /**
   * @swagger
   * /word:
   *  get:
   *    description: used to request a single word
   *    responses:
   *      '200':
   *        description: A successful response, containing the requested document
   */
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
      return res.status(422).json({ error : 'need exactly two json body params : a word (string) and a translation ([string])' });
    // TODO : VERIFIE INPUT
    wordsCollection.find({ 'word' : req.body['word'] }).count()
    .then(findResponse => {
      if (findResponse > 0)
        return res.status(409).json ({ error : 'resource already exists, try updating it instead' });
      wordsCollection.insertOne(req.body, (insertErr, insertResponse) => {
        console.log(insertResponse.ops)
        if (insertErr) {
          // TODO : check HTTP code
          console.log('/word post, insertOne : ', insertErr);
          return res.status(500).json({ error : 'could not save to database' });
        }
        return res.status(201).json({ success : 'successfully created one entry : ' + insertResponse.ops });
      });
    })
    .catch(findErr => {
      console.log('/word post, find : ', findErr);
      res.status(500).json({ error : 'could not check if the entry already exists' });
    });
  });

  app.delete('/word', (req, res) => {
    // TODO : CHECK PARAMS
    wordsCollection.deleteOne(req.body, (err, response) => {
      if (err) {
        // TODO : check HTTP code
        console.log('/word delete, deleteOne : ', err)
        return res.status(500).json({ error : 'could not delete entry' });
      }
      console.log(response)
      if (!response.deletedCount)
        return res.status(404).json({ error : 'cannot delete, entry not found' });
      return res.status(200).json({ success : 'successfully deleted one entry : ' + req.body })
    });
  });

  app.put('/word', (req, res) => {
    const queryParams = url.parse(req.url, true).query;
    console.log(queryParams);
    if (!queryParams['word'] || !queryParams['replace'])
      return res.status(422).json({ error : 'need string params to specify the options like so : word=<string>&replace=<boolean>' });
    if (!req.body['word'] || !req.body['translation'])
      return res.status(422).json({ error : 'need exactly two json body params : a word (string) and a translation ([string])' });
    if (Object.keys(req.body).length > 2)
      return res.status(422).json({ error : 'provided more than the two json body params expected' });
    queryParams['replace'] ? wordsCollection.findOneAndReplace : wordsCollection.findOneAndUpdate (
      {'word' : queryParams['word'] },
      req.body,
      queryParams['upsert'] ? { upsert : true } : { upsert : false },
      (err, response) => {
        if (err) {
          // TODO : check HTTP code
          console.log(`/word put, ${queryParams['replace'] ? 'findOneAndReplace' : 'findOneAndUpdate'} : `, err);
          return res.status(500).json({ error : 'could not update entry' });
        }
        return res.status(201).json({ success : 'successfully created one entry : ' + insertResponse.ops });
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



