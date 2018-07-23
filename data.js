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

function getStartData(period) {
  const Period = {
    lastDay: 1,
    lastWeek: 2,
    lastMonth: 3,
    lastYear: 4
  };
  switch (period) {
    case Period.lastDay: return moment().subtract(1, 'days').toDate();
    case Period.lastWeek: return moment().subtract(7, 'days').toDate();
    case Period.lastMonth: return moment().subtract(1, 'months').toDate();
    case Period.lastYear: return moment().subtract(50, 'days').toDate();
    default: throw 'invalid period';
  }
}

function fetchDataHandler() {
    return async function(req, res, next) {
        try{
          if (!req.session.name)
            throw 'invalid session';
          console.log('body:' + JSON.stringify(req.body));
          const period = req.body.period;
          const buyer = req.body.buyer;
          const fromDate = getStartData(period);
          const client = await MongoClient.connect(config.database_url);
          if (await detectValidUser(client, req.session)) {
              const collection = client.db(config.db_name).collection('data');
              let findExpr = {created: {$gte: fromDate}};
              if (buyer && buyer.length)
                findExpr = {...findExpr, buyer: {$eq: buyer}};
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
