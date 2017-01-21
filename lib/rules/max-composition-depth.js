/**
 * @fileoverview Limit foo(bar(baz(qux(3)))) depth
 * @author Victor Nakoryakov
 */
"use strict";

const R = require('ramda');

const defaultOptions = {
  max: 4,
  ignoreArrow: false,
};

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

const isCallExpression = R.propEq('type', 'CallExpression');
const isArrowFunctionExpression = R.propEq('type', 'ArrowFunctionExpression');

const isNestingExpression = ignoreArrow => R.anyPass([
  isCallExpression,
  ignoreArrow ? R.F : isArrowFunctionExpression,
]);

// :: Node -> [Node] -- a chain of parents to the root
const parents = R.ifElse(
  R.prop('parent'),
  R.compose(parent => R.concat([parent], parents(parent)), R.prop('parent')),
  R.always([])
);

// :: Node -> Number
const nestingDepth = R.curry((ignoreArrow, node) => R.compose(
  R.length,
  R.uniq,
  R.map(R.prop('start')),
  R.filter(isNestingExpression(ignoreArrow)),
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
      category: "Fill me in",
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
          },
          additionalProperties: false
        }
      ]
    }]
  },

  create: function(context) {
    const opts = normalizeOptions(context.options[0]);

    function handleExpression(node) {
      const depth = nestingDepth(opts.ignoreArrow, node) + 1;
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
