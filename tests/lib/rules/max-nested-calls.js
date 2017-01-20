/**
 * @fileoverview Limit foo(bar(baz(qux(3)))) depth
 * @author Victor Nakoryakov
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/max-nested-calls");
const RuleTester = require("eslint").RuleTester;

const parserOptions = {
  ecmaVersion: 6,
  ecmaFeatures: {
    jsx: true,
  },
};

//------------------------------------------------------------------------------
// Fixtures
//------------------------------------------------------------------------------

const fixture = [
  'const convertPatches = R.compose(',
  '  composeT,',
  '  R.converge(',
  '    Tuple,',
  '    [',
  '      R.compose(R.mergeAll, R.pluck(0)),',
  '      R.compose(composeA, R.pluck(1)),',
  '    ]',
  '  ),',
  '  R.map(oldPatch => Maybe.of(Patch.createPatch())',
  '    .chain(apOrSkip(addLabel(oldPatch)))',
  '    .chain(apOrSkip(copyImpls(oldPatch)))',
  '    .map(convertPatchPins(oldPatch))',
  '    .chain(convertNodes(oldPatch))',
  '    .map(assocPatchUnsafe(oldPatch.id))',
  '  ),',
  '  R.values,',
  '  mergePatchesAndNodeTypes',
  ');'
].join('\n');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

var ruleTester = new RuleTester();
ruleTester.run("max-nested-calls", rule, {

  valid: [
    { code: 'foo(bar())' },
    { code: 'foo(bar(baz()))', options: [{ max: 3 }] },
    { code: 'foo(bar(baz()), qux())', options: [ 3 ] },
    { code: fixture, options: [ 5 ], parserOptions }
  ],

  invalid: [
    {
      code: 'foo(bar(baz()))',
      options: [{ max: 2 }],
      errors: ["Function calls are nested too deeply (3)."]
    },
    {
      code: fixture,
      options: [ 4 ],
      errors: [
        {
          message: "Function calls are nested too deeply (5).",
          line: 11,
          column: 21
        },
        {
          message: "Function calls are nested too deeply (5).",
          line: 12,
          column: 21
        },
      ],
      parserOptions
    }
  ]
});
