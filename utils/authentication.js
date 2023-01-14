const { AuthenticationError } = require('apollo-server');
const jwt = require('jsonwebtoken');

const JWT_KEY = process.env.JWT_KEY;

const verifyTokenFromHeader = (context) => {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
        throw new Error('Authorization header must be provided');
    }

    const token = authHeader.slice(7);
    if (!token) {
        throw new Error("Authentication token must be 'Bearer [token]");
    }

    try {
        const user = jwt.verify(token, JWT_KEY);
        return user;
    } catch (e) {
        throw new AuthenticationError("Invalid/Expired Token");
    }
}

module.exports = { verifyTokenFromHeader }
