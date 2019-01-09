export abstract class IDbEntity {
    //parse any object into given IDbEntity implementation
    public abstract parse(obj: any): void;

    //convert instance of IDbEntity into database json object
    public abstract toJSON(): any;

    //get unique object to filter in database
    public abstract filter: any;
}