/**
 * @fileoverview Limit foo(bar(baz(qux(3)))) depth
 * @author Victor Nakoryakov
 */
"use strict";

const R = require('ramda');

const defaultOptions = {
  max: 4,
  ignoreArrow: false,
  ignoreCurry: false,
  ignoreMocha: false,
};

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

// :: Node -> Boolean
const isCallExpression = R.propEq('type', 'CallExpression');

// :: Node -> Boolean
const isArrowFunctionExpression = R.propEq('type', 'ArrowFunctionExpression');

// :: Node -> Boolean
const isCurry = R.allPass([
  isCallExpression,
  R.pathEq(['callee', 'type'], 'MemberExpression'),
  R.pathEq(['callee', 'object', 'type'], 'Identifier'),
  R.pathEq(['callee', 'object', 'name'], 'R'),
  R.pathEq(['callee', 'property', 'type'], 'Identifier'),
  R.pathEq(['callee', 'property', 'name'], 'curry'),
]);

// :: String -> Boolean
const isMochaIdentifier = R.flip(R.contains(['it', 'describe']));

// :: Node -> Boolean
const isMochaCall = R.allPass([
  isCallExpression,
  R.pathEq(['callee', 'type'], 'Identifier'),
  R.pathSatisfies(isMochaIdentifier, ['callee', 'name']),
]);

// :: Node -> Boolean
const isMochaArrow = R.both(
  isArrowFunctionExpression,
  R.propSatisfies(isMochaCall, 'parent')
);

// :: Node -> Boolean
const isMocha = R.either(isMochaCall, isMochaArrow);

// :: Options -> Node -> Boolean
const shouldIgnore = R.curry((opts, node) => R.anyPass([
  R.both(R.always(opts.ignoreArrow), isArrowFunctionExpression),
  R.both(R.always(opts.ignoreCurry), isCurry),
  R.both(R.always(opts.ignoreMocha), isMocha),
])(node));

// :: Options -> Node -> Boolean
const isNestingExpression = R.curry((opts, node) => R.both(
  R.either(isArrowFunctionExpression, isCallExpression),
  R.complement(shouldIgnore(opts))
)(node));

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

// :: Integer | undefined | Options -> Options
const objectizeOptions = R.cond([
  [R.is(Number), R.objOf('max')],
  [R.is(Object), R.identity],
  [R.isNil, R.always({})],
]);

// :: Options -> Options
const normalizeOptions = R.compose(
  R.merge(defaultOptions),
  objectizeOptions
);

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    docs: {
      description: "Limit foo(bar(baz(qux(3)))) depth",
      category: "Stylistic Issues",
      recommended: false
    },
    fixable: null,
    schema: [{
      oneOf: [
        {
          type: "integer",
          minimum: 1
        },
        {
          type: "object",
          properties: {
            max: { type: "integer", minimum: 1, maximum: 20 },
            ignoreArrow: { type: "boolean" },
            ignoreCurry: { type: "boolean" },
            ignoreMocha: { type: "boolean" },
          },
          additionalProperties: false
        }
      ]
    }]
  },

  create: function(context) {
    const opts = normalizeOptions(context.options[0]);

    function handleExpression(node) {
      const depth = nestingDepth(opts, node) + 1;
      if (depth > opts.max) {
        const message = "Composition depth exceeded ({{depth}}).";
        context.report({ node, message, data: { depth } });
      }
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return R.converge(
      R.unapply(R.mergeAll),
      [
        R.objOf('CallExpression'),
        opts.ignoreArrow ? R.always({}) : R.objOf('ArrowFunctionExpression')
      ]
    )(handleExpression);
  }
};
