const mongoose = require('mongoose');
const problem = require('./Problem');
const graphql = require('graphql');

// Submission Mongoose model
const SubmissionSchema = new mongoose.Schema({
    problemId: Number,
    time: Number,
    failCount: Number
});
const Submission = mongoose.model('Submission', SubmissionSchema);

// Submission GraphQL model
const SubmissionQLType = new graphql.GraphQLObjectType({
    name: 'Submission',
    fields: {
        problemId: { type: graphql.GraphQLInt },
        time: { type: graphql.GraphQLInt },
        failCount: { type: graphql.GraphQLInt }
    }
});

// Contest Mongoose model
const ContestSchema = new mongoose.Schema({
    contestId: String,
    time: Number,
    problems: [problem.ProblemSchema],
    userNum: Number
});
ContestSchema.index({contestId: 1});
const Contest = mongoose.model('Contest', ContestSchema);

//Contest GraphQL model

const ContestQLType = new graphql.GraphQLObjectType({
    name: 'Contest',
    fields: {
        contestId: { type: graphql.GraphQLString },
        time: { type: graphql.GraphQLFloat },
        problems: { type: new graphql.GraphQLList(problem.ProblemQLType) }
    }
});

//ContestUser Mongoose model

const ContestUserSchema = new mongoose.Schema({
    user: String,
    dataRegion: String,
    contestId: String,
    country: String,
    rank: Number,
    score: Number,
    finishTime: Number,
    submissions: [SubmissionSchema]
});
ContestUserSchema.virtual('contest', {
    ref: 'Contest',
    localField: 'contestId',
    foreignField: 'contestId',
    justOne: true
});
ContestUserSchema.index({user: 1});
ContestUserSchema.index({contestId: 1});
const ContestUser = mongoose.model('ContestUser', ContestUserSchema);

//ContestUser GraphQL model

const ContestUserQLType = new graphql.GraphQLObjectType({
    name: 'ContestUser',
    fields: {
        user: { type: graphql.GraphQLString },
        dataRegion: { type: graphql.GraphQLString },
        contestId: { type: graphql.GraphQLString },
        country: { type: graphql.GraphQLString },
        rank: { type: graphql.GraphQLInt },
        score: { type: graphql.GraphQLInt },
        finishTime: { type: graphql.GraphQLInt },
        submissions: { type: new graphql.GraphQLList(SubmissionQLType) },
        contest: {type: ContestQLType }
    }
});


module.exports = {
    SubmissionSchema: SubmissionSchema,
    Submission: Submission,
    SubmissionQLType: SubmissionQLType,
    ContestUserSchema: ContestUserSchema,
    ContestUser: ContestUser,
    ContestUserQLType: ContestUserQLType,
    ContestSchema: ContestSchema,
    Contest: Contest,
    ContestQLType: ContestQLType
};