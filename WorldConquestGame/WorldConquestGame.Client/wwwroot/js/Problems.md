Tracking Prevention blocked access to storage for <URL>.
Tracking Prevention blocked access to storage for <URL>.
Tracking Prevention blocked access to storage for <URL>.
Tracking Prevention blocked access to storage for <URL>.
Tracking Prevention blocked access to storage for <URL>.
Tracking Prevention blocked access to storage for <URL>.
Tracking Prevention blocked access to storage for <URL>.
Tracking Prevention blocked access to storage for <URL>.
assetsCache.ts:30 dotnet Loaded 8.82 MB resourcesThis application was built with linking (tree shaking) disabled. Published applications will be significantly smaller if you install wasm-tools workload. See also https://aka.ms/dotnet-wasm-features
blazor.webassembly.js:1 Debugging hotkey: Shift+Alt+D (when application has focus)
mapInterop.js:363 mapInterop: loaded geo layer, known layer keys count= 15  sample= Array(12)
mapInterop.js:336 mapInterop: feature clicked, id= Dover
mapInterop.js:340 mapInterop: .NET callback invoked for Dover
blazor.webassembly.js:1 [Modal] Submit called. UserAnswer=Dover, CorrectAnswer=Dover
blazor.webassembly.js:1 [Modal] Submit: correct answer, invoking OnSubmit
mapInterop.js:770 mapInterop: trying to apply style for id Dover  color= #28a745
mapInterop.js:754  mapInterop.setCountryConquered error TypeError: layer.setStyle is not a function
    at Object.setCountryConquered (mapInterop.js:692:23)
    at Object.setCountryConqueredAny (mapInterop.js:775:39)
    at blazor.webassembly.js:1:2878
    at new Promise (<anonymous>)
    at b.beginInvokeJSFromDotNet (blazor.webassembly.js:1:2835)
    at Object.vn [as invokeJSJson] (blazor.webassembly.js:1:58849)
    at invoke-js.ts:233:31
    at $l (invoke-js.ts:276:5)
    at 00b2380a:0x1fa8c
    at 00b2380a:0x1bf2f
setCountryConquered @ mapInterop.js:754
setCountryConqueredAny @ mapInterop.js:775
(anonymous) @ blazor.webassembly.js:1
beginInvokeJSFromDotNet @ blazor.webassembly.js:1
vn @ blazor.webassembly.js:1
(anonymous) @ invoke-js.ts:233
$l @ invoke-js.ts:276
$func349 @ 00b2380a:0x1fa8c
$func245 @ 00b2380a:0x1bf2f
$func238 @ 00b2380a:0xf017
$func272 @ 00b2380a:0x1d14d
$func3187 @ 00b2380a:0xe8951
$func2507 @ 00b2380a:0xbe641
$func2506 @ 00b2380a:0xbe5d1
$func1876 @ 00b2380a:0x9a6c3
$func349 @ 00b2380a:0x1fb10
$func245 @ 00b2380a:0x1bf2f
$func238 @ 00b2380a:0xf017
$func272 @ 00b2380a:0x1d14d
$func3187 @ 00b2380a:0xe8951
$func2507 @ 00b2380a:0xbe641
$func2513 @ 00b2380a:0xbee65
$func2537 @ 00b2380a:0xc14bc
$mono_wasm_invoke_method_bound @ 00b2380a:0xa4fe
Module._mono_wasm_invoke_method_bound @ dotnet.native.js:8
kr @ invoke-cs.ts:273
(anonymous) @ invoke-cs.ts:247
beginInvokeDotNetFromJS @ blazor.webassembly.js:1
invokeDotNetMethodAsync @ blazor.webassembly.js:1
invokeMethodAsync @ blazor.webassembly.js:1
(anonymous) @ blazor.webassembly.js:1
N @ blazor.webassembly.js:1
(anonymous) @ blazor.webassembly.js:1
invokeWhenHeapUnlocked @ blazor.webassembly.js:1
(anonymous) @ blazor.webassembly.js:1
N @ blazor.webassembly.js:1
C @ blazor.webassembly.js:1
dispatchGlobalEventToAllElements @ blazor.webassembly.js:1
onGlobalEvent @ blazor.webassembly.js:1
blazor.webassembly.js:1 [Modal] Close called, invoking OnClose
blazor.webassembly.js:1 [KentTownsMap] OnModalClose called. Setting IsModalOpen=false

This is occurring when I
 dover as a correct answer  the map pin should be turning green but does not it stays red