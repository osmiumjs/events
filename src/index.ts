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

export class Events {
	private eventIdPrefix = '#';

	private eventsList: EventsObjects = {};
	private eventMappers: EventMapObject[] = [];
	private eventMappersAfter: EventMapObject[] = [];
	private middlewares: MiddlewareArray = [];
	private middlewaresAfter: MiddlewareArray = [];
	private readonly defaultChain: boolean;
	private readonly UNDEFINED: Symbol = Symbol('UNDEFINED');

	constructor(defaultChain: boolean = false) {
		this.defaultChain = defaultChain;
	}

	private getUID(): EventId {
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

	/** Remove event by EventId or array of EventId */
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

	/** Remove event by name */
	offEvent(eventName: EventName | EventNames): AffectedEventIds | false {
		return this.off(eventName, true);
	}

	/** Add (prepend) 'before' middleware */
	useFirst(handler: Function): number {
		return this.middlewares.unshift(handler);
	}

	/** Add (append) 'before' middleware */
	use(handler: Function): number {
		return this.middlewares.push(handler);
	}

	/** Remove 'before' middleware by MiddlewareBefore id */
	unUse(handlerPosition: number): void {
		this.middlewares.splice(handlerPosition - 1, 1);
	}

	/** Add (prepend) 'after' middleware */
	useAfterFirst(handler: Function): number {
		return this.middlewaresAfter.unshift(handler);
	}

	/** Add (append) 'after' middleware */
	useAfter(handler: Function): number {
		return this.middlewaresAfter.push(handler);
	}

	/** Remove 'after' middleware by MiddlewareAfter id */
	unUseAfter(handlerPosition: number): void {
		this.middlewaresAfter.splice(handlerPosition - 1, 1);
	}

	/** Get events names list */
	getEventsList(): EventNames {
		return Object.keys(this.eventsList);
	}

	/** Get events names by RegExp pattern */
	getEvents(findStr: string): EventName[] {
		return tools.iterate(this.eventsList, (event, name) =>
			name.match(new RegExp(`^${findStr}$`, 'gi')) ? name : undefined, []) as EventName[];
	}

	/** Map events 'before' */
	mapEvents(target: Events, list: MapList = false): number {
		return this.eventMappers.push({
			list,
			target
		});
	}

	/** Remove 'before' event mapper by position */
	unmapEvents(position: number): void {
		this.eventMappers.splice(position - 1, 1);
	}

	/** Map events 'after' */
	mapEventsAfter(target: Events, list: MapList = false): number {
		return this.eventMappersAfter.push({
			list,
			target
		});
	}

	/** Remove 'after' event mapper by id */
	unmapEventsAfter(position: number): void {
		this.eventMappersAfter.splice(position - 1, 1);
	}

	/** Check event exists */
	exists(what: EventName | RegExp, inMappingsToo: boolean = false): boolean {
		let ret = false;

		if (inMappingsToo) {
			tools.iterate(this.eventMappers.concat(this.eventMappersAfter), (row: EventMapObject) => {
				if (row.target.exists(what)) ret = true;
			});
			if (ret) return ret;
		}

		if (tools.isRegExp(what)) {
			let out = false;
			tools.iterate((this.getEventsList() as string[]), (eventName: string) => {
				out = out || !!eventName.match(what);
			});
			return out;
		}

		return !!this.eventsList[what as string];
	}

	/** Register event */
	on(name: EventName, cb: EventCallback): EventId
	on(name: EventNamesWithCallbacks): EventIds
	on(name: EventName | EventNamesWithCallbacks, cb?: EventCallback): EventId | EventIds | false {
		const _on = (event: EventName, eventCb: EventCallback) => {
			let id = `${event}${this.getUID()}`;

			this.eventsList[event] = this.eventsList[event] || {};
			this.eventsList[event][id] = new EventInformation(eventCb, Date.now());

			return id;
		};

		if (tools.isObject(name)) return tools.iterate(name as EventNamesWithCallbacks, (a, b) => _on(b, a), [] as EventIds);

		return tools.isFunction(cb) ? _on(name as EventName, cb as EventCallback) : false;
	}

	/**  Register event and self-remove after first call */
	once(name: EventNamesWithCallbacks): EventIds
	once(name: EventName, cb: EventCallback): EventId
	once(name: EventName | EventNamesWithCallbacks, cb?: EventCallback): EventId | EventIds | false {
		const _once = (event: EventName, eventCb: EventCallback) => {
			let id = this.on(event, async (...args: [any]) => {
				this.off(id);

				return eventCb(...args);
			});

			return id;
		};

		if (tools.isObject(name)) {
			return tools.iterate(name as EventNamesWithCallbacks, (a, b) => _once(b, a), [] as EventIds);
		}

		return tools.isFunction(cb) ? _once(name as EventName, cb as EventCallback) : false;
	}

	/** Await event emit */
	wait(name: EventName, cb: EventCallbackSpread | Boolean = false): Promise<Array<any | void>> {
		return new Promise((resolve) => this.once(name, async (...args: Array<any>) => {
			const ret = await (<EventCallbackSpread>cb || tools.nop$)(...args);
			resolve(args);

			return ret;
		}));
	}

	/** Advanced event emit */
	async emitEx(name: EventName, chainable: boolean, configParam: Config | false, ...args: any[]): Promise<Object | any> {
		let promises: Array<Promise<[]>> = [];
		let exitVal: any;
		let ret: Object = {};
		const config: Config = configParam ? configParam : {};

		config.context = config.context || this;

		const mapperFn = (list: Array<EventMapObject>) => tools.iterate(list, (mapperRow: EventMapObject) => {
			if (tools.isFunction(mapperRow.target.emit)
				&& (mapperRow.list === false || tools.arrayToObject(mapperRow.list)[name])
			) {
				promises.push(mapperRow.target.emitEx(name, false, {
					context   : config.context,
					preCall   : config.preCall,
					fromMapper: true
				}, ...args));
			}
		});

		const mapperFnChain = async (list: Array<EventMapObject>) => {
			await tools.iterate(list, async (mapperRow: EventMapObject) => {
				if (tools.isFunction(mapperRow.target.emit)
					&& (mapperRow.list === false || tools.arrayToObject(mapperRow.list)[name])
				) {
					Object.assign(ret, await mapperRow.target.emitEx(name, true, {
						context   : config.context,
						preCall   : config.preCall,
						fromMapper: true
					}, ...args));
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
			/** @ts-ignore */
			await tools.iterate(this.eventsList[name], async (rec, id, iter: IIteration) => {
				iter.key(id);

				if (tools.isFunction(config.preCall) && typeof config.preCall === 'function') args = await config.preCall(rec.cb, args, id, config, this);

				const res = await rec.cb.apply(config.context, args);
				return tools.isUndefined(res) ? this.UNDEFINED : res;
			}, ret);
		} else {
			await tools.iterate(this.eventsList[name], async (row, id) => {
				if (config.preCall && tools.isFunction(config.preCall)) args = await config.preCall(row.cb, args, id, config, this);

				return promises.push(row.cb.apply(config.context, args));
			});
			ret = await Promise.all(promises);
			promises = [];
		}

		chainable ? await mapperFnChain(this.eventMappersAfter) : mapperFn(this.eventMappersAfter);

		if (!chainable) {
			ret = (ret as Array<any>).concat(await Promise.all(promises));
		}

		await tools.iterate(this.middlewaresAfter, async (fn: Function) => {
			const fnRet = await fn.apply(config.context, [name, config, ret, ...args]);
			if (!tools.isUndefined(fnRet)) ret = fnRet;
		});

		return ret;
	}

	/** Event emit (call) */
	async emit(name: EventName, ...args: any[]): ReturnAsyncEmitResult {
		return this.defaultChain ? this.emitChain(name, ...args) : this.emitParallel(name, ...args);
	}

	/** Event emit (call) as parallel */
	async emitParallel(name: EventName, ...args: any[]): ReturnAsyncEmitResult {
		return this.emitEx(name, false, false, ...args);
	}

	/** Event emit (call) as chain */
	async emitChain(name: EventName, ...args: any[]): ReturnAsyncEmitResult {
		return this.emitEx(name, true, false, ...args);
	}
}

export * from './types';

export default {
	Events
};
