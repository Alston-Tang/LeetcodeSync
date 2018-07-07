const fs = require('fs');
const request = require('request');
const mongoose = require('mongoose');
const contest = require('./Contest');
const problem = require('./Problem');
const contestList = require('./ContestList')["data"]["allContests"];

const dbAddr = "127.0.0.1";

const getResourceUrl = function (contestId, page) {
    return `https://leetcode.com/contest/api/ranking/${contestId}/?pagination=${page}`;
};

const sleep = async function (time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
};

const getContestPageFromCache = async function (contestId, page) {
    return new Promise((resolve, reject) => {
        fs.readFile(`cache/${contestId}_${page}.json`, (error, data) => {
            let res = null;
            if (error) resolve(null);
            try {
                res = JSON.parse(data);
            } catch (e) {
                resolve(null);
            }
            resolve(res);
        })
    });
};

const writeContestPageToCache = function (contestId, page, data) {
    try {
        fs.writeFileSync(`cache/${contestId}_${page}.json`, JSON.stringify(data));
    } catch (e) {
        console.log(e);
    }
};

const getContestPage = async function (contestId, page) {
    return new Promise(async (resolve, reject) => {
        let res = null;
        res = await getContestPageFromCache(contestId, page);
        if (res) {
            resolve(res);
            return;
        }
        console.log(`Send request to ${getResourceUrl(contestId, page)}`);
        request(getResourceUrl(contestId, page), (error, response, body) => {
            if (error) {
                console.error(`Cannot get content of contest: ${contestId}, page: ${page}`);
                console.error(`Reason: ${error}`);
                reject();
                return;
            }
            if (!response || response.statusCode >= 400) {
                console.error(`Cannot get content of contest: ${contestId}, page: ${page}`);
                console.error(`Reason: ${response}`);
                reject();
                return;
            }
            res = JSON.parse(body);
            writeContestPageToCache(contestId, page, res);
            resolve(res);
        });
    });
};

const forceUpdateContest = async function (contestId) {
    // Get metadata of contest by requiring for the 1st page
    let res = await getContestPage(contestId, 1);
    const userNum = res["user_num"];
    if (isNaN(userNum)) {
        return false;
    }
    // Check rank begins with: 0 or 1?
    let rankOffset = res["total_rank"][0]["rank"] === 0 ? 1 : 0;

    // Construct problem array for contest model
    const curProblems = [];
    res["questions"].forEach((qObj) => {
        curProblems.push(new problem.Problem({name: qObj["title"], id: qObj["question_id"]}));
    });

    // Update contest meta
    contest.Contest.update(
        {contestId: contestId},
        {contestId: contestId, time: res["time"], problems: curProblems, userNum: userNum},
        {upsert: true, overwrite: true},
        (err, contest) => {
            if (err) {
                console.error(err);
                return false;
            }
        }
    );

    // Update user performance
    let baseRank = 0;
    while (true) {
        console.log(`Process contest ${contestId} page ${baseRank / 25 + 1}`);
        for (let i = 0; i < res["total_rank"].length; i++) {
            const curUser = res["total_rank"][i];
            const curSubmission = res["submissions"][i];
            // Construct submission array
            const submissionArr = [];
            for (let problemId in curSubmission) {
                if (!curSubmission.hasOwnProperty(problemId)) continue;
                submissionArr.push({
                        problemId: problemId,
                        time: curSubmission[problemId]["date"],
                        failCount: curSubmission[problemId]["fail_count"]
                    }
                );
            }
            // Update contest user model
            contest.ContestUser.update(
                {rank: baseRank + i + 1, contestId: contestId},
                {
                    user: curUser["username"],
                    dataRegion: curUser["data_region"],
                    contestId: contestId,
                    country: curUser["country_name"],
                    rank: baseRank + i + 1,
                    score: curUser["score"],
                    finishTime: curUser["finish_time"],
                    submissions: submissionArr
                },
                {upsert: true, overwrite: true},
                (err, contestUser) => {
                    if (err) {
                        console.error(err);
                        return false;
                    }
                }
            );
        }

        baseRank += res["total_rank"].length;
        if (baseRank < userNum) {
            let getResult = false;
            let retryCount = 0;
            while (retryCount < 5) {
                await sleep(Math.round(Math.random() * 500));
                try {
                    res = await getContestPage(contestId, baseRank / 25 + 1);
                    getResult = true;
                }
                catch (e) {
                    retryCount++;
                }
                if (getResult) break;
            }
            if (!getResult) {
                // Too many fails. Abort.
                return false;
            }
        }
        else {
            break;
        }
    }
    return true;
};

const updateContest = async function(contestId) {
    let success = await contestConsistentCheck(contestId);
    if (!success) {
        success = await forceUpdateContest(contestId);
    }
    if (!success) {
        console.error(`Cannot update ${contestId}`);
        return false;
    }
    return contestConsistentCheck(contestId);
};

const update = async function() {
    for (let i = 0; i < contestList.length; i++) {
        const curContest = contestList[i];
        // Whether the contest has finished ?
        if (new Date().getTime() / 1000 < curContest["startTime"] + curContest["duration"] + 600) continue;

        const contestId = curContest["titleSlug"];
        console.log(`Update contest ${contestId}`);

        let retryCount = 0;
        while (true) {
            const res = await updateContest(contestId);
            if (!res) {
                console.error(`Cannot update contest ${contestId}`);
                retryCount++;
                if (retryCount >= 5) return false;
                await sleep(2000);
            }
            else {
                break;
            }
        }
    }
    return true;
};


const contestConsistentCheck = async function (contestId) {
    let success = true;
    // Get meta data first
    const curContest = await contest.Contest.findOne({contestId: contestId}).exec();
    if (!curContest) {
        console.error(`Metadata of contest ${contestId} is missing`);
        return false;
    }

    // Check rank consistency
    const curContestUsers = await contest.ContestUser.find({contestId: contestId}).exec();
    // Number of ContestUser should equal to number of users in meta data
    if (curContestUsers.length !== curContest.userNum) {
        console.error(`Length of ContestUsers is ${curContestUsers.length} while Contest.userNum is ${curContest.userNum}`);
        success = false;
    }
    curContestUsers.sort((a, b) => {
        return a.rank - b.rank;
    });
    let curIndex = 0;
    for (let i = 1; i <= curContest.userNum; i++) {
        if (curIndex >= curContestUsers.length || curContestUsers[curIndex].rank !== i) {
            if (curIndex >= curContestUsers.length || curContestUsers[curIndex].rank > i) {
                console.error(`User with rank ${i} is missing`);
                success = false;
            }
            else {
                console.error(`User with rank ${i} is duplicated`);
                success = false;
                i--;
                curIndex++;
            }
        }
        else {
            curIndex++;
        }
    }
    return success;
};


const main = async function() {
    await mongoose.connect(`mongodb://${dbAddr}/leetcodeContest`);
    const res = await update();
    mongoose.connection.close();
    return res;
};

main().then((res) => {
    console.log("Finish");
});

