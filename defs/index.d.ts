import { AffectedEventIds, Config, EventCallback, EventCallbackSpread, EventId, EventIds, EventName, EventNames, EventNamesWithCallbacks, MapList, ReturnAsyncEmitResult } from './types';
export declare class EventInformation {
    cb: Function;
    time: number;
    constructor(cb: Function, time: number);
}
/**
 * @class Events
 */
export declare class Events {
    private eventIdPrefix;
    private eventsList;
    private eventMappers;
    private eventMappersAfter;
    private middlewares;
    private middlewaresAfter;
    private readonly defaultChain;
    private readonly UNDEFINED;
    /**
     * @constructor
     * @param {boolean} [defaultChain=false] - If true use emitChain as default for emit, if false use emitParallel (default)
     */
    constructor(defaultChain?: boolean);
    private getUID;
    /**
     * Clear event's list
     */
    clear(): void;
    /**
     * Reset all states
     */
    reset(): void;
    /**
     * Remove event by EventId or array of EventId
     * @param {EventIds | EventName | Array<EventName>} targetId - EventId or array of EventId
     * @param onlyEventNames
     * @returns {{[EventID]: {EventCallback}}} Affected events
     */
    off(targetId: EventName, onlyEventNames: boolean): AffectedEventIds | false;
    off(targetId: EventNames, onlyEventNames: boolean): AffectedEventIds | false;
    off(targetId: EventName | EventNames, onlyEventNames: boolean): AffectedEventIds | false;
    off(targetId: EventIds): AffectedEventIds | false;
    off(targetId: EventId): AffectedEventIds | false;
    /**
     * Remove event by name
     * @param {EventName|EventNames} eventName - Event name
     * @return {AffectedEventIds}
     */
    offEvent(eventName: EventName | EventNames): AffectedEventIds | false;
    /**
     * Add (prepend) 'before' middleware
     * @param {Function} handler - MiddlewareBefore handler callback
     * @returns {number} MiddlewareBefore position
     */
    useFirst(handler: Function): number;
    /**
     * Add (append) 'before' middleware
     * @param {Function} handler - MiddlewareBefore handler callback
     * @returns {number} MiddlewareBefore position
     */
    use(handler: Function): number;
    /**
     * Remove 'before' middleware by MiddlewareBefore id
     * @param {Number} handlerPosition - MiddlewareBefore position
     */
    unUse(handlerPosition: number): void;
    /**
     * Add (prepend) 'after' middleware
     * @param {Function<*>} handler - Middleware handler callback
     * @returns {number} MiddlewareAfter position
     */
    useAfterFirst(handler: Function): number;
    /**
     * Add (append) 'after' middleware
     * @param {Function<*>} handler - Middleware handler callback
     * @returns {number} MiddlewareAfter position
     */
    useAfter(handler: Function): number;
    /**
     * Remove 'after' middleware by MiddlewareAfter id
     * @param {Number} handlerPosition - MiddlewareAfter position
     */
    unUseAfter(handlerPosition: number): void;
    /**
     * Get events names list
     * @returns {EventNames}
     */
    getEventsList(): EventNames;
    /**
     * Get events names by RegExp pattern
     * @param {String} findStr - RegExp pattern without /^ $/gi
     *, @returns {EventName[]}
     */
    getEvents(findStr: string): EventName[];
    /**
     * Map events 'before'
     * @param {Events} target
     * @param {MapList} list
     * @returns {Number} Event mapper position
     */
    mapEvents(target: Events, list?: MapList): number;
    /**
     * Remove 'before' event mapper by position
     * @param {Number} position
     */
    unmapEvents(position: number): void;
    /**
     * Map events 'after'
     * @param {Events} target
     * @param {MapList} list
     * @returns {Number}
     */
    mapEventsAfter(target: Events, list?: MapList): number;
    /**
     * Remove 'after' event mapper by id
     * @param {Number} position
     */
    unmapEventsAfter(position: number): void;
    /**
     * Check event exists
     * @param {String | RegExp} what
     * @param {Boolean} inMappingsToo
     * @returns {boolean}
     */
    exists(what: EventName | RegExp, inMappingsToo?: boolean): boolean;
    on(name: EventName, cb: EventCallback): EventId;
    on(name: EventNamesWithCallbacks): EventIds;
    once(name: EventNamesWithCallbacks): EventIds;
    once(name: EventName, cb: EventCallback): EventId;
    /**
     * Await event emit
     * @param {EventName} name - Event name
     * @param {Function<*>|Boolean} [cb=false] - Callback for event (result returned to emitter)
     * @returns {Promise<*[]>} Return array of event call args
     */
    wait(name: EventName, cb?: EventCallbackSpread | Boolean): Promise<Array<any | void>>;
    /**
     * Advanced event emit
     * @param {EventName} name - Event name
     * @param {Boolean} chainable - Use chain emit call if true
     * @param configParam
     * @param {...*} args - Event call args
     * @returns {Promise<{}|*>}
     */
    emitEx(name: EventName, chainable: boolean, configParam: Config | false, ...args: any[]): Promise<Object | any>;
    /**
     * Event emit (call)
     * @param {EventName} name - Event name
     * @param {...*} args - Event call args
     * @returns {Promise<*>|Function<*>}
     */
    emit(name: EventName, ...args: any[]): ReturnAsyncEmitResult;
    /**
     * Event emit (call) as parallel
     * @param {EventName} name - Event name
     * @param {...*} args - Event call args
     * @returns {Promise<*>|Function<*>}
     */
    emitParallel(name: EventName, ...args: any[]): ReturnAsyncEmitResult;
    /**
     * Event emit (call) as chain
     * @param {EventName} name - Event name
     * @param {...*} args - Event call args
     * @returns {Promise<*>|Function<*>}
     */
    emitChain(name: EventName, ...args: any[]): ReturnAsyncEmitResult;
}
export * from './types';
declare const _default: {
    Events: typeof Events;
};
export default _default;
