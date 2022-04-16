let fs = require('fs');
let config = require('./config');
let MongoClient = require('mongodb').MongoClient;

async function start() {
  try{
    const client = await MongoClient.connect(config.database_url);
    const collection = client.db(config.db_name).collection('data');

    let alldata = collection.find();
    let items = await alldata.toArray();
    let ws = fs.createWriteStream('dump.js');

    items.forEach(v => {
        ws.write(JSON.stringify(v) + '\n');
      });
    ws.end('');
    console.log('end');
  } catch(e) {
    console.log('catch:' + e.toString());
  }
};

start();
