/**
 * @fileoverview Limit foo(bar(baz(qux(3)))) depth
 * @author Victor Nakoryakov
 */
"use strict";

const R = require('ramda');

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
    const option = context.options[0];
    let currentDepth = 0;
    let maxDepth = 4;

    if (typeof option === "object" && option.hasOwnProperty("max") && typeof option.max === "number") {
      maxDepth = option.max;
    } else if (typeof option === "number") {
      maxDepth = option;
    }

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

    function onCallExpression(node) {
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
      CallExpression: onCallExpression,
      ArrowFunctionExpression: onCallExpression,
    };
  }
};
