import "reflect-metadata";
import { IDatabase, IEndpoint } from "../interfaces";
import { injectable } from "inversify";
import { SessionEndpoint } from "./session";
import { WorkerInfo } from "../model/worker_info";
import { WorkspaceInfo } from "../model/workspace_info";
import { SessionInfo } from "../model/session_info";
import { JobInfo } from "../model/job_info";

@injectable()
class DatabaseMock implements IDatabase {
  public spyObj: jasmine.Spy;

  constructor() {
  }

  connect(url: string): Promise<any> {
    throw new Error("Method not implemented.");
  }  
  getApiKey(apiKey: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
  getWorkspace(workspaceGuid: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
  getSession(sessionGuid: string): Promise<SessionInfo> {
    throw new Error("Method not implemented.");
  }
  storeWorker(workerInfo: WorkerInfo): Promise<WorkerInfo> {
    throw new Error("Method not implemented.");
  }
  getWorker(sessionGuid: string): Promise<WorkerInfo> {
    throw new Error("Method not implemented.");
  }
  startWorkerSession(apiKey: string, sessionGuid: string): Promise<WorkerInfo> {
    throw new Error("Method not implemented.");
  }
  assignSessionWorkspace(sessionGuid: string, workspaceGuid: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  getSessionWorkspace(sessionGuid: string): Promise<WorkspaceInfo> {
    throw new Error("Method not implemented.");
  }
  expireSessions(): Promise<SessionInfo[]> {
    throw new Error("Method not implemented.");
  }
  closeSession(sessionGuid: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  storeJob(jobInfo: JobInfo): Promise<JobInfo> {
    throw new Error("Method not implemented.");
  }
  getJob(jobGuid: string): Promise<JobInfo> {
    throw new Error("Method not implemented.");
  }
  getSessionActiveJobs(sessionGuid: string): Promise<JobInfo[]> {
    throw new Error("Method not implemented.");
  }
}

class ExpressMock {
  public gets: any[] = [];
  public posts: any[] = [];
  public puts: any[] = [];
  public deletes: any[] = [];

  public get(path: string, handler: (req, res) => void): void {
    this.gets.push({ 
      path: path, 
      handler: handler 
    });
  }

  public post(path: string, handler: (req, res) => void): void {
    this.posts.push({ 
      path: path, 
      handler: handler 
    });
  }

  public put(path: string, handler: (req, res) => void): void {
    this.puts.push({ 
      path: path, 
      handler: handler 
    });
  }

  public delete(path: string, handler: (req, res) => void): void {
    this.deletes.push({ 
      path: path, 
      handler: handler 
    });
  }
}

describe("SessionEndpoint", function() {
  var session: IEndpoint;
  var expressMock: ExpressMock;

  beforeEach(function() {
    session = new SessionEndpoint(new DatabaseMock(), null);
    expressMock = new ExpressMock();
  });

  it("should be able to play a Song", function() {
    session.bind(expressMock);
    expect(expressMock.gets.length).toBe(0);
    expect(expressMock.posts.length).toBe(1);
    expect(expressMock.puts.length).toBe(0);
    expect(expressMock.deletes.length).toBe(1);

    /* let res = jasmine.createSpyObj("response", ["isValid"]);
    console.log(res);
    let promise = session.checkApiKey(res, "someApiKey");

    promise
      .then(function(value){

      })
      .catch(function(err){

      }); */

    //player.play(song);
    //expect(player.currentlyPlayingSong).toEqual(song);

    //demonstrates use of custom matcher
    //expect(player).toBePlaying(song);
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
