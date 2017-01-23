# eslint-plugin-xod-fp

ESLint plugins to check code written in functional style with
[Ramda](http://ramdajs.com/).

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-xod-fp`:

```
$ npm install eslint-plugin-xod-fp --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must
also install `eslint-plugin-xod-fp` globally.

## Usage

Add `xod-ramda` to the plugins section of your `.eslintrc` configuration file.
You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": [
    "xod-fp"
  ]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "xod-fp/max-composition-depth": [ "error", 5 ],
  }
}
```

## Supported Rules

* `max-composition-depth`: limit compositional calls nesting

### Rule: `max-composition-depth`

Ensure that function compositions are not too deep.

#### Valid
```js
// :: Node -> Boolean
const isCallExpression = R.propEq('type', 'CallExpression');

// :: Node -> Boolean
const isArrowFunctionExpression = R.propEq('type', 'ArrowFunctionExpression');

// :: Node -> Boolean
const isCurry = R.allPass([
  R.propEq('type', 'CallExpression'),
  R.pathEq(['callee', 'type'], 'MemberExpression'),
  R.pathEq(['callee', 'object', 'type'], 'Identifier'),
  R.pathEq(['callee', 'object', 'name'], 'R'),
  R.pathEq(['callee', 'property', 'type'], 'Identifier'),
  R.pathEq(['callee', 'property', 'name'], 'curry'),
]);

// :: Node -> Boolean
const isCallNotCurry = R.both(
  isCallExpression,
  R.complement(isCurry)
);

// :: Options -> Node -> Boolean
const isNestingExpression = opts => R.anyPass([
  opts.ignoreCurry ? isCallNotCurry : isCallExpression,
  opts.ignoreArrow ? R.F : isArrowFunctionExpression,
]);

// :: Node -> [Node] -- a chain of parents to the root
const parents = R.ifElse(
  R.prop('parent'),
  R.compose(parent => R.concat([parent], parents(parent)), R.prop('parent')),
  R.always([])
);

// :: Options -> Node -> Number
const nestingDepth = R.curry((opts, node) => R.compose(
  R.length,
  R.uniq,
  R.map(R.prop('start')),
  R.filter(isNestingExpression(opts)),
  parents
)(node));
```

#### Invalid
```js
// :: Options -> Node -> Number
// -- No R.compose (depth is 7)
const nestingDepth = R.curry((opts, node) =>
  R.length(R.uniq(R.map(
    R.prop('start'), R.filter(isNestingExpression(opts)), parents(node)
  )))
);

// :: Options -> Node -> Number
// -- Too complex inlining (depth is 8)
const nestingDepth = R.curry((opts, node) => R.compose(
  R.length,
  R.uniq,
  R.map(R.prop('start')),
  R.filter(opts => R.anyPass([
      opts.ignoreCurry ? R.allPass([
        R.propEq('type', 'CallExpression'),
        R.pathEq(['callee', 'type'], 'MemberExpression'),
        R.pathEq(['callee', 'object', 'type'], 'Identifier'),
        R.pathEq(['callee', 'object', 'name'], 'R'),
        R.pathEq(['callee', 'property', 'type'], 'Identifier'),
        R.pathEq(['callee', 'property', 'name'], 'curry'),
      ]) : R.propEq('type', 'CallExpression'),
      opts.ignoreArrow ? R.F : R.propEq('type', 'ArrowFunctionExpression'),
  ])),
  R.ifElse(
    R.prop('parent'),
    R.compose(parent => R.concat([parent], parents(parent)), R.prop('parent')),
    R.always([])
  )
)(node));
```

#### Options

#### `max`

Defaults to 4.

Maximal nesting depth. Nested function call or arrow function expression
increment the depth.

#### `ignoreArrow`

Defaults to false.

Pass `{ ignoreArrow: true }` to not to take arrow functions into account when
counting the depth.

#### `ignoreCurry`

Defaults to false.

Pass `{ ignoreCurry: true }` to not to take `R.curry` calls into account when
counting the depth.

Calling `R.curry` is just a fighting with JavaScript to make it more
FP-compatible. If you see `R.curry` you probably would not think about it
at all trying to understand what an overall function does. So it is a good
idea to ignore currying in depth calculation as well.

#### `ignoreMocha`

Defaults to false.

Pass `{ ignoreMocha: true }` to not to take `it` and `describe` calls of
[Mocha](https://mochajs.org/) into account when counting the depth. Child
arrow functions of `it` and `describe` will be ignored as well.

Mocha’s functions are part of testing DSL and are not part of functions logic,
so do not add to a function complexity thus can be ignored.
