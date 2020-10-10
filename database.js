const { MongoClient } = require('mongodb');

class MongoBot {
  constructor() {
    const mongodbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ratnh.gcp.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
    this.client = new MongoClient(mongodbUrl, { useUnifiedTopology : true });
  }
  async init() {
    try {
      await this.client.connect();
      console.log("Connected successfully to server");
      this.db = this.client.db(process.env.DB_NAME);
    } catch (err) {
      // this.client.close();
      return console.error('MongoClient.connect error : ', err)
    }
  }
}

module.exports = new MongoBot();
