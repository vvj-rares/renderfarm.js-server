const uuidv4 = require('uuid/v4');

class Project {
    constructor(api_key) {
        this.created_at = (new Date()).toISOString();
        this.guid = uuidv4(); // => '45745c60-7b1a-11e8-9c9c-2d42b21b1a3e'
        this.api_key = api_key;
    }
}

module.exports = Project;