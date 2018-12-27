import "reflect-metadata";
import axios from "axios";

const apiEndpoint = "mel.mbnsay.com";
const baseUrl = `https://${apiEndpoint}`;
const majorVersion = 1;

describe(`Endpoint ${baseUrl}`, function() {

    beforeEach(function() {});

    it("should return own version on simple GET request", async function() {
        let res: any = await axios.get(baseUrl);
        expect(res).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
        expect(res.headers['access-control-allow-methods']).toBe('PUT, POST, GET, DELETE, OPTIONS');

        expect(res.data).toBeTruthy();
        expect(res.data.version).toBe("1.0.2");
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
});