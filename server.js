/**
 * Required External Modules
 */
const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const MongoClient = require('mongodb').MongoClient;
const url = require('url');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yml');

/**
 * App Variables
 */
const app = express();
const port = process.env.PORT || 3000;

/**
 *  App Configuration
 */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended : true })); // for parsing application/x-www-form-urlencoded
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // swagger UI middleware ?

/**
 * Database Connection
 */
const mongodbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ratnh.gcp.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
MongoClient.connect(mongodbUrl, { useUnifiedTopology : true }, (err, client) => {
  if (err)
    return console.error('MongoClient.connect error : ', err)
  console.log("Connected successfully to server");
  const db = client.db(process.env.DB_NAME);
  const wordsCollection = db.collection('words');

  /**
   * Routes Definitions
   */
  app.get('/', (req, res) => {
    res.status(200).json({ success : 'welcome to the EnglishWordsAPI' });
  });
  app.get('/word/:value', (req, res) => {
    if (!req.params.value.match(/^[A-Za-z]+$/))
      return res.status(422).json({
        satus : 'error',
        message : 'Only alphabetical values are accepted',
        data : { value : req.params.value }
      });
    wordsCollection.findOne({ value : req.params.value }, (err, obj) => {
      if (err) {
        console.log('/word get, find : ', err);
        return res.status(500).json({
          satus : 'error',
          message : 'Error while querying database',
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
        message : 'Successfully retrieved the object in database',
        data : obj
      });
    });
  });

  app.post('/word', (req, res) => {
    console.log(req.body);
    if (!req.body['value'] || !req.body['value'].match(/^[A-Za-z]+$/) || !req.body['translations'] || Object.keys(req.body).length > 2)
      return res.status(422).json({
        status : 'error',
        message : 'Exactly two json body parameters required : a value (string, only alphabetical) and translations ([string])',
        data : req.body
      });
    // TODO : VERIFIE INPUT
    wordsCollection.find({ value : req.body['value'] }).count()
    .then(foundDocumentsNb => {
      if (foundDocumentsNb > 0)
        return res.status(409).json ({
          status : 'error',
          message : 'Resource already exists, try updating it instead',
        data : { value : req.body['value'] }
      });
      wordsCollection.insertOne(req.body, (insertErr, insertResponse) => {
        console.log(insertResponse.ops)
        if (insertErr) {
          // TODO : check HTTP code
          console.log('/word post (new), insertOne : ', insertErr);
          return res.status(500).json({
            satus : 'error',
            message : 'Error while querying database',
            data : {}
          });
        }
        res.status(201).json({
          status : 'success',
          message : 'Successfully created one entry',
          data : insertResponse.ops
        });
      });
    })
    .catch(findErr => {
      console.log('/word post, find : ', findErr);
      res.status(500).json({
        satus : 'error',
        message : 'Error while querying database',
        data : {}
      });
    });
  });

  app.post('/word/:value', (req, res) => {
    console.log('Object.keys(req.body).length : ', Object.keys(req.body).length)
    if (!req.body['word'])
      return res.status(422).json({
        status : 'error',
        message : 'Mssing word object in parameters, refer to the documentation at /api-docs',
        data : req.body
      });
    wordsCollection.findOneAndUpdate(
      { 'value' : req.body['word']['value'] },
      req.body['replace'] ? {  $set : { 'translations' : req.body['word']['translations'] } } : {  $push : { 'translations' : req.body['word']['translations'] } },
      req.body['upsert'] ? { upsert : true } : { upsert : false },
      (err, response) => {
        if (err) {
          // TODO : check HTTP code
          console.log(`/word post (update), ${req.body['replace'] ? 'findOneAndReplace' : 'findOneAndUpdate'} : `, err);
          return res.status(500).json({
            satus : 'error',
            message : 'Error while querying database',
            data : {}
          });
        }
        res.status(201).json({
          status : 'success',
          message : 'Successfully updated one entry',
          data : response.ops
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
          message : 'Error while querying database',
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
        message : 'Successfully deleted one entry',
        data : { value : req.params.value }
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