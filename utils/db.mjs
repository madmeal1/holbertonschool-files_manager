import pkg from 'mongodb';

const { MongoClient } = pkg;

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '27017';
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${DB_HOST}:${DB_PORT}`;

/**
 * DBClient - a small wrapper around the MongoDB client that exposes
 * a connection status check and helpers to count documents in the
 * `users` and `files` collections.
 */
class DBClient {
  constructor() {
    this.connected = false;
    this.client = new MongoClient(url, { useUnifiedTopology: true });

    this.client.connect()
      .then(() => {
        this.db = this.client.db(DB_DATABASE);
        this.connected = true;
      })
      .catch((err) => {
        console.error(`MongoDB client error: ${err}`);
        this.connected = false;
      });
  }

  /**
   * Returns true if the connection to MongoDB is currently alive.
   * @returns {boolean}
   */
  isAlive() {
    return this.connected;
  }

  /**
   * Returns the number of documents in the `users` collection.
   * @returns {Promise<number>}
   */
  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  /**
   * Returns the number of documents in the `files` collection.
   * @returns {Promise<number>}
   */
  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
