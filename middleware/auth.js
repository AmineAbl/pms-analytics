const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Token manquant',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      sub: decoded.sub,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Token invalide ou expiré',
    });
  }
};

module.exports = auth;
