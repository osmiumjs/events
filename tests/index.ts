import {expect, assert} from 'chai';
import 'mocha';

import {Events as EventsFull} from '../';
// @ts-ignore
import {Events as EventsMin} from '../dist/index.min.js';

function doTests(Events: EventsFull | EventsMin, title: string) {
	const event = new Events();

	describe(`==== Test for "${title}" version ====`, () => {
		describe(`${title}::Events::On`, () => {
			it('should register event and return id', () => {
				let defaultEventId = event.on('default event', async function <T>(param: T): Promise<T> {
					return param;
				});
				assert(defaultEventId);
			});

			it('should emit the event and return callback return value', async () => {
				const emitResult = await event.emit('default event', 20);
				expect(emitResult[0]).to.equal(20);
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
				const emitResult = await event.emit('expirable event', 20);
				expect(emitResult[0]).to.equal(20);
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
				event.offEvent(disabledNameEventId.split('#')[0]);

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
			let middlewaresId: { [index: string]: number } = {};
			let param: number = 10;

			event.on('test middleware', () => {
				param += 10;
			});

			it('should register append middleware "before"', async () => {
				middlewaresId.firstTest = event.use(async () => {
					param += 10;
				});

				await event.emit('test middleware');

				assert(param === 30);
			});

			it('should disable middlware', async () => {
				param = 10;

				event.unUse(middlewaresId.firstTest);
				await event.emit('test middleware');

				assert(param === 20);
			});

			param = 10;

			it('should register prepend middleware "before"', async () => {
				let registered: boolean = false;

				middlewaresId.secondTest = event.use(async () => {
					registered ? param = 100 : param += 10;
				});

				middlewaresId.thirdTest = event.useFirst(async () => {
					registered = true;
				});

				await event.emit('test middleware');

				assert(param === 110);
			});

			it('should disable prepend middlwares "before"', async () => {
				param = 10;

				event.unUse(middlewaresId.thirdTest);
				event.unUse(middlewaresId.secondTest);

				await event.emit('test middleware');

				assert(param === 20, `${param} is not matching excpected value`);
			});


			//

			it('should append middleware "after"', async () => {
				param = 10;

				middlewaresId.firstTestAfter = event.useAfter(async () => {
					param === 20 ? param = 100 : param += 10;
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
					registered ? param = 100 : param += 10;
				});

				middlewaresId.thirdTestAfter = event.useAfterFirst(async () => {
					registered = true;
				});

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
			it('should return event\'s names list', () => {
				const listNames = event.getEventsList();
				assert(listNames.length === 4);
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

		describe(`${title}::Events::Chain`, async () => {
			const chain = new Events();

			let flag: string = 'nchd';

			chain.on('chain', async () => {
				await new Promise<void>(resolve => {
					setTimeout(() => resolve(), 200);
				});
				flag = 'chnd';
			});

			chain.on('chain', async () => {
				await new Promise<void>(resolve => {
					setTimeout(() => resolve(), 100);
				});
				!(flag === 'true') ? flag = 'wrng' : false;
			});

			it('should execute first event declatation, then the second', async function () {
				await chain.emit('chain');
				assert(flag === 'chnd', 'For some reason default chain is not synchronously');
			});
		});

		describe(`${title}::Events::Mappers`, () => {
			const linkingEvent = new Events();
			const linkedEvent = new Events();
			const linkedEventAfter = new Events();

			let type: string = 'none';
			let flag: boolean = false;
			let advancedFlag: string = 'dflt';

			linkingEvent.on('same event', () => {});

			linkedEventAfter.on('same event', () => {
				if (type === 'after' && advancedFlag === 'dflt') advancedFlag = 'wrng';
				if (type === 'removalAfter') advancedFlag = 'nnpd';
			});

			linkedEvent.on('same event', () => {
				if (type === 'after' && advancedFlag === 'dflt') advancedFlag = 'chgd';
				if (type === 'removal') advancedFlag = 'nnpd';
				flag = true;
			});

			const mapId = linkingEvent.mapEventsAfter(linkedEventAfter);
			const mapIdAfter = linkingEvent.mapEvents(linkedEvent);

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

				linkingEvent.unmapEvents(mapId);
				await linkingEvent.emit('same event');
				assert(advancedFlag !== 'nnpd', 'Event was not unmapped');
			});


			it('should unmap "after" event', async () => {
				type = 'removalAfter';
				advancedFlag = '';

				linkingEvent.unmapEventsAfter(mapIdAfter);
				await linkingEvent.emit('same event');
				assert(advancedFlag !== 'nnpd', 'Event "after" was not unmapped');
			});
		});
	});
}

doTests(EventsFull, 'Full');
doTests(EventsMin, 'Minimifed');
