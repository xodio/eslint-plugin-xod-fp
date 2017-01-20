/**
 * @fileoverview Limit foo(bar(baz(qux(3)))) depth
 * @author Victor Nakoryakov
 */
"use strict";

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
        fixable: null,  // or "code" or "whitespace"
        schema: [{
            type: "object",
            properties: {
                max: {
                    type: "integer",
                    minimum: 1,
                    maximum: 20
                }
            },
            additionalProperties: false
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

        function pushCall(node) {
            currentDepth += 1;

            if (currentDepth > maxDepth) {
                const message = "Function calls are nested too deeply ({{depth}}).";
                context.report({ node, message, data: { depth: currentDepth } });
            }
        }

        function popCall() {
            currentDepth -= 1;
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            CallExpression: pushCall,
            "CallExpression:exit": popCall
        };
    }
};
