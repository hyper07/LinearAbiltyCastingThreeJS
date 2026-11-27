# Real-looking Seoul buildings and signs in three.js

Written 2026-11-24 after the user judged Gangnam Jarani's buildings "not like
real" and its shop signs "not where real signs go". References: `images2/BLDG_1-5.png`
(haze skyline, a dense signage avenue, an old-town street with wires and hanging
signs, a typical Seoul office tower with white fins, a glass tower at dusk with
lit floors), `ref.img2-0316`, `ref.img2-0314`.

Real textured 3D Seoul data is not an option: V-World's 3D buildings are
classified "restricted" (공개제한) and its 3D API was closed in 2019; Seoul's
S-Map has no public download. Buildings are generated from the footprint +
height + use register we already have (`games/g_cv2yrhrpv2/tiles.js`), so realism has to
come from the rules below.

## 1. Why the first pass looked fake

1. **Signs in a continuous band at pedestrian height** along the pavement, like
   a fence. Real signs are fixed to the building, one per tenant, at set heights.
2. **Flat boxes with window textures.** Real windows are recessed: frame,
   reveal, sill, glass set back 10–25 cm, so every window has a shadow line.
3. **Every face treated alike.** Real Seoul street buildings have one designed
   front and plain side and back walls.
4. **Wrong scale.** Floors and windows that are too big or small, no ground-floor
   height difference, no plinth.
5. **No dirt, no age, no AO.** Clean, even colour on every surface reads as CG.
6. **Same building repeated**, no rooftop clutter, no pipes, no AC units on walls.

## 2. Proportions (metres)

| Thing | Size |
|---|---|
| Floor height, commercial / office | 3.3–4.0 (ground floor 4.0–4.5) |
| Floor height, residential (villa, apartment) | 2.8–3.0 |
| Small shop building (근린생활시설) | 4–7 floors, frontage 8–15 m |
| Window, residential | 1.2–1.8 wide × 1.2–1.5 tall, sill at 0.9 |
| Office ribbon / curtain wall module | 1.2–1.5 wide, floor-to-ceiling |
| Window recess (glass behind wall face) | 0.10–0.25 |
| Shopfront glass | full width of the bay, 2.8–3.5 tall, 0.3–0.6 plinth or none |
| Parapet | 0.9–1.2 above the roof slab |

## 3. The building types on a Seoul street

| Type | Where | Front | Sides |
|---|---|---|---|
| **Small shop building** (상가 근생) | main streets, corners | granite/ceramic tile or painted render, punched windows or a glass band per floor, shopfront on 1F | plain painted concrete, a few small windows, exposed downpipes |
| **Office tower** (BLDG_4) | boulevards | dark reflective glass between white aluminium vertical fins, recessed glass lobby, company name at the top | same system all round |
| **Glass tower** (BLDG_5) | Gangnam, Yangjae | curtain wall reflecting the sky, floors visible inside (ceiling lights, desks), one sculptural feature | glass |
| **Concrete office, older** | everywhere | horizontal concrete bands with ribbon windows, white or grey | similar, plainer |
| **Brick villa** (다세대/빌라) | alleys | red/brown brick, small windows with security grilles, piloti parking on 1F, external stair or balcony rails | brick, AC units hung on the wall |
| **Apartment slab** | background | white with a big number painted near the top, balconies glazed | blank end walls |

Assign by the register's use code and height: low + residential → villa;
low/mid + commercial → shop building; tall + office → office or glass tower.
Vary colour, tile, window rhythm and roof per building from a seeded random so
neighbours never match.

## 4. Where Korean signs actually go

Governed by the outdoor-advertising law (옥외광고물법), so streets look alike
everywhere. **Every sign belongs to a tenant on a floor.**

| Sign | Where exactly | Size / look |
|---|---|---|
| **Horizontal shop sign** (가로형 간판) | 1F, directly above the shopfront, under the 2F windows, spanning that one shop's width | 0.8–1.2 m tall, box or channel letters, lit at night; one per shop, gaps between shops |
| **Upper-floor horizontal signs** | 2F–3F (sometimes to 5F), on the band between floors, one per tenant | same as above, smaller |
| **Window lettering** (창문 시트지) | on the glass of 2F+ windows: big letters for 학원, 치과, 의원, 미용실, 필라테스, phone numbers | coloured vinyl on glass, the most "Seoul" detail of all |
| **Projecting vertical sign** (돌출간판) | on the building's front corner or edge, sticking out ~0.6–1.0 m perpendicular to the facade, from 2F upwards, one box per tenant stacked floor by floor | 0.5–0.6 m wide, lit, white or coloured boxes with names |
| **Rooftop / top sign** | only on bigger buildings: company name at the top of a tower (BLDG_4/5) | large channel letters |
| **Standing sign** (입간판) | on the pavement right in front of its shop | small A-frame or lit cylinder, ~1–1.5 m tall |
| **Banners** | hung vertically beside a shop door, or on lamp posts | cloth |

Never: a continuous wall of signs at pedestrian height; signs floating free of a
building; signs on blank side walls (except a painted name or a big banner).

**What goes on which floor**: 1F 편의점, 카페, 약국, 김밥, 치킨, 베이커리, 부동산,
휴대폰; 2F 치과, 미용실, PC방, 노래방, 학원, 식당; 3F+ 학원, 의원, 사무실, 교회,
스터디카페; B1 노래방, 주점. Names are our own (no real brands); use the business
word plus a made-up name (e.g. 하늘약국, 바른치과, 별빛미용실).

## 5. Materials and light that make it real

- **Photo textures at true scale** (CC0: ambientCG, Poly Haven): granite and
  ceramic tile (300×600 mm), painted render, red brick (stretcher bond),
  concrete; one texel ≈ 1 cm up close. Triplanar or world-space UVs so scale
  never stretches.
- **Recessed windows as geometry or parallax**: near the course, real frames and
  reveals; farther, a parallax/POM window atlas. Glass: reflections of sky and
  buildings (low roughness, fresnel) over **interior mapping** (rooms, ceiling
  lights, blinds half down in some, random lit/unlit at night with warm vs cool
  light).
- **Grime**: darker at the base (splash zone ~0.5 m), streaks under every sill
  and AC unit, faded paint on side walls, rust under railings. A world-space
  noise + vertical streak mask is enough.
- **Wall clutter**: AC outdoor units, gas pipes (yellow), downpipes, meter boxes,
  window grilles on villas, CCTV, cables running between buildings.
- **Roofs**: water tanks, railings, antennas, rooftop greenhouses/sheds,
  stair-tower boxes, solar panels on some.
- **Ground floor**: lit shop interiors seen through glass (shelves, tables,
  counters as a parallax layer), roller shutters down on some at night, awnings.
- **Light**: AgX tone mapping, sky + sun with soft shadows, GTAO for recesses,
  aerial haze tinted by the sky (distant buildings blue-grey, BLDG_1), a warm
  low sun in golden hour. Night: signs and windows carry the light.

## 6. Order of work (do it in this order, check each step)

1. Building types + correct proportions + plain side walls (§2–3).
2. Recessed windows and glass with interior mapping, near-course LOD (§5).
3. Signs placed per tenant by the rules (§4), floor-plausible names.
4. Photo-textured materials + grime + wall clutter + roofs.
5. Light: AO, haze, golden hour, night.

After each step: screenshot the same three views (boulevard, small-shop corner,
alley) and put them **side by side with BLDG_3, BLDG_4, BLDG_5**. If the game shot
looks obviously fake next to them, it is not done: list what differs and fix
the biggest difference next.
