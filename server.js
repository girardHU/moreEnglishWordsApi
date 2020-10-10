/**
 * Required External Modules
 */
const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const url = require('url');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yml');
const mongo = require('./database');

start();

async function start() {
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
  await mongo.init();

  /**
   * Routes Definitions
   */
  app.get('/', (req, res) => {
    res.status(200).json({ success : 'welcome to the EnglishWordsAPI' });
  });

  app

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
}