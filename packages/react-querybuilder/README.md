# react-querybuilder

_The Query Builder component for React_

**React Query Builder** is a fully customizable query builder component for React, along with a collection of utility functions for [importing from](#import), and [exporting to](#export), various query languages like SQL, MongoDB, and more.

![Screenshot](../../_assets/screenshot.png)

- [Demo](https://react-querybuilder.js.org/demo)
- [Full documentation](https://react-querybuilder.js.org/)
- [CodeSandbox](https://react-querybuilder.js.org/sandbox) / [StackBlitz](https://react-querybuilder.js.org/sandbox?p=stackblitz) example projects

Custom components are not limited to the following libraries, but these have first-class support through their respective compatibility packages:

| Library                                            | Compatibility package                                                                        | Demo                                                     | Example projects                                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [Ant Design](https://ant.design/)                  | [@react-querybuilder/antd](https://www.npmjs.com/package/@react-querybuilder/antd)           | [demo](https://react-querybuilder.js.org/demo/antd)      | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=antd) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=antd)           |
| [Bootstrap](https://getbootstrap.com/)             | [@react-querybuilder/bootstrap](https://www.npmjs.com/package/@react-querybuilder/bootstrap) | [demo](https://react-querybuilder.js.org/demo/bootstrap) | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=bootstrap) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=bootstrap) |
| [Bulma](https://bulma.io/)                         | [@react-querybuilder/bulma](https://www.npmjs.com/package/@react-querybuilder/bulma)         | [demo](https://react-querybuilder.js.org/demo/bulma)     | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=bulma) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=bulma)         |
| [Chakra UI](https://chakra-ui.com/)                | [@react-querybuilder/chakra](https://www.npmjs.com/package/@react-querybuilder/chakra)       | [demo](https://react-querybuilder.js.org/demo/chakra)    | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=chakra) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=chakra)       |
| [Fluent UI](https://github.com/microsoft/fluentui) | [@react-querybuilder/fluent](https://www.npmjs.com/package/@react-querybuilder/fluent)       | [demo](https://react-querybuilder.js.org/demo/fluent)    | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=fluent) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=fluent)       |
| [Mantine](https://mantine.dev/)                    | [@react-querybuilder/mantine](https://www.npmjs.com/package/@react-querybuilder/mantine)     | [demo](https://react-querybuilder.js.org/demo/mantine)   | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=mantine) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=mantine)     |
| [MUI](https://mui.com/)                            | [@react-querybuilder/material](https://www.npmjs.com/package/@react-querybuilder/material)   | [demo](https://react-querybuilder.js.org/demo/material)  | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=material) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=material)   |
| [React Native](https://reactnative.dev/)           | [@react-querybuilder/native](https://www.npmjs.com/package/@react-querybuilder/native)       |                                                          | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=native) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=native)       |
| [Tremor](https://www.tremor.so/)                   | [@react-querybuilder/tremor](https://www.npmjs.com/package/@react-querybuilder/tremor)       | [demo](https://react-querybuilder.js.org/demo/tremor)    | [CodeSandbox](https://react-querybuilder.js.org/sandbox?t=tremor) · [StackBlitz](https://react-querybuilder.js.org/sandbox?t=tremor)       |

## Basic usage

```bash
npm i react-querybuilder
# OR yarn add / pnpm add / bun add
```

```tsx
import { useState } from 'react';
import { Field, QueryBuilder, RuleGroupType } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';

const fields: Field[] = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
  { name: 'age', label: 'Age', inputType: 'number' },
  { name: 'address', label: 'Address' },
  { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email', validator: ({ value }) => /^[^@]+@[^@]+/.test(value) },
  { name: 'twitter', label: 'Twitter' },
  { name: 'isDev', label: 'Is a Developer?', valueEditorType: 'checkbox', defaultValue: false },
];

const initialQuery: RuleGroupType = {
  combinator: 'and',
  rules: [],
};

export const App = () => {
  const [query, setQuery] = useState(initialQuery);

  return <QueryBuilder fields={fields} defaultQuery={query} onQueryChange={setQuery} />;
};
```

> [!TIP]
>
> To enable drag-and-drop, install the [`@react-querybuilder/dnd` package](https://www.npmjs.com/package/@react-querybuilder/dnd) and nest `QueryBuilder` under `QueryBuilderDnD`.

## Export

To [export queries](https://react-querybuilder.js.org/docs/utils/export) as SQL, MongoDB, or one of several other formats, use the `formatQuery` function.

```ts
const query = {
  combinator: 'and',
  rules: [
    {
      field: 'first_name',
      operator: 'beginsWith',
      value: 'Stev',
    },
    {
      field: 'last_name',
      operator: 'in',
      value: 'Vai, Vaughan',
    },
  ],
};
const sqlWhere = formatQuery(query, 'sql');
console.log(sqlWhere);
// `(first_name like 'Stev%' and last_name in ('Vai', 'Vaughan'))`
```

## Import

To [import queries](https://react-querybuilder.js.org/docs/utils/import) use `parseSQL`, `parseMongoDB`, `parseJsonLogic`, `parseJSONata`, `parseCEL`, `parseSpEL` or `parsePostgREST` depending on the source.

> [!TIP]
>
> `parseSQL` will accept a full `SELECT` statement or the `WHERE` clause by itself (everything but the expressions in the `WHERE` clause will be ignored). Trailing semicolon is optional.

```ts
const query = parseSQL(
  `SELECT * FROM my_table WHERE first_name LIKE 'Stev%' AND last_name in ('Vai', 'Vaughan')`
);
console.log(query);
/*
{
  "combinator": "and",
  "rules": [
    {
      "field": "first_name",
      "operator": "beginsWith",
      "value": "Stev",
    },
    {
      "field": "last_name",
      "operator": "in",
      "value": "Vai, Vaughan",
    },
  ],
}
*/
```

## Utilities

`formatQuery`, `transformQuery`, and the `parse*` functions can be used without importing from `react` (on the server, for example) like this:

```js
import { formatQuery } from 'react-querybuilder/formatQuery';
import { parseCEL } from 'react-querybuilder/parseCEL';
import { parseJSONata } from 'react-querybuilder/parseJSONata';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { parseMongoDB } from 'react-querybuilder/parseMongoDB';
import { parseSpEL } from 'react-querybuilder/parseSpEL';
import { parseSQL } from 'react-querybuilder/parseSQL';
import { parsePostgREST } from 'react-querybuilder/parsePostgREST';
import { transformQuery } from 'react-querybuilder/transformQuery';
```

(As of version 7, the `parse*` functions are _only_ available through these extended exports.)
