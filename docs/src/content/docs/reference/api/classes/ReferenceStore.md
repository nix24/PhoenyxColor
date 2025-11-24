---
editUrl: false
next: false
prev: false
title: "ReferenceStore"
---

Defined in: references.svelte.ts:22

## Constructors

### Constructor

> **new ReferenceStore**(): `ReferenceStore`

Defined in: references.svelte.ts:28

#### Returns

`ReferenceStore`

## Properties

### history

> **history**: `HistoryStore`\<`ReferenceImage`[]\>

Defined in: references.svelte.ts:24

***

### references

> **references**: `ReferenceImage`[]

Defined in: references.svelte.ts:23

## Methods

### add()

> **add**(`ref`): `void`

Defined in: references.svelte.ts:49

#### Parameters

##### ref

`Omit`\<`ReferenceImage`, `"id"` \| `"createdAt"`\>

#### Returns

`void`

***

### load()

> **load**(): `Promise`\<`void`\>

Defined in: references.svelte.ts:32

#### Returns

`Promise`\<`void`\>

***

### remove()

> **remove**(`id`): `void`

Defined in: references.svelte.ts:73

#### Parameters

##### id

`string`

#### Returns

`void`

***

### save()

> **save**(): `Promise`\<`void`\>

Defined in: references.svelte.ts:42

#### Returns

`Promise`\<`void`\>

***

### update()

> **update**(`id`, `updates`): `void`

Defined in: references.svelte.ts:96

#### Parameters

##### id

`string`

##### updates

`Partial`\<`ReferenceImage`\>

#### Returns

`void`
