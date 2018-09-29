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
        row = {...row, buyDate: new Date(row.buyDate)}; // convert to date of buydate value
        const thisdate = moment().toDate();
        if (row._id) { // edit data
          const {_id, ...rowni} = row;
          const values = {...rowni, editor: req.session.name, edited: thisdate}
          const ires = await collection.findOneAndReplace({_id: {$eq: ObjectID(row._id)}}, values);
          if (ires.ok)
              res.json({res: true});
          else
              throw ires.lastErrorObject;
        } else { // add data
          row = { created: thisdate, creator: req.session.name, ...row };
          const ires = await collection.insertOne(row);
          if (ires.insertedCount == 1) {
            console.log('inserted successfully');
              res.json({res: true});
          } else
              throw 'cannot insert data to db';
        }
      } catch(e) {
        res.json({res: false, text: e.toString()});
      } finally {
        res.end();
      }
    }
}

// fomat of filters = {columnName: 'text', columnName2: 'text}

const validFilterColumns = ['buyer', 'category', 'product'];
function checkFilter(filter) {
  let columns = Object.keys(filter);
  return columns.reduce((res, c) => {
    if (validFilterColumns.findIndex(v => c == v) != -1) {
      res[c] = {$eq: filter[c]};
    }
    return res;
  }, {});
}

function makeSummary(items) {
  return items.reduce((res, itm) => {
    if (res[itm.buyer]) {
      res[itm.buyer] += itm.sum;
    } else
      res[itm.buyer] = itm.sum;
    return res;
  }, {})
}

function fetchDataHandler() {
    return async function(req, res, next) {
        try{
          if (!req.session.name)
            throw 'invalid session';
          const fromDate = moment(req.body.fromDate);
          const toDate =moment(req.body.toDate) || moment().toDate(); // toDate < fromDate

          const {filter} = req.body;
          const client = await MongoClient.connect(config.database_url);
          if (await detectValidUser(client, req.session)) {
              const collection = client.db(config.db_name).collection('data');
              let findExpr = {buyDate: {$gte: fromDate.toDate(), $lt: toDate.toDate()}};
              // if (filter && filter.column && filter.column == 'buyer' && filter.text.length)
              //   findExpr = {...findExpr, buyer: {$eq: filter.text}};
              let checkedFilter = checkFilter(filter);
              findExpr = {...findExpr, ...checkedFilter};
              const findRes = await collection.find(findExpr);
              let items = await findRes.toArray();
              res.json({res: items, summary: makeSummary(items)});
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
