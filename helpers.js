let MongoClient = require('mongodb').MongoClient;
let config = require('./config');

const dbName = config.db_name;

async function detectValidUser(mongoClient, session) {
    if (session.name == null)
        return false;
    const collection = mongoClient.db(dbName).collection('users');
    const fres = await collection.find({user: {$eq: session.name}});
    const items = await fres.toArray();
    console.log('user items:' + JSON.stringify(items));
    return items.length == 1;
}
// exports
exports.detectValidUser = detectValidUser;