---
editUrl: false
next: false
prev: false
title: "GradientStore"
---

Defined in: [src/lib/stores/gradients.svelte.ts:6](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L6)

## Constructors

### Constructor

> **new GradientStore**(): `GradientStore`

Defined in: [src/lib/stores/gradients.svelte.ts:15](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L15)

#### Returns

`GradientStore`

## Properties

### activeGradientId

> **activeGradientId**: `string` \| `null`

Defined in: [src/lib/stores/gradients.svelte.ts:8](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L8)

***

### gradients

> **gradients**: `object`[]

Defined in: [src/lib/stores/gradients.svelte.ts:7](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L7)

#### angle?

> `optional` **angle**: `number`

#### centerX?

> `optional` **centerX**: `number`

#### centerY?

> `optional` **centerY**: `number`

#### createdAt

> **createdAt**: `Date`

#### id

> **id**: `GradientId`

#### interpolationMode?

> `optional` **interpolationMode**: `"rgb"` \| `"oklch"` \| `"oklab"` \| `"hsl"` \| `"lab"` \| `"lch"`

#### meshPoints?

> `optional` **meshPoints**: `object`[]

#### name

> **name**: `string`

#### noise?

> `optional` **noise**: `object`

##### noise.enabled

> **enabled**: `boolean`

##### noise.intensity

> **intensity**: `number`

##### noise.scale

> **scale**: `number`

##### noise.type

> **type**: `"perlin"` \| `"simplex"` \| `"grain"`

#### stops

> **stops**: `object`[]

#### tags?

> `optional` **tags**: `string`[]

#### type

> **type**: `"linear"` \| `"radial"` \| `"conic"` \| `"mesh"`

***

### history

> **history**: `HistoryStore`\<`object`[]\>

Defined in: [src/lib/stores/gradients.svelte.ts:10](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L10)

***

### isReady

> **isReady**: `boolean`

Defined in: [src/lib/stores/gradients.svelte.ts:9](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L9)

## Accessors

### activeGradient

#### Get Signature

> **get** **activeGradient**(): \{ `angle?`: `number`; `centerX?`: `number`; `centerY?`: `number`; `createdAt`: `Date`; `id`: `GradientId`; `interpolationMode?`: `"rgb"` \| `"oklch"` \| `"oklab"` \| `"hsl"` \| `"lab"` \| `"lch"`; `meshPoints?`: `object`[]; `name`: `string`; `noise?`: \{ `enabled`: `boolean`; `intensity`: `number`; `scale`: `number`; `type`: `"perlin"` \| `"simplex"` \| `"grain"`; \}; `stops`: `object`[]; `tags?`: `string`[]; `type`: `"linear"` \| `"radial"` \| `"conic"` \| `"mesh"`; \} \| `null` \| `undefined`

Defined in: [src/lib/stores/gradients.svelte.ts:27](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L27)

##### Returns

\{ `angle?`: `number`; `centerX?`: `number`; `centerY?`: `number`; `createdAt`: `Date`; `id`: `GradientId`; `interpolationMode?`: `"rgb"` \| `"oklch"` \| `"oklab"` \| `"hsl"` \| `"lab"` \| `"lch"`; `meshPoints?`: `object`[]; `name`: `string`; `noise?`: \{ `enabled`: `boolean`; `intensity`: `number`; `scale`: `number`; `type`: `"perlin"` \| `"simplex"` \| `"grain"`; \}; `stops`: `object`[]; `tags?`: `string`[]; `type`: `"linear"` \| `"radial"` \| `"conic"` \| `"mesh"`; \} \| `null` \| `undefined`

## Methods

### add()

> **add**(`gradient`): `GradientId`

Defined in: [src/lib/stores/gradients.svelte.ts:62](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L62)

#### Parameters

##### gradient

`Omit`\<`ValidatedGradient`, `"id"` \| `"createdAt"`\>

#### Returns

`GradientId`

***

### load()

> **load**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/gradients.svelte.ts:33](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L33)

#### Returns

`Promise`\<`void`\>

***

### remove()

> **remove**(`id`): `void`

Defined in: [src/lib/stores/gradients.svelte.ts:88](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L88)

#### Parameters

##### id

`string`

#### Returns

`void`

***

### save()

> **save**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/gradients.svelte.ts:58](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L58)

#### Returns

`Promise`\<`void`\>

***

### setActive()

> **setActive**(`id`): `void`

Defined in: [src/lib/stores/gradients.svelte.ts:141](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L141)

#### Parameters

##### id

`string` | `null`

#### Returns

`void`

***

### update()

> **update**(`id`, `updates`): `void`

Defined in: [src/lib/stores/gradients.svelte.ts:116](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L116)

#### Parameters

##### id

`string`

##### updates

`Partial`\<`ValidatedGradient`\>

#### Returns

`void`

***

### whenReady()

> **whenReady**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/gradients.svelte.ts:23](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/gradients.svelte.ts#L23)

Wait for the store to be ready (for components that need data immediately)

#### Returns

`Promise`\<`void`\>
