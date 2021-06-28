"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Events = exports.EventInformation = void 0;
const tools = require("@osmium/tools");
class EventInformation {
    constructor(cb, time) {
        this.cb = cb;
        this.time = time;
    }
}
exports.EventInformation = EventInformation;
/**
 * @class Events
 */
class Events {
    /**
     * @constructor
     * @param {boolean} [defaultChain=false] - If true use emitChain as default for emit, if false use emitParallel (default)
     */
    constructor(defaultChain = false) {
        this.eventIdPrefix = '#';
        this.eventsList = {};
        this.eventMappers = [];
        this.eventMappersAfter = [];
        this.middlewares = [];
        this.middlewaresAfter = [];
        this.UNDEFINED = Symbol('UNDEFINED');
        this.defaultChain = defaultChain;
    }
    getUID() {
        return tools.UID(this.eventIdPrefix);
    }
    /**
     * Clear event's list
     */
    clear() {
        this.eventsList = {};
    }
    /**
     * Reset all states
     */
    reset() {
        this.middlewares = [];
        this.middlewaresAfter = [];
        this.eventMappers = [];
        this.eventMappersAfter = [];
        this.clear();
    }
    off(targetId, onlyEventNames = false) {
        const affectedEvents = {};
        tools.iterate(tools.toArray(targetId), (id) => {
            if (this.eventsList[id]) {
                affectedEvents[id] = Object.keys(this.eventsList[id]);
                delete this.eventsList[id];
                return;
            }
            if (onlyEventNames) {
                affectedEvents[id] = false;
                return;
            }
            let eventName = id.slice(0, this.getUID().length * -1);
            const eventIds = this.eventsList[eventName];
            if (!eventIds) {
                affectedEvents[eventName] = false;
                return;
            }
            affectedEvents[eventName] = affectedEvents[eventName] || [];
            affectedEvents[eventName].push(id);
            delete this.eventsList[eventName][id];
        });
        return affectedEvents;
    }
    /**
     * Remove event by name
     * @param {EventName|EventNames} eventName - Event name
     * @return {AffectedEventIds}
     */
    offEvent(eventName) {
        return this.off(eventName, true);
    }
    /**
     * Add (prepend) 'before' middleware
     * @param {Function} handler - MiddlewareBefore handler callback
     * @returns {number} MiddlewareBefore position
     */
    useFirst(handler) {
        return this.middlewares.unshift(handler);
    }
    /**
     * Add (append) 'before' middleware
     * @param {Function} handler - MiddlewareBefore handler callback
     * @returns {number} MiddlewareBefore position
     */
    use(handler) {
        return this.middlewares.push(handler);
    }
    /**
     * Remove 'before' middleware by MiddlewareBefore id
     * @param {Number} handlerPosition - MiddlewareBefore position
     */
    unUse(handlerPosition) {
        this.middlewares.splice(handlerPosition - 1, 1);
    }
    /**
     * Add (prepend) 'after' middleware
     * @param {Function<*>} handler - Middleware handler callback
     * @returns {number} MiddlewareAfter position
     */
    useAfterFirst(handler) {
        return this.middlewaresAfter.unshift(handler);
    }
    /**
     * Add (append) 'after' middleware
     * @param {Function<*>} handler - Middleware handler callback
     * @returns {number} MiddlewareAfter position
     */
    useAfter(handler) {
        return this.middlewaresAfter.push(handler);
    }
    /**
     * Remove 'after' middleware by MiddlewareAfter id
     * @param {Number} handlerPosition - MiddlewareAfter position
     */
    unUseAfter(handlerPosition) {
        this.middlewaresAfter.splice(handlerPosition - 1, 1);
    }
    /**
     * Get events names list
     * @returns {EventNames}
     */
    getEventsList() {
        return Object.keys(this.eventsList);
    }
    /**
     * Get events names by RegExp pattern
     * @param {String} findStr - RegExp pattern without /^ $/gi
     *, @returns {EventName[]}
     */
    getEvents(findStr) {
        return tools.iterate(this.eventsList, (event, name) => name.match(new RegExp(`^${findStr}$`, 'gi')) ? name : undefined, []);
    }
    /**
     * Map events 'before'
     * @param {Events} target
     * @param {MapList} list
     * @returns {Number} Event mapper position
     */
    mapEvents(target, list = false) {
        return this.eventMappers.push({ list, target });
    }
    /**
     * Remove 'before' event mapper by position
     * @param {Number} position
     */
    unmapEvents(position) {
        this.eventMappers.splice(position - 1, 1);
    }
    /**
     * Map events 'after'
     * @param {Events} target
     * @param {MapList} list
     * @returns {Number}
     */
    mapEventsAfter(target, list = false) {
        return this.eventMappersAfter.push({ list, target });
    }
    /**
     * Remove 'after' event mapper by id
     * @param {Number} position
     */
    unmapEventsAfter(position) {
        this.eventMappersAfter.splice(position - 1, 1);
    }
    /**
     * Check event exists
     * @param {String | RegExp} what
     * @param {Boolean} inMappingsToo
     * @returns {boolean}
     */
    exists(what, inMappingsToo = false) {
        let ret = false;
        if (inMappingsToo) {
            tools.iterate(this.eventMappers.concat(this.eventMappersAfter), (row) => {
                if (row.target.exists(what))
                    ret = true;
            });
            if (ret)
                return ret;
        }
        if (tools.isRegExp(what)) {
            return tools.iterate(this.getEventsList(), (eventName) => !!eventName.match(what), false);
        }
        return !!this.eventsList[what];
    }
    /**
     * Register event
     * @param {EventName | EventNamesWithCallbacks} name - Event name
     * @param {EventCallback: Function} cb - Event callback
     * @returns {EventID: number | EventID[]} Event id's
     */
    on(name, cb) {
        const _on = (event, eventCb) => {
            let id = `${event}${this.getUID()}`;
            this.eventsList[event] = this.eventsList[event] || {};
            this.eventsList[event][id] = new EventInformation(eventCb, Date.now());
            return id;
        };
        if (tools.isObject(name))
            return tools.iterateKeys(name, _on, []);
        return tools.isFunction(cb) ? _on(name, cb) : false;
    }
    ;
    /**
     * Register event and self-remove after first call
     * @param {EventName | EventsObjects} name - Event name
     * @param {EventCallback} cb - Event callback
     * @returns {EventID: number | EventID[]} Event id's
     */
    once(name, cb) {
        const _once = (event, eventCb) => {
            let id = this.on(event, async (...args) => {
                this.off(id);
                return eventCb(...args);
            });
            return id;
        };
        if (tools.isObject(name)) {
            return tools.iterateKeys(name, _once, []);
        }
        return tools.isFunction(cb) ? _once(name, cb) : false;
    }
    ;
    /**
     * Await event emit
     * @param {EventName} name - Event name
     * @param {Function<*>|Boolean} [cb=false] - Callback for event (result returned to emitter)
     * @returns {Promise<*[]>} Return array of event call args
     */
    wait(name, cb = false) {
        return new Promise((resolve) => this.once(name, async (...args) => {
            const ret = await (cb || tools.nop$)(...args);
            resolve(args);
            return ret;
        }));
    }
    /**
     * Advanced event emit
     * @param {EventName} name - Event name
     * @param {Boolean} chainable - Use chain emit call if true
     * @param configParam
     * @param {...*} args - Event call args
     * @returns {Promise<{}|*>}
     */
    async emitEx(name, chainable, configParam, ...args) {
        let promises = [];
        let exitVal;
        let ret = {};
        const config = configParam ? configParam : {};
        config.context = config.context || this;
        const mapperFn = (list) => tools.iterate(list, (mapperRow) => {
            if (tools.isFunction(mapperRow.target.emit)
                && (mapperRow.list === false || tools.arrayToObject(mapperRow.list)[name])) {
                promises.push(mapperRow.target.emitEx(name, false, { context: config.context, preCall: config.preCall, fromMapper: true }, ...args));
            }
        });
        const mapperFnChain = async (list) => {
            await tools.iterate(list, async (mapperRow) => {
                if (tools.isFunction(mapperRow.target.emit)
                    && (mapperRow.list === false || tools.arrayToObject(mapperRow.list)[name])) {
                    Object.assign(ret, await mapperRow.target.emitEx(name, true, { context: config.context, preCall: config.preCall, fromMapper: true }, ...args));
                }
            });
        };
        Object.assign(config, {
            ignore: false,
            ignoreFalse: false,
            dontExit: false
        });
        if (!config.ignore) {
            await tools.iterate(this.middlewares, async (fn) => {
                if (!tools.isFunction(fn))
                    return;
                const fnRet = await fn.apply(config.context, [name, config, ...args]);
                if (tools.isArray(fnRet))
                    args = fnRet;
                if (tools.isObject(fnRet))
                    exitVal = fnRet;
            });
        }
        if (exitVal && !config.dontExit)
            return exitVal.ret;
        await (chainable ? mapperFnChain : mapperFn)(this.eventMappers);
        if (chainable) {
            await tools.iterate(this.eventsList[name], async (rec, id, iter) => {
                iter.key(id);
                if (tools.isFunction(config.preCall) && typeof config.preCall === 'function')
                    args = await config.preCall(rec.cb, args, id, config, this);
                const res = await rec.cb.apply(config.context, args);
                return tools.isUndefined(res) ? this.UNDEFINED : res;
            }, ret);
        }
        else {
            await tools.iterate(this.eventsList[name], async (row, id) => {
                if (config.preCall && tools.isFunction(config.preCall))
                    args = await config.preCall(row.cb, args, id, config, this);
                return promises.push(row.cb.apply(config.context, args));
            });
            ret = await Promise.all(promises);
            promises = [];
        }
        chainable ? await mapperFnChain(this.eventMappersAfter) : mapperFn(this.eventMappersAfter);
        if (!chainable) {
            ret.concat(await Promise.all(promises));
        }
        await tools.iterate(this.middlewaresAfter, async (fn) => {
            const fnRet = await fn.apply(config.context, [name, config, ret, ...args]);
            if (!tools.isUndefined(fnRet))
                ret = fnRet;
        });
        return ret;
    }
    /**
     * Event emit (call)
     * @param {EventName} name - Event name
     * @param {...*} args - Event call args
     * @returns {Promise<*>|Function<*>}
     */
    async emit(name, ...args) {
        return this.defaultChain ? this.emitChain(name, ...args) : this.emitParallel(name, ...args);
    }
    /**
     * Event emit (call) as parallel
     * @param {EventName} name - Event name
     * @param {...*} args - Event call args
     * @returns {Promise<*>|Function<*>}
     */
    async emitParallel(name, ...args) {
        return await this.emitEx(name, false, false, ...args);
    }
    ;
    /**
     * Event emit (call) as chain
     * @param {EventName} name - Event name
     * @param {...*} args - Event call args
     * @returns {Promise<*>|Function<*>}
     */
    async emitChain(name, ...args) {
        return await this.emitEx(name, true, false, ...args);
    }
}
exports.Events = Events;
__exportStar(require("./types"), exports);
exports.default = {
    Events
};
//# sourceMappingURL=index.js.map