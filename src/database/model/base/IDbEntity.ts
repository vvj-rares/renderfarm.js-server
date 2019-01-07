export abstract class IDbEntity {
    public abstract parse(obj: any): void;
    public abstract toJSON(): any;
}