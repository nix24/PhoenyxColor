---
editUrl: false
next: false
prev: false
title: "SettingsStore"
---

Defined in: settings.svelte.ts:35

## Constructors

### Constructor

> **new SettingsStore**(): `SettingsStore`

Defined in: settings.svelte.ts:39

#### Returns

`SettingsStore`

## Properties

### state

> **state**: `AppSettings`

Defined in: settings.svelte.ts:36

## Methods

### load()

> **load**(): `Promise`\<`void`\>

Defined in: settings.svelte.ts:43

#### Returns

`Promise`\<`void`\>

***

### save()

> **save**(): `Promise`\<`void`\>

Defined in: settings.svelte.ts:51

#### Returns

`Promise`\<`void`\>

***

### setTheme()

> **setTheme**(`theme`): `void`

Defined in: settings.svelte.ts:61

#### Parameters

##### theme

`"light"` | `"dark"` | `"system"`

#### Returns

`void`

***

### update()

> **update**(`updates`): `void`

Defined in: settings.svelte.ts:55

#### Parameters

##### updates

`Partial`\<`AppSettings`\>

#### Returns

`void`
