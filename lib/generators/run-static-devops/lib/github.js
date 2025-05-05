const axios = require('axios');

class GitHubManager {
    constructor(username, accessToken) {
        this.username = username;
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.github.com';
    }

    async checkRepositoryExists(repoName) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/repos/${this.username}/${repoName}`,
                {
                    headers: {
                        Authorization: `token ${this.accessToken}`,
                        Accept: 'application/vnd.github+json'
                    }
                }
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    generateRepositoryNames(appName) {
        const components = ['frontend', 'backend', 'devops', 'nginx', 'actions'];
        return components.map(component => `${appName}-${component}`);
    }
}

module.exports = GitHubManager; 