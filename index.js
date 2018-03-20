const tools = require('osmium-tools');

module.exports = class Events {
	constructor() {
		this._eventsList = {};
		this._eventMappers = [];
		this._eventMappersAfter = [];
		this._middlewares = [];
		this._middlewaresAfter = [];
	}

	off(targetId) {
		targetId = tools.arrayToObject(tools.toArray(targetId), false);
		return tools.iterate(this._eventsList, (callbacks, eventName) => {
			return tools.iterate(callbacks, (callback, id) => {
				if (!targetId[id]) return;
				delete this._eventsList[eventName][id];
				return callback;
			}, {});
		}, {});
	}

	use(handler) {
		return this._middlewares.push(handler);
	}

	unUse(handlerId) {
		this._middlewares.splice(handlerId - 1, 1);
	}

	useAfter(handler) {
		return this._middlewaresAfter.push(handler);
	}

	unUseAfter(handlerId) {
		this._middlewaresAfter.splice(handlerId - 1, 1);
	}

	offEvent(eventName) {
		let ret = this._eventsList[eventName];
		delete this._eventsList[eventName];
		return ret;
	}

	mapEvents(target, list = false) {
		return this._eventMappers.push({list, target});
	}

	unmapEvenets(id) {
		this._eventMappers.splice(id - 1, 1);
	}

	mapEventsAfter(target, list = false) {
		return this._eventMappersAfter.push({list, target});
	}

	unmapEvenetsAfter(id) {
		this._eventMappersAfter.splice(id - 1, 1);
	}

	on(name, cb) {
		const _on = (event, eventCb) => {
			let id = tools.GUID();
			this._eventsList[event] = this._eventsList[event] || {};
			this._eventsList[event][id] = eventCb;
			return id;
		};

		if (tools.isObject(name)) {
			return tools.iterate(name, (cb, event) => _on(event, cb), []);
		} else {
			return _on(name, cb);
		}
	};

	once(name, cb) {
		const _once = (event, eventCb) => {
			let id = this.on(event, async (...args) => {
				this.off(id);
				return await eventCb(...args);
			});
			return id;
		};

		if (tools.isObject(name)) {
			return tools.iterate(name, (cb, event) => _once(event, cb), []);
		} else {
			return _once(name, cb);
		}
	};

	wait(name) {
		return new Promise((resolve) => this.once(name, resolve));
	}

	async emit(name, ...args) {
		let promises = [];
		let mapperFn = (list) => tools.iterate(list, (mapperRow) => {
			if (tools.isFunction(mapperRow.target.emit) && (
				mapperRow.list === false
				|| tools.arrayToObject(mapperRow.list)[name])) {
				promises.push(mapperRow.target.emit(name, ...args));
			}
		});

		await tools.iterate(this._middlewares, async (fn) => {
			const fnRet = await fn(name, ...args);
			if (tools.isArray(fnRet)) args = fnRet;
		});

		mapperFn(this._eventMappers);
		tools.iterate(this._eventsList[name], (fn, id) => promises.push(fn(...args)));
		mapperFn(this._eventMappersAfter);
		let ret = await Promise.all(promises);

		await tools.iterate(this._middlewaresAfter, async (fn) => {
			const fnRet = await fn(name, ret, ...args);
			if (!tools.isUndefined(fnRet)) ret = fnRet;
		});

		return ret;
	};

	async emitChain(name, ...args) {
		let mapperFn = async (list) => {
			await tools.iterate(list, async (mapperRow) => {
				if (tools.isFunction(mapperRow.target.emit) && (
					mapperRow.list === false
					|| tools.arrayToObject(mapperRow.list)[name])) {
					await mapperRow.target.emitChain(name, ...args);
				}
			});
		};

		await tools.iterate(this._middlewares, async (fn) => {
			const fnRet = await fn(name, ...args);
			if (tools.isArray(fnRet)) args = fnRet;
		});

		await mapperFn(this._eventMappers);
		let ret = await tools.iterate(this._eventsList[name], async (fn, id, iter) => {
			iter.key(id);
			return await fn(...args);
		}, {});
		await mapperFn(this._eventMappersAfter);
		await tools.iterate(this._middlewaresAfter, async (fn) => {
			const fnRet = await fn(name, ret, ...args);
			if (!tools.isUndefined(fnRet)) ret = fnRet;
		});

		return ret;
	}
};


