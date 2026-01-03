---
editUrl: false
next: false
prev: false
title: "RootStore"
---

Defined in: [src/lib/stores/root.svelte.ts:8](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L8)

## Constructors

### Constructor

> **new RootStore**(): `RootStore`

#### Returns

`RootStore`

## Properties

### globalColorBuffer

> **globalColorBuffer**: `string` \| `null`

Defined in: [src/lib/stores/root.svelte.ts:20](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L20)

***

### gradients

> **gradients**: [`GradientStore`](/reference/api/classes/gradientstore/)

Defined in: [src/lib/stores/root.svelte.ts:12](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L12)

***

### isEyedropperActive

> **isEyedropperActive**: `boolean`

Defined in: [src/lib/stores/root.svelte.ts:19](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L19)

***

### mobileMenuOpen

> **mobileMenuOpen**: `boolean`

Defined in: [src/lib/stores/root.svelte.ts:23](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L23)

***

### palettes

> **palettes**: [`PaletteStore`](/reference/api/classes/palettestore/)

Defined in: [src/lib/stores/root.svelte.ts:10](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L10)

***

### references

> **references**: [`ReferenceStore`](/reference/api/classes/referencestore/)

Defined in: [src/lib/stores/root.svelte.ts:11](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L11)

***

### settings

> **settings**: [`SettingsStore`](/reference/api/classes/settingsstore/)

Defined in: [src/lib/stores/root.svelte.ts:9](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L9)

***

### spatial

> **spatial**: `SpatialNavEngine` = `spatialNav`

Defined in: [src/lib/stores/root.svelte.ts:16](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L16)

***

### theme

> **theme**: `ThemeStore`

Defined in: [src/lib/stores/root.svelte.ts:13](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L13)

## Accessors

### isReady

#### Get Signature

> **get** **isReady**(): `boolean`

Defined in: [src/lib/stores/root.svelte.ts:28](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L28)

Derived state: true when all stores have finished loading

##### Returns

`boolean`

## Methods

### clearGlobalColor()

> **clearGlobalColor**(): `void`

Defined in: [src/lib/stores/root.svelte.ts:57](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L57)

#### Returns

`void`

***

### closeMobileMenu()

> **closeMobileMenu**(): `void`

Defined in: [src/lib/stores/root.svelte.ts:65](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L65)

#### Returns

`void`

***

### openMobileMenu()

> **openMobileMenu**(): `void`

Defined in: [src/lib/stores/root.svelte.ts:69](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L69)

#### Returns

`void`

***

### setGlobalColor()

> **setGlobalColor**(`color`): `void`

Defined in: [src/lib/stores/root.svelte.ts:53](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L53)

#### Parameters

##### color

`string`

#### Returns

`void`

***

### toggleEyedropper()

> **toggleEyedropper**(): `void`

Defined in: [src/lib/stores/root.svelte.ts:49](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L49)

#### Returns

`void`

***

### toggleMobileMenu()

> **toggleMobileMenu**(): `void`

Defined in: [src/lib/stores/root.svelte.ts:61](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L61)

#### Returns

`void`

***

### whenReady()

> **whenReady**(): `Promise`\<`void`\>

Defined in: [src/lib/stores/root.svelte.ts:40](https://github.com/nix24/PhoenyxColor/blob/31995168151b04344423428cf8e8bbe543587a73/src/lib/stores/root.svelte.ts#L40)

Wait for all stores to be ready

#### Returns

`Promise`\<`void`\>
