const { ApolloServer } = require('apollo-server')
const mongoose = require('mongoose');
require('dotenv').config();

const typeDefs = require('./gql/typeDefs')
const resolvers = require('./gql/resolvers')

const uri = process.env.DATABASE_URI;

// host independently configures port in deployment environment
const PORT = process.env.port || 5000;

// GraphQL Schema, Resolvers, Middleware
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req })
});

// connect to DB + jumpstart server
mongoose.connect(uri, { useNewUrlParser: true })
    .then(() => {
        console.log('OK');
        return server.listen({ port: PORT })
    })
    .then(res => {
        console.log(`Server running at ${res.url}`)
    })
    .catch(err => {
        console.error(err)
    })



