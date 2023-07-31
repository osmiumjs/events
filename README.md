# Osmium Events - Async event dispatcher (readme in progress)

## About

`@osmium/events` - is a TypeScript/JS library of universal event dispatcher with support for asynchrony, middlewares,
event mapping between different library instances and many other things. Support nodejs & browser (has bundled js.min version with all depends).

This project is released under MIT license.

## How to use?

...

```
// Example here
```

## Events handlers and emitters

...

```
// Example here
```

## Middlewares

...

```
// Example here
```

## Event mappings

...

```
// Example here
```

## API

### Classes

#### new Events

`Events<EventNameType = string | number | symbol, MiddlewareMetadataType extends Record<string, unknown>>(config: Events.ConfigOptionable = {}, mapEmitOnce: Events<EventNameType> | null = null)`

Creates an event dispatcher instance.

`<EventNameType>` - defines the type of event names used. Any types can be used (actually the event name is the key in `Map<EventNameType,...>`).
By default is `string | number | symbol`

`config` - Instance configuration

##### Events.ConfigOptionable

```
{
	metadata?        : MiddlewareMetadata; //      
	defaultChain?    : boolean;            //
	instanceIdPrefix?: string;             //
	instanceIdMask?  : string;             //
	eventIdPrefix?   : string;             //
	eventIdPrefixMW? : string;             //
	eventIdMask?     : string;             //
}
```

`mapEmitOnce` - ...

### API - Event handlers

#### on

`on<ArgsType extends any[] = any[], ReturnType = any, ThisExtType extends object = {}>(name: Events.EventName<EventNameType>, cb: Events.EventCallback<EventNameType, ArgsType, ReturnType, ThisExtType>): Events.EventId`

Register event handler

```
	// Example here
```

#### once

`once<ArgsType extends any[] = any[], ReturnType = any, ThisExtType extends object = {}>(name: Events.EventName<EventNameType>, cb: Events.EventCallback<EventNameType, ArgsType, ReturnType, ThisExtType>): Events.EventId`

Register event and self-remove after first call

```
	// Example here
```

#### wait

`wait<ReturnType extends [] = []>(name: Events.EventName<EventNameType>, timeout: number = -1): Promise<ReturnType | null>`

Await event emit

```
	// Example here
```

#### offById

`offById(targetId: Events.EventId | Events.EventIds): Events.AffectedEventId | Events.AffectedEventIds`

Remove event by EventId or array of EventId

```
	// Example here
```

#### off

`off(name: Events.EventName<EventNameType>): Events.AffectedEventIds | null`

Remove event by EventName

```
	// Example here
```

### API - Event emits

#### emit

`async emit<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>>`

Event emit (call)

```
	// Example here
```

#### emitParallel

`async emitParallel<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>>`

Event emit (call) as parallel (via `Promise.all`)

```
	// Example here
```

#### emitChain

`async emitChain<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<Events.EmitResult<ReturnType>>`

Event emit (call) as chain (one by one)

```
	// Example here
```

#### emitOnce

`async emitOnce<ArgsType extends any[] = any[], ReturnType = unknown>(name: Events.EventName<EventNameType>, ...args: ArgsType): Promise<ReturnType | undefined>`

Event emit (call) and return first value

```
	// Example here
```

#### emitEx

`async emitEx<ArgsType extends any[] = any[], ReturnType = unknown>`

Advanced event emit

```
	// Example here
```

### API - Tools/others

#### clear

`clear(): void`

Clear all events

```
new e = new Events();
e.on('test',()=>{
	console.log('Test called');
});

e.emit('test');  // 'Test called' in console
e.clear();
e.emit('test');  // Nope
```

#### reset

`reset(): void`

Reset all (events, mappings, middlewares), like new Events().

```
	// Example here
```

#### getEvents

`getEvents(findStr: string | RegExp | null = null): Events.EventNames<EventNameType>`

Get events names by RegExp pattern.

Will try to cast the event name to a `string` type (so that RegExp can work) using `?.toString()`, if that doesn't work, it will skip that event name for out list.

```
	// Example here
```

#### exists

`exists(what: Events.EventName<EventNameType> | RegExp, inMappingsToo: boolean = false): boolean`

Check event exists

```
	// Example here
```

### API - Middlewares

#### useBefore

`useBefore(handler: Events.MiddlewareBeforeCallback<EventNameType>, position: number | null = null): number`

Add 'before' middleware

```
	// Example here
```

#### unUseBefore

`unUseBefore(handlerPosition: number): void`

Remove 'before' middleware by MiddlewareBefore position

```
	// Example here
```

#### useAfter

`useAfter(handler: Events.MiddlewareAfterCallback<EventNameType>, position: number | null = null): number`

Add 'after' middleware

```
	// Example here
```

#### unUseAfter

unUseAfter(handlerPosition: number): void

Remove 'after' middleware by MiddlewareAfter id

```
	// Example here
```

### API - Event mapping

#### mapEventsBefore

`mapEventsBefore(target: Events<EventNameType>, list: Events.EventNames<EventNameType> | null = null): void`

Map events 'before' by list, or all if not defined

```
	// Example here
```

#### unMapEventsBefore

`unMapEventsBefore(target: Events<EventNameType>, list: Events.EventNames<EventNameType> | null = null): void`

Remove 'before' event mapper by list, or all if not defined

```
	// Example here
```

#### mapEventsAfter

`mapEventsAfter(target: Events<EventNameType>, list: Events.EventNames<EventNameType> | null = null): void`

Map events 'after' by list, or all if not defined

```
	// Example here
```

#### unMapEventsAfter

`unMapEventsAfter(target: Events<EventNameType>, list: Events.EventNames<EventNameType> | null = null): void`

Remove 'after' event mapper by list, or all if not defined

```
	// Example here
```
