const admin = require("../config/firebase");

const sendToTokens = async (tokens = [], title, body, data = {}) => {
  if (!tokens.length) return null;

  // data bắt buộc string
  const safeData = {};
  Object.keys(data).forEach((k) => (safeData[k] = String(data[k])));

  const message = {
    tokens,
    notification: { title, body },
    data: safeData,
  };

  return admin.messaging().sendEachForMulticast(message);
};

module.exports = { sendToTokens };
