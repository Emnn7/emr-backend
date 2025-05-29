const crypto = require('crypto');
const bcrypt = require('bcryptjs');

exports.hashData = async (data, saltRounds = 12) => {
  return await bcrypt.hash(data, saltRounds);
};

exports.compareHashedData = async (data, hashedData) => {
  return await bcrypt.compare(data, hashedData);
};

exports.createRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

exports.createHmac = (data, secret) => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

exports.encryptData = (data, key, iv) => {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

exports.decryptData = (encryptedData, key, iv) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};