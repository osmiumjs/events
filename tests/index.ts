import {expect, assert} from 'chai';
import 'mocha';

import {Events} from '../';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
//import {Events as EventsMin} from '../dist/index.min.js';

const event: EventsFull = new Events<string | number | symbol>();
const title = 'full';

describe(`==== Test for "${title}" version ====`, () => {
	describe(`${title}::Events::On`, () => {
		it('should register event and return id', () => {
			let defaultEventId = event.on('default event', async function <T>(param: T): Promise<T> {
				return param;
			});
			assert(defaultEventId);
		});

		it('should emit the event and return callback return value', async () => {
			const emitResult = await event.emitOnce('default event', 20);
			expect(emitResult).to.equal(20);
		});
	});

	describe(`${title}::Events::Once`, () => {
		it('should register event and return id', () => {
			const onceEventId = event.once('expirable event', async function <T>(param: T): Promise<T> {
				return param;
			});
			assert(onceEventId);
		});

		it('should emit once the event and return value', async () => {
			const emitResult = await event.emitOnce('expirable event', 20);
			expect(emitResult).to.equal(20);
		});

		it('should not emit the event after', async () => {
			const emitResult = await event.emit('expirable event', 20);
			assert(emitResult[0] === undefined);
		});
	});

	describe(`${title}::Events::DisableName`, () => {
		let disabledNameEventId: string;

		it('should register event and return id', () => {
			disabledNameEventId = event.on('disabled by name event', async function <T>(param: T): Promise<T> {
				return param;
			});
			assert(disabledNameEventId);
		});

		it('should disable event by name', async () => {
			event.off(disabledNameEventId);

			const emitResult = await event.emit('disabled by name event', 40);
			assert(emitResult[0] === undefined);
		});
	});

	describe(`${title}::Events::DisableId`, () => {
		let disabledIdEventId: string;

		it('should register event and return id', () => {
			disabledIdEventId = event.on('disabled by name event', async function <T>(param: T): Promise<T> {
				return param;
			});
			assert(disabledIdEventId);
		});

		it('should disable event by id', async () => {
			event.off(disabledIdEventId.split('#')[1]);

			const emitResult = await event.emit('disabled by id event', 50);
			assert(emitResult[0] === undefined);
		});
	});

	describe(`${title}::Events::Middleware`, () => {
		let middlewaresId: {[index: string]: number} = {};
		let param: number = 10;

		event.on('test middleware', () => {
			param += 10;
		});

		it('should register append middleware "before"', async () => {
			// @ts-ignore
			middlewaresId.firstTest = event.useBefore(async (ctx) => {
				ctx.setArguments([param]);
				param += 10;
			});

			await event.emit('test middleware');

			assert(param === 30);
		});

		it('should disable middlware', async () => {
			param = 10;

			event.unUseBefore(middlewaresId.firstTest);
			await event.emit('test middleware');

			assert(param === 20);
		});

		param = 10;

		it('should register prepend middleware "before"', async () => {
			let registered: boolean = false;

			middlewaresId.secondTest = event.useBefore(async () => {
				registered ? (param = 100) : (param += 10);
			});

			middlewaresId.thirdTest = event.useBefore(async () => {
				registered = true;
			}, -1000);

			await event.emit('test middleware');

			assert(param === 110);
		});

		it('should disable prepend middlwares "before"', async () => {
			param = 10;

			event.unUseBefore(middlewaresId.thirdTest);
			event.unUseBefore(middlewaresId.secondTest);

			await event.emit('test middleware');

			assert(param === 20, `${param} is not matching excpected value`);
		});

		//

		it('should append middleware "after"', async () => {
			param = 10;

			middlewaresId.firstTestAfter = event.useAfter(async () => {
				param === 20 ? (param = 100) : (param += 10);
			});

			await event.emit('test middleware');

			assert(param === 100, `Order of middleware executions is not correct, expected value 100, got ${param}`);
		});

		it('should disable appended middlware "after"', async () => {
			param = 10;

			event.unUseAfter(middlewaresId.firstTestAfter);
			await event.emit('test middleware');

			assert(param === 20);
		});

		it('should prepend middleware "after"', async () => {
			param = 10;
			let registered: boolean = false;

			middlewaresId.secondTestAfter = event.useAfter(async () => {
				registered ? (param = 100) : (param += 10);
			});

			middlewaresId.thirdTestAfter = event.useAfter(async () => {
				registered = true;
			}, -1000);

			await event.emit('test middleware');

			assert(param === 100);
		});

		it('should disable prepend middlwares "before"', async () => {
			param = 10;

			event.unUseAfter(middlewaresId.thirdTestAfter);
			event.unUseAfter(middlewaresId.secondTestAfter);

			await event.emit('test middleware');

			assert(param === 20, `${param} is not matching excpected value`);
		});
	});

	describe(`${title}::Events::Display`, () => {
		it('should return events names list', () => {
			const listNames = event.getEvents();
			assert(listNames.length === 3);
		});

		it('should return events by string', async () => {
			const listNames = event.getEvents('default event');
			assert(listNames[0] === 'default event');
		});
	});

	describe(`${title}::Events::Exist`, () => {
		it('should return true for existing event', () => {
			const listNames = event.exists('default event');
			assert(listNames);
		});

		it('should return false for definitely not existing event', async () => {
			const listNames = event.exists('definitely not existing event');
			assert(listNames === false);
		});
	});

	describe(`${title}::Events::Mappers`, () => {
		const linkingEvent = new Events();
		const linkedEvent = new Events();
		const linkedEventAfter = new Events();

		let type: string = 'none';
		let flag: boolean = false;
		let advancedFlag: string = 'dflt';

		linkingEvent.on('same event', () => {
			//
		});

		linkedEventAfter.on('same event', () => {
			if (type === 'after' && advancedFlag === 'dflt') advancedFlag = 'wrng';
			if (type === 'removalAfter') advancedFlag = 'nnpd';
		});

		linkedEvent.on('same event', () => {
			if (type === 'after' && advancedFlag === 'dflt') advancedFlag = 'chgd';
			if (type === 'removal') advancedFlag = 'nnpd';
			flag = true;
		});

		linkingEvent.mapEventsAfter(linkedEventAfter);
		linkingEvent.mapEventsBefore(linkedEvent);

		it('should relate one-way event instance', async () => {
			await linkingEvent.emit('same event');
			assert(flag === true, 'Events was not linked');
		});

		it('should relate one-way event instance appendingly', async () => {
			type = 'after';

			await linkingEvent.emit('same event');
			assert(advancedFlag === 'chgd', 'Event that must have occured after, emitted earlier');
		});

		it('should unmap event', async () => {
			type = 'removal';
			advancedFlag = '';

			linkingEvent.unMapEventsBefore(linkedEvent);
			await linkingEvent.emit('same event');
			assert(advancedFlag !== 'nnpd', 'Event was not unmapped');
		});

		it('should unmap "after" event', async () => {
			type = 'removalAfter';
			advancedFlag = '';

			linkingEvent.unMapEventsAfter(linkedEventAfter);
			await linkingEvent.emit('same event');
			assert(advancedFlag !== 'nnpd', 'Event "after" was not unmapped');
		});
	});
});

