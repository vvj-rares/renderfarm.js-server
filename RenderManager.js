var Project = require('./Project');

class RenderManager {
    constructor() {
        this._projects = []; // load from db
    }

    getStatus() {
        return {
            version: "1.0.0.0"
        }
    }

    getProjects() {
        return this._projects;
    }
    
    createProject(api_key) {
        let p = new Project(api_key);
        this._projects.push(p);
        return p;
    }
}

module.exports = RenderManager;