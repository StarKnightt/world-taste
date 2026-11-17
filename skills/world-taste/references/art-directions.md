# Art directions

Pick one. Each gives you starting numbers for the sun, sky, fog and exposure, a palette, the one signature detail that sells the look, what to search for references, and the mistakes that kill it.

How to use the numbers:
- **Sun** is elevation and azimuth in degrees (elevation 0 = horizon, 90 = straight up). Feed them to the sky and directional light together so they always agree.
- **Sun color / intensity** go on the `DirectionalLight`. **Fill** is a `HemisphereLight(sky, ground, intensity)`.
- **Fog** is `FogExp2(color, density)` for scenes around 200 to 600 units across. Scale density down for larger worlds.
- **Exposure** is `renderer.toneMappingExposure` with ACES Filmic. Lower it before touching bloom if whites clip.
- Colors are hex. Treat every number as a start point and let the check move it.

---

## 1. Golden hour coast
- **Sun:** elevation 6, low over the sea. Color `#ffbf7a`, intensity 3.2
- **Fill:** sky `#a9c4e8`, ground `#5a4636`, 0.5
- **Fog:** `#e6b98f`, 0.006 · **Exposure:** 0.85
- **Palette:** amber, teal water, cream sand, dark wet rock
- **Signature:** a path of sun glint on the water leading to the camera
- **References:** "golden hour rocky coast", "sunset sea stack", "Big Sur sunset"
- **Kills it:** water the same brightness as the sky; no wet darkening where waves hit sand

## 2. Toon countryside afternoon
- **Sun:** elevation 35. Color `#fff1d6`, intensity 2.6
- **Fill:** sky `#9cc9ff`, ground `#6b7d3a`, 0.7
- **Fog:** `#cfe3f5`, 0.004 · **Exposure:** 0.95
- **Palette:** saturated grass greens, sky blue, white cumulus, red roofs
- **Signature:** big stacked cumulus clouds and hand-painted foliage edges
- **References:** "Japanese countryside rice fields summer", anime background art of rural roads
- **Kills it:** realistic textures mixed with flat toon shading; clouds as flat sprites

## 3. Misty pine valley at sunrise
- **Sun:** elevation 4, behind a ridge. Color `#ffd2a1`, intensity 2.2
- **Fill:** sky `#b8c9d9`, ground `#3a4436`, 0.6
- **Fog:** `#c9d3d8`, 0.018 (layered: thicker low in the valley) · **Exposure:** 0.9
- **Palette:** blue-green pines, grey mist, pale gold rim light
- **Signature:** fog layers between ridges, each ridge lighter than the one in front
- **References:** "foggy pine valley sunrise", "Pacific Northwest morning mist"
- **Kills it:** one uniform fog density; dark pines with no rim light

## 4. Desert sunset
- **Sun:** elevation 3. Color `#ff9a55`, intensity 3.5
- **Fill:** sky `#8f8bc9`, ground `#7a4a2e`, 0.45
- **Fog:** `#d79a74`, 0.005 · **Exposure:** 0.85
- **Palette:** rust rock, purple shadows, gold sand
- **Signature:** long shadows across dunes and purple sky in the shadowed side
- **References:** "Monument Valley sunset", "red rock desert golden hour"
- **Kills it:** grey shadows; sand with no ripple detail near the camera

## 5. Neon night street (after rain)
- **Sun:** none. Moon fill only: `#7f94c9`, intensity 0.3
- **Fill:** sky `#1b2140`, ground `#120d14`, 0.25
- **Fog:** `#2a2440`, 0.02 · **Exposure:** 1.1
- **Palette:** magenta, cyan, warm sodium orange, near black
- **Signature:** wet asphalt reflecting every sign
- **References:** "rainy night street neon Tokyo", "wet street reflections night"
- **Kills it:** dry roads; every light the same color; pure black areas. Pair with a day version if possible.

## 6. Tropical island noon
- **Sun:** elevation 70. Color `#fff6e3`, intensity 3.6
- **Fill:** sky `#8ec5ff`, ground `#d9c9a3`, 0.6
- **Fog:** `#cde6f5`, 0.002 · **Exposure:** 0.8
- **Palette:** turquoise shallows, deep blue drop-off, white sand, palm green
- **Signature:** clear shallow water where you see sand and caustics through it
- **References:** "Maldives shallow water aerial", "tropical beach palm noon"
- **Kills it:** the same water color everywhere; palms as cones

## 7. Summer festival at dusk
- **Sun:** elevation -2 (just set). Sky only. Color `#ff9a6b`, intensity 0.8
- **Fill:** sky `#4c5c9c`, ground `#3a2a2a`, 0.5
- **Fog:** `#5a5070`, 0.01 · **Exposure:** 1.05
- **Palette:** warm lantern orange, deep blue sky, red and white stalls
- **Signature:** strings of lanterns with soft bloom against a blue-hour sky
- **References:** "Japanese summer festival lanterns dusk", "yatai stalls night"
- **Kills it:** every lantern the same brightness; sky already pitch black

## 8. Jungle trail
- **Sun:** elevation 55, broken by canopy. Color `#fff0c8`, intensity 2.8
- **Fill:** sky `#a7c49a`, ground `#2f2a1d`, 0.55
- **Fog:** `#9fb38f`, 0.02 · **Exposure:** 0.9
- **Palette:** many greens (lime, olive, emerald, near-black), brown mud
- **Signature:** dappled light patches on the path and hanging vines in front of the camera
- **References:** "rainforest trail sun rays", "Costa Rica jungle path"
- **Kills it:** one green; no light shafts; foliage that stops at mid-height

## 9. Mountain valley ride (late afternoon)
- **Sun:** elevation 18. Color `#ffd9a3`, intensity 3.0
- **Fill:** sky `#a3c3e6`, ground `#6b5a3a`, 0.55
- **Fog:** `#b9cde0`, 0.004 · **Exposure:** 0.9
- **Palette:** gold grass, dark pine, snow peaks fading blue
- **Signature:** wind waves rolling across tall grass, peaks fading into blue haze
- **References:** "alpine meadow late afternoon", "Dolomites golden grass"
- **Kills it:** peaks as sharp as the foreground; frozen grass

## 10. Quiet roadside at dawn
- **Sun:** elevation 2. Color `#ffc8a8`, intensity 1.8
- **Fill:** sky `#c4c9e0`, ground `#4a4744`, 0.6
- **Fog:** `#d8cdd0`, 0.009 · **Exposure:** 0.95
- **Palette:** soft pink sky, concrete grey, one warm light (a diner, a sign)
- **Signature:** one warm practical light in a cool scene
- **References:** "empty road dawn", "roadside motel morning"
- **Kills it:** several competing warm lights; harsh midday contrast

## 11. Snowy village morning
- **Sun:** elevation 12. Color `#ffe2c4`, intensity 2.6
- **Fill:** sky `#b7cdf0`, ground `#d7dfea`, 0.7
- **Fog:** `#dfe6f0`, 0.008 · **Exposure:** 0.75
- **Palette:** blue shadows on white snow, warm windows, dark timber
- **Signature:** blue shadows on snow and warm light from windows
- **References:** "snowy village morning", "Hallstatt winter"
- **Kills it:** white snow with grey shadows (must be blue); clipped snow everywhere

## 12. Autumn forest
- **Sun:** elevation 25. Color `#ffd59a`, intensity 2.8
- **Fill:** sky `#b5c8dc`, ground `#5a3b22`, 0.55
- **Fog:** `#d6b98f`, 0.01 · **Exposure:** 0.9
- **Palette:** orange, red, yellow leaves; some green left; leaf-covered ground
- **Signature:** backlit leaves glowing and leaves on the ground
- **References:** "autumn forest path backlit", "Vermont fall foliage"
- **Kills it:** all trees one orange; bare ground under colored trees

## 13. Rainy city afternoon
- **Sun:** none direct. Overcast fill: `#d8dde6`, intensity 1.2 from above
- **Fill:** sky `#aab4c3`, ground `#3d3f45`, 0.9
- **Fog:** `#9aa3b0`, 0.012 · **Exposure:** 1.0
- **Palette:** wet greys, yellow taxis or one accent color, reflections
- **Signature:** puddles reflecting buildings and umbrellas as the only color
- **References:** "rainy street afternoon reflections", "overcast city puddles"
- **Kills it:** sharp sun shadows in a rain scene; dry surfaces

## 14. Sunlit cliffside town (Mediterranean)
- **Sun:** elevation 40. Color `#fff1dc`, intensity 3.4
- **Fill:** sky `#7fb3ef`, ground `#e2d2b8`, 0.6
- **Fog:** `#cfe2f2`, 0.002 · **Exposure:** 0.8
- **Palette:** white walls, blue doors, terracotta, deep sea blue
- **Signature:** bright bounced light inside shadows of white walls
- **References:** "Positano", "Santorini street"
- **Kills it:** grey-white walls; shadows without bounce light

## 15. Lakeside cabin evening
- **Sun:** elevation 5. Color `#ffb27a`, intensity 2.4
- **Fill:** sky `#8fa7cf`, ground `#3a3328`, 0.5
- **Fog:** `#c7a98e`, 0.006 · **Exposure:** 0.9
- **Palette:** mirror-still lake, dark pines, warm cabin window
- **Signature:** a perfect reflection of trees and sky in still water
- **References:** "still lake reflection sunset cabin", "Canadian lake evening"
- **Kills it:** reflection that doesn't match the scene; ripples on "still" water

## 16. Savanna golden grass
- **Sun:** elevation 10. Color `#ffc77d`, intensity 3.2
- **Fill:** sky `#c9b9a0`, ground `#7a5a2e`, 0.5
- **Fog:** `#e0bf8c`, 0.006 · **Exposure:** 0.85
- **Palette:** gold grass, acacia silhouettes, dusty orange sky
- **Signature:** a single acacia silhouette against a huge low sun
- **References:** "Serengeti sunset acacia", "savanna golden hour"
- **Kills it:** green grass; dense trees (it's mostly open)

## 17. Volcanic black-sand beach
- **Sun:** elevation 15, through cloud. Color `#ffe0c2`, intensity 2.0
- **Fill:** sky `#a7b2bf`, ground `#2b2a2a`, 0.7
- **Fog:** `#b8c0c8`, 0.01 · **Exposure:** 1.0
- **Palette:** black sand, white foam, grey-blue sea, moss green cliffs
- **Signature:** bright white foam lines on black sand
- **References:** "Reynisfjara black sand beach", "Iceland basalt coast"
- **Kills it:** sand as pure black; foam that doesn't follow the shoreline

## 18. Old Japanese street at blue hour
- **Sun:** elevation -4. Color `#9fb0e6`, intensity 0.4
- **Fill:** sky `#3c4f8c`, ground `#2a2420`, 0.5
- **Fog:** `#4a5070`, 0.012 · **Exposure:** 1.05
- **Palette:** deep blue, warm paper lanterns, dark wood
- **Signature:** warm windows and lanterns against a deep blue sky that still has color
- **References:** "Kyoto Gion blue hour", "Takayama old town evening"
- **Kills it:** black sky; neon-bright lanterns

## 19. Wildflower meadow, spring noon
- **Sun:** elevation 60. Color `#fffaf0`, intensity 3.0
- **Fill:** sky `#9ccbff`, ground `#6a8a3a`, 0.7
- **Fog:** `#d6e8f5`, 0.003 · **Exposure:** 0.85
- **Palette:** fresh green, scattered yellow, purple and white flowers
- **Signature:** flowers in clumps and drifts, not evenly scattered
- **References:** "wildflower meadow spring", "alpine flowers close up"
- **Kills it:** confetti flowers spread evenly; one flower color

## 20. Canyon river, morning
- **Sun:** elevation 30, one wall lit, one in shade. Color `#ffe1b5`, intensity 3.0
- **Fill:** sky `#9fc0e4`, ground `#8a5a3a`, 0.65
- **Fog:** `#d2b9a0`, 0.004 · **Exposure:** 0.85
- **Palette:** orange lit wall, purple-blue shaded wall, green river
- **Signature:** bounced orange light from the lit wall into the shaded side
- **References:** "Antelope canyon", "Zion Narrows morning"
- **Kills it:** both walls lit the same; clear blue river (canyon rivers are green or brown)

---

## Making your own direction

If none fit, write a new entry in the same shape before building: sun, fill, fog, exposure, palette, signature, references, kills it. Base every number on a reference photo, not on taste.
