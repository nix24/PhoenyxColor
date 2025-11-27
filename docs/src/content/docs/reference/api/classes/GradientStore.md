---
editUrl: false
next: false
prev: false
title: "GradientStore"
---

Defined in: gradients.svelte.ts:20

## Constructors

### Constructor

> **new GradientStore**(): `GradientStore`

Defined in: gradients.svelte.ts:27

#### Returns

`GradientStore`

## Properties

### activeGradientId

> **activeGradientId**: `string` \| `null`

Defined in: gradients.svelte.ts:22

***

### gradients

> **gradients**: `Gradient`[]

Defined in: gradients.svelte.ts:21

***

### history

> **history**: `HistoryStore`\<`Gradient`[]\>

Defined in: gradients.svelte.ts:23

## Accessors

### activeGradient

#### Get Signature

> **get** **activeGradient**(): `Gradient` \| `null` \| `undefined`

Defined in: gradients.svelte.ts:31

##### Returns

`Gradient` \| `null` \| `undefined`

## Methods

### add()

> **add**(`gradient`): `string`

Defined in: gradients.svelte.ts:49

#### Parameters

##### gradient

`Omit`\<`Gradient`, `"id"` \| `"createdAt"`\>

#### Returns

`string`

***

### load()

> **load**(): `Promise`\<`void`\>

Defined in: gradients.svelte.ts:35

#### Returns

`Promise`\<`void`\>

***

### remove()

> **remove**(`id`): `void`

Defined in: gradients.svelte.ts:75

#### Parameters

##### id

`string`

#### Returns

`void`

***

### save()

> **save**(): `Promise`\<`void`\>

Defined in: gradients.svelte.ts:45

#### Returns

`Promise`\<`void`\>

***

### setActive()

> **setActive**(`id`): `void`

Defined in: gradients.svelte.ts:125

#### Parameters

##### id

`string` | `null`

#### Returns

`void`

***

### update()

> **update**(`id`, `updates`): `void`

Defined in: gradients.svelte.ts:103

#### Parameters

##### id

`string`

##### updates

`Partial`\<`Gradient`\>

#### Returns

`void`
