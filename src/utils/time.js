/**
 * Lấy thời gian hiện tại theo giờ Việt Nam (UTC+7)
 * @returns {Date} Date object đại diện thời điểm giờ VN
 */
const getVNTime = () => {
    return new Date(
      new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
      })
    );
  };
  const add7Hours = (date = new Date()) => {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000);
  };
  
  
  module.exports = {
    getVNTime,
    add7Hours
  };
  