const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connecté - Analytics');
  } catch (err) {
    console.log('MongoDB local non trouvé, démarrage instance en mémoire...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log(`MongoDB local démarré sur ${uri}`);
  }
};

module.exports = connectDB;
