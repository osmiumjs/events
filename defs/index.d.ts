import { AffectedEventIds, Config, EventCallback, EventCallbackSpread, EventId, EventIds, EventName, EventNames, EventNamesWithCallbacks, MapList, ReturnAsyncEmitResult } from './types';
export declare class EventInformation {
    cb: Function;
    time: number;
    constructor(cb: Function, time: number);
}
export declare class Events {
    private eventIdPrefix;
    private eventsList;
    private eventMappers;
    private eventMappersAfter;
    private middlewares;
    private middlewaresAfter;
    private readonly defaultChain;
    private readonly UNDEFINED;
    constructor(defaultChain?: boolean);
    private getUID;
    /** Clear event's list */
    clear(): void;
    /** Reset all states */
    reset(): void;
    /** Remove event by EventId or array of EventId */
    off(targetId: EventName, onlyEventNames: boolean): AffectedEventIds | false;
    off(targetId: EventNames, onlyEventNames: boolean): AffectedEventIds | false;
    off(targetId: EventName | EventNames, onlyEventNames: boolean): AffectedEventIds | false;
    off(targetId: EventIds): AffectedEventIds | false;
    off(targetId: EventId): AffectedEventIds | false;
    /** Remove event by name */
    offEvent(eventName: EventName | EventNames): AffectedEventIds | false;
    /** Add (prepend) 'before' middleware */
    useFirst(handler: Function): number;
    /** Add (append) 'before' middleware */
    use(handler: Function): number;
    /** Remove 'before' middleware by MiddlewareBefore id */
    unUse(handlerPosition: number): void;
    /** Add (prepend) 'after' middleware */
    useAfterFirst(handler: Function): number;
    /** Add (append) 'after' middleware */
    useAfter(handler: Function): number;
    /** Remove 'after' middleware by MiddlewareAfter id */
    unUseAfter(handlerPosition: number): void;
    /** Get events names list */
    getEventsList(): EventNames;
    /** Get events names by RegExp pattern */
    getEvents(findStr: string): EventName[];
    /** Map events 'before' */
    mapEvents(target: Events, list?: MapList): number;
    /** Remove 'before' event mapper by position */
    unmapEvents(position: number): void;
    /** Map events 'after' */
    mapEventsAfter(target: Events, list?: MapList): number;
    /** Remove 'after' event mapper by id */
    unmapEventsAfter(position: number): void;
    /** Check event exists */
    exists(what: EventName | RegExp, inMappingsToo?: boolean): boolean;
    /** Register event */
    on(name: EventName, cb: EventCallback): EventId;
    on(name: EventNamesWithCallbacks): EventIds;
    /**  Register event and self-remove after first call */
    once(name: EventNamesWithCallbacks): EventIds;
    once(name: EventName, cb: EventCallback): EventId;
    /** Await event emit */
    wait(name: EventName, cb?: EventCallbackSpread | Boolean): Promise<Array<any | void>>;
    /** Advanced event emit */
    emitEx(name: EventName, chainable: boolean, configParam: Config | false, ...args: any[]): Promise<Object | any>;
    /** Event emit (call) */
    emit(name: EventName, ...args: any[]): ReturnAsyncEmitResult;
    /** Event emit (call) as parallel */
    emitParallel(name: EventName, ...args: any[]): ReturnAsyncEmitResult;
    /** Event emit (call) as chain */
    emitChain(name: EventName, ...args: any[]): ReturnAsyncEmitResult;
}
export * from './types';
declare const _default: {
    Events: typeof Events;
};
export default _default;
