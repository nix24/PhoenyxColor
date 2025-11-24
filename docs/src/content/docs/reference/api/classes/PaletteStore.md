---
editUrl: false
next: false
prev: false
title: "PaletteStore"
---

Defined in: palettes.svelte.ts:14

## Constructors

### Constructor

> **new PaletteStore**(): `PaletteStore`

Defined in: palettes.svelte.ts:21

#### Returns

`PaletteStore`

## Properties

### activePaletteId

> **activePaletteId**: `string` \| `null`

Defined in: palettes.svelte.ts:16

***

### history

> **history**: `HistoryStore`\<`ColorPalette`[]\>

Defined in: palettes.svelte.ts:17

***

### palettes

> **palettes**: `ColorPalette`[]

Defined in: palettes.svelte.ts:15

## Accessors

### activePalette

#### Get Signature

> **get** **activePalette**(): `ColorPalette` \| `null` \| `undefined`

Defined in: palettes.svelte.ts:25

##### Returns

`ColorPalette` \| `null` \| `undefined`

## Methods

### add()

> **add**(`palette`): `string`

Defined in: palettes.svelte.ts:45

#### Parameters

##### palette

`Omit`\<`ColorPalette`, `"id"` \| `"createdAt"`\>

#### Returns

`string`

***

### addColor()

> **addColor**(`paletteId`, `color`): `void`

Defined in: palettes.svelte.ts:127

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

Defined in: palettes.svelte.ts:29

#### Returns

`Promise`\<`void`\>

***

### remove()

> **remove**(`id`): `void`

Defined in: palettes.svelte.ts:73

#### Parameters

##### id

`string`

#### Returns

`void`

***

### removeColor()

> **removeColor**(`paletteId`, `colorIndex`): `void`

Defined in: palettes.svelte.ts:137

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

Defined in: palettes.svelte.ts:40

#### Returns

`Promise`\<`void`\>

***

### setActive()

> **setActive**(`id`): `void`

Defined in: palettes.svelte.ts:123

#### Parameters

##### id

`string` | `null`

#### Returns

`void`

***

### update()

> **update**(`id`, `updates`): `void`

Defined in: palettes.svelte.ts:101

#### Parameters

##### id

`string`

##### updates

`Partial`\<`ColorPalette`\>

#### Returns

`void`

***

### updateColor()

> **updateColor**(`paletteId`, `colorIndex`, `newColor`): `void`

Defined in: palettes.svelte.ts:148

#### Parameters

##### paletteId

`string`

##### colorIndex

`number`

##### newColor

`string`

#### Returns

`void`
