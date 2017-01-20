/**
 * @fileoverview Limit foo(bar(baz(qux(3)))) depth
 * @author Victor Nakoryakov
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var rule = require("../../../lib/rules/max-nested-calls"),

    RuleTester = require("eslint").RuleTester;


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

var ruleTester = new RuleTester();
ruleTester.run("max-nested-calls", rule, {

    valid: [
        { code: 'foo(bar())' },
        { code: 'foo(bar(baz()))', options: [{ max: 3 }] },
        { code: 'foo(bar(baz()), qux())', options: [{ max: 3 }] }
    ],

    invalid: [
        {
            code: 'foo(bar(baz()))',
            options: [{ max: 2 }],
            errors: ["Function calls are nested too deeply (3)."]
        }
    ]
});
