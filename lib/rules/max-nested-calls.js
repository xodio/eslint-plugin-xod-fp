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

    function nestingDepth(node) {
      const parentz = parents(node);
      const callExpressions = R.filter(isCallExpression)(parentz);
      const starts = R.map(R.prop('start'))(callExpressions);
      const uniqStarts = R.uniq(starts);
      return uniqStarts.length;
    }

    function parents(node) {
      return node.parent ? [node.parent].concat(parents(node.parent)) : [];
    }

    function onCallExpression(node) {
      const depth = nestingDepth(node) + 1;
      if (depth > maxDepth) {
        const message = "Function calls are nested too deeply ({{depth}}).";
        context.report({ node, message, data: { depth } });
      }
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      CallExpression: onCallExpression,
    };
  }
};
