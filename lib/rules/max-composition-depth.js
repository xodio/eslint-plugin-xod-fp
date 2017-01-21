/**
 * @fileoverview Limit foo(bar(baz(qux(3)))) depth
 * @author Victor Nakoryakov
 */
"use strict";

const R = require('ramda');

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

const isCallExpression = R.propEq('type', 'CallExpression');
const isArrowFunctionExpression = R.propEq('type', 'ArrowFunctionExpression');

const isNestingExpression = R.anyPass([
  isCallExpression,
  isArrowFunctionExpression
]);

// :: Node -> [Node] -- a chain of parents to the root
const parents = R.ifElse(
  R.prop('parent'),
  R.compose(parent => R.concat([parent], parents(parent)), R.prop('parent')),
  R.always([])
);

// :: Node -> Number
const nestingDepth = R.compose(
  R.length,
  R.uniq,
  R.map(R.prop('start')),
  R.filter(isNestingExpression),
  parents
);

// :: Integer | Options -> Options
const normalizeOptions = R.ifElse(
  R.is(Object),
  R.identity,
  R.objOf('max')
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
            max: { type: "integer", minimum: 1, maximum: 20 }
          },
          additionalProperties: false
        }
      ]
    }]
  },

  create: function(context) {
    const rawOptions = context.options[0];
    const options = normalizeOptions(rawOptions);
    const maxDepth = R.propOr(4, 'max', options);

    function handleExpression(node) {
      const depth = nestingDepth(node) + 1;
      if (depth > maxDepth) {
        const message = "Composition depth exceeded ({{depth}}).";
        context.report({ node, message, data: { depth } });
      }
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      CallExpression: handleExpression,
      ArrowFunctionExpression: handleExpression,
    };
  }
};
