---
editUrl: false
next: false
prev: false
title: "SettingsStore"
---

Defined in: [src/lib/stores/settings.svelte.ts:29](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L29)

## Constructors

### Constructor

> **new SettingsStore**(): `SettingsStore`

Defined in: [src/lib/stores/settings.svelte.ts:35](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L35)

#### Returns

`SettingsStore`

## Properties

### isReady

> **isReady**: `boolean`

Defined in: [src/lib/stores/settings.svelte.ts:31](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L31)

***

### state

> **state**: `object`

Defined in: [src/lib/stores/settings.svelte.ts:30](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L30)

#### alwaysOnTop

> **alwaysOnTop**: `boolean`

#### autoSave

> **autoSave**: `boolean`

#### autoSaveInterval

> **autoSaveInterval**: `number`

#### defaultPaletteSlots

> **defaultPaletteSlots**: `number`

#### enableAnimations

> **enableAnimations**: `boolean`

#### exportPreferences

> **exportPreferences**: `object`

##### exportPreferences.compressionLevel

> **compressionLevel**: `number`

##### exportPreferences.defaultFormat

> **defaultFormat**: `"png"` \| `"jpeg"` \| `"webp"` \| `"svg"`

##### exportPreferences.defaultPngResolution

> **defaultPngResolution**: `number`

##### exportPreferences.defaultScale

> **defaultScale**: `number`

##### exportPreferences.defaultSvgSize

> **defaultSvgSize**: `object` = `DimensionsSchema`

##### exportPreferences.defaultSvgSize.height

> **height**: `number`

##### exportPreferences.defaultSvgSize.width

> **width**: `number`

##### exportPreferences.includeBackground

> **includeBackground**: `boolean`

#### globalEyedropperEnabled

> **globalEyedropperEnabled**: `boolean`

#### referenceBoardSavePath

> **referenceBoardSavePath**: `string` \| `null`

#### theme

> **theme**: `"light"` \| `"dark"` \| `"system"`

#### workspace

> **workspace**: `object`

##### workspace.gridSize

> **gridSize**: `number`

##### workspace.showGrid

> **showGrid**: `boolean`

##### workspace.showRulers

> **showRulers**: `boolean`

##### workspace.snapToGrid

> **snapToGrid**: `boolean`

## Methods

### load()

> **load**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/settings.svelte.ts:47](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L47)

#### Returns

`Promise`\<`void`\>

***

### save()

> **save**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/settings.svelte.ts:61](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L61)

#### Returns

`Promise`\<`void`\>

***

### setTheme()

> **setTheme**(`theme`): `void`

Defined in: [src/lib/stores/settings.svelte.ts:71](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L71)

#### Parameters

##### theme

`"light"` | `"dark"` | `"system"`

#### Returns

`void`

***

### update()

> **update**(`updates`): `void`

Defined in: [src/lib/stores/settings.svelte.ts:65](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L65)

#### Parameters

##### updates

`Partial`\<`ValidatedAppSettings`\>

#### Returns

`void`

***

### whenReady()

> **whenReady**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/settings.svelte.ts:43](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/settings.svelte.ts#L43)

Wait for the store to be ready (for components that need data immediately)

#### Returns

`Promise`\<`void`\>
