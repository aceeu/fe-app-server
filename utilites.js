let MongoClient = require('mongodb').MongoClient;
let config = require('./config');
const dbName = config.db_name;
const Collection = 'data';

// creates the categories list with frequences of use
async function FrequencyOfUseCathegories() {
  try {
    const client = await MongoClient.connect(config.database_url);
    const collection = client.db(dbName).collection(Collection);
    const cursor = collection.find();
    const cats = [];
    cursor.forEach(r => {
      const index = cats.findIndex(v => v.cat == r.category);
      if (-1 == index)
        cats.push({cat: r.category, entry: 0});
      else
        cats[index].entry += 1;
    }, async () => {
        cats.sort((a, b) => b.entry - a.entry);
        const categoriesCollection = client.db(dbName).collection('categories');
        await categoriesCollection.drop();
        await categoriesCollection.insertMany(cats);
        // console.log(cats);
        process.exit();
      }
    );

  } catch(e) {
    console.log(e);
  }
  return;
}

FrequencyOfUseCathegories();
