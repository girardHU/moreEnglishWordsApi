const express = require('express');
const mongo = require('../../database');
const router = express.Router();

const wordsCollection = mongo.db.collection('words');


router.get('/:value', (req, res) => {
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

router.post('/', (req, res) => {
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

router.post('/:value', (req, res) => {
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

router.delete('/:value', (req, res) => {
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

module.exports = router;