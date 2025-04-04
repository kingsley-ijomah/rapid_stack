const axios = require('axios');

class GitHubManager {
    constructor(username, accessToken) {
        this.username = username;
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.github.com';
    }

    async createRepository(repoName, isPublic = false) {
        try {
            // Check if repository exists
            const exists = await this.checkRepositoryExists(repoName);
            if (exists) {
                console.log(`Repository '${repoName}' already exists.`);
                return true;
            }

            // Create repository
            const response = await axios.post(
                `${this.baseUrl}/user/repos`,
                {
                    name: repoName,
                    private: !isPublic
                },
                {
                    headers: {
                        Authorization: `token ${this.accessToken}`,
                        Accept: 'application/vnd.github+json'
                    }
                }
            );

            console.log(`Repository '${repoName}' created successfully.`);
            return true;
        } catch (error) {
            console.error(`Failed to create repository '${repoName}':`, error.response?.data || error.message);
            return false;
        }
    }

    async deleteRepository(repoName) {
        try {
            const response = await axios.delete(
                `${this.baseUrl}/repos/${this.username}/${repoName}`,
                {
                    headers: {
                        Authorization: `token ${this.accessToken}`,
                        Accept: 'application/vnd.github+json'
                    }
                }
            );

            console.log(`Repository '${repoName}' deleted successfully.`);
            return true;
        } catch (error) {
            console.error(`Failed to delete repository '${repoName}':`, error.response?.data || error.message);
            return false;
        }
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