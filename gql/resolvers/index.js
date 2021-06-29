const postResolvers = require('./posts');
const userResolvers = require('./users');
const commentsResolvers = require('./comments');
const profileResolvers = require('./profile');

module.exports = {
    Query: {
        ...userResolvers.Query,
        ...postResolvers.Query,
        ...profileResolvers.Query,
    },
    Mutation: {
        ...userResolvers.Mutation,
        ...postResolvers.Mutation,
        ...commentsResolvers.Mutation,
        ...profileResolvers.Mutation,
    }
};