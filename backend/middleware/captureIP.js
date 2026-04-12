// ADDED: captureIP middleware - sets req.clientIP safely
module.exports = function captureIP(req, res, next) {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket && req.socket.remoteAddress) || req.ip;
    req.clientIP = ip;
  } catch (err) {
    // don't break request flow
    req.clientIP = req.ip || null;
  }
  next();
};
