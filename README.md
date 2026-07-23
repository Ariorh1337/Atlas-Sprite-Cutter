ABOUT
-----------------------------------

This script slices texture atlases into individual PNG files.

Supported formats:

- TexturePacker `JSON` (hash and multipack/array formats, tested with `v5.5.0`)
- Spine / libGDX `.atlas` (both the legacy 3.x format with `xy`/`size` and the 4.x format with `bounds`/`offsets`)
- Multi-page atlases (several `PNG` pages in one `.atlas` file)

Rotated frames are automatically rotated back to their original orientation.
Region names with `/` (e.g. spine skin attachments like `Skin1/Body`) are saved into matching subfolders.

In the `input` folder you need to put the `PNG` page files together with the `JSON` or `.atlas` file.

At start, you will need to specify the name of the atlas as a parameter.

As a result, you will receive individual PNG files in the output folder.


INSTALL
-----------------------------------

`npm install`


RUN
-----------------------------------

`node index.js example.json`

`node index.js freaze.atlas`


OPTIONS
-----------------------------------

`--orig` — restore each sprite to its original untrimmed size, placing the
trimmed region at its recorded offset (uses `orig`/`offset`/`offsets` from
`.atlas` files and `sourceSize`/`spriteSourceSize` from `JSON` files):

`node index.js freaze.atlas --orig`
