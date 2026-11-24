# RikiPath Roadmap World — landscape art

Painted environment backgrounds for the Learner Dashboard lesson roadmap ("Lộ trình học của bạn").
They are **environment only**: the learning path, checkpoints, status badges and labels are rendered on top by
`src/features/learner-ui/LearningJourneyMap.jsx`, so art never contains text, UI, numbers or a drawn route.

## Assets in use (`public/images/roadmap-world/`)

| Landscape key   | Source painting (team-provided, 2000×667)        | Files                                   |
|-----------------|---------------------------------------------------|-----------------------------------------|
| `sakura_garden` | Sakura garden, stream, red bridge, Fuji           | `sakura_garden-{800,1280,2000}.webp`    |
| `village`       | Village houses, lanterns, red bridge, torii, Fuji | `village-{800,1280,2000}.webp`          |
| `momiji`        | Autumn maples, misty hills, pagoda, Fuji          | `momiji-{800,1280,2000}.webp`           |
| `lakeside`      | Turquoise lake, red bridge, pavilion, mountains   | `lakeside-{800,1280,2000}.webp`         |
| `snowy`         | Snowy Fuji, pines, shrine, torii, stream          | `snowy-{800,1280,2000}.webp`            |
| `festival`      | Lantern street at dusk, stalls, bridge, Fuji      | `festival-{800,1280,2000}.webp`         |
| `bamboo`        | **Missing** — uses the vector fallback            | add `bamboo-{800,1280,2000}.webp`       |

Encoding: WebP (quality 80 / 78 / 76 for 2000 / 1280 / 800 px), 47–231 KB each. The browser picks one width via
`srcset`; only the visible scene and its neighbours load eagerly, the rest lazily.

## Adding or replacing a painting

1. Export a 3:1 landscape (≥ 2000×667, ideally 2400×800), no text/UI/route.
2. Produce the three widths (e.g. with Pillow: resize LANCZOS, `save('…-1280.webp', 'WEBP', quality=78, method=6)`).
3. Drop them in `public/images/roadmap-world/` using the key above.
4. For a new key, add its `focus` (object-position keeping the subject in frame) to `ART_FOCUS` in
   `src/features/learner-ui/journeyLayout.js`. `bamboo` only needs a focus value instead of `null`.

Keep the subject band (mountains, bridge, landmark) in the middle 40–70 % of the height: the roadmap crops to
about 4:1–5:1 on desktop, and nodes sit in the lower-middle band.

## Generation prompts (shared style block + scene)

Style block (append to every prompt):

> premium 2.5D illustrated game environment, Japanese fantasy adventure landscape, soft painterly anime rendering,
> lush vegetation, rich environmental detail, warm natural lighting, multiple depth layers (foreground framing
> branches, midground scenery, distant mountains with atmospheric haze), vibrant but tasteful pastel palette with
> sakura pink accents, clean polished cohesive style, ultra-wide 3:1 panorama, no text, no people in focus,
> no UI, no path markers, no numbers, not photorealistic, not flat vector

- **Bamboo Forest (missing):** a sunlit bamboo grove in Kyoto style, tall green bamboo stalks forming a natural
  arch, light rays filtering through the canopy, a small clear stream with mossy stones and a low wooden bridge,
  stone lanterns, a few sakura petals drifting, soft green and jade tones with warm sunlight, a subtle red torii
  far in the background.
- Sakura Garden: rolling green hills of blooming cherry trees, a clear stream with small waterfalls and a red
  arched bridge, a wooden tea house, stone lantern in the foreground, Mt. Fuji under a bright blue sky.
- Japanese Village: traditional wooden houses with noren curtains and paper lanterns, cherry trees, a red arched
  bridge over a stream, stone steps to a large red torii, a pagoda on the hill, Mt. Fuji in the distance.
- Momiji Mountain: autumn valley of red and orange maple trees, misty layered hills, a river with a small
  waterfall, a stone lantern, a pagoda on a cliff, snow-capped Mt. Fuji at golden hour.
- Lakeside Journey: a calm turquoise lake reflecting clouds and forested mountains, a red arched bridge, a
  wooden pavilion, hydrangeas and irises on the shore, a stone path and fence, sakura branches framing.
- Snowy Summit: snow-covered Mt. Fuji above a sea of clouds, snowy pines, a red shrine and torii on a rocky
  hill, glowing stone lanterns, a half-frozen stream, plum blossoms with soft pink winter light.
- Festival Town: a stone street through an old town at sunset, glowing paper lanterns and festival stalls,
  cherry trees, a koinobori banner, a red arched bridge over a stream, a pagoda and Mt. Fuji under a pink sky.
