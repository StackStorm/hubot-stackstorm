// ESLint flat config: the rules of the old .eslintrc.yml (which listed its rules rather than extend
// a preset), minus the formatting-only rules ESLint no longer ships (arrow-spacing,
// rest-spread-spacing, template-curly-spacing, wrap-iife).
"use strict";

const globals = require('globals');

const LICENSE = "(// Copyright \\d{4} [a-zA-Z0-9,\\.\\s]+\\n)+//\\n// Licensed under the Apache License, Version 2\\.0 \\(the \"License\"\\);\\n// you may not use this file except in compliance with the License\\.\\n// You may obtain a copy of the License at\\n//\\n//\\s+http://www\\.apache\\.org/licenses/LICENSE-2\\.0\\n//\\n// Unless required by applicable law or agreed to in writing, software\\n// distributed under the License is distributed on an \"AS IS\" BASIS,\\n// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied\\.\\n// See the License for the specific language governing permissions and\\n// limitations under the License\\.\\n";

// Every source file starts with the Apache 2.0 header (one or more copyright lines, then the
// license text). A local rule, as in st2web, since eslint-plugin-notice doesn't run on ESLint 10.
const license = {
  rules: {
    header: {
      meta: {
        type: 'problem',
        messages: { missing: 'Missing or malformed Apache 2.0 license header.' },
        schema: [],
      },
      create(context) {
        const header = new RegExp(`^${LICENSE}`);
        return {
          Program(node) {
            if (!header.test(context.sourceCode.text)) {
              context.report({ node, loc: { line: 1, column: 0 }, messageId: 'missing' });
            }
          },
        };
      },
    },
  },
};

module.exports = [
  { ignores: ['node_modules/', 'coverage/'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.mocha },
    },
    plugins: { license },
    rules: {
      camelcase: 'off',
      curly: ['error', 'all'],
      eqeqeq: ['error', 'allow-null'],
      strict: 'off',
      'new-cap': 'error',
      'no-bitwise': 'error',
      'no-caller': 'error',
      'no-case-declarations': 'off',
      'no-cond-assign': ['error', 'except-parens'],
      'no-debugger': 'error',
      'no-empty': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-irregular-whitespace': 'error',
      'no-iterator': 'error',
      'no-loop-func': 'error',
      'no-multi-str': 'error',
      'no-new': 'error',
      'no-proto': 'error',
      'no-script-url': 'error',
      'no-sequences': 'error',
      'no-undef': 'error',
      'no-with': 'error',
      'valid-typeof': 'error',
      'prefer-const': 'error',
      'prefer-spread': 'error',
      'license/header': 'error',
    },
  },
  {
    // this file has no license header of its own
    files: ['eslint.config.js'],
    rules: { 'license/header': 'off' },
  },
];
