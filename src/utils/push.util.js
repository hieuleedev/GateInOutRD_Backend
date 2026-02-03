const admin = require("../config/firebase");
const { FcmToken } = require("../models");

const pushToUser = async (userId, { title, body, data = {} }) => {
    console.log("userId",userId)
  if (!userId) return null;

  const rows = await FcmToken.findAll({
    where: { user_id: userId },
    attributes: ["token"],
  });

  const tokens = rows.map((r) => r.token).filter(Boolean);
  if (!tokens.length) return null;

  // data phải là string
  const safeData = {};
  Object.keys(data || {}).forEach((k) => {
    safeData[k] = String(data[k]);
  });

  const message = {
    tokens,
    notification: { title, body },
    data: safeData,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // optional: xoá token chết
  const invalidTokens = [];
  response.responses.forEach((r, idx) => {
    if (!r.success) {
      const code = r.error?.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        invalidTokens.push(tokens[idx]);
      }
    }
  });

  if (invalidTokens.length) {
    await FcmToken.destroy({ where: { token: invalidTokens } });
  }

  return response;
};

module.exports = { pushToUser };
