const cors = require('cors');

const corsOptions = {
  origin: [
    'http://localhost:3000', // Your React app
    'http://localhost:5000'  // Your Express server
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);