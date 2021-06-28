import { Events, EventInformation } from './index';
export declare type EventCallback = Function;
export declare type EventCallbackSpread = (v?: any | any[], key?: number, iter?: IIteration) => any | Boolean;
export declare type ReturnAsyncEmitResult = Promise<Promise<any> | Function>;
export declare type IterRowWithCallback = {
    cb: EventCallback;
    [index: string]: any;
};
export declare type IterRow = IterRowWithCallback | Array<any> | Number;
export declare type EventNamesWithCallbacks = {
    [index: string]: Function;
};
export declare type EventName = string;
export declare type EventNames = Array<string>;
export declare type EventObject = {
    [key: string]: EventInformation;
};
export declare type EventsObjects = {
    [key: string]: EventObject;
};
export declare type EventId = string;
export declare type EventIds = Array<EventId>;
export declare type AffectedEventIds = {
    [key: string]: EventIds | false;
};
export declare type MapList = Array<String> | false;
export declare type EventMapObject = {
    list: MapList;
    target: Events;
};
export declare type MiddlewareArray = Array<Function>;
export interface Config {
    preCall?: Function;
    ignore?: boolean;
    fromMapper?: boolean;
    dontExit?: boolean;
    context?: object;
}
export interface IIteration {
    'break': Function;
    accKeyName: string | number;
    key: Function;
}
