import * as tools from '@osmium/tools';
import {
	AffectedEventIds,
	Config,
	EventCallback,
	EventCallbackSpread,
	EventId,
	EventIds,
	EventMapObject,
	EventName,
	EventNames,
	EventNamesWithCallbacks,
	EventObject,
	EventsObjects,
	IIteration,
	MapList,
	MiddlewareArray,
	ReturnAsyncEmitResult
} from './types';

export class EventInformation {
	public cb: Function;
	public time: number;

	constructor(cb: Function, time: number) {
		this.cb = cb;
		this.time = time;
	}
}

/**
 * @class Events
 */
export class Events {
	private eventIdPrefix = '#';

	private eventsList: EventsObjects = {};
	private eventMappers: EventMapObject[] = [];
	private eventMappersAfter: EventMapObject[] = [];
	private middlewares: MiddlewareArray = [];
	private middlewaresAfter: MiddlewareArray = [];
	private readonly defaultChain: boolean;
	private readonly UNDEFINED: Symbol = Symbol('UNDEFINED');

	/**
	 * @constructor
	 * @param {boolean} [defaultChain=false] - If true use emitChain as default for emit, if false use emitParallel (default)
	 */
	constructor(defaultChain: boolean = false) {
		this.defaultChain = defaultChain;
	}

	private getUID(): EventId {
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

	/**
	 * Remove event by EventId or array of EventId
	 * @param {EventIds | EventName | Array<EventName>} targetId - EventId or array of EventId
	 * @param onlyEventNames
	 * @returns {{[EventID]: {EventCallback}}} Affected events
	 */
	off(targetId: EventName, onlyEventNames: boolean): AffectedEventIds | false
	off(targetId: EventNames, onlyEventNames: boolean): AffectedEventIds | false
	off(targetId: EventName | EventNames, onlyEventNames: boolean): AffectedEventIds | false
	off(targetId: EventIds): AffectedEventIds | false
	off(targetId: EventId): AffectedEventIds | false
	off(targetId: EventIds | EventName | EventNames, onlyEventNames = false): AffectedEventIds | false {
		const affectedEvents: AffectedEventIds = {};

		tools.iterate<EventId | EventName>(tools.toArray(targetId), (id) => {
			if (this.eventsList[id]) {
				affectedEvents[id] = Object.keys(this.eventsList[id]);
				delete this.eventsList[id];

				return;
			}
			if (onlyEventNames) {
				affectedEvents[id] = false;
				return;
			}

			let eventName: EventName = id.slice(0, this.getUID().length * -1);
			const eventIds = this.eventsList[eventName];
			if (!eventIds) {
				affectedEvents[eventName] = false;
				return;
			}

			affectedEvents[eventName] = affectedEvents[eventName] || [];
			(affectedEvents[eventName] as EventIds).push(id);

			delete this.eventsList[eventName][id];
		});

		return affectedEvents;
	}

	/**
	 * Remove event by name
	 * @param {EventName|EventNames} eventName - Event name
	 * @return {AffectedEventIds}
	 */
	offEvent(eventName: EventName | EventNames): AffectedEventIds | false {
		return this.off(eventName, true);
	}

	/**
	 * Add (prepend) 'before' middleware
	 * @param {Function} handler - MiddlewareBefore handler callback
	 * @returns {number} MiddlewareBefore position
	 */
	useFirst(handler: Function): number {
		return this.middlewares.unshift(handler);
	}

	/**
	 * Add (append) 'before' middleware
	 * @param {Function} handler - MiddlewareBefore handler callback
	 * @returns {number} MiddlewareBefore position
	 */
	use(handler: Function): number {
		return this.middlewares.push(handler);
	}

	/**
	 * Remove 'before' middleware by MiddlewareBefore id
	 * @param {Number} handlerPosition - MiddlewareBefore position
	 */
	unUse(handlerPosition: number): void {
		this.middlewares.splice(handlerPosition - 1, 1);
	}

	/**
	 * Add (prepend) 'after' middleware
	 * @param {Function<*>} handler - Middleware handler callback
	 * @returns {number} MiddlewareAfter position
	 */
	useAfterFirst(handler: Function): number {
		return this.middlewaresAfter.unshift(handler);
	}

	/**
	 * Add (append) 'after' middleware
	 * @param {Function<*>} handler - Middleware handler callback
	 * @returns {number} MiddlewareAfter position
	 */
	useAfter(handler: Function): number {
		return this.middlewaresAfter.push(handler);
	}

	/**
	 * Remove 'after' middleware by MiddlewareAfter id
	 * @param {Number} handlerPosition - MiddlewareAfter position
	 */
	unUseAfter(handlerPosition: number): void {
		this.middlewaresAfter.splice(handlerPosition - 1, 1);
	}

	/**
	 * Get events names list
	 * @returns {EventNames}
	 */
	getEventsList(): EventNames {
		return Object.keys(this.eventsList);
	}

	/**
	 * Get events names by RegExp pattern
	 * @param {String} findStr - RegExp pattern without /^ $/gi
	 *, @returns {EventName[]}
	 */
	getEvents(findStr: string): EventName[] {
		return tools.iterate<EventObject>(this.eventsList, (event, name) =>
			name.match(new RegExp(`^${findStr}$`, 'gi')) ? name : undefined, []) as EventName[];
	}

	/**
	 * Map events 'before'
	 * @param {Events} target
	 * @param {MapList} list
	 * @returns {Number} Event mapper position
	 */
	mapEvents(target: Events, list: MapList = false): number {
		return this.eventMappers.push({list, target});
	}

	/**
	 * Remove 'before' event mapper by position
	 * @param {Number} position
	 */
	unmapEvents(position: number): void {
		this.eventMappers.splice(position - 1, 1);
	}

	/**
	 * Map events 'after'
	 * @param {Events} target
	 * @param {MapList} list
	 * @returns {Number}
	 */
	mapEventsAfter(target: Events, list: MapList = false): number {
		return this.eventMappersAfter.push({list, target});
	}

	/**
	 * Remove 'after' event mapper by id
	 * @param {Number} position
	 */
	unmapEventsAfter(position: number): void {
		this.eventMappersAfter.splice(position - 1, 1);
	}

	/**
	 * Check event exists
	 * @param {String | RegExp} what
	 * @param {Boolean} inMappingsToo
	 * @returns {boolean}
	 */
	exists(what: EventName | RegExp, inMappingsToo: boolean = false): boolean {
		let ret = false;

		if (inMappingsToo) {
			tools.iterate(this.eventMappers.concat(this.eventMappersAfter), (row: EventMapObject) => {
				if (row.target.exists(what)) ret = true;
			});
			if (ret) return ret;
		}

		if (tools.isRegExp(what)) {
			return tools.iterate(this.getEventsList(), (eventName: string) => !!eventName.match(what), false) as boolean;
		}

		return !!this.eventsList[what as string];
	}


	on(name: EventName, cb: EventCallback): EventId
	on(name: EventNamesWithCallbacks): EventIds
	/**
	 * Register event
	 * @param {EventName | EventNamesWithCallbacks} name - Event name
	 * @param {EventCallback: Function} cb - Event callback
	 * @returns {EventID: number | EventID[]} Event id's
	 */
	on(name: EventName | EventNamesWithCallbacks, cb?: EventCallback): EventId | EventIds | false {
		const _on = (event: EventName, eventCb: EventCallback) => {
			let id = `${event}${this.getUID()}` as EventId;

			this.eventsList[event] = this.eventsList[event] || {};
			this.eventsList[event][id] = new EventInformation(eventCb, Date.now());

			return id;
		};

		if (tools.isObject(name)) return tools.iterateKeys<EventCallback>(name as EventNamesWithCallbacks, _on, []) as EventIds;

		return tools.isFunction(cb) ? _on(name as EventName, cb as EventCallback) : false;
	};

	once(name: EventNamesWithCallbacks): EventIds
	once(name: EventName, cb: EventCallback): EventId
	/**
	 * Register event and self-remove after first call
	 * @param {EventName | EventsObjects} name - Event name
	 * @param {EventCallback} cb - Event callback
	 * @returns {EventID: number | EventID[]} Event id's
	 */
	once(name: EventName | EventNamesWithCallbacks, cb?: EventCallback): EventId | EventIds | false {
		const _once = (event: EventName, eventCb: EventCallback) => {
			let id = this.on(event as EventName, async (...args: [any]) => {
				this.off(id);

				return eventCb(...args);
			});

			return id;
		};

		if (tools.isObject(name)) {
			return tools.iterateKeys<EventCallback>(name as EventNamesWithCallbacks, _once, []) as EventIds;
		}

		return tools.isFunction(cb) ? _once(name as EventName, cb as EventCallback) : false;
	};

	/**
	 * Await event emit
	 * @param {EventName} name - Event name
	 * @param {Function<*>|Boolean} [cb=false] - Callback for event (result returned to emitter)
	 * @returns {Promise<*[]>} Return array of event call args
	 */
	wait(name: EventName, cb: EventCallbackSpread | Boolean = false): Promise<Array<any | void>> {
		return new Promise((resolve) => this.once(name, async (...args: Array<any>) => {
			const ret = await (<EventCallbackSpread>cb || tools.nop$)(...args);
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
	async emitEx(name: EventName, chainable: boolean, configParam: Config | false, ...args: any[]): Promise<Object | any> {
		let promises: Array<Promise<[]>> = [];
		let exitVal: any;
		let ret: Object = {};
		const config: Config = configParam ? configParam as Config : {};

		config.context = config.context || this;

		const mapperFn = (list: Array<EventMapObject>) => tools.iterate(list, (mapperRow: EventMapObject) => {
			if (tools.isFunction(mapperRow.target.emit)
			    && (mapperRow.list === false || tools.arrayToObject(mapperRow.list)[name])
			) {
				promises.push(mapperRow.target.emitEx(name, false, {context: config.context, preCall: config.preCall, fromMapper: true}, ...args));
			}
		});

		const mapperFnChain = async (list: Array<EventMapObject>) => {
			await tools.iterate(list, async (mapperRow: EventMapObject) => {
				if (tools.isFunction(mapperRow.target.emit)
				    && (mapperRow.list === false || tools.arrayToObject(mapperRow.list)[name])
				) {
					Object.assign(ret, await mapperRow.target.emitEx(name, true, {context: config.context, preCall: config.preCall, fromMapper: true}, ...args));
				}
			});
		};

		Object.assign(config, {
			ignore     : false,
			ignoreFalse: false,
			dontExit   : false
		});

		if (!config.ignore) {
			await tools.iterate(this.middlewares, async (fn: Function) => {
				if (!tools.isFunction(fn)) return;
				const fnRet = await fn.apply(config.context, [name, config, ...args]);

				if (tools.isArray(fnRet)) args = fnRet;
				if (tools.isObject(fnRet)) exitVal = fnRet;
			});
		}

		if (exitVal && !config.dontExit) return exitVal.ret;

		await (chainable ? mapperFnChain : mapperFn)(this.eventMappers);
		if (chainable) {
			await tools.iterate<EventInformation>(this.eventsList[name] as EventObject, async (rec, id, iter: IIteration) => {
				iter.key(id);

				if (tools.isFunction(config.preCall) && typeof config.preCall === 'function') args = await config.preCall(rec.cb, args, id, config, this);

				const res = await rec.cb.apply(config.context, args);
				return tools.isUndefined(res) ? this.UNDEFINED : res;
			}, ret);
		} else {
			await tools.iterate<EventInformation>(this.eventsList[name], async (row, id) => {
				if (config.preCall && tools.isFunction(config.preCall)) args = await config.preCall(row.cb, args, id, config, this);

				return promises.push(row.cb.apply(config.context, args));
			});
			ret = await Promise.all(promises);
			promises = [];
		}

		chainable ? await mapperFnChain(this.eventMappersAfter) : mapperFn(this.eventMappersAfter);

		if (!chainable) {
			(ret as Array<any>).concat(await Promise.all(promises));
		}

		await tools.iterate(this.middlewaresAfter, async (fn: Function) => {
			const fnRet = await fn.apply(config.context, [name, config, ret, ...args]);
			if (!tools.isUndefined(fnRet)) ret = fnRet;
		});

		return ret;
	}

	/**
	 * Event emit (call)
	 * @param {EventName} name - Event name
	 * @param {...*} args - Event call args
	 * @returns {Promise<*>|Function<*>}
	 */
	async emit(name: EventName, ...args: any[]): ReturnAsyncEmitResult {
		return this.defaultChain ? this.emitChain(name, ...args) : this.emitParallel(name, ...args);
	}

	/**
	 * Event emit (call) as parallel
	 * @param {EventName} name - Event name
	 * @param {...*} args - Event call args
	 * @returns {Promise<*>|Function<*>}
	 */
	async emitParallel(name: EventName, ...args: any[]): ReturnAsyncEmitResult {
		return await this.emitEx(name, false, false, ...args);
	};

	/**
	 * Event emit (call) as chain
	 * @param {EventName} name - Event name
	 * @param {...*} args - Event call args
	 * @returns {Promise<*>|Function<*>}
	 */
	async emitChain(name: EventName, ...args: any[]): ReturnAsyncEmitResult {
		return await this.emitEx(name, true, false, ...args);
	}
}

export * from './types';

export default {
	Events
};
