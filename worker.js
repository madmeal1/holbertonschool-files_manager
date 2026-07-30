// worker.js
import Bull from 'bull';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) {
    throw new Error('File not found');
  }

  const widths = [500, 250, 100];

  await Promise.all(widths.map(async (width) => {
    const thumbnail = await imageThumbnail(file.localPath, { width });
    const thumbnailPath = `${file.localPath}_${width}`;
    fs.writeFileSync(thumbnailPath, thumbnail);
  }));
});

export default fileQueue;
