let express = require('express');
let session = require('express-session');
let MongoClient = require('mongodb').MongoClient;
let config = require('./config');
let jsSHA = require('jssha');
const bodyParser = require('body-parser');
const addData = require('./add-data');
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
        console.log(req.body.password + '-' + req.session.tokenGenerator);
        const serverHash = jssha(req.body.password + req.session.tokenGenerator);
        if ( serverHash !== clientHash) {
            console.log('client hash:' + clientHash);
            console.log ('server hash:' + serverHash);
            throw 'hash';
          }
        const client = await MongoClient.connect(config.database_url);
        const users = client.db(dbName).collection('users');
        const fres = await users.find({user: {$eq: req.body.user}, password: {$eq: req.body.password}});
        let items = await fres.toArray();
        if (items.length == 1) {
            if (req.session) {
                req.session.name = items[0].user;
                res.json({res: true, name: req.session.name});
            }
            else
                res.json({res: false, text: 'no valid user'});
        }
        else {
            res.json({res: false, text: 'invalid user or password'});
        }
    } catch(e) {
        console.log('catch: ' + e.toString());
        res.json({res: false, text: e.toString()});
    } finally {
        res.end();
    }

});

app.get('/logout', function(req, res, next) {
    if (req.session.name) {
        delete req.session.name;
        res.json({res: true});
    } else {
        res.json({res: true, text: 'no user logged before'})
    }
    res.end();
});

app.get('/user', function(req, res, next){
    if (req.session.name)
        res.json({res: true, name: req.session.name});
    else
        res.json({res: false, text: 'no session name'});
    res.end();
});

app.get('/data', addData.fetchDataHandler());

app.post('/adddata', addData.addDataHandler());

app.listen(3001);
