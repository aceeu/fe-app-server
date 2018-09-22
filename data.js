let MongoClient = require('mongodb').MongoClient;
let ObjectID = require('mongodb').ObjectID;
let moment = require('moment');
let config = require('./config');
const detectValidUser = require('./helpers').detectValidUser;

const requiredParams = ['_id', 'buyer', 'category', 'buyDate', 'product', 'sum', 'whom', 'note'];

function checkData(data) {
    const keys = Object.keys(data);
    // if (requiredParams.length != keys.length)
    //     return false;
    let res = [];
    keys.forEach((k, i) => {
         res[i] = requiredParams.findIndex(p => p == k);
    })
    return res.findIndex(v => v === -1) == -1;
}

function addDataHandler() {
    return async function(req, res, next) {
      try {
        if (!req.session.name) {
          throw 'invalid session';
        }
        const client = await MongoClient.connect(config.database_url);
        if (!detectValidUser(client, req.session))
          throw 'invalid user';
        const collection = client.db(config.db_name).collection('data');
        let row = req.body;
        if (!checkData(row))
          throw 'invalid check data';
        const thisdate = moment().toDate();
        if (row._id) { // edit data
          const {_id, ...rowni} = row;
          const values = {...rowni, editor: req.session.name, edited: thisdate}
          console.log('values=' + JSON.stringify(values));
          const ires = await collection.findOneAndReplace({_id: {$eq: ObjectID(row._id)}}, values);
          console.log(ires);
          if (ires.ok)
              res.json({res: true});
          else
              throw ires.lastErrorObject;
        } else { // add data
          row = { created: thisdate, creator: req.session.name, ...row };
          const ires = await collection.insertOne(row);
          if (ires.insertedCount == 1)
              res.json({res: true});
          else
              throw 'cannot insert data to db';
        }
      } catch(e) {
        res.json({res: false, text: e.toString()});
      } finally {
        res.end();
      }
    }
}

function fetchDataHandler() {
    return async function(req, res, next) {
        try{
          if (!req.session.name)
            throw 'invalid session';
          console.log('body:' + JSON.stringify(req.body));
          const fromDate = moment(req.body.fromDate);
          const toDate =moment(req.body.toDate) || moment().toDate(); // toDate < fromDate

          const {filter} = req.body;
          const client = await MongoClient.connect(config.database_url);
          if (await detectValidUser(client, req.session)) {
              const collection = client.db(config.db_name).collection('data');
              let findExpr = {buyDate: {$gte: fromDate.toDate(), $lt: toDate.toDate()}};
              if (filter && filter.column && filter.column == 'buyer')
                findExpr = {...findExpr, buyer: {$eq: filter.text}};
              console.log(JSON.stringify(findExpr));
              const findRes = await collection.find(findExpr);
              let items = await findRes.toArray();
              res.json(items);
          } else {
              res.json({res: false, text: 'invalid user'});
          }
        } catch(e) {
          res.json({res: false, text: e.toString()})
        } finally {
          res.end();
        }
    }
}

exports.addDataHandler = addDataHandler;
exports.fetchDataHandler = fetchDataHandler;
