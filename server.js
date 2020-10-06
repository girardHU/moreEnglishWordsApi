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
      title : 'Unknown Words API',
      description : 'API used to extend your word pool in any language, currently serving only english to french translations',
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
   *    summary: used to find a single word
   *    description: ""
   *    produces:
   *    - "application/json"
   *    parameters:
   *      - in: path
   *        name: value
   *        schema:
   *          type: string
   *        required: true
   *        description: The very `word` you want to find in the database
   *    responses:
   *      '500':
   *        description: An error triggered while querying database, try again later
   *      '200':
   *        description: A successful response, containing the requested document
   */
  app.get('/word/:value', (req, res) => {
    // if (!req.params.value)
    //   return res.status(422).json({
    //     satus : 'error',
    //     message : 'Need a path parameter corresponding to the value of the word you are requiring',
    //     data : {}
    //   });
    wordsCollection.findOne({ value : req.params.value }, (err, obj) => {
      if (err) {
        console.log('/word get, find : ', err);
        return res.status(500).json({
          satus : 'error',
          message : 'error while querying database',
          data : {}
        });
      }
      if (!obj)
        return res.status(404).json({
          status : 'error',
          message : 'Entry not found',
          data : {
            value : req.params.value
          }
        });
      res.status(200).json({
        status : 'success',
        message : 'successfully retrieved the object in database',
        data : obj
      });
    });
  });

  /**
   * @swagger
   * /word:
   *  post:
   *    summary: used to add a single word
   *    description: ""
   *    produces:
   *    - "application/json"
   *    parameters:
   *      - in: body
   *        name: word
   *        schema:
   *          type: string
   *        required: true
   *        description: The very `word` you want to add in the database
   *      - in: body
   *        name: translation
   *        schema:
   *          type: "array"
   *          items:
   *            type: "string"
   *        required: true
   *        description: The translation.s of the given `word`
   *    responses:
   *      '422':
   *        description: An error triggered by not passing either `value`, `translations` or both body parameters
   *      '409':
   *        description: The given `value` entry already exists, try updating it by using the dedicated endpoint
   *      '500':
   *        description: An error triggered while querying database, try again later
   *      '201':
   *        description: A successful response, containing the new document
   */
  app.post('/word', (req, res) => {
    console.log(req.body);
    if (!req.body['value'] || !req.body['translations'] || Object.keys(req.body).length > 2)
      return res.status(422).json({
        status : 'error',
        message : 'exactly two json body parameters required : a value (string) and translations ([string])',
        data : req.body
      });
    // TODO : VERIFIE INPUT
    wordsCollection.find({ value : req.body['value'] }).count()
    .then(foundDocumentsNb => {
      if (foundDocumentsNb > 0)
        return res.status(409).json ({
          status : 'error',
          message : 'resource already exists, try updating it instead',
        data : { value : req.body['value'] }
      });
      wordsCollection.insertOne(req.body, (insertErr, insertResponse) => {
        console.log(insertResponse.ops)
        if (insertErr) {
          // TODO : check HTTP code
          console.log('/word post (new), insertOne : ', insertErr);
          return res.status(500).json({
            satus : 'error',
            message : 'error while querying database',
            data : {}
          });
        }
        res.status(201).json({
          status : 'success',
          message : 'successfully created one entry',
          data : insertResponse.ops
        });
      });
    })
    .catch(findErr => {
      console.log('/word post, find : ', findErr);
      res.status(500).json({
        satus : 'error',
        message : 'error while querying database',
        data : {}
      });
    });
  });

  app.delete('/word/:value', (req, res) => {
    // TODO : CHECK PARAMS
    wordsCollection.deleteOne({ value : req.params.value }, (err, response) => {
      if (err) {
        // TODO : check HTTP code
        console.log('/word delete, deleteOne : ', err)
        return res.status(500).json({
          satus : 'error',
          message : 'error while querying database',
          data : {}
        });
      }
      console.log(response)
      if (!response.deletedCount)
        return res.status(404).json({
          status : 'error',
          message : 'Entry not found',
          data : {
            value : req.params.value
          }
        });
      res.status(200).json({
        status : 'success',
        message : 'successfully deleted one entry',
        data : { value : req.params.value }
      });
    });
  });

  app.post('/word/:value', (req, res) => {
    console.log('Object.keys(req.body).length : ', Object.keys(req.body).length)
    if (!req.body['word'] || !req.body['replace'] || Object.keys(req.body).length > 2)
      return res.status(422).json({
        status : 'error',
        message : 'bad parameters, please refere to the documentation',
        data : req.body
      });
    req.body['replace'] ? wordsCollection.findOneAndReplace : wordsCollection.findOneAndUpdate (
      {'value' : req.body['word']['value'] },
      req.body['world'],
      req.body['upsert'] ? { upsert : true } : { upsert : false },
      (err, response) => {
        if (err) {
          // TODO : check HTTP code
          console.log(`/word post (update), ${req.body['replace'] ? 'findOneAndReplace' : 'findOneAndUpdate'} : `, err);
          return res.status(500).json({
            satus : 'error',
            message : 'error while querying database',
            data : {}
          });
        }
        res.status(201).json({
          status : 'success',
          message : 'successfully updated one entry',
          data : response.ops
        });
    });
  });

  app.use((req, res, next) => {
    res.status(404).json({
      satus : 'error',
      message : 'nothing found here',
      data : {
        url : req.url,
        verb : req.method
      }
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

/**
 * @swagger
 * definitions:
 *  Word:
 *    type: "object"
 *    properties:
 *      value:
 *        type: "string"
 *      translations:
 *        type: "array"
 *        items:
 *          type: "string"
 *  ApiResponse:
 *    type: "object"
 *    properties:
 *      status:
 *        type: "string"
 *      message:
 *        type: "string"
 *      data:
 *        type: "object"
 */