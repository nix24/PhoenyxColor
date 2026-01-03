---
editUrl: false
next: false
prev: false
title: "PaletteStore"
---

Defined in: [src/lib/stores/palettes.svelte.ts:6](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L6)

## Constructors

### Constructor

> **new PaletteStore**(): `PaletteStore`

Defined in: [src/lib/stores/palettes.svelte.ts:15](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L15)

#### Returns

`PaletteStore`

## Properties

### activePaletteId

> **activePaletteId**: `string` \| `null`

Defined in: [src/lib/stores/palettes.svelte.ts:8](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L8)

***

### history

> **history**: `HistoryStore`\<`object`[]\>

Defined in: [src/lib/stores/palettes.svelte.ts:10](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L10)

***

### isReady

> **isReady**: `boolean`

Defined in: [src/lib/stores/palettes.svelte.ts:9](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L9)

***

### palettes

> **palettes**: `object`[]

Defined in: [src/lib/stores/palettes.svelte.ts:7](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L7)

#### colors

> **colors**: `string`[]

#### createdAt

> **createdAt**: `Date`

#### id

> **id**: `PaletteId`

#### maxSlots

> **maxSlots**: `number`

#### name

> **name**: `string`

#### tags

> **tags**: `string`[]

## Accessors

### activePalette

#### Get Signature

> **get** **activePalette**(): \{ `colors`: `string`[]; `createdAt`: `Date`; `id`: `PaletteId`; `maxSlots`: `number`; `name`: `string`; `tags`: `string`[]; \} \| `null` \| `undefined`

Defined in: [src/lib/stores/palettes.svelte.ts:27](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L27)

##### Returns

\{ `colors`: `string`[]; `createdAt`: `Date`; `id`: `PaletteId`; `maxSlots`: `number`; `name`: `string`; `tags`: `string`[]; \} \| `null` \| `undefined`

## Methods

### add()

> **add**(`palette`): `PaletteId`

Defined in: [src/lib/stores/palettes.svelte.ts:53](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L53)

#### Parameters

##### palette

`Omit`\<`ValidatedColorPalette`, `"id"` \| `"createdAt"`\>

#### Returns

`PaletteId`

***

### addColor()

> **addColor**(`paletteId`, `color`): `void`

Defined in: [src/lib/stores/palettes.svelte.ts:141](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L141)

#### Parameters

##### paletteId

`string`

##### color

`string`

#### Returns

`void`

***

### load()

> **load**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/palettes.svelte.ts:31](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L31)

#### Returns

`Promise`\<`void`\>

***

### remove()

> **remove**(`id`): `void`

Defined in: [src/lib/stores/palettes.svelte.ts:81](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L81)

#### Parameters

##### id

`string`

#### Returns

`void`

***

### removeColor()

> **removeColor**(`paletteId`, `colorIndex`): `void`

Defined in: [src/lib/stores/palettes.svelte.ts:151](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L151)

#### Parameters

##### paletteId

`string`

##### colorIndex

`number`

#### Returns

`void`

***

### save()

> **save**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/palettes.svelte.ts:48](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L48)

#### Returns

`Promise`\<`void`\>

***

### setActive()

> **setActive**(`id`): `void`

Defined in: [src/lib/stores/palettes.svelte.ts:137](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L137)

#### Parameters

##### id

`string` | `null`

#### Returns

`void`

***

### update()

> **update**(`id`, `updates`): `void`

Defined in: [src/lib/stores/palettes.svelte.ts:109](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L109)

#### Parameters

##### id

`string`

##### updates

`Partial`\<`ValidatedColorPalette`\>

#### Returns

`void`

***

### updateColor()

> **updateColor**(`paletteId`, `colorIndex`, `newColor`): `void`

Defined in: [src/lib/stores/palettes.svelte.ts:162](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L162)

#### Parameters

##### paletteId

`string`

##### colorIndex

`number`

##### newColor

`string`

#### Returns

`void`

***

### whenReady()

> **whenReady**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/palettes.svelte.ts:23](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/palettes.svelte.ts#L23)

Wait for the store to be ready (for components that need data immediately)

#### Returns

`Promise`\<`void`\>
