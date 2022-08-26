const fs = require("fs");
const { createCanvas, loadImage } = require('canvas');
const atlas = process.argv[2] || undefined;

if (!atlas) return console.log("Please enter name of atlas from input folder");

fs.readFile(`./input/${atlas}`, (err, data) => {
    if (err) throw err;

    const textures = defineTextures(atlas, data);
    textures.forEach(texture => {
        textureParse(texture);
    });
});

const defineTextures = (atlas, data) => {
    if (atlas.indexOf("json") > -1) {
        return JSON.parse(data).textures;
    }

    if (atlas.indexOf("atlas") > -1) {
        return parseSpineAtlas(data.toString());
    }
}

const parseSpineAtlas = (data) => {
    const textures = {
        image: "",
        frames: [ { frame: {} } ],
    };

    let blockIndex = 0;
    const lines = data.split("\n");
    lines.forEach((line, i) => {
        if (line.includes(".png")) textures.image = line;
        if (line.includes("rotate")) {
            textures.frames[blockIndex].filename = lines[i - 1].trim().replace("\r", "");
            textures.frames[blockIndex].frame.r = line.includes("true");
        }
        if (line.includes("xy")) {
            const [x, y] = line.split(":")[1].split(",");
            textures.frames[blockIndex].frame.x = Number(x);
            textures.frames[blockIndex].frame.y = Number(y);
        }
        if (line.includes("size")) {
            const [w, h] = line.split(":")[1].split(",");
            textures.frames[blockIndex].frame.w = Number(w);
            textures.frames[blockIndex].frame.h = Number(h);
        }
        if (line.includes("index")) {
            blockIndex+= 1;
            textures.frames.push({ frame: {} });
        }
    });

    return textures;
}