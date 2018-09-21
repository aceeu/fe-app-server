let dbAuth = require('./dbpasswd');
exports.database_url = `mongodb+srv://${dbAuth.user}:${dbAuth.pwd}@cluster0-fg6zf.mongodb.net/test?retryWrites=true`;
exports.db_name = 'fe';
exports.public_folder = '../fe-app/build';
