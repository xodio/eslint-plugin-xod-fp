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
