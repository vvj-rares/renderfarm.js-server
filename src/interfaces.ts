import { MongoClient } from "mongodb";

export interface Warrior {
    fight(): string;
    sneak(): string;
}

export interface Weapon {
    hit(): string;
}

export interface ThrowableWeapon {
    throw(): string;
}

export interface IDatabase {
    getApiKey(arg0: string): any;
    connect(url: string, onSuccess: Function, onError: Function): void;
}