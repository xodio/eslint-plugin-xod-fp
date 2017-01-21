/**
 * @fileoverview Limit foo(bar(baz(qux(3)))) depth
 * @author Victor Nakoryakov
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/max-composition-depth");
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
    { code: fixture, options: [ 6 ], parserOptions },
    {
      code: 'foo(bar(x => x + 1))',
      options: [{ max: 2, ignoreArrow: true }],
      parserOptions,
    },
    {
      code: 'foo(x => bar(x))',
      options: [{ max: 2, ignoreArrow: true }],
      parserOptions,
    },
  ],

  invalid: [
    {
      code: 'foo(bar(baz(qux(boo()))))',
      errors: ["Composition depth exceeded (5)."]
    },
    {
      code: 'foo(bar(baz()))',
      options: [{ max: 2 }],
      errors: ["Composition depth exceeded (3)."]
    },
    {
      code: 'foo(bar(x => x + 1))',
      options: [ 2 ],
      errors: ["Composition depth exceeded (3)."],
      parserOptions,
    },
    {
      code: fixture,
      options: [ 5 ],
      errors: [
        {
          message: "Composition depth exceeded (6).",
          line: 11,
          column: 21
        },
        {
          message: "Composition depth exceeded (6).",
          line: 12,
          column: 21
        },
      ],
      parserOptions
    },
    {
      code: 'foo(bar(x => x + 1))',
      options: [{ max: 2 }],
      errors: ["Composition depth exceeded (3)."],
      parserOptions,
    },
    {
      code: 'foo(x => bar(x))',
      options: [{ max: 2 }],
      errors: ["Composition depth exceeded (3)."],
      parserOptions,
    },
  ]
});
