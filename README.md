# `handlebars-wax`

[![NPM version][npm-img]][npm-url] [![Downloads][downloads-img]][npm-url] [![Build Status][travis-img]][travis-url] [![Coverage Status][coveralls-img]][coveralls-url] [![Tip][amazon-img]][amazon-url]

The missing Handlebars API. Effortless registration of data, partials, helpers, and decorators using file-system globs, modules, and plain-old JavaScript objects.

## Install

    $ npm install --save handlebars-wax

## Usage

```
┣━ index.js
┣━ data/
┃  ┣━ site.js
┃  ┗━ locale.json
┣━ decorators/
┃  ┣━ currency.js
┃  ┗━ i18n.js
┣━ helpers/
┃  ┣━ link.js
┃  ┗━ list.js
┗━ partials/
   ┣━ footer.js
   ┗━ header.hbs
```

```js
var handlebars = require('handlebars');
var handlebarsWax = require('handlebars-wax');

var wax = handlebarsWax(handlebars)

    // Partials
    .partials('./partials/**/*.{hbs,js}')
    .partials({
        boo: '{{#each boo}}{{greet}}{{/each}}',
        far: '{{#each far}}{{length}}{{/each}}'
    })

    // Helpers
    .helpers(require('handlebars-layouts'))
    .helpers('./helpers/**/*.js')
    .helpers({
        foo: function () { ... },
        bar: function () { ... }
    })

    // Decorators
    .decorators('./decorators/**/*.js')
    .decorators({
        baz: function () { ... },
        qux: function () { ... }
    })

    // Data
    .data('./data/**/*.{js,json}')
    .data({
        lorem: 'dolor',
        ipsum: 'sit amet'
    });

console.log(handlebars.partials);
// { footer: fn(), header: fn(), boo: fn(), far: fn() }

console.log(handlebars.helpers);
// { link: fn(), list: fn(), foo: fn(), bar: fn(), extend: fn(), ... }

console.log(handlebars.decorators);
// { currency: fn(), i18n: fn(), baz: fn(), bat: fn() }

console.log(wax.context);
// { site: { ... }, locale: { ... }, lorem: 'dolor', ipsum: 'sit amet' }

var template = wax.compile('{{lorem}} {{ipsum}}');

console.log(template({ ipsum: 'consectetur' }));
// "dolor consectetur"
```

## Registering Partials, Helpers, and Decorators

You may use `handlebars-wax` to require and register any modules that export a `register` factory, an object, or a function as partials, helpers, and decorators.

### Exporting a Factory

In cases where a direct reference to the instance of Handlebars in use is needed, modules may export a `register` factory function. For example, the following module will define a new helper called `foo-bar`:

```js
module.exports.register = function (handlebars) {
    handlebars.registerHelper('foo-bar', function (text, url) {
        var result = '<a href="' + url + '">' + text + '</a>';

        return new handlebars.SafeString(result);
    });
};
```

### Exporting an Object

If a module exports an object, that object is registered with Handlebars directly where the object keys are used as names. For example, the following module exports an object that will cause `baz` and `qux` to be registered:

```js
module.exports = {
    baz: function () {
        // do something
    },
    qux: function () {
        // do something
    }
};
```

### Exporting a Function

If a module exports a function, that function is registered based on the globbed portion of a path, ignoring extensions. Handlebars' `require.extensions` hook may be used to load `.handlebars` or `.hbs` files.

```js
module.exports = function () {
    // do something
};
```

```
┣━ index.js
┗━ partials/
   ┣━ components
   ┃  ┣━ link.js
   ┃  ┗━ list.js
   ┗━ layouts
      ┣━ one-column.hbs
      ┗━ two-column.hbs
```

```js
handlebarsWax(handlebars)
    .partials('./partials/**/*.{hbs,js}');
    // registers the partials:
    // - `components/link`
    // - `components/list`
    // - `layouts/one-column`
    // - `layouts/two-column`

handlebarsWax(handlebars)
    .partials('./partials/components/*.js')
    .partials('./partials/layouts/*.hbs');
    // registers the partials:
    // - `link`
    // - `list`
    // - `one-column`
    // - `two-column`

handlebarsWax(handlebars)
    .partials([
        './partials/**/*.{hbs,js}',
        '!./partials/layouts/**'
    ])
    .partials('./partials/layouts/*.hbs');
    // registers the partials:
    // - `components/link`
    // - `components/list`
    // - `one-column`
    // - `two-column`
```

Helpers and decorators are handled similarly to partials, but path separators and non-word characters are replaced with hyphens to avoid having to use [segment-literal notation][square] inside templates.

```
┣━ index.js
┗━ helpers/
   ┣━ format
   ┃  ┣━ date.js
   ┃  ┗━ number.round.js
   ┗━ list
      ┣━ group-by.js
      ┗━ order-by.js
```

```js
handlebarsWax(handlebars)
    .helpers('./helpers/**/*.js');
    // registers the helpers:
    // - `format-date`
    // - `format-number-round`
    // - `list-group-by`
    // - `list-order-by`
```

You may customize how names are generated by using the `base` option, or by specifying a custom `parsePartialName`, `parseHelperName`, or `parseDecoratorName` function.


```js
handlebarsWax(handlebars)
    .partials('./partials/components/*.js', {
        base: __dirname
    })
    .partials('./partials/layouts/*.hbs', {
        base: path.join(__dirname, 'partials/layouts')
    });
    // registers the partials:
    // - `partials/components/link`
    // - `partials/components/list`
    // - `one-column`
    // - `two-column`

handlebarsWax(handlebars)
    .helpers('./helpers/**/*.{hbs,js}', {
        // Expect these helpers to export their own name.
        parseHelperName: function(options, file) {
            // options.handlebars
            // file.cwd
            // file.base
            // file.path
            // file.exports

            return file.exports.name;
        }
    });
    // registers the helpers:
    // - `date`
    // - `round`
    // - `groupBy`
    // - `orderBy`
```

## Registering Data

When data is registered, the resulting object structure is determined according to the default rules of [`require-glob`][reqglob].

```
┣━ index.js
┗━ data/
   ┣━ foo/
   ┃  ┣━ hello.js
   ┃  ┗━ world.json
   ┗━ bar/
      ┣━ bye.js
      ┗━ moon.json
```

```js
handlebarsWax(handlebars)
    .data('./data/**/*.{js,json}');
    // registers the data:
    // {
    //     foo: {
    //         hello: require('./data/foo/hello.js'),
    //         world: require('./data/foo/world.json')
    //     },
    //     bar: {
    //         hello: require('./data/bar/bye.js'),
    //         world: require('./data/bar/moon.json')
    //     }
    // }
```

You may customize how data is structured by using the `base` option, or by specifying a custom `parseDataName`.

```js
handlebarsWax(handlebars)
    .data('./data/**/*.{js,json}', {
        base: __dirname,
        parseDataName: function(options, file) {
            // options.handlebars
            // file.cwd
            // file.base
            // file.path
            // file.exports

            return file.path
                .replace(file.base, '')
                .split(/[\/\.]/)
                .filter(Boolean)
                .reverse()
                .join('_')
                .toUpperCase();
        }
    });
    // registers the data:
    // {
    //     JS_HELLO_FOO_DATA: require('./data/foo/hello.js'),
    //     JSON_WORLD_FOO_DATA: require('./data/foo/world.json'),
    //     JS_BYE_BAR_DATA: require('./data/bar/bye.js'),
    //     JSON_MOON_BAR_DATA: require('./data/bar/moon.json')
    // }
```

## Context and Rendering

Templates that are compiled by `handlebars-wax` are passed a merged object of pre-registered (global) data and template (local) data as the context. This means accessing data will generally Just Work™.

```js
var template = wax.compile('{{foo}} {{bar}} {{baz}}');

wax.data({ foo: 'hello', bar: 'world' });

console.log(template({});
// "hello world "

console.log(template({ bar: 'moon', baz: 'pluto' });
// "hello moon pluto"
```

In cases where local variable names conflict with global variables, each context may be accessed directly using the special `@global` and `@local` variables.

```js
var template = wax.compile('{{@global.foo}} {{@local.foo}} {{foo}}');

wax.data({ foo: 'jupiter' });

console.log(template({ foo: 'mars' });
// "jupiter mars mars"
```

## API

### handlebarsWax(handlebars [, options]): HandlebarsWax

- `handlebars` `{Handlebars}` An instance of Handlebars to wax.
- `options` `{Object}` (optional) Passed directly to [`require-glob`][reqglob] so check there for more options.
  - `bustCache` `{Boolean}` (default: `true`) Force reload data, partials, helpers, and decorators.
  - `cwd` `{String}` (default: `process.cwd()`) Current working directory.
  - `compileOptions` `{Object}` Default options to use when compiling templates.
  - `extensions` `{Array}` (default: `['.handlebars', '.hbs', '.html']`) Extensions to compile via `require()`.
  - `templateOptions` `{Object}` Default options to use when rendering templates.
  - `parsePartialName` `{Function(options, file): String}` See section on [registering a function](#exporting-a-function).
  - `parseHelperName` `{Function(options, file): String}` See section on [registering a function](#exporting-a-function).
  - `parseDecoratorName` `{Function(options, file): String}` See section on [registering a function](#exporting-a-function).
  - `parseDataName` `{Function(options, file): String}` See section on [registering data](#exporting-data).

Provides a waxed API to augment an instance of Handlebars.

### .handlebars

The instance of Handlebars in use.

### .context

An object containing all [registered data](#data-pattern-options-handlebarswax).

### .partials(pattern [, options]): HandlebarsWax

- `pattern` `{String|Array.<String>|Object|Function(handlebars)}` One or more [`minimatch` glob patterns][minimatch] patterns, an object of partials, or a partial factory.
- `options` `{Object}` Passed directly to [`require-glob`][reqglob] so check there for more options.
  - `parsePartialName` `{Function(options, file): String}` See section on [registering a function](#exporting-a-function).

Requires and registers [partials][partials] en-masse from the file-system or an object. May be called more than once. If names collide, newest wins.

### .helpers(pattern [, options]): HandlebarsWax

- `pattern` `{String|Array.<String>|Object|Function(handlebars)}` One or more [`minimatch` glob patterns][minimatch] patterns, an object of helpers, or a helper factory.
- `options` `{Object}` Passed directly to [`require-glob`][reqglob] so check there for more options.
  - `parseHelperName` `{Function(options, file): String}` See section on [registering a function](#exporting-a-function).

Requires and registers [helpers][helpers] en-masse from the file-system or an object. May be called more than once. If names collide, newest wins.

### .decorators(pattern [, options]): HandlebarsWax

- `pattern` `{String|Array.<String>|Object|Function(handlebars)}` One or more [`minimatch` glob patterns][minimatch] patterns, an object of decorators, or a decorator factory.
- `options` `{Object}` Passed directly to [`require-glob`][reqglob] so check there for more options.
  - `parseDecoratorName` `{Function(options, file): String}` See section on [registering a function](#exporting-a-function).

Requires and registers [decorators][decorators] en-masse from the file-system or an object. May be called more than once. If names collide, newest wins.

### .data(pattern [, options]): HandlebarsWax

- `pattern` `{String|Array.<String>|Object}` One or more [`minimatch` glob patterns][minimatch] patterns, or a data object.
- `options` `{Object}` Passed directly to [`require-glob`][reqglob] so check there for more options.
  - `parseDataName` `{Function(options, file): String}` See section on [registering data](#registering-data).

Requires and registers data en-masse from the file-system or an object into the current context. May be called more than once. Results are shallow-merged into a single object. If keys collide, newest wins. See [Context and Rendering](#context-and-rendering).

### .compile(template [, options]): Function(Object)

- `template` `{String|Function(Object)}`
- `options` `{Object}` See the [`Handlebars.compile` documentation][compile].

Compiles a template that can be executed immediately to produce a final result. Data provided to the template function will be a [child frame][frame] of the current [context](#context). See [Context and Rendering](#context-and-rendering).

### .engine(file, data, callback): HandlebarsWax

- `file` `{String}` File path to dynamic view.
- `data` `{Object}` Data to pass to the template.
- `callback` `{Function(err, string)}`

[Express.js][express]-compatible template engine for rendering dynamic views.

```js
var express = require('express');
var handlebars = require('handlebars');
var handlebarsWax = require('handlebars-wax');

var wax = handlebarsWax(handlebars, { bustCache: false })
    .partials('./partials/**/*.{hbs,js}')
    .helpers('./helpers/**/*.js')
    .data('./data/**/*.{js,json}');

var app = express()
    .engine('hbs', wax.engine)
    .set('view engine', 'hbs')
    .set('views', './views');

// Route
app.get('/:foo/:bar', function (req, res) {
    res.render('index', req.params);
});

// Listen
app.listen(3000);
```

[compile]: http://handlebarsjs.com/reference.html#base-compile
[decorators]: https://github.com/wycats/handlebars.js/blob/master/docs/decorators-api.md
[express]: https://github.com/expressjs/express#readme
[frame]: http://handlebarsjs.com/reference.html#base-createFrame
[glob]: https://github.com/isaacs/node-glob#usage
[handlebars]: https://github.com/wycats/handlebars.js#usage
[helpers]: http://handlebarsjs.com/#helpers
[keygen]: https://github.com/shannonmoeller/require-glob#keygen
[minimatch]: https://github.com/isaacs/minimatch#usage
[partials]: http://handlebarsjs.com/#partials
[reqglob]: https://github.com/shannonmoeller/require-glob#usage
[root]: http://handlebarsjs.com/reference.html#data-root
[square]: http://handlebarsjs.com/expressions.html#basic-blocks

## Contribute

Standards for this project, including tests, code coverage, and semantics are enforced with a build tool. Pull requests must include passing tests with 100% code coverage and no linting errors.

### Test

    $ npm test

----

© Shannon Moeller <me@shannonmoeller.com> (shannonmoeller.com)

Licensed under [MIT](http://shannonmoeller.com/mit.txt)

[amazon-img]:    https://img.shields.io/badge/amazon-tip_jar-yellow.svg?style=flat-square
[amazon-url]:    https://www.amazon.com/gp/registry/wishlist/1VQM9ID04YPC5?sort=universal-price
[coveralls-img]: http://img.shields.io/coveralls/shannonmoeller/handlebars-wax/master.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/shannonmoeller/handlebars-wax
[downloads-img]: http://img.shields.io/npm/dm/handlebars-wax.svg?style=flat-square
[npm-img]:       http://img.shields.io/npm/v/handlebars-wax.svg?style=flat-square
[npm-url]:       https://npmjs.org/package/handlebars-wax
[travis-img]:    http://img.shields.io/travis/shannonmoeller/handlebars-wax/master.svg?style=flat-square
[travis-url]:    https://travis-ci.org/shannonmoeller/handlebars-wax
