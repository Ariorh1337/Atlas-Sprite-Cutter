const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require('canvas');

const args = process.argv.slice(2);
const restoreOrig = args.includes("--orig");
const atlas = args.find(arg => !arg.startsWith("--"));

if (!atlas) return console.log("Please enter name of atlas from input folder");

fs.readFile(`./input/${atlas}`, (err, data) => {
    if (err) throw err;

    const textures = defineTextures(atlas, data);
    if (!textures || !textures.length) {
        return console.log("Unsupported atlas format, expected a .json or .atlas file");
    }

    textures.forEach(texture => {
        textureParse(texture);
    });
});

const defineTextures = (atlas, data) => {
    if (atlas.indexOf("json") > -1) {
        const json = JSON.parse(data);

        if (json.textures) {
            return json.textures.map(texture => ({
                image: texture.image,
                frames: texture.frames.map(normalizeJsonFrame),
            }));
        }

        if (json.frames) {
            const frames = Object.keys(json.frames).map(name => {
                return normalizeJsonFrame({
                    filename: name,
                    ...json.frames[name],
                });
            });

            return [{
                image: (json.meta && json.meta.image) || atlas.split(".")[0] + ".png",
                frames: frames,
            }];
        }
    }

    if (atlas.indexOf("atlas") > -1) {
        return parseSpineAtlas(data.toString());
    }
}

// normalized frame:
//   rotate - degrees the region was rotated clockwise when packed into the page
//   frame  - region rect, w/h are the unrotated dimensions
//   source - untrimmed size and top-left offset of the region inside it
const normalizeJsonFrame = (data) => ({
    filename: data.filename,
    rotate: data.rotated ? 90 : 0,
    frame: data.frame,
    source: (data.sourceSize && data.spriteSourceSize) ? {
        x: data.spriteSourceSize.x,
        y: data.spriteSourceSize.y,
        w: data.sourceSize.w,
        h: data.sourceSize.h,
    } : undefined,
});

const textureParse = (texture) => {
    const fileName = texture.image;

    loadImage(`./input/${fileName}`).then((image) => {
        texture.frames.forEach(frameOptions => {
            frameParse(image, frameOptions);
        });
    });
}

const frameParse = (img, frameOptions) => {
    const fileName = frameOptions.filename;
    if (!fileName) return;

    const { x, y, w, h } = frameOptions.frame;
    const rotate = frameOptions.rotate || 0;

    // dimensions the region occupies inside the atlas page
    const pageW = rotate % 180 ? h : w;
    const pageH = rotate % 180 ? w : h;

    let canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    if (rotate) {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-rotate * Math.PI / 180);
        ctx.drawImage(img, x, y, pageW, pageH, -pageW / 2, -pageH / 2, pageW, pageH);
    } else {
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    }

    if (restoreOrig && frameOptions.source) {
        const source = frameOptions.source;
        const full = createCanvas(source.w, source.h);
        full.getContext('2d').drawImage(canvas, source.x, source.y);
        canvas = full;
    }

    const buffer = canvas.toBuffer("image/png", {
        compressionLevel: 6,
        filters: canvas.PNG_ALL_FILTERS,
        palette: undefined,
        backgroundIndex: 0,
        resolution: undefined
    })

    const outFile = fileName.toLowerCase().endsWith(".png") ? fileName : `${fileName}.png`;
    const outPath = path.join("output", outFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buffer);
}

const parseSpineAtlas = (data) => {
    const pages = [];
    let page = null;
    let region = null;

    data.split(/\r?\n/).forEach(rawLine => {
        const line = rawLine.trim();

        if (!line) {
            page = null;
            region = null;
            return;
        }

        if (!page) {
            page = { image: line, frames: [] };
            pages.push(page);
            return;
        }

        const colon = line.indexOf(":");
        if (colon === -1) {
            region = { filename: line, rotate: 0, frame: {} };
            page.frames.push(region);
            return;
        }

        if (!region) return; // page property (size, format, filter, repeat, pma, scale)

        const key = line.slice(0, colon).trim();
        const values = line.slice(colon + 1).split(",").map(value => value.trim());

        switch (key) {
            case "rotate": // true/false in Spine 3.x, degrees in Spine 4.x
                // spine packs counter clockwise, normalize to clockwise degrees
                const degrees = values[0] === "true" ? 90 : values[0] === "false" ? 0 : Number(values[0]);
                region.rotate = (360 - degrees) % 360;
                break;
            case "xy":
                region.frame.x = Number(values[0]);
                region.frame.y = Number(values[1]);
                break;
            case "size":
                region.frame.w = Number(values[0]);
                region.frame.h = Number(values[1]);
                break;
            case "bounds": // Spine 4.x: x, y, w, h
                region.frame.x = Number(values[0]);
                region.frame.y = Number(values[1]);
                region.frame.w = Number(values[2]);
                region.frame.h = Number(values[3]);
                break;
            case "orig":
                region.origSize = { w: Number(values[0]), h: Number(values[1]) };
                break;
            case "offset":
                region.offset = { x: Number(values[0]), y: Number(values[1]) };
                break;
            case "offsets": // Spine 4.x: offsetX, offsetY, origW, origH
                region.offset = { x: Number(values[0]), y: Number(values[1]) };
                region.origSize = { w: Number(values[2]), h: Number(values[3]) };
                break;
        }
    });

    pages.forEach(page => {
        page.frames.forEach(frame => {
            if (!frame.origSize) return;
            // spine offset is measured from the bottom-left corner
            frame.source = {
                x: frame.offset ? frame.offset.x : 0,
                y: frame.origSize.h - frame.frame.h - (frame.offset ? frame.offset.y : 0),
                w: frame.origSize.w,
                h: frame.origSize.h,
            };
            delete frame.origSize;
            delete frame.offset;
        });
    });

    return pages;
}
