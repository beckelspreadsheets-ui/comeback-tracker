# Key art: app icon and lead store picture

Full-quality Blender Cycles renders, built entirely by Python script with no
external assets. These are still pictures, not game models.

| Script | What it makes |
|---|---|
| `white-kart-hero.py` | First white kart picture. The app icon since 9b78f51b. |
| `purple-kart-hero.py` | Purple and mint take. Not used; the owner prefers its Seth. |
| `white-kart-seth2-hero.py` | White kart scene with the purple take's Seth (the "white2" picture, feet still showing). |

Run with Blender 5.1, for example:

    blender -b -P white-kart-hero.py -- --job square 2048 2048 400 /abs/out.png
    blender -b -P purple-kart-hero.py -- --jobs square:2048x2048:320:/abs/out.png

Each script's header lists its cameras and flags. A render uses the GPU, so
do not run the gate battery at the same time: the browser gates time out.

Preview copies of the pictures are in `docs/key-art/`. Full-size PNGs are on
the owner's Mac in `~/Desktop/Penguin-Kart-Icon-Art/` and are not in the repo.

State on 2026-11-13: the owner approved "white3" (white kart, new Seth, feet
tucked in) as the next icon once Seth's head is made smaller. That render
("white4") was in progress; its script changes are not in this folder yet.
