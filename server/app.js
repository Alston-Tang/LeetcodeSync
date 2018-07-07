const express = require('express');
const mongoose = require('mongoose');
const graphqlHTTP = require('express-graphql');
const graphql = require('graphql');
const queryQL = require('../model/QueryQL');
const contest = require('../model/Contest');

const app = express();
const schema = new graphql.GraphQLSchema({query: queryQL.QueryQL});

const dbAddr = "127.0.0.1";

mongoose.connect(`mongodb://${dbAddr}/leetcodeContest`);

const getContestUsers = async function (restrictions) {
    return await contest.ContestUser.find(restrictions).populate('contest').exec();
};

const getContest = async function(contestId) {
    return await contest.Contest.findOne({contestId: contestId});
};

const resolve = {
    contestUsers: async (restrictions) => {
        return await getContestUsers(restrictions);
    },
    contest: async ({contestId}) => {
        return await getContest(contestId);
    }
};

app.use('/graphql', graphqlHTTP({
    schema: schema,
    graphiql: true,
    rootValue: resolve
}));

app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');