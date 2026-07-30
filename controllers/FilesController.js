import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const VALID_TYPES = ['folder', 'file', 'image'];

async function getUserFromToken(req) {
  const token = req.header('X-Token');
  if (!token) return null;

  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (!userId) return null;

  const usersCollection = dbClient.db.collection('users');
  const user = await usersCollection.findOne({ _id: ObjectId(userId) });
  return user;
}

function formatFile(file) {
  return {
    id: file._id,
    userId: file.userId,
    name: file.name,
    type: file.type,
    isPublic: file.isPublic,
    parentId: file.parentId,
  };
}

class FilesController {
  static async postUpload(req, res) {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = user._id.toString();

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    const filesCollection = dbClient.db.collection('files');

    if (parentId !== 0 && parentId !== '0') {
      const parentFile = await filesCollection.findOne({ _id: ObjectId(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      const newFile = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 || parentId === '0' ? 0 : ObjectId(parentId),
      };

      const result = await filesCollection.insertOne(newFile);

      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId: newFile.parentId,
      });
    }

    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    const localFilename = uuidv4();
    const localPath = path.join(FOLDER_PATH, localFilename);

    const fileBuffer = Buffer.from(data, 'base64');
    fs.writeFileSync(localPath, fileBuffer);

    const newFile = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 || parentId === '0' ? 0 : ObjectId(parentId),
      localPath,
    };

    const result = await filesCollection.insertOne(newFile);

    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId: newFile.parentId,
    });
  }

  static async getShow(req, res) {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    let file;
    try {
      const filesCollection = dbClient.db.collection('files');
      file = await filesCollection.findOne({
        _id: ObjectId(id),
        userId: user._id,
      });
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(formatFile(file));
  }

  static async getIndex(req, res) {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = 0, page = 0 } = req.query;
    const pageNum = parseInt(page, 10) || 0;

    const matchParentId = parentId === '0' || parentId === 0
      ? 0
      : ObjectId(parentId);

    const filesCollection = dbClient.db.collection('files');

    const files = await filesCollection.aggregate([
      { $match: { userId: user._id, parentId: matchParentId } },
      { $skip: pageNum * 20 },
      { $limit: 20 },
    ]).toArray();

    return res.status(200).json(files.map(formatFile));
  }
}

export default FilesController;
