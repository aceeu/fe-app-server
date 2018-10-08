let fs = require('fs');
let parse = require('csv-parse');
let asyncc = require('async');
var inputFile='./rashod.rashod2018.csv';
let config = require('./config');
let MongoClient = require('mongodb').MongoClient;

// импорт csv файла экспортированный из http://192.168.1.34/phpliteadmin.php?table=rashod&action=table_export
//----- удаляет предыдущие данные

function make(line) {
  const date = new Date(line[2]);
  return {created: date, creator: line[1], buyer: line[1], category: line[3],
    buyDate: date, product: line[4], sum: +line[5], whom: line[7], note: line[6]};
}

console.log(config.database_url);

(async function() {
  try{
    const client = await MongoClient.connect(config.database_url);
    const collection = client.db(config.db_name).collection('data');
    // await collection.drop()
    var parser = parse({delimiter: ';'}, function (err, data) {
      asyncc.eachSeries(data, function (line, callback) {
        collection.insertOne(make(line)).then(() => {
          console.log(new Date(line[2]));
          callback();
        },
        rej => console.log(rej));
      });
      console.log('end');
    });
    fs.createReadStream(inputFile).pipe(parser);
  } catch(e) {
    console.log('catch:' + e.toString());
  }
})();
