const graphql = require('graphql');
const contest = require('./Contest');

const QueryQL = new graphql.GraphQLObjectType({
    name: 'Query',
    fields: {
        contestUsers: {
            type: new graphql.GraphQLList(contest.ContestUserQLType),
            args: {
                user: { type: graphql.GraphQLString },
                dataRegion: { type: graphql.GraphQLString },
                contestId: { type: graphql.GraphQLString }
            }
        },
        contest: {
            type: contest.ContestQLType,
            args: {
                contestId: { type: graphql.GraphQLString }
            }
        }
    }
});

module.exports = {
    QueryQL: QueryQL
};