import {isArray, isRegExp, isSet, isUndefined} from '@osmium/is';
import {Iterate, iterateAsync, iterateParallel, iterateSync} from '@osmium/iterate';
import MiddlewareMetadataDefault = Events.MiddlewareMetadataDefault;

function UID(prefix: string) {
	let u = '',
		i = 0;

	while (i++ < 36) {
		const c = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxx'[i - 1],
			r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		u += c == '-' || c == '4' ? c : v.toString(16);
	}

	return `${prefix}${u}`;
}

export class EventHandler {
	public cb: Function;
	public time: number;

	constructor(cb: Function, time: number) {
		this.cb = cb;
		this.time = time;
	}
}

type EventNameTypeDefault = string | number | symbol;

class EventsMiddlewareContextBasic<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> {
	protected states: Events.MiddlewareStates<EventNameType, MiddlewareMetadataType>;

	constructor(
		eventName: Events.EventName<EventNameType>,
		context: Events<EventNameType, MiddlewareMetadataType>,
		emitStates: Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>> | null,
		metadata: MiddlewareMetadataType
	) {
		this.states = {
			context,
			eventName,
			metadata,
			emitStates,
			skipped: false,
			rejected: false,
			returnValue: undefined,
			arguments: []
		};
	}

	/** @description Get middleware config */
	getStates(): Events.MiddlewareStates<EventNameType, MiddlewareMetadataType> {
		return this.states;
	}

	/** @description Get event name */
	getEventName(): Events.EventName<EventNameType> {
		return this.states.eventName;
	}

	/** @description Get metadata */
	getMetadata<K extends keyof MiddlewareMetadataType>(name: K): MiddlewareMetadataType[K] {
		return this.states.metadata[name];
	}

	/** @description Set metadata */
	setMetadata<K extends keyof MiddlewareMetadataType, ValueType = unknown>(name: K, value: MiddlewareMetadataType[K]): void {
		this.states.metadata[name] = value;
	}

	setEmitStates<ValueType = unknown>(key: string, value: ValueType) {
		(this.states.emitStates as any)[key] = value;
	}

	/** @description Reject event flow */
	reject<ReturnValueType = any>(returnValue: ReturnValueType): void {
		this.states.rejected = true;
		this.states.returnValue = returnValue;
	}
}

export class EventsMiddlewareBeforeContext<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> extends EventsMiddlewareContextBasic<
	EventNameType,
	MiddlewareMetadataType
> {
	constructor(
		eventName: Events.EventName<EventNameType>,
		args: unknown[],
		context: Events<EventNameType, MiddlewareMetadataType>,
		emitStates: Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>> | null,
		metadata: MiddlewareMetadataType
	) {
		super(eventName, context, emitStates, metadata);
		this.states.arguments = args;
	}

	/** @description Skip other middlewares */
	skip(): void {
		this.states.skipped = true;
	}

	/** @description Get arguments */
	getArguments<ArgumentsType extends unknown[] = unknown[]>(): ArgumentsType {
		return this.states.arguments as ArgumentsType;
	}

	/** @description Set arguments */
	setArguments<ArgumentsType extends unknown[] = unknown[]>(args: ArgumentsType): void {
		this.states.arguments = args;
	}
}

export class EventsMiddlewareAfterContext<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> extends EventsMiddlewareContextBasic<
	EventNameType,
	MiddlewareMetadataType
> {
	constructor(
		eventName: Events.EventName<EventNameType>,
		context: Events<EventNameType, MiddlewareMetadataType>,
		emitConfig: Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>> | null,
		metadata: MiddlewareMetadataType
	) {
		super(eventName, context, emitConfig, metadata);
	}

	/** @description Get return value */
	getReturn<ReturnValueType = unknown>(): Events.EmitResult<ReturnValueType> {
		return this.states.returnValue as Events.EmitResult<ReturnValueType>;
	}

	/** @description Set return value */
	setReturn<ReturnValueType = unknown>(returnValue: ReturnValueType): void {
		this.states.returnValue = returnValue;
	}
}

export class EventsEmit<EventNameType = EventNameTypeDefault, MiddlewareMetadataType extends MiddlewareMetadataDefault = MiddlewareMetadataDefault> {
	public readonly config: Events.Config<MiddlewareMetadataType>;

	private mapEmitOnce: Events<EventNameType, MiddlewareMetadataType> | null;
	private instance: Events<EventNameType, MiddlewareMetadataType>;

	constructor(config: Partial<Events.Config<MiddlewareMetadataType>> = {}, mapEmitOnce: Events<EventNameType, MiddlewareMetadataType> | null = null) {
		this.config = {
			metadata: {} as MiddlewareMetadataType,
			defaultChain: true,
			eventIdPrefix: '#',
			eventIdPrefixMW: '@',
			eventIdMask: 'xxxxxxxxxxxxxxxxxx-xxxxxx',
			instanceIdPrefix: '$',
			instanceIdMask: 'xxxxxxxxxxxxxxxxxx-xxxxxx'
		};

		this.mapEmitOnce = mapEmitOnce;

		this.instance = new Events<EventNameType, MiddlewareMetadataType>(config, mapEmitOnce);
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
	async emitEx<ArgsType extends any[] = any[], ReturnType = unknown>(
		name: Events.EventName<EventNameType>,
		states: Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>> | null,
		...args: ArgsType
	): Promise<Events.EmitResult<ReturnType>> {
		return this.instance.emitEx<ArgsType, ReturnType>(name, states, ...args);
	}
}

export class Events<EventNameType = string | number | symbol, MiddlewareMetadataType extends MiddlewareMetadataDefault = MiddlewareMetadataDefault> {
	//#region Properties
	private readonly config: Events.Config<MiddlewareMetadataType>;

	states: Events.States<EventNameType, MiddlewareMetadataType> = {
		instanceId: UID('$'),
		events: new Map(),
		mappersBefore: new Map(),
		mappersAfter: new Map(),
		middlewaresBefore: new Map(),
		middlewaresAfter: new Map()
	};

	private mapEmitOnce: Events<EventNameType, MiddlewareMetadataType> | null;
	//#endregion

	//#region Static
	/** @description Make UID */
	static UID(prefix: string): string {
		return UID(prefix);
	}

	//#endregion

	//#region Constructor
	constructor(config: Partial<Events.Config<MiddlewareMetadataType>> = {}, mapEmitOnce: Events<EventNameType, MiddlewareMetadataType> | null = null) {
		this.config = {
			metadata: {} as MiddlewareMetadataType,
			defaultChain: true,
			eventIdPrefix: '#',
			eventIdPrefixMW: '@',
			eventIdMask: 'xxxxxxxxxxxxxxxxxx-xxxxxx',
			instanceIdPrefix: '$',
			instanceIdMask: 'xxxxxxxxxxxxxxxxxx-xxxxxx'
		};

		this.reset();

		this.mapEmitOnce = mapEmitOnce;

		if (this.mapEmitOnce) {
			this.mapEventsBefore(this.mapEmitOnce);
		}
	}

	//#endregion

	//#region Tools
	private getEventId(): Events.EventId {
		return UID(this.config.eventIdPrefix);
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

		return iterateSync(
			eventsList,
			(name: EventNameType) => {
				if (!name?.toString()) return;

				return name.toString().match(isRegExp(findStr) ? (findStr as RegExp) : new RegExp(`^${findStr}$`, 'gi')) ? name : undefined;
			},
			[]
		) as Events.EventNames<EventNameType>;
	}

	/** @description Check event exists */
	exists(what: Events.EventName<EventNameType> | RegExp, inMappingsToo: boolean = false): boolean {
		let ret = false;

		if (inMappingsToo) {
			iterateSync([...this.states.mappersBefore.keys(), ...this.states.mappersAfter.keys()], (mapping, _, iter) => {
				ret = mapping.exists(what, true);

				if (ret) iter.break();
			});

			if (ret) return true;
		}

		if (isRegExp(what)) {
			return !!this.getEvents(what as RegExp).length;
		}

		iterateSync([...this.states.events.keys()], (eventName, _, iter) => {
			if (eventName !== (what as Events.EventName<EventNameType>)) return;

			ret = true;

			iter.break();
		});

		return ret;
	}

	//#endregion

	//#region On/off-like
	/** @description Register event */
	on<ArgsType extends any[] = any[], ReturnType = any, ThisExtType extends object = {}>(
		name: Events.EventName<EventNameType>,
		cb: Events.EventCallback<EventNameType, MiddlewareMetadataType, ArgsType, ReturnType, ThisExtType>
	): Events.EventId {
		const id = this.getEventId();

		const eventHandlers = (this.states.events.has(name) ? this.states.events.get(name) : {}) as Events.EventHandlers;
		eventHandlers[id] = new EventHandler(cb, Date.now());

		this.states.events.set(name, eventHandlers);

		return id;
	}

	/** @description Register event and self-remove after first call */
	once<ArgsType extends any[] = any[], ReturnType = any, ThisExtType extends object = {}>(
		name: Events.EventName<EventNameType>,
		cb: Events.EventCallback<EventNameType, MiddlewareMetadataType, ArgsType, ReturnType, ThisExtType>
	): Events.EventId {
		const self = this;

		const id = this.on<ArgsType, ReturnType, ThisExtType>(name, function (...args: ArgsType) {
			self.offById(id);

			return cb.apply(this, args);
		});

		return id;
	}

	/** @description Await event emit */
	wait<ReturnType extends any[] = []>(name: Events.EventName<EventNameType>, timeout: number = -1): Promise<ReturnType | null> {
		return new Promise((resolve) => {
			let tId: number | null = null;
			const id = this.once(name, async (...args: unknown[]) => {
				if (tId !== null) clearInterval(tId);

				resolve(args as ReturnType);
			});

			if (timeout < 0) return;

			tId = +setTimeout(() => {
				tId = null;
				this.offById(id);

				resolve(null);
			}, timeout);
		});
	}

	/** @description Remove event by EventId or array of EventId */
	offById(targetId: Events.EventId | Events.EventIds): Events.AffectedEventId | Events.AffectedEventIds {
		const _off = (currentId: Events.EventId) => {
			let found = null;

			iterateSync(this.states.events, (eventHandlers, eventName, iter) => {
				if (!eventHandlers[currentId]) return;

				found = currentId;
				delete eventHandlers[currentId];

				if (!Object.keys(eventHandlers).length) {
					this.states.events.delete(eventName);
				}

				iter.break();
			});

			return found;
		};

		if (isArray(targetId)) {
			return iterateSync(targetId as Events.EventIds, (row) => _off(row), [] as Events.AffectedEventIds);
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
	useBefore(handler: Events.MiddlewareBeforeCallback<EventNameType, MiddlewareMetadataType>, position: number | null = null): number {
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

	/** @description Add 'after' middleware */
	useAfter(handler: Events.MiddlewareAfterCallback<EventNameType, MiddlewareMetadataType>, position: number | null = null): number {
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
	private mapEvents(
		source: Events.MappedEvents<EventNameType, MiddlewareMetadataType>,
		target: Events<EventNameType, MiddlewareMetadataType>,
		list: Events.EventNames<EventNameType> | null
	) {
		let mappers = source.get(target);

		if (list === null) {
			mappers = null;
		} else {
			if (!isSet(mappers)) {
				mappers = new Set();
			}

			iterateSync(list, (row) => {
				(mappers as Events.MappedEventsSet<EventNameType>).add(row);
			});
		}

		source.set(target, mappers as Events.MappedEventsList<EventNameType>);
	}

	private unMap(
		source: Events.MappedEvents<EventNameType, MiddlewareMetadataType>,
		target: Events<EventNameType, MiddlewareMetadataType>,
		list: Events.EventNames<EventNameType> | null
	): void {
		if (list === null) {
			if (source.has(target)) source.delete(target);

			return;
		}

		let mappers = source.get(target);
		if (!isSet(mappers)) return;

		iterateSync(list, (row) => {
			(mappers as Events.MappedEventsSet<EventNameType>).delete(row);
		});

		source.set(target, mappers as Events.MappedEventsSet<EventNameType>);
	}

	/** @description Map events 'before' by list, or all if not defined */
	mapEventsBefore(target: Events<EventNameType, MiddlewareMetadataType>, list: Events.EventNames<EventNameType> | null = null): void {
		this.mapEvents(this.states.mappersBefore, target, list);
	}

	/** @description Remove 'before' event mapper by list, or all if not defined */
	unMapEventsBefore(target: Events<EventNameType, MiddlewareMetadataType>, list: Events.EventNames<EventNameType> | null = null): void {
		this.unMap(this.states.mappersBefore, target, list);
	}

	/** @description Map events 'after' by list, or all if not defined */
	mapEventsAfter(target: Events<EventNameType, MiddlewareMetadataType>, list: Events.EventNames<EventNameType> | null = null): void {
		this.mapEvents(this.states.mappersAfter, target, list);
	}

	/** @description Remove 'after' event mapper by list, or all if not defined */
	unMapEventsAfter(target: Events<EventNameType, MiddlewareMetadataType>, list: Events.EventNames<EventNameType> | null = null): void {
		this.unMap(this.states.mappersAfter, target, list);
	}

	//#endregion

	//#region EmitEx
	private async processMappings<ReturnType>(
		target: Events.MappedEvents<EventNameType, MiddlewareMetadataType>,
		name: Events.EventName<EventNameType>,
		emitStates: Events.EmitStates<EventNameType, MiddlewareMetadataType>,
		ret: Events.EmitResult<ReturnType>,
		isAfter: boolean
	): Promise<Events.ProcessMappingsResult | null> {
		let out: Events.ProcessMappingsResult | null = null;

		await iterateAsync(target, async (events, instance, iter) => {
			if (instance === emitStates.context) return;

			if (events !== null) {
				if ([...events].indexOf(name) === -1) return;
			}

			const states: Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>> = {
				metadata: emitStates.metadata,
				chainable: emitStates.chainable,
				context: emitStates.context,
				fromMapper: true
			};

			const mapRets = await instance.emitEx(name, states, ...emitStates.middlewareBeforeContext.getStates().arguments);

			const mwStates: Events.MiddlewareStates<EventNameType, MiddlewareMetadataType> | undefined = isAfter
				? states?.middlewareAfterContext?.getStates()
				: states?.middlewareBeforeContext?.getStates();

			if (mwStates?.rejected) {
				out = {
					rejected: true,
					returnValue: mwStates.returnValue
				};

				iter.break();
				return;
			}

			iterateSync(mapRets, (row, eventId) => {
				ret[eventId] = row as ReturnType;
			});
		});

		return out;
	}

	private async emitExMiddlewaresBefore<ReturnType>(
		emitStates: Events.EmitStates<EventNameType, MiddlewareMetadataType>
	): Promise<Events.MiddlewareStates<EventNameType, MiddlewareMetadataType>> {
		const idxs = [...this.states.middlewaresBefore.keys()].sort((a, b) => a - b);

		await iterateAsync(idxs, async (idx, _, iter) => {
			const mw = this.states.middlewaresBefore.get(idx) as Events.MiddlewareBeforeCallback<EventNameType, MiddlewareMetadataType>;
			await mw(emitStates.middlewareBeforeContext);

			const {skipped, rejected} = emitStates.middlewareBeforeContext.getStates();

			if (skipped || rejected) {
				iter.break();
			}
		});

		return emitStates.middlewareBeforeContext.getStates();
	}

	private async emitExMiddlewaresAfter<ReturnType>(
		emitStates: Events.EmitStates<EventNameType, MiddlewareMetadataType>
	): Promise<Events.MiddlewareStates<EventNameType, MiddlewareMetadataType>> {
		const idxs = [...this.states.middlewaresAfter.keys()].sort((a, b) => a - b);

		await iterateAsync(idxs, async (idx, _, iter) => {
			const mw = this.states.middlewaresAfter.get(idx) as Events.MiddlewareAfterCallback<EventNameType, MiddlewareMetadataType>;
			await mw(emitStates.middlewareAfterContext);

			const {skipped, rejected} = emitStates.middlewareAfterContext.getStates();
			if (skipped || rejected) {
				iter.break();
			}
		});

		return emitStates.middlewareAfterContext.getStates();
	}

	private getEmitExDefaultStates(
		name: Events.EventName<EventNameType>,
		states: Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>> | null,
		args: unknown[],
		metadata: MiddlewareMetadataType
	): Events.EmitStates<EventNameType, MiddlewareMetadataType> {
		const outStates: Events.EmitStates<EventNameType, MiddlewareMetadataType> = Object.assign(
			{
				chainable: this.config.defaultChain,
				context: this,
				skipMappingsAfter: false,
				skipMappingsBefore: false,
				skipMiddlewaresAfter: false,
				skipMiddlewaresBefore: false,
				fromMapper: false,
				metadata: metadata,
				middlewareBeforeContext: new EventsMiddlewareBeforeContext<EventNameType, MiddlewareMetadataType>(name, args, this, states, metadata),
				middlewareAfterContext: new EventsMiddlewareAfterContext<EventNameType, MiddlewareMetadataType>(name, this, states, metadata),
				sourceMapper: this,
				reject: false
			},
			states
		);

		return Object.assign(states as object, outStates);
	}

	private async emitExProcessHandlers<ReturnType>(
		emitStates: Events.EmitStates<EventNameType, MiddlewareMetadataType>,
		eventHandlers: Events.EventHandlers,
		ret: Events.EmitResult<ReturnType>
	) {
		const iterateHandlers = async (row: EventHandler, id: string, iter: Iterate.Control<any>) => {
			if (emitStates.reject) {
				iter.break();
				return;
			}

			iter.key(id);
			ret[id] = await row.cb.apply(emitStates, emitStates.middlewareBeforeContext.getArguments());
		};

		if (emitStates.chainable) {
			await iterateAsync(eventHandlers, iterateHandlers);
		} else {
			await iterateParallel(eventHandlers, iterateHandlers);
		}
	}

	private async beforeEmitExProcessHandlers<ReturnType>(
		emitStates: Events.EmitStates<EventNameType, MiddlewareMetadataType>,
		name: Events.EventName<EventNameType>,
		ret: Events.EmitResult<ReturnType>
	): Promise<void | Events.EmitResult<ReturnType>> {
		if (!emitStates.skipMappingsBefore) {
			const res = await this.processMappings(this.states.mappersBefore, name, emitStates, ret, false);

			if (res?.rejected) return res.returnValue as Events.EmitResult<ReturnType>;
		}

		if (!emitStates.skipMiddlewaresBefore) {
			const {rejected, returnValue} = await this.emitExMiddlewaresBefore<ReturnType>(emitStates);

			if (rejected) {
				return returnValue as Events.EmitResult<ReturnType>;
			}
		}
	}

	private async afterEmitExProcessHandlers<ReturnType>(
		emitStates: Events.EmitStates<EventNameType, MiddlewareMetadataType>,
		name: Events.EventName<EventNameType>,
		ret: Events.EmitResult<ReturnType>
	): Promise<void | Events.EmitResult<ReturnType>> {
		if (!emitStates.skipMappingsAfter) {
			const res = await this.processMappings(this.states.mappersAfter, name, emitStates, ret, true);

			if (res?.rejected) return res.returnValue as Events.EmitResult<ReturnType>;
		}

		if (!emitStates.skipMiddlewaresAfter) {
			const {rejected, returnValue} = await this.emitExMiddlewaresAfter(emitStates);

			if (rejected) {
				return returnValue as Events.EmitResult<ReturnType>;
			}
		}
	}

	/** @description Advanced event emit */
	async emitEx<ArgsType extends any[] = any[], ReturnType = unknown>(
		name: Events.EventName<EventNameType>,
		states: Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>> | null,
		...args: ArgsType
	): Promise<Events.EmitResult<ReturnType>> {
		const _return = <T>(out: T): T => {
			if (this.mapEmitOnce) {
				this.reset();
			}

			return out;
		};

		let ret: Events.EmitResult<ReturnType> = {};

		states = states ?? {};

		const metadata: MiddlewareMetadataType = states?.metadata ?? ({} as MiddlewareMetadataType);
		if (states?.metadata) delete states.metadata;

		if (this.config.metadata) {
			Object.assign(metadata, this.config.metadata);
		}

		const emitStates: Events.EmitStates<EventNameType, MiddlewareMetadataType> = this.getEmitExDefaultStates(name, states, args, metadata);
		const eventHandlers = this.states.events.get(name) as Events.EventHandlers;

		const beforeProcessRet = await this.beforeEmitExProcessHandlers<ReturnType>(emitStates, name, ret);
		if (!isUndefined(beforeProcessRet)) return _return(beforeProcessRet as Events.EmitResult<ReturnType>);

		if (eventHandlers) {
			await this.emitExProcessHandlers<ReturnType>(emitStates, eventHandlers, ret);
		}

		emitStates.middlewareAfterContext.setReturn(ret);

		const afterProcessRet = await this.afterEmitExProcessHandlers(emitStates, name, ret);
		if (!isUndefined(afterProcessRet)) return _return(afterProcessRet as Events.EmitResult<ReturnType>);

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
		return this.config.defaultChain ? this.emitChain<ArgsType, ReturnType>(name, ...args) : this.emitParallel<ArgsType, ReturnType>(name, ...args);
	}

	/** @description Event emit (call) as parallel */
	async emitParallel<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.emitEx<ArgsType, ReturnType>(name, {chainable: false} as Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>>, ...args);
	}

	/** @description Event emit (call) as chain */
	async emitChain<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>> {
		return this.emitEx<ArgsType, ReturnType>(name, {chainable: true} as Partial<Events.EmitStates<EventNameType, MiddlewareMetadataType>>, ...args);
	}

	//#endregion
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

	export type EventCallback<
		EventNameType,
		MiddlewareMetadataType extends MiddlewareMetadataDefault,
		ArgsType extends any[] = any[],
		ReturnType = void,
		EmitStatesExt extends object = {}
	> = (this: Events.EmitStates<EventNameType, MiddlewareMetadataType> & EmitStatesExt, ...args: ArgsType) => ReturnType | Promise<ReturnType>;

	export type EmitResult<T> = Record<EventId, T>;

	export type MappedEventsSet<EventNameType> = Set<EventName<EventNameType>>;
	export type MappedEventsList<EventNameType> = MappedEventsSet<EventNameType> | null;
	export type MappedEvents<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> = Map<
		Events<EventNameType, MiddlewareMetadataType>,
		MappedEventsList<EventNameType>
	>;

	export type MiddlewareBeforeCallback<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> = (
		context: EventsMiddlewareBeforeContext<EventNameType, MiddlewareMetadataType>
	) => Promise<void>;
	export type MiddlewareAfterCallback<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> = (
		context: EventsMiddlewareAfterContext<EventNameType, MiddlewareMetadataType>
	) => Promise<void>;
	export type MiddlewaresList<MiddlewareCallbackType> = Map<number, MiddlewareCallbackType>;
	export type MiddlewareMetadataDefault = Record<string, unknown>;

	export interface Config<MiddlewareMetadataType> {
		metadata: MiddlewareMetadataType;
		defaultChain: boolean;
		instanceIdPrefix: string;
		instanceIdMask: string;
		eventIdPrefix: string;
		eventIdPrefixMW: string;
		eventIdMask: string;
	}

	export interface States<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> {
		instanceId: EventInstanceId;
		events: EventsList<EventNameType>;
		mappersBefore: MappedEvents<EventNameType, MiddlewareMetadataType>;
		mappersAfter: MappedEvents<EventNameType, MiddlewareMetadataType>;
		middlewaresBefore: MiddlewaresList<MiddlewareBeforeCallback<EventNameType, MiddlewareMetadataType>>;
		middlewaresAfter: MiddlewaresList<MiddlewareAfterCallback<EventNameType, MiddlewareMetadataType>>;
	}

	export interface IEmitStates<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> {
		skipMiddlewaresBefore: boolean;
		skipMiddlewaresAfter: boolean;
		skipMappingsBefore: boolean;
		skipMappingsAfter: boolean;
		context: Function | Events<EventNameType, MiddlewareMetadataType>;
		sourceMapper: Events<EventNameType, MiddlewareMetadataType> | null;
		chainable: boolean;
		fromMapper: boolean;
		metadata: MiddlewareMetadataType;
		middlewareBeforeContext: EventsMiddlewareBeforeContext<EventNameType, MiddlewareMetadataType>;
		middlewareAfterContext: EventsMiddlewareAfterContext<EventNameType, MiddlewareMetadataType>;
		reject: boolean;
	}

	export type EmitStates<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> = IEmitStates<EventNameType, MiddlewareMetadataType>;

	export interface MiddlewareStates<EventNameType, MiddlewareMetadataType extends MiddlewareMetadataDefault> {
		context: Events<EventNameType, MiddlewareMetadataType>;
		emitStates: Partial<Events.IEmitStates<EventNameType, MiddlewareMetadataType>> | null;
		eventName: EventName<EventNameType>;
		metadata: MiddlewareMetadataType;
		rejected: boolean;
		returnValue: unknown;
		arguments: unknown[];
		skipped: boolean;
	}

	export type ProcessMappingsResult = {
		rejected: boolean;
		returnValue: unknown;
	};
}
