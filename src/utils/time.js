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
  const formatVNTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
  
    return d.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  
  
  module.exports = {
    getVNTime,
    add7Hours,
    formatVNTime
  };
  