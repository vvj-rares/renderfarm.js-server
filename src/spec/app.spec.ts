import "reflect-metadata";
import axios from "axios";

const apiEndpoint = "mel.mbnsay.com";
const baseUrl = `https://${apiEndpoint}`;
const majorVersion = 1;
const apiKey = "75f5-4d53-b0f4";
const workspaceGuid = "55a0bd33-9f15-4bc0-a482-17899eb67af3";

xdescribe(`Endpoint ${baseUrl}`, function() {
    /*
    var checkResponse = function(res) {
        expect(res).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
        expect(res.headers['access-control-allow-methods']).toBe('PUT, POST, GET, DELETE, OPTIONS');
    };

    beforeEach(function() {
        axios.defaults.baseURL = baseUrl;
        axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    });

    it("should return own version on simple GET request", async function() {
        let res: any = await axios.get(baseUrl);
        checkResponse(res);
        expect(res.data).toBeTruthy();
        expect(res.data.version).toBe("1.0.2");
    });

    it("should return session guid on session POST request", async function() {
        let res1: any = await axios.post(`/v${majorVersion}/session`, {
                api_key: apiKey,
                workspace: workspaceGuid
            });
        checkResponse(res1);

        expect(res1.data).toBeTruthy();
        expect(res1.data.guid).toMatch("\\w{8}-\\w{4}-\\w{4}-\\w{4}-\\w{12}");

        //todo: close session
        // let res2: any = await axios.delete(`/v${majorVersion}/session/${res1.data.id}`);
        // checkResponse(res2);
        // console.log(res2.data);
    });

    describe("when song has been paused", function() {
        beforeEach(function() {
            //todo: define it
        });

        it("should indicate that the song is currently paused", function() {
            //expect(player.isPlaying).toBeFalsy();

            // demonstrates use of 'not' with a custom matcher
            //expect(player).not.toBePlaying(song);
        });

        it("should be possible to resume", function() {
            //player.resume();
            //expect(player.isPlaying).toBeTruthy();
            //expect(player.currentlyPlayingSong).toEqual(song);
        });
    });

    // demonstrates use of spies to intercept and test method calls
    it("tells the current song if the user has made it a favorite", function() {
        //spyOn(song, 'persistFavoriteStatus');

        //player.play(song);
        //player.makeFavorite();

        //expect(song.persistFavoriteStatus).toHaveBeenCalledWith(true);
    });

    //demonstrates use of expected exceptions
    describe("#resume", function() {
        it("should throw an exception if song is already playing", function() {
            //player.play(song);

            //expect(function() {
            //  player.resume();
            //}).toThrowError("song is already playing");
        });
    });
    */
});