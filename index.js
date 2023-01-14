const { ApolloServer } = require('apollo-server')
const mongoose = require('mongoose');
require('dotenv').config();

const typeDefs = require('./gql/typeDefs')
const resolvers = require('./gql/resolvers')

const uri = process.env.DATABASE_URI;

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req })
});

mongoose.connect(uri, { useNewUrlParser: true })
    .then(() => {
        console.log('OK');
        return server.listen({ port: process.env.PORT || 3001 })
    })
    .then(res => {
        console.log(`Server running at ${res.url}`)
    })
    .catch(err => {
        console.error(err)
    })
