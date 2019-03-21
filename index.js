const tools = require('osmium-tools');

module.exports = class Events {
	constructor(defaultChain = false) {
		this._eventsList = {};
		this._eventMappers = [];
		this._eventMappersAfter = [];
		this._middlewares = [];
		this._middlewaresAfter = [];
		this._defaultChain = defaultChain;
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

	useFirst(handler) {
		return this._middlewares.reverse().push(handler).reverse();
	}

	use(handler) {
		return this._middlewares.push(handler);
	}

	unUse(handlerId) {
		this._middlewares.splice(handlerId - 1, 1);
	}

	useAfterFirst(handler) {
		return this._middlewaresAfter.reverse().push(handler).reverse();
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

	exist(name, inMappingsToo = true) {
		let ret = false;
		if (inMappingsToo) {
			tools.iterate(this._eventMappers.concat(this._eventMappersAfter), (row) => {
				if (row.target.exist(name)) ret = true;
			});
		}
		return ret ? ret : !!this._eventsList[name];
	}

	on(name, cb) {
		const _on = (event, eventCb) => {
			let id = tools.GUID();
			this._eventsList[event] = this._eventsList[event] || {};
			this._eventsList[event][id] = {cb: eventCb, time: Date.now()};
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

	wait(name, cb) {
		return new Promise((resolve) => this.once(name, async (...args) => {
			const ret = await (cb || tools.nop$)(...args);
			resolve(args);
			return ret;
		}));
	}

	async emitEx(name, chainable, mwConfig, ...args) {
		let promises = [];
		let exitVal;
		let ret = {};

		const mapperFn = (list) => tools.iterate(list, (mapperRow) => {
			if (tools.isFunction(mapperRow.target.emit) && (
				mapperRow.list === false
				|| tools.arrayToObject(mapperRow.list)[name])) {
				promises.push(mapperRow.target.emitEx(name, false, {fromMapper: true}, ...args));
			}
		});

		const mapperFnChain = async (list) => {
			await tools.iterate(list, async (mapperRow) => {
				if (tools.isFunction(mapperRow.target.emit) && (
					mapperRow.list === false
					|| tools.arrayToObject(mapperRow.list)[name])) {
					Object.assign(ret, await mapperRow.target.emitEx(name, true, {fromMapper: true}, ...args));
				}
			});
		};

		Object.assign(mwConfig, {
			ignore     : false,
			ignoreFalse: false,
			dontExit   : false
		});

		if (!mwConfig.ignore) {
			await tools.iterate(this._middlewares, async (fn) => {
				if (!tools.isFunction(fn)) return;
				const fnRet = await fn(name, mwConfig, ...args);
				if (tools.isArray(fnRet)) args = fnRet;
				if (tools.isObject(fnRet)) exitVal = fnRet;
			});
		}

		if (exitVal && mwConfig.dontExit !== true) return exitVal.ret;

		await (chainable ? mapperFnChain : mapperFn)(this._eventMappers);
		if (chainable) {
			await tools.iterate(this._eventsList[name], async (rec, id, iter) => {
				iter.key(id);
				return await rec.cb(...args);
			}, ret);
		} else {
			tools.iterate(this._eventsList[name], (row) => promises.push(row.cb(...args)));
			ret = await Promise.all(promises);
			promises = [];
		}
		await (chainable ? mapperFnChain : mapperFn)(this._eventMappersAfter);
		if (!chainable) {
			ret.concat(await Promise.all(promises));
		}

		await tools.iterate(this._middlewaresAfter, async (fn) => {
			const fnRet = await fn(name, mwConfig, ret, ...args);
			if (!tools.isUndefined(fnRet)) ret = fnRet;
		});

		return tools.isObject(ret) ? Object.keys(ret).length === 0 ? undefined : ret : tools.isArray(ret) ? ret.length === 0 ? undefined : ret : ret;
	}

	async emit(name, ...args) {
		return await this[this._defaultChain ? 'emitChain' : 'emitParallel'](name, ...args);
	}

	async emitParallel(name, ...args) {
		return await this.emitEx(name, false, false, ...args);
	};

	async emitChain(name, ...args) {
		return await this.emitEx(name, true, false, ...args);
	}
};
