class ProjectEndpoint {
    constructor(app) {
        app.get('/project', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`GET on /project with api_key: ${api_key}`);

            res.send(JSON.stringify({}, null, 2));
        });

        app.get('/project/:uid', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`GET on /project/${req.params.uid} with api_key: ${api_key}`);
        
            res.send(JSON.stringify({}, null, 2));
        });
        
        app.post('/project', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`POST on /project with api_key: ${api_key}`);

            res.send(JSON.stringify({}, null, 2));
        });

        app.put('/project/:uid', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`PUT on /project/${req.params.uid} with api_key: ${api_key}`);
        
            res.send(JSON.stringify({}, null, 2));
        });

        app.delete('/project/:uid', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`DELETE on /project/${req.params.uid} with api_key: ${api_key}`);
        
            res.send(JSON.stringify({}, null, 2));
        });
    }
}

module.exports = ProjectEndpoint;