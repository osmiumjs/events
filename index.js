const oTools = require('osmium-tools');

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
		let ret = {};
		oTools.toArray(targetId).forEach((id) => {
			let eventName = targetId.slice(0, -26);
			let callbacks = this._eventsList[eventName];
			if (!callbacks) return;

			ret[id] = callbacks[id];
			delete this._eventsList[eventName][id];
		});
		return ret;
	}

	useFirst(handler) {
		return this._middlewares.unshift(handler);
	}

	use(handler) {
		return this._middlewares.push(handler);
	}

	unUse(handlerId) {
		this._middlewares.splice(handlerId - 1, 1);
	}

	useAfterFirst(handler) {
		return this._middlewaresAfter.unshift(handler);
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

	exists(name, inMappingsToo = false) {
		let ret = false;
		if (inMappingsToo) {
			oTools.iterate(this._eventMappers.concat(this._eventMappersAfter), (row) => {
				if (row.target.exists(name)) ret = true;
			});
		}
		return ret ? ret : !!this._eventsList[name];
	}

	on(name, cb) {
		const _on = (event, eventCb) => {
			let id = `${event}${oTools.UID('#')}`;
			this._eventsList[event] = this._eventsList[event] || {};
			this._eventsList[event][id] = {cb: eventCb, time: Date.now()};
			return id;
		};

		if (oTools.isObject(name)) {
			return oTools.iterate(name, (cb, event) => _on(event, cb), []);
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

		if (oTools.isObject(name)) {
			return oTools.iterate(name, (cb, event) => _once(event, cb), []);
		} else {
			return _once(name, cb);
		}
	};

	wait(name, cb) {
		return new Promise((resolve) => this.once(name, async (...args) => {
			const ret = await (cb || oTools.nop$)(...args);
			resolve(args);
			return ret;
		}));
	}

	async emitEx(name, chainable, config, ...args) {
		let promises = [];
		let exitVal;
		let ret = {};
		config = config || {};
		config.context = config.context || this;

		const mapperFn = (list) => oTools.iterate(list, (mapperRow) => {
			if (oTools.isFunction(mapperRow.target.emit) && (
				mapperRow.list === false
				|| oTools.arrayToObject(mapperRow.list)[name])) {
				promises.push(mapperRow.target.emitEx(name, false, {context: config.context, preCall: config.preCall, fromMapper: true}, ...args));
			}
		});

		const mapperFnChain = async (list) => {
			await oTools.iterate(list, async (mapperRow) => {
				if (oTools.isFunction(mapperRow.target.emit) && (
					mapperRow.list === false
					|| oTools.arrayToObject(mapperRow.list)[name])) {
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
			await oTools.iterate(this._middlewares, async (fn) => {
				if (!oTools.isFunction(fn)) return;
				const fnRet = await fn.apply(config.context, [name, config, ...args]);
				if (oTools.isArray(fnRet)) args = fnRet;
				if (oTools.isObject(fnRet)) exitVal = fnRet;
			});
		}

		if (exitVal && config.dontExit !== true) return exitVal.ret;

		await (chainable ? mapperFnChain : mapperFn)(this._eventMappers);
		if (chainable) {
			await oTools.iterate(this._eventsList[name], async (rec, id, iter) => {
				iter.key(id);
				if (oTools.isFunction(config.preCall)) args = await config.preCall(rec.cb, args, id, config, this);
				return await rec.cb.apply(config.context, args);
			}, ret);
		} else {
			await oTools.iterate(this._eventsList[name], async (row) => {
				if (oTools.isFunction(config.preCall)) args = await config.preCall(rec.cb, args, id, config, this);
				return promises.push(row.cb.apply(config.context, args));
			});
			ret = await Promise.all(promises);
			promises = [];
		}
		await (chainable ? mapperFnChain : mapperFn)(this._eventMappersAfter);
		if (!chainable) {
			ret.concat(await Promise.all(promises));
		}

		await oTools.iterate(this._middlewaresAfter, async (fn) => {
			const fnRet = await fn.apply(config.context, [name, config, ret, ...args]);
			if (!oTools.isUndefined(fnRet)) ret = fnRet;
		});

		return ret;
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
