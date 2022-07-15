const child_process = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const os = require('os')

const config = require('../module.json');

async function installModule(moduleName, moduleConfig, destinationDirectory) {
    const ref = moduleConfig.branch || "master"
    const isHash = !!ref.match(/^[0-9A-Fa-f]{40}$/);
    const modulePath = path.join(moduleName.owner, moduleName.name);

    if (isHash) {
        if (await checkIfModuleExistsLocally(modulePath)) {
            if (!await checkIfCommitExistsLocally(modulePath, ref)) {
                await fetchCommit(modulePath, ref);
            }
            await checkoutBranch(modulePath, ref)
        } else {
            await fetchModuleAtCommit(modulePath, moduleConfig.repository, ref);
        }
    } else {
        if (await checkIfModuleExistsLocally(modulePath)) {
            if (await checkIfRefExistsLocally(modulePath, ref)) {
                await checkoutBranch(modulePath, ref)
            } else if (await checkIfRefExistsRemotely(modulePath)) {
                await pullRemoteBranch(modulePath, moduleConfig.branch)
                await checkoutBranch(modulePath, ref)
            } else {
                // TODO: ref doesn't exist, throw an error
            }
        } else {
            await fetchModule(modulePath, moduleConfig.repository, ref)
        }
    }

    await copyModuleToProject(moduleName, moduleConfig, destinationDirectory);
}

function moduleCacheDirectory(moduleName) {
    return path.join(os.homedir(), '.rell', 'modules', moduleName);
}

function checkIfDirectoryExists(directoryName) {
    return fs.existsSync(directoryName)
}

function checkIfModuleExistsLocally(moduleName) {
    return checkIfDirectoryExists(moduleCacheDirectory(moduleName))
}

async function fetchModule(moduleName, repository, branch) {
    const { stdout, stderr } = await exec(`git clone --depth=1 --branch=${
        branch} ${repository
    } ${moduleCacheDirectory(moduleName)}`)
}

async function fetchModuleAtCommit(moduleName, repository, commit) {
    await exec(`git clone ${repository} ${moduleCacheDirectory(moduleName)}`);
    await exec(`git -C ${moduleCacheDirectory(moduleName)} reset --hard ${commit}`);
}

async function checkIfRefExistsLocally(moduleName, refName) {
    const refs = await fetchLocalRefs(moduleName);
    return refs.some(({ type, name }) => (name === refName))
}

async function fetchLocalRefs(moduleName) {
    const { stdout } = await exec(`git -C ${moduleCacheDirectory(moduleName)} show-ref`)

    return stdout
        .split('\n')
        .filter(Boolean)
        .map(ref => ref.split(' '))
        .map(([hash, ref]) => {
            if (ref === 'HEAD') {
                return {
                    type: 'HEAD',
                    hash
                };
            }

            const match = /refs\/(\w+)\/(.+)/.exec(ref);
            if (!match) {
                throw new Error('Error parsing refs');
            }

            return {
                type:
                    match[1] === 'heads'
                        ? 'branch'
                        : match[1] === 'refs'
                            ? 'ref'
                            : match[1],
                name: match[2],
                hash
            };
        });
}

async function checkIfRefExistsRemotely(moduleName, refName) {
    const refs = await fetchRemoteRefs(moduleName)
    return refs.some(({ type, name }) => (name === refName))
}

async function fetchRemoteRefs(moduleName) {
    const { stdout } = await exec(`git -C ${moduleCacheDirectory(moduleName)} ls-remote`)
    
    return stdout
        .split('\n')
        .filter(Boolean)
        .map(ref => ref.split('\t'))
        .map(([hash, ref]) => {
            if (ref === 'HEAD') {
                return {
                    type: 'HEAD',
                    hash
                };
            }

            const match = /refs\/(\w+)\/(.+)/.exec(ref);
            if (!match) {
                throw new Error('Error parsign refs');
            }

            return {
                type:
                    match[1] === 'heads'
                        ? 'branch'
                        : match[1] === 'refs'
                            ? 'ref'
                            : match[1],
                name: match[2],
                hash
            };
        });
}

async function checkIfCommitExistsLocally(moduleName, hash) {
    try {
        await exec(`git  -C ${moduleCacheDirectory(moduleName)} cat-file commit ${hash} > /dev/null`)
        return true;
    } catch (error) {
        if (error.message.includes("bad file")) {
            return false;
        }
        
        throw error;
    }
}

async function fetchCommit(moduleName, hash) {
    await exec(`git  -C ${moduleCacheDirectory(moduleName)} fetch --depth=1 origin ${hash}`)
}

async function pullRemoteBranch(moduleName, branchName) {
    await exec(`git  -C ${moduleCacheDirectory(moduleName)} pull --depth=1 origin ${branchName}`)
}

async function checkoutBranch(moduleName, branchName) {
    await exec(`git  -C ${moduleCacheDirectory(moduleName)} checkout ${branchName}`)
}

async function copyModuleToProject(moduleName, moduleConfig, modulesDirectory) {
    const directory = modulesDirectory || "rell/src/rell_modules/"
    const modulePath = path.join(moduleName.owner, moduleName.name);
    const sourcePath = path.join(moduleCacheDirectory(modulePath), moduleConfig.subdirectory || '')
    const shouldCreateDirectory = moduleConfig.createDirectory !== undefined ? moduleConfig.createDirectory : true;
    const destinationPath = shouldCreateDirectory ? path.join(directory, moduleName.name) : directory;

    if (await fs.pathExists(sourcePath) === false) {
        console.log(sourcePath)
        console.log(`Directory doesn't exist`)

        return
    }

    if (await fs.pathExists(destinationPath)) {
        fs.ensureDir(destinationPath)
    } else {
        //delete content
    }

    await fs.copy(sourcePath, destinationPath)
}

async function installModules(config) {
    const destinationDirectory = config.directory || "rell/src/rell_modules/"

    for (const dependency of Object.keys(config.dependencies)) {
        const moduleName = getModuleNameFromRepositoryURL(config.dependencies[dependency].repository);
        await installModule(moduleName, config.dependencies[dependency], destinationDirectory);
    }
}

function getModuleNameFromRepositoryURL(url) {
    if (!url) throw new Error("Missing dependency repository url");
    
    const match = url.match(/.*(:|\/)(?<owner>[\w.-]+)\/(?<name>[\w.-]+)\.git/);

    if (!match || !match["groups"].name) throw new Error("Invalid repository url");

    return {
        name: match["groups"].name,
        owner: match["groups"].owner
    };
}

function exec(command) {
	return new Promise((resolve, reject) => {
		child_process.exec(command, (err, stdout, stderr) => {
			if (err) {
				reject(err);
				return;
			}

			resolve({ stdout, stderr });
		});
    });
}

(async () => {
    await installModules(config);
})()
