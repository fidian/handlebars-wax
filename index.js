const fs = require('fs');
const path = require('path');
const requireGlob = require('require-glob');

const ESCAPE_CHARACTERS = /[-/\\^$*+?.()|[\]{}]/g;
const NON_WORD_CHARACTERS = /\W+/g;
const PATH_SEPARATOR = fs.sep;
const PATH_SEPARATORS = /[\\/]/g;
const WHITESPACE_CHARACTERS = /\s+/g;
const WORD_SEPARATOR = '-';

// Utilities

function hookRequire(handlebars, extensions) {
	function compileFile(module, filename) {
		const templateString = fs.readFileSync(filename, 'utf8');

		module.exports = handlebars.compile(templateString);
	}

	function cacheHook(extension) {
		const originalHook = require.extensions[extension];

		require.extensions[extension] = compileFile;

		return originalHook;
	}

	function uncacheHook(extension) {
		require.extensions[extension] = originalHooks[extension];
	}

	function unhookRequire() {
		for (const extension of extensions) {
			uncacheHook(extension);
		}
	}

	extensions = extensions || [];
	const originalHooks = extensions.map(cacheHook);

	return unhookRequire;
}

function keygenPartial(options, file) {
	const resolvedFilePath = fs.realpathSync(file.path);
	const resolvedFileBase = fs.realpathSync(file.base);

	const fullPath = resolvedFilePath.replace(PATH_SEPARATORS, PATH_SEPARATOR);
	const basePath
		= resolvedFileBase.replace(PATH_SEPARATORS, PATH_SEPARATOR)
		+ PATH_SEPARATOR;
	const shortPath = fullPath.replace(
		new RegExp('^' + string_.replace(ESCAPE_CHARACTERS, '\\$&'), 'i'),
		'',
	);
	const extension = path.extname(shortPath);

	return shortPath
		.slice(0, Math.max(0, shortPath.length - extension.length))
		.replace(WHITESPACE_CHARACTERS, WORD_SEPARATOR);
}

function keygenHelper(options, file) {
	return keygenPartial(options, file).replace(
		NON_WORD_CHARACTERS,
		WORD_SEPARATOR,
	);
}

function keygenDecorator(options, file) {
	return keygenHelper(options, file);
}

function reducer(options, object, fileObject) {
	let value = fileObject.exports;

	if (!value) {
		return object;
	}

	if (typeof value.register === 'function') {
		value = value.register(options.handlebars, options);

		if (typeof value === 'object') {
			return Object.assign(object, value);
		}

		return object;
	}

	if (typeof value === 'object') {
		return Object.assign(object, value);
	}

	object[options.keygen(fileObject)] = value;

	return object;
}

function resolveValue(options, value) {
	if (!value) {
		return {};
	}

	if (typeof value === 'function') {
		value = value(options.handlebars, options);

		if (typeof value === 'object') {
			return value;
		}

		return {};
	}

	if (typeof value === 'object') {
		return reducer(options, {}, {exports: value});
	}

	return requireGlob.sync(value, options);
}
function HandlebarsWax(handlebars, options) {
	const defaults = {
		handlebars,
		bustCache: true,
		cwd: process.cwd(),
		compileOptions: null,
		extensions: ['.handlebars', '.hbs', '.html'],
		templateOptions: null,
		parsePartialName: keygenPartial,
		parseHelperName: keygenHelper,
		parseDecoratorName: keygenDecorator,
		parseDataName: null,
	};

	this.handlebars = handlebars;
	this.config = Object.assign(defaults, options);
	this.context = Object.create(null);
	this.engine = this.engine.bind(this);
}

HandlebarsWax.prototype.partials = function (partials, options) {
	options = Object.assign({}, this.config, options);
	options.keygen = options.parsePartialName;
	options.reducer = options.reducer || reducer;

	const unhookRequire = hookRequire(options.handlebars, options.extensions);

	options.handlebars.registerPartial(resolveValue(options, partials));

	unhookRequire();

	return this;
};

HandlebarsWax.prototype.helpers = function (helpers, options) {
	options = Object.assign({}, this.config, options);
	options.keygen = options.parseHelperName;
	options.reducer = options.reducer || reducer;

	options.handlebars.registerHelper(resolveValue(options, helpers));

	return this;
};

HandlebarsWax.prototype.decorators = function (decorators, options) {
	options = Object.assign({}, this.config, options);
	options.keygen = options.parseDecoratorName;
	options.reducer = options.reducer || reducer;

	options.handlebars.registerDecorator(resolveValue(options, decorators));

	return this;
};

HandlebarsWax.prototype.data = function (data, options) {
	options = Object.assign({}, this.config, options);
	options.keygen = options.parseDataName;

	Object.assign(this.context, resolveValue(options, data));

	return this;
};

HandlebarsWax.prototype.compile = function (template, compileOptions) {
	const {config} = this;
	const {context} = this;

	compileOptions = Object.assign({}, config.compileOptions, compileOptions);

	if (typeof template !== 'function') {
		template = this.handlebars.compile(template, compileOptions);
	}

	return function (data, templateOptions) {
		templateOptions = Object.assign(
			{},
			config.templateOptions,
			templateOptions,
		);
		templateOptions.data = Object.assign({}, templateOptions.data);

		// {{@global.foo}} and {{@global._parent.foo}}
		templateOptions.data.global = Object.assign(
			{_parent: context},
			templateOptions.data.global || context,
		);

		// {{@local.foo}} and {{@local._parent.foo}}
		templateOptions.data.local = Object.assign(
			{_parent: context},
			templateOptions.data.local || data,
		);

		// {{foo}} and {{_parent.foo}}
		return template(
			Object.assign({_parent: context}, context, data),
			templateOptions,
		);
	};
};

HandlebarsWax.prototype.engine = function (file, data, callback) {
	const {config} = this;
	const cache = this.cache || (this.cache = {});

	try {
		let template = cache[file];

		if (!template || config.bustCache) {
			template = this.compile(fs.readFileSync(file, 'utf8'));
			cache[file] = template;
		}

		callback(null, template(data));
	} catch (error) {
		callback(error);
	}

	return this;
};

module.exports = function handlebarsWax(handlebars, config) {
    return new HandlebarsWax(handlebars, config);
}

module.exports.HandlebarsWax = HandlebarsWax;
