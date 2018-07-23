let express = require('express');
let session = require('express-session');
let MongoClient = require('mongodb').MongoClient;
let config = require('./config');
let jsSHA = require('jssha');
const bodyParser = require('body-parser');
const data = require('./data');
const detectValidUser = require('./helpers').detectValidUser;

const dbName = config.db_name;
let app = express();
let tokenGenerator = require( 'token-generator' )({
        salt: ';lasdkfj alskdf alskd flk;lksdfalsdk d',
        timestampMap: 'abcdefghij', // 10 chars array for obfuscation proposes
    });

function jssha(text) {
  const shaObj = new jsSHA("SHA-256", "TEXT");
  shaObj.update(text);
  return shaObj.getHash("HEX");
}

app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 * 60 }}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

const options = {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['htm', 'html', 'css', 'js'],
    redirect: false,
  }
app.use(express.static(config.public_folder, options));

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/json');
    next();
})

app.get('/authtoken', (req, res, next) => {
  try {
    if (req.session) {
      req.session.tokenGenerator = tokenGenerator.generate();
      res.json({res: true, token: req.session.tokenGenerator});
    } else {
      res.json({res: false});
    }
  } finally {
      res.end();
  }
});

app.post('/auth', async function(req, res, next) {
    try {
        const clientHash = req.body.hash;
        const client = await MongoClient.connect(config.database_url);
        const users = client.db(dbName).collection('users');
        const fres = await users.find({user: {$eq: req.body.user}});
        let items = await fres.toArray();
        if (items.length != 1)
          throw 'user not found';
        if (!req.session)
          throw 'invalid session';
        const serverHash = jssha(items[0].password + req.session.tokenGenerator);
        if (serverHash !== clientHash)
          throw 'invalid password'
        req.session.name = items[0].user;
        res.json({res: true, name: req.session.name});
    } catch(e) {
        res.json({res: false, text: e.toString()});
    } finally {
        res.end();
    }

});

app.get('/logout', function(req, res, next) {
  try {
    if (!req.session.name)
      throw 'no user logged before';
    delete req.session.name;
    res.json({res: true});
  } catch (e) {
    res.json({res: true, text: e.toString()});
  } finally {
    res.end();
  }
});

app.get('/user', function(req, res, next){
    if (req.session.name)
        res.json({res: true, name: req.session.name});
    else
        res.json({res: false, text: 'no session name'});
    res.end();
});

app.post('/data', data.fetchDataHandler());

app.post('/adddata', data.addDataHandler());

app.listen(3001);
