import { createClient } from 'redis';
import { promisify } from 'util';

/**
 * RedisClient - a small wrapper around the `redis` client that exposes
 * convenient async get/set/del helpers and a connection status check.
 */
class RedisClient {
  constructor() {
    this.client = createClient();
    this.connected = true;

    // Any client error must be logged to the console (per spec).
    this.client.on('error', (err) => {
      console.error(`Redis client error: ${err}`);
      this.connected = false;
    });

    this.client.on('connect', () => {
      this.connected = true;
    });

    // Promisify the callback-based redis client methods we need.
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setexAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  /**
   * Returns true if the connection to Redis is currently alive.
   * @returns {boolean}
   */
  isAlive() {
    return this.connected;
  }

  /**
   * Retrieves the value stored under `key`.
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    return this.getAsync(key);
  }

  /**
   * Stores `value` under `key` with an expiration of `duration` seconds.
   * @param {string} key
   * @param {string|number} value
   * @param {number} duration - expiration time in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, duration) {
    return this.setexAsync(key, duration, value);
  }

  /**
   * Removes the value stored under `key`.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async del(key) {
    return this.delAsync(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
