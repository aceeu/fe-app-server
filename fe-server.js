let express = require('express');
let session = require('express-session');
let MongoClient = require('mongodb').MongoClient;
let config = require('./config');

const dbName = config.users_collection_name;
let app = express();

app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 * 60 }}));

const options = {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['htm', 'html', 'css', 'js'],
    redirect: false,
    setHeaders: function (res, path, stat) {
      res.set('Cache-Control', 'max-age=0, no-cache, no-store')
    }
  }
app.use(express.static(config.public_folder, options));

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/json');
    res.setHeader('Cache-Control', 'max-age=0, no-cache, no-store');
    next();
})

app.use((req, res, next) => {
    console.log('url=' + req.originalUrl)
    next();
});



async function getCollection() {
    let client = await MongoClient.connect(config.database_url);
    return client.db(dbName).collection('users');
}

app.get('/auth/:nameU/pass/:passW', async function(req, res, next) {
    try {
        const col = await getCollection();   
        const fres = await col.find({user: {$eq: req.params.nameU}, password: {$eq: req.params.passW}});
        let items = [];
        items = await fres.toArray();
        if (items.length == 1) {
            if (req.session) {
                req.session.name = req.params.nameU;
                res.json({res: true, name: req.session.name});
            }
            else 
                res.json({res: false, text: 'no session started'});
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
        res.json({res: false, text: 'no user logged before'})
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

app.get('/data', async function(req, res, next) {
    if (req.session.name && req.session.name.length > 0) {
        const col = getCollection();
        const findRes = await col.find();
        res.json(findRes);
    } else {
        res.json({});
    }
    res.end();
});

app.listen(3001);
