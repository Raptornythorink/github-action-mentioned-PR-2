const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

const main = async () => {
    try{
        const token = core.getInput('github-token', {required: true})
        const upstreamToken = core.getInput('upstream-github-token', {required: true})
        const upstreamRepository = core.getInput('upstream-repository', {required: true})

        const [owner, repo] = upstreamRepository.split('/');

        const body = github.context.payload.pull_request.body;

        const octokit = new Octokit({ auth: token})
        const upstreamOctokit = new Octokit({ auth: upstreamToken })

        const regex = new RegExp(`- \\[ \\] ${upstreamRepository}#(\\d+) is merged`);

        var lines = body.split("\n");
        var outputBody = ""

        for (var i=0; i < lines.length; i++) { //checking every line of the body
            var result = lines[i].match(regex);
            if (result) { // line matches the pattern "- [ ] owner/repo#number is merged"
                var pull_number = result[1]
                try {
                    const response = await upstreamOctokit.rest.pulls.checkIfMerged({
                        owner, repo, pull_number,
                    });
                    if (response.status === 204) {
                        console.log(result[1] + " has been merged")
                        outputBody += "- [x] " + upstreamRepository + "#" + result[1] + " is merged\n" // ticking the box
                    } else {
                        console.log(result[1] + " has not been merged")
                        outputBody += lines[i] + "\n"
                    }
                } catch (error) {
                    outputBody += lines[i] + "\n"
                }
            } else {
                outputBody += lines[i] + "\n";
            }
        }

        outputBody = outputBody.replace(/\n+$/, ""); // removing the last "\n"
        
        if (outputBody !== body) { // updating the body of the PR if necessary
            octokit.rest.pulls.update({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                pull_number: github.context.payload.pull_request.number,
                body: outputBody,
            })
                .then(() => console.log("Succesfully updated"))
        } else {
            console.log("Nothing to update")
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

main();
