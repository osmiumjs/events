import * as tools from '@osmium/tools';

export class EventHandler {
	public cb: Function;
	public time: number;

	constructor(cb: Function, time: number) {
		this.cb = cb;
		this.time = time;
	}
}

export namespace Events {
	export type EventInstanceId = string;

	export type EventName<EventNameType = string> = EventNameType;
	export type EventId = string;
	export type EventIds = EventId[];
	export type AffectedEventIds = (EventId | null)[];
	export type AffectedEventId = EventId | null;

	export type EventNames<EventNameType = string> = EventName<EventNameType>[];

	export type EventHandlers = Record<EventId, EventHandler>;
	export type EventsList<EventNameType = string> = Map<EventName<EventNameType>, EventHandlers>;

	export type EventCallback<EventNameType, ArgsType extends any[] = any[], ReturnType = void, EmitStatesExtType extends object = {}> = (this: Events.EmitStates<EventNameType, EmitStatesExtType>, ...args: ArgsType) => ReturnType | Promise<ReturnType>;

	export type EmitResult<T> = Record<EventId, T>;

	export type MappedEventsSet<EventNameType> = Set<EventName<EventNameType>>;
	export type MappedEventsList<EventNameType> = MappedEventsSet<EventNameType> | null;
	export type MappedEvents<EventNameType, EmitStatesExtType extends object> = Map<Events<EventNameType, EmitStatesExtType>, MappedEventsList<EventNameType>>;

	export type MiddlewareBeforeCallback<EventNameType, EmitStatesExtType extends object> = (context: EventsMiddlewareBeforeContext<EventNameType, EmitStatesExtType>) => Promise<void>;
	export type MiddlewareAfterCallback<EventNameType, EmitStatesExtType extends object> = (context: EventsMiddlewareAfterContext<EventNameType, EmitStatesExtType>) => Promise<void>;
	export type MiddlewaresList<MiddlewareCallbackType> = Map<number, MiddlewareCallbackType>;
	export type MiddlewareMetadata = Record<string, unknown>;

	export interface ConfigOptionable {
		metadata?: MiddlewareMetadata | null;
		defaultChain?: boolean,
		eventIdPrefix?: string,
		eventIdMask?: string,
	}

	export interface Config extends ConfigOptionable {
		metadata: MiddlewareMetadata;
		defaultChain: boolean;
		instanceIdPrefix: string;
		instanceIdMask: string;
		eventIdPrefix: string;
		eventIdPrefixMW: string;
		eventIdMask: string;
	}

	export interface States<EventNameType, EmitStatesExtType extends object> {
		instanceId: EventInstanceId;
		events: EventsList<EventNameType>;
		mappersBefore: MappedEvents<EventNameType, EmitStatesExtType>;
		mappersAfter: MappedEvents<EventNameType, EmitStatesExtType>;
		middlewaresBefore: MiddlewaresList<MiddlewareBeforeCallback<EventNameType, EmitStatesExtType>>;
		middlewaresAfter: MiddlewaresList<MiddlewareAfterCallback<EventNameType, EmitStatesExtType>>;
	}

	export interface IEmitStatesOptionable<EventNameType, EmitStatesExtType extends object> {
		skipMiddlewaresBefore?: boolean;
		skipMiddlewaresAfter?: boolean;
		skipMappingsBefore?: boolean;
		skipMappingsAfter?: boolean;
		context?: Function;
		chainable?: boolean;
		fromMapper?: boolean;
		metadata?: Events.MiddlewareMetadata;
		middlewareBeforeContext?: EventsMiddlewareBeforeContext<EventNameType, EmitStatesExtType>;
		middlewareAfterContext?: EventsMiddlewareAfterContext<EventNameType, EmitStatesExtType>;
	}

	export type EmitStatesOptionable<EventNameType, EmitStatesExtType extends object> = IEmitStatesOptionable<EventNameType, EmitStatesExtType> & EmitStatesExtType;

	export interface IEmitStates<EventNameType, EmitStatesExtType extends object> {
		skipMiddlewaresBefore: boolean;
		skipMiddlewaresAfter: boolean;
		skipMappingsBefore: boolean;
		skipMappingsAfter: boolean;
		context: Function;
		chainable: boolean;
		fromMapper: boolean;
		metadata: Events.MiddlewareMetadata;
		middlewareBeforeContext: EventsMiddlewareBeforeContext<EventNameType, EmitStatesExtType>;
		middlewareAfterContext: EventsMiddlewareAfterContext<EventNameType, EmitStatesExtType>;
	}

	export type EmitStates<EventNameType, EmitStatesExtType extends object> = IEmitStates<EventNameType, EmitStatesExtType> & EmitStatesExtType;

	export interface MiddlewareStates<EventNameType, EmitStatesExtType extends object> {
		context: Events<EventNameType, EmitStatesExtType>;
		emitStates: Events.EmitStatesOptionable<EventNameType, EmitStatesExtType> | null;
		eventName: EventName<EventNameType>;
		metadata: MiddlewareMetadata;
		rejected: boolean;
		returnValue: undefined | unknown;
		arguments: unknown[];
		skipped: boolean;
	}

	export type ProcessMappingsResult = {
		rejected: boolean;
		returnValue: undefined | unknown;
	}
}

class EventsMiddlewareContextBasic<EventNameType, EmitStatesExtType extends object> {
	protected states: Events.MiddlewareStates<EventNameType, EmitStatesExtType>;

	constructor(eventName: Events.EventName<EventNameType>, context: Events<EventNameType, EmitStatesExtType>, emitStates: Events.EmitStatesOptionable<EventNameType, EmitStatesExtType> | null, metadata: Events.MiddlewareMetadata) {
		this.states = {
			context,
			eventName,
			metadata,
			emitStates,
			skipped    : false,
			rejected   : false,
			returnValue: undefined,
			arguments  : []
		};
	}

	/** @description Get middleware config */
	getStates(): Events.MiddlewareStates<EventNameType, EmitStatesExtType> {
		return this.states;
	}

	/** @description Get event name */
	getEventName(): Events.EventName<EventNameType> {
		return this.states.eventName;
	}

	/** @description Get metadata */
	getMetadata<T = unknown>(name: string): T {
		return this.states.metadata[name] as T;
	}

	/** @description Set metadata */
	setMetadata<T = unknown>(name: string, data: T): void {
		this.states.metadata[name] = data;
	}

	/** @description Reject event flow */
	reject<T = any>(returnValue: T): void {
		this.states.rejected = true;
		this.states.returnValue = returnValue;
	}
}

export class EventsMiddlewareBeforeContext<EventNameType, EmitStatesExtType extends object> extends EventsMiddlewareContextBasic<EventNameType, EmitStatesExtType> {
	constructor(eventName: Events.EventName<EventNameType>, args: unknown[], context: Events<EventNameType, EmitStatesExtType>, emitStates: Events.EmitStatesOptionable<EventNameType, EmitStatesExtType> | null, metadata: Events.MiddlewareMetadata) {
		super(eventName, context, emitStates, metadata);
		this.states.arguments = args;
	}

	/** @description Skip other middlewares */
	skip(): void {
		this.states.skipped = true;
	}

	/** @description Get arguments */
	getArguments<T extends unknown[] = unknown[]>(): T {
		return this.states.arguments as T;
	}

	/** @description Set arguments */
	setArguments<T extends unknown[] = unknown[]>(args: T): void {
		this.states.arguments = args;
	}
}

export class EventsMiddlewareAfterContext<EventNameType, EmitStatesExtType extends object> extends EventsMiddlewareContextBasic<EventNameType, EmitStatesExtType> {
	constructor(eventName: Events.EventName<EventNameType>, context: Events<EventNameType, EmitStatesExtType>, emitConfig: Events.EmitStatesOptionable<EventNameType, EmitStatesExtType> | null, metadata: Events.MiddlewareMetadata) {
		super(eventName, context, emitConfig, metadata);
	}

	/** @description Get return value */
	getReturn<T = unknown>(): Events.EmitResult<T> {
		return this.states.returnValue as Events.EmitResult<T>;
	}

	/** @description Set return value */
	setReturn<T = unknown>(returnValue: T): void {
		this.states.returnValue = returnValue;
	}
}

const eventsConfigDefault = {
	metadata        : {},
	defaultChain    : true,
	eventIdPrefix   : '#',
	eventIdPrefixMW : '@',
	eventIdMask     : 'xxxxxxxxxxxxxxxxxx-xxxxxx',
	instanceIdPrefix: '$',
	instanceIdMask  : 'xxxxxxxxxxxxxxxxxx-xxxxxx'
};

type EventNameTypeDefault = string | number | symbol;

export class EventsEmit<EventNameType = EventNameTypeDefault, EmitStatesExtType extends object = {}> {
	private readonly config: Events.Config = eventsConfigDefault;
	private mapEmitOnce: Events<EventNameType, EmitStatesExtType> | null;
	private instance: Events<EventNameType, EmitStatesExtType>;

	constructor(config: Events.ConfigOptionable = {}, mapEmitOnce: Events<EventNameType, EmitStatesExtType> | null = null) {
		Object.assign(this.config, config);

		this.mapEmitOnce = mapEmitOnce;
		this.instance = new Events<EventNameType, EmitStatesExtType>(config, mapEmitOnce);
	}

	/** @description Event emit (call) and return first value */
	async emitOnce<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<ReturnType | undefined> {
		return this.instance.emitOnce<ArgsType, ReturnType>(name, ...args);
	}

	/** @description Event emit (call) */
	async emit<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.instance.emit<ArgsType, ReturnType>(name, ...args);
	}

	/** @description Event emit (call) as parallel */
	async emitParallel<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.instance.emitParallel<ArgsType, ReturnType>(name, ...args);
	}

	/** @description Event emit (call) as chain */
	async emitChain<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.instance.emitChain<ArgsType, ReturnType>(name, ...args);
	}

	/** @description Advanced event emit */
	async emitEx<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, states: Events.EmitStatesOptionable<EventNameType, EmitStatesExtType> | null, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.instance.emitEx<ArgsType, ReturnType>(name, states, ...args);
	}
}

export class Events<EventNameType = string | number | symbol, EmitStatesExtType extends object = {}> {
	//#region Properties
	private readonly config: Events.Config = eventsConfigDefault;

	private states: Events.States<EventNameType, EmitStatesExtType> = {
		instanceId       : tools.UID(this.config.instanceIdPrefix, this.config.instanceIdMask),
		events           : new Map(),
		mappersBefore    : new Map(),
		mappersAfter     : new Map(),
		middlewaresBefore: new Map(),
		middlewaresAfter : new Map()
	};

	private mapEmitOnce: Events<EventNameType, EmitStatesExtType> | null;
	//#endregion

	//#region Constructor
	constructor(config: Events.ConfigOptionable = {}, mapEmitOnce: Events<EventNameType, EmitStatesExtType> | null = null) {
		this.config = Object.assign(config, this.config, config);
		this.reset();

		this.mapEmitOnce = mapEmitOnce;
		if (this.mapEmitOnce) {
			this.mapEventsBefore(this.mapEmitOnce);
		}
	}

	//#endregion

	//#region Tools
	private getEventId(): Events.EventId {
		return tools.UID(this.config.eventIdPrefix, this.config.eventIdMask);
	}

	/** @description Clear event's list */
	clear(): void {
		this.states.events.clear();
	}

	/** @description Reset all states */
	reset(): void {
		if (this.mapEmitOnce) {
			this.unMapEventsBefore(this.mapEmitOnce);
			this.mapEmitOnce = null;
		}

		this.clear();
		this.states.mappersBefore.clear();
		this.states.mappersAfter.clear();
		this.states.middlewaresAfter.clear();
		this.states.middlewaresBefore.clear();
	}

	/** @description Get events names by RegExp pattern */
	getEvents(findStr: string | RegExp | null = null): Events.EventNames<EventNameType> {
		const eventsList = [...this.states.events.keys()];

		if (findStr === null) return eventsList;

		return tools.iterate(eventsList, (name) => {
			if (!(name as unknown as string)?.toString()) return;

			return (name as unknown as string).toString().match(tools.isRegExp(findStr) ? findStr as RegExp : new RegExp(`^${findStr}$`, 'gi')) ? name : undefined;
		}, []) as Events.EventNames<EventNameType>;
	}

	/** @description Check event exists */
	exists(what: Events.EventName<EventNameType> | RegExp, inMappingsToo: boolean = false): boolean {
		let ret = false;

		if (inMappingsToo) {
			tools.iterate([...this.states.mappersBefore.keys(), ...this.states.mappersAfter.keys()], (mapping, _, iter) => {
				ret = mapping.exists(what, true);

				if (ret) iter.break();
			});
			if (ret) return true;
		}

		if (tools.isRegExp(what)) {
			return !!this.getEvents(what as RegExp).length;
		}

		tools.iterate([...this.states.events.keys()], (eventName, _, iter) => {
			if (eventName !== what as Events.EventName<EventNameType>) return;

			ret = true;
			iter.break();
		});

		return ret;
	}

	//#endregion

	//#region On/off-like
	/** @description Register event */
	on<ArgsType extends any[] = any[], ReturnType = any>(name: Events.EventName<EventNameType>, cb: Events.EventCallback<EventNameType, ArgsType, ReturnType, EmitStatesExtType>): Events.EventId {
		const id = this.getEventId();

		const eventHandlers = (this.states.events.has(name) ? this.states.events.get(name) : {}) as Events.EventHandlers;
		eventHandlers[id] = new EventHandler(cb, Date.now());
		this.states.events.set(name, eventHandlers);

		return id;
	}

	/** @description Register event and self-remove after first call */
	once<ArgsType extends any[] = any[], ReturnType = any>(name: Events.EventName<EventNameType>, cb: Events.EventCallback<EventNameType, ArgsType, ReturnType>): Events.EventId {
		const self = this;
		const id = this.on(name, function (...args: ArgsType) {
			self.offById(id);

			return cb.apply(this, args);
		});

		return id;
	}

	/** @description Await event emit */
	wait(name: Events.EventName<EventNameType>, timeout: number = -1): Promise<Array<unknown> | null> {
		return new Promise((resolve) => {
			const id = this.once(name, async (...args: unknown[]) => resolve(args));

			if (timeout > 0) {
				setTimeout(() => {
					this.offById(id);

					resolve(null);
				}, timeout);
			}
		});
	}

	/** @description Remove event by EventId or array of EventId */
	offById(targetId: Events.EventId | Events.EventIds): Events.AffectedEventId | Events.AffectedEventIds {
		const _off = (currentId: Events.EventId) => {
			let found = null;

			tools.iterate([...this.states.events.values()], (eventHandlers, _, iter) => {
				if (!eventHandlers[currentId]) return;

				found = currentId;
				delete eventHandlers[currentId];

				iter.break();
			});


			return found;
		};

		if (tools.isArray(targetId)) {
			return tools.iterate(targetId as Events.EventIds, (row) => _off(row), [] as Events.AffectedEventIds);
		}

		return _off(targetId as Events.EventId);
	}

	/** @description Remove event by EventName */
	off(name: Events.EventName<EventNameType>): Events.AffectedEventIds | null {
		if (!this.states.events.has(name)) return null;

		const affectedIds = Object.keys(this.states.events.get(name) as Events.EventHandlers);
		this.states.events.delete(name);

		return affectedIds;
	}

	//#endregion

	//#region Middlewares
	/** @description Add 'before' middleware */
	useBefore(handler: Events.MiddlewareBeforeCallback<EventNameType, EmitStatesExtType>, position: number | null = null): number {
		if (position === null) {
			position = this.states.middlewaresBefore.size;
		}

		this.states.middlewaresBefore.set(position, handler);

		return position;
	}

	/** @description Remove 'before' middleware by MiddlewareBefore position */
	unUseBefore(handlerPosition: number): void {
		this.states.middlewaresBefore.delete(handlerPosition);
	}

	/** @description Add  'after' middleware */
	useAfter(handler: Events.MiddlewareAfterCallback<EventNameType, EmitStatesExtType>, position: number | null = null): number {
		if (position === null) {
			position = this.states.middlewaresAfter.size;
		}

		this.states.middlewaresAfter.set(position, handler);

		return position;
	}

	/** @description Remove 'after' middleware by MiddlewareAfter id */
	unUseAfter(handlerPosition: number): void {
		this.states.middlewaresAfter.delete(handlerPosition);
	}

	//#endregion

	//#region Mappers
	private mapEvents(source: Events.MappedEvents<EventNameType, EmitStatesExtType>, target: Events<EventNameType, EmitStatesExtType>, list: Events.EventNames<EventNameType> | null) {
		let mappers = source.get(target);

		if (list === null) {
			mappers = null;
		} else {
			if (!tools.isSet(mappers)) {
				mappers = new Set();
			}

			tools.iterate(list, (row) => {
				(mappers as Events.MappedEventsSet<EventNameType>).add(row);
			});
		}

		source.set(target, mappers as Events.MappedEventsList<EventNameType>);
	}

	private unMap(source: Events.MappedEvents<EventNameType, EmitStatesExtType>, target: Events<EventNameType, EmitStatesExtType>, list: Events.EventNames<EventNameType> | null): void {
		if (list === null) {
			if (source.has(target)) source.delete(target);

			return;
		}

		let mappers = source.get(target);
		if (!tools.isSet(mappers)) return;

		tools.iterate(list, (row) => {
			(mappers as Events.MappedEventsSet<EventNameType>).delete(row);
		});

		source.set(target, mappers as Events.MappedEventsSet<EventNameType>);
	}

	/** @description Map events 'before' by list, or all if not defined */
	mapEventsBefore(target: Events<EventNameType, EmitStatesExtType>, list: Events.EventNames<EventNameType> | null = null): void {
		this.mapEvents(this.states.mappersBefore, target, list);
	}

	/** @description Remove 'before' event mapper by list, or all if not defined */
	unMapEventsBefore(target: Events<EventNameType, EmitStatesExtType>, list: Events.EventNames<EventNameType> | null = null): void {
		this.unMap(this.states.mappersBefore, target, list);
	}

	/** @description Map events 'after' by list, or all if not defined */
	mapEventsAfter(target: Events<EventNameType, EmitStatesExtType>, list: Events.EventNames<EventNameType> | null = null): void {
		this.mapEvents(this.states.mappersAfter, target, list);
	}

	/** @description Remove 'after' event mapper by list, or all if not defined */
	unMapEventsAfter(target: Events<EventNameType, EmitStatesExtType>, list: Events.EventNames<EventNameType> | null = null): void {
		this.unMap(this.states.mappersAfter, target, list);
	}

	//#endregion

	//#region EmitEx
	private async processMappings<ReturnType>(target: Events.MappedEvents<EventNameType, EmitStatesExtType>, name: Events.EventName<EventNameType>, emitStates: Events.EmitStates<EventNameType, EmitStatesExtType>, ret: Events.EmitResult<ReturnType>, isAfter: boolean): Promise<Events.ProcessMappingsResult | null> {
		let out: Events.ProcessMappingsResult | null = null;

		await tools.iterate(target, async (events, instance, iter) => {
			if (events !== null) {
				if ([...events].indexOf(name) === -1) return;
			}

			const states = {
				metadata          : emitStates.metadata,
				chainable         : emitStates.chainable,
				context           : emitStates.context,
				fromMapper        : true,
				skipMappingsBefore: true,
				skipMappingsAfter : true
			} as Events.EmitStatesOptionable<EventNameType, EmitStatesExtType>;
			const mapRets = await instance.emitEx(name, states, ...emitStates.middlewareBeforeContext.getStates().arguments);

			const mwStates: Events.MiddlewareStates<EventNameType, EmitStatesExtType> | undefined =
				      isAfter
				      ? states?.middlewareAfterContext?.getStates()
				      : states?.middlewareBeforeContext?.getStates();
			if (mwStates?.rejected) {
				out = {
					rejected   : true,
					returnValue: mwStates.returnValue
				};

				iter.break();
				return;
			}

			tools.iterate(mapRets, (row, eventId) => {
				ret[eventId] = row as ReturnType;
			});
		});

		return out;
	}

	private async emitExMiddlewaresBefore<ReturnType>(emitStates: Events.EmitStates<EventNameType, EmitStatesExtType>): Promise<Events.MiddlewareStates<EventNameType, EmitStatesExtType>> {
		const idxs = [...this.states.middlewaresBefore.keys()].sort((a, b) => a - b);

		await tools.iterate(idxs, async (idx, _, iter) => {
			const mw = this.states.middlewaresBefore.get(idx) as Events.MiddlewareBeforeCallback<EventNameType, EmitStatesExtType>;
			await mw(emitStates.middlewareBeforeContext);

			const {
				      skipped,
				      rejected: mwRejected
			      } = emitStates.middlewareBeforeContext.getStates();

			if (mwRejected || skipped) {
				iter.break();
			}
		});

		return emitStates.middlewareBeforeContext.getStates();
	}

	private async emitExMiddlewaresAfter<ReturnType>(emitStates: Events.EmitStates<EventNameType, EmitStatesExtType>): Promise<Events.MiddlewareStates<EventNameType, EmitStatesExtType>> {
		const idxs = [...this.states.middlewaresAfter.keys()].sort((a, b) => a - b);

		await tools.iterate(idxs, async (idx, _, iter) => {
			const mw = this.states.middlewaresAfter.get(idx) as Events.MiddlewareAfterCallback<EventNameType, EmitStatesExtType>;
			await mw(emitStates.middlewareAfterContext);

			const {
				      skipped,
				      rejected: mwRejected
			      } = emitStates.middlewareAfterContext.getStates();

			if (mwRejected || skipped) {
				iter.break();
			}
		});

		return emitStates.middlewareAfterContext.getStates();
	}

	private getEmitExDefaultStates(name: Events.EventName<EventNameType>, states: Events.EmitStatesOptionable<EventNameType, EmitStatesExtType> | null, args: unknown[], metadata: Events.MiddlewareMetadata): Events.EmitStates<EventNameType, EmitStatesExtType> {
		return Object.assign(states, {
			chainable              : this.config.defaultChain,
			context                : this,
			skipMappingsAfter      : false,
			skipMappingsBefore     : false,
			skipMiddlewaresAfter   : false,
			skipMiddlewaresBefore  : false,
			fromMapper             : false,
			metadata               : metadata,
			middlewareBeforeContext: new EventsMiddlewareBeforeContext<EventNameType, EmitStatesExtType>(name, args, this, states, metadata),
			middlewareAfterContext : new EventsMiddlewareAfterContext<EventNameType, EmitStatesExtType>(name, this, states, metadata)
		}, states) as unknown as Events.EmitStates<EventNameType, EmitStatesExtType>;
	}

	private async emitExProcessHandlers<ReturnType>(emitStates: Events.EmitStates<EventNameType, EmitStatesExtType>, eventHandlers: Events.EventHandlers, ret: Events.EmitResult<ReturnType>) {
		const iterateHandlers = async (row: EventHandler, id: string, iter: tools.IIteration) => {
			iter.key(id);
			ret[id] = await row.cb.apply(emitStates, emitStates.middlewareBeforeContext.getArguments());
		};

		if (emitStates.chainable) {
			await tools.iterate(eventHandlers, iterateHandlers);
		} else {
			await tools.iterateParallel(eventHandlers, iterateHandlers);
		}
	}

	private async beforeEmitExProcessHandlers<ReturnType>(emitStates: Events.EmitStates<EventNameType, EmitStatesExtType>, name: Events.EventName<EventNameType>, ret: Events.EmitResult<ReturnType>): Promise<void | Events.EmitResult<ReturnType>> {
		if (!emitStates.skipMappingsBefore) {
			const res = await this.processMappings(this.states.mappersBefore, name, emitStates, ret, false);
			if (res && res?.rejected) return res.returnValue as Events.EmitResult<ReturnType>;
		}

		if (!emitStates.skipMiddlewaresBefore) {
			const {
				      rejected,
				      returnValue
			      } = await this.emitExMiddlewaresBefore<ReturnType>(emitStates);
			if (rejected) {
				return returnValue as Events.EmitResult<ReturnType>;
			}
		}
	}

	private async afterEmitExProcessHandlers<ReturnType>(emitStates: Events.EmitStates<EventNameType, EmitStatesExtType>, name: Events.EventName<EventNameType>, ret: Events.EmitResult<ReturnType>): Promise<void | Events.EmitResult<ReturnType>> {
		if (!emitStates.skipMappingsAfter) {
			const res = await this.processMappings(this.states.mappersAfter, name, emitStates, ret, true);
			if (res && res?.rejected) return res.returnValue as Events.EmitResult<ReturnType>;
		}

		if (!emitStates.skipMiddlewaresAfter) {
			const {
				      rejected,
				      returnValue
			      } = await this.emitExMiddlewaresAfter(emitStates);
			if (rejected) {
				return returnValue as Events.EmitResult<ReturnType>;
			}
		}
	}

	/** @description Advanced event emit */
	async emitEx<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, states: Events.EmitStatesOptionable<EventNameType, EmitStatesExtType> | null, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		const _return = <T>(out: T): T => {
			if (this.mapEmitOnce) {
				this.reset();
			}

			return out;
		};

		let ret: Events.EmitResult<ReturnType> = {};

		states = (states || {}) as Events.EmitStatesOptionable<EventNameType, EmitStatesExtType>;

		const metadata: Events.MiddlewareMetadata = states?.metadata || {};
		if (states?.metadata) delete states.metadata;

		if (this.config.metadata) {
			Object.assign(metadata, this.config.metadata);
		}

		const emitStates: Events.EmitStates<EventNameType, EmitStatesExtType> = this.getEmitExDefaultStates(name, states, args, metadata);
		const eventHandlers = this.states.events.get(name) as Events.EventHandlers;

		const beforeProcessRet = await this.beforeEmitExProcessHandlers<ReturnType>(emitStates, name, ret);
		if (!tools.isUndefined(beforeProcessRet)) return _return(beforeProcessRet as Events.EmitResult<ReturnType>);

		if (eventHandlers) {
			await this.emitExProcessHandlers<ReturnType>(emitStates, eventHandlers, ret);
		}

		emitStates.middlewareAfterContext.setReturn(ret);

		const afterProcessRet = await this.afterEmitExProcessHandlers(emitStates, name, ret);
		if (!tools.isUndefined(afterProcessRet)) return _return(afterProcessRet as Events.EmitResult<ReturnType>);

		return _return(emitStates.middlewareAfterContext.getReturn());
	}

	//#endregion

	//#region Emit-like
	/** @description Event emit (call) and return first value */
	async emitOnce<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<ReturnType | undefined> {
		const rows = await this.emitEx<ArgsType, ReturnType>(name, null, ...args);

		const rowsKeys = Object.keys(rows);
		if (!rowsKeys.length) return;

		return rows[rowsKeys[0]];
	}

	/** @description Event emit (call) */
	async emit<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.config.defaultChain
		       ? this.emitChain<ArgsType, ReturnType>(name, ...args)
		       : this.emitParallel<ArgsType, ReturnType>(name, ...args);
	}

	/** @description Event emit (call) as parallel */
	async emitParallel<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.emitEx<ArgsType, ReturnType>(name, {chainable: false} as Events.EmitStatesOptionable<EventNameType, EmitStatesExtType>, ...args);
	}

	/** @description Event emit (call) as chain */
	async emitChain<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.emitEx<ArgsType, ReturnType>(name, {chainable: true} as Events.EmitStatesOptionable<EventNameType, EmitStatesExtType>, ...args);
	}

	//#endregion
}

export default {
	EventHandler,
	EventsMiddlewareBeforeContext,
	EventsMiddlewareAfterContext,
	Events
};
