let MongoClient = require('mongodb').MongoClient;
let moment = require('moment');
let config = require('./config');
const detectValidUser = require('./helpers').detectValidUser;

const requiredParams = ['buyer', 'category', 'buyDate', 'product', 'sum', 'whom', 'note'];

function checkData(data) {
    const keys = Object.keys(data);
    if (requiredParams.length != keys.length)
        return false;
    let res = [];
    keys.forEach((k, i) => {
         res[i] = requiredParams.findIndex(p => p == k);
    })
    return res.findIndex(v => v === -1) == -1;
}

function addDataHandler() {
    return async function(req, res, next) {
        const client = await MongoClient.connect(config.database_url);
        if (detectValidUser(client, req.session)) {
            const collection = client.db(config.db_name).collection('data');
            let row = req.body;
            if (checkData(row)) {
                const thisdate = moment().unix()*1000;
                row = { created: thisdate, edited: thisdate, creator: req.session.name, ...row };
                const ires = await collection.insertOne(row);
                if (ires.insertedCount == 1)
                    res.json({res: true});
                else
                    res.json({res: false, text: 'cannot insert data to db'});
                }
        } else {
            res.json({res: false, text: 'invalid user'});
        }
        res.end();
    }
}

function fetchDataHandler(filter) {
    return async function(req, res, next) {
        const client = await MongoClient.connect(config.database_url);
        if (await detectValidUser(client, req.session)) {
            const collection = client.db(config.db_name).collection('data');
            const findRes = await collection.find();
            let items = await findRes.toArray();
            res.json(items);
        } else {
            res.json({res: false, text: 'invalid user'});
        }
        res.end();
    }
}

exports.addDataHandler = addDataHandler;
exports.fetchDataHandler = fetchDataHandler;