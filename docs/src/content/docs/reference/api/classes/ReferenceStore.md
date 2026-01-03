---
editUrl: false
next: false
prev: false
title: "ReferenceStore"
---

Defined in: [src/lib/stores/references.svelte.ts:6](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L6)

## Constructors

### Constructor

> **new ReferenceStore**(): `ReferenceStore`

Defined in: [src/lib/stores/references.svelte.ts:14](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L14)

#### Returns

`ReferenceStore`

## Properties

### history

> **history**: `HistoryStore`\<`object`[]\>

Defined in: [src/lib/stores/references.svelte.ts:9](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L9)

***

### isReady

> **isReady**: `boolean`

Defined in: [src/lib/stores/references.svelte.ts:8](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L8)

***

### references

> **references**: `object`[]

Defined in: [src/lib/stores/references.svelte.ts:7](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L7)

#### appliedEffects?

> `optional` **appliedEffects**: `object`[]

#### blur?

> `optional` **blur**: `number`

#### brightness?

> `optional` **brightness**: `number`

#### clarity?

> `optional` **clarity**: `number`

#### contrast?

> `optional` **contrast**: `number`

#### createdAt

> **createdAt**: `Date`

#### cropRect?

> `optional` **cropRect**: \{ `height`: `number`; `width`: `number`; `x`: `number`; `y`: `number`; \} \| `null`

#### curves?

> `optional` **curves**: `object`

##### curves.blue

> **blue**: `object`[]

##### curves.green

> **green**: `object`[]

##### curves.red

> **red**: `object`[]

##### curves.rgb

> **rgb**: `object`[]

#### dimensions?

> `optional` **dimensions**: `object`

##### dimensions.height

> **height**: `number`

##### dimensions.width

> **width**: `number`

#### fileSize?

> `optional` **fileSize**: `number`

#### flipX?

> `optional` **flipX**: `boolean`

#### flipY?

> `optional` **flipY**: `boolean`

#### gradientMapBlendMode?

> `optional` **gradientMapBlendMode**: `string`

#### gradientMapOpacity?

> `optional` **gradientMapOpacity**: `number`

#### highlights?

> `optional` **highlights**: `number`

#### hueRotate?

> `optional` **hueRotate**: `number`

#### id

> **id**: `ReferenceId`

#### invert?

> `optional` **invert**: `number`

#### isGrayscale

> **isGrayscale**: `boolean`

#### name

> **name**: `string`

#### opacity

> **opacity**: `number`

#### position

> **position**: `object` = `PositionSchema`

##### position.x

> **x**: `number`

##### position.y

> **y**: `number`

#### rotation

> **rotation**: `number`

#### saturation?

> `optional` **saturation**: `number`

#### scale

> **scale**: `number`

#### sepia?

> `optional` **sepia**: `number`

#### shadows?

> `optional` **shadows**: `number`

#### src

> **src**: `string`

#### temperature?

> `optional` **temperature**: `number`

#### thumbnailSrc?

> `optional` **thumbnailSrc**: `string`

#### tint?

> `optional` **tint**: `number`

#### vibrance?

> `optional` **vibrance**: `number`

#### vignette?

> `optional` **vignette**: `number`

## Methods

### add()

> **add**(`ref`): `void`

Defined in: [src/lib/stores/references.svelte.ts:49](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L49)

#### Parameters

##### ref

`Omit`\<`ValidatedReferenceImage`, `"id"` \| `"createdAt"`\>

#### Returns

`void`

***

### load()

> **load**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/references.svelte.ts:26](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L26)

#### Returns

`Promise`\<`void`\>

***

### remove()

> **remove**(`id`): `void`

Defined in: [src/lib/stores/references.svelte.ts:73](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L73)

#### Parameters

##### id

`string`

#### Returns

`void`

***

### save()

> **save**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/references.svelte.ts:42](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L42)

#### Returns

`Promise`\<`void`\>

***

### update()

> **update**(`id`, `updates`): `void`

Defined in: [src/lib/stores/references.svelte.ts:96](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L96)

#### Parameters

##### id

`string`

##### updates

`Partial`\<`ValidatedReferenceImage`\>

#### Returns

`void`

***

### whenReady()

> **whenReady**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/references.svelte.ts:22](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/references.svelte.ts#L22)

Wait for the store to be ready (for components that need data immediately)

#### Returns

`Promise`\<`void`\>
