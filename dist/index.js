"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    cb;
    time;
    constructor(cb, time) {
        this.cb = cb;
        this.time = time;
    }
}
exports.EventInformation = EventInformation;
class Events {
    eventIdPrefix = '#';
    eventsList = {};
    eventMappers = [];
    eventMappersAfter = [];
    middlewares = [];
    middlewaresAfter = [];
    defaultChain;
    UNDEFINED = Symbol('UNDEFINED');
    constructor(defaultChain = false) {
        this.defaultChain = defaultChain;
    }
    getUID() {
        return tools.UID(this.eventIdPrefix);
    }
    /** Clear event's list */
    clear() {
        this.eventsList = {};
    }
    /** Reset all states */
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
    /** Remove event by name */
    offEvent(eventName) {
        return this.off(eventName, true);
    }
    /** Add (prepend) 'before' middleware */
    useFirst(handler) {
        return this.middlewares.unshift(handler);
    }
    /** Add (append) 'before' middleware */
    use(handler) {
        return this.middlewares.push(handler);
    }
    /** Remove 'before' middleware by MiddlewareBefore id */
    unUse(handlerPosition) {
        this.middlewares.splice(handlerPosition - 1, 1);
    }
    /** Add (prepend) 'after' middleware */
    useAfterFirst(handler) {
        return this.middlewaresAfter.unshift(handler);
    }
    /** Add (append) 'after' middleware */
    useAfter(handler) {
        return this.middlewaresAfter.push(handler);
    }
    /** Remove 'after' middleware by MiddlewareAfter id */
    unUseAfter(handlerPosition) {
        this.middlewaresAfter.splice(handlerPosition - 1, 1);
    }
    /** Get events names list */
    getEventsList() {
        return Object.keys(this.eventsList);
    }
    /** Get events names by RegExp pattern */
    getEvents(findStr) {
        return tools.iterate(this.eventsList, (event, name) => name.match(new RegExp(`^${findStr}$`, 'gi')) ? name : undefined, []);
    }
    /** Map events 'before' */
    mapEvents(target, list = false) {
        return this.eventMappers.push({
            list,
            target
        });
    }
    /** Remove 'before' event mapper by position */
    unmapEvents(position) {
        this.eventMappers.splice(position - 1, 1);
    }
    /** Map events 'after' */
    mapEventsAfter(target, list = false) {
        return this.eventMappersAfter.push({
            list,
            target
        });
    }
    /** Remove 'after' event mapper by id */
    unmapEventsAfter(position) {
        this.eventMappersAfter.splice(position - 1, 1);
    }
    /** Check event exists */
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
            let out = false;
            tools.iterate(this.getEventsList(), (eventName) => {
                out = out || !!eventName.match(what);
            });
            return out;
        }
        return !!this.eventsList[what];
    }
    on(name, cb) {
        const _on = (event, eventCb) => {
            let id = `${event}${this.getUID()}`;
            this.eventsList[event] = this.eventsList[event] || {};
            this.eventsList[event][id] = new EventInformation(eventCb, Date.now());
            return id;
        };
        if (tools.isObject(name))
            return tools.iterate(name, (a, b) => _on(b, a), []);
        return tools.isFunction(cb) ? _on(name, cb) : false;
    }
    once(name, cb) {
        const _once = (event, eventCb) => {
            let id = this.on(event, async (...args) => {
                this.off(id);
                return eventCb(...args);
            });
            return id;
        };
        if (tools.isObject(name)) {
            return tools.iterate(name, (a, b) => _once(b, a), []);
        }
        return tools.isFunction(cb) ? _once(name, cb) : false;
    }
    /** Await event emit */
    wait(name, cb = false) {
        return new Promise((resolve) => this.once(name, async (...args) => {
            const ret = await (cb || tools.nop$)(...args);
            resolve(args);
            return ret;
        }));
    }
    /** Advanced event emit */
    async emitEx(name, chainable, configParam, ...args) {
        let promises = [];
        let exitVal;
        let ret = {};
        const config = configParam ? configParam : {};
        config.context = config.context || this;
        const mapperFn = (list) => tools.iterate(list, (mapperRow) => {
            if (tools.isFunction(mapperRow.target.emit)
                && (mapperRow.list === false || tools.arrayToObject(mapperRow.list)[name])) {
                promises.push(mapperRow.target.emitEx(name, false, {
                    context: config.context,
                    preCall: config.preCall,
                    fromMapper: true
                }, ...args));
            }
        });
        const mapperFnChain = async (list) => {
            await tools.iterate(list, async (mapperRow) => {
                if (tools.isFunction(mapperRow.target.emit)
                    && (mapperRow.list === false || tools.arrayToObject(mapperRow.list)[name])) {
                    Object.assign(ret, await mapperRow.target.emitEx(name, true, {
                        context: config.context,
                        preCall: config.preCall,
                        fromMapper: true
                    }, ...args));
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
            /** @ts-ignore */
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
            ret = ret.concat(await Promise.all(promises));
        }
        await tools.iterate(this.middlewaresAfter, async (fn) => {
            const fnRet = await fn.apply(config.context, [name, config, ret, ...args]);
            if (!tools.isUndefined(fnRet))
                ret = fnRet;
        });
        return ret;
    }
    /** Event emit (call) */
    async emit(name, ...args) {
        return this.defaultChain ? this.emitChain(name, ...args) : this.emitParallel(name, ...args);
    }
    /** Event emit (call) as parallel */
    async emitParallel(name, ...args) {
        return this.emitEx(name, false, false, ...args);
    }
    /** Event emit (call) as chain */
    async emitChain(name, ...args) {
        return this.emitEx(name, true, false, ...args);
    }
}
exports.Events = Events;
__exportStar(require("./types"), exports);
exports.default = {
    Events
};
//# sourceMappingURL=index.js.map