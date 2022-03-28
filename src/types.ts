import {Events, EventInformation} from './index';

export type EventCallback = Function;
export type EventCallbackSpread = (v?: any | any[], key?: number, iter?: IIteration) => any | boolean;

export type ReturnAsyncEmitResult = Promise<Promise<any> | Function>;

export type IterRowWithCallback = { cb: EventCallback; [index: string]: any }
export type IterRow = IterRowWithCallback | Array<any> | number;

export type EventNamesWithCallbacks = { [index: string]: Function };
export type EventName = string;
export type EventNames = Array<string>;

export type EventObject = { [key: string]: EventInformation };
export type EventsObjects = { [key: string]: EventObject };

export type EventId = string;
export type EventIds = Array<EventId>;

export type AffectedEventIds = { [key: string]: EventIds | false };

export type MapList = Array<string> | false;
export type EventMapObject = { list: MapList; target: Events }

export type MiddlewareArray = Array<Function>;

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

