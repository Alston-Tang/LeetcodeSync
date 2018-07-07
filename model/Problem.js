const mongoose = require('mongoose');
const graphql = require('graphql');

const ProblemSchema = new mongoose.Schema({
    name: String,
    id: Number
});

const ProblemQLType = new graphql.GraphQLObjectType({
    name: "Problem",
    fields: {
        name: { type: graphql.GraphQLString },
        id: { type: graphql.GraphQLInt }
    }
});

const Problem = mongoose.model('Problem', ProblemSchema);

module.exports = {
    ProblemSchema: ProblemSchema,
    Problem: Problem,
    ProblemQLType: ProblemQLType
};