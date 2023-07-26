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
        const json = JSON.parse(data);

        if (json.textures) {
            return json.textures;
        }

        if (json.frames) {
            const frames = Object.keys(json.frames).map(name => {
                return {
                    filename: name,
                    ...json.frames[name],
                }
            });

            return [{
                image: atlas.split(".")[0] + ".png",
                frames: frames,
            }];
        }
    }

    if (atlas.indexOf("atlas") > -1) {
        return parseSpineAtlas(data.toString());
    }
}

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

    let { x, y, w, h, r } = frameOptions.frame;
    if (r) {
        [w, h] = [h, w];
    }

    const canvas = createCanvas(w, h);

    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

    const buffer = canvas.toBuffer("image/png", {
        compressionLevel: 6, 
        filters: canvas.PNG_ALL_FILTERS, 
        palette: undefined, 
        backgroundIndex: 0, 
        resolution: undefined
    })
    
    const postfix = r ? "_rotated" : "";
    fs.writeFileSync(`./output/${fileName}${postfix}.png`, buffer );
}

const parseSpineAtlas = (data) => {
    const textures = {
        image: "",
        frames: [ { frame: {} } ],
    };

    let blockIndex = 0;
    const lines = data.split("\n");
    lines.forEach((line, i) => {
        if (line.includes(".png")) textures.image = line.trim().replace("\r", "");
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

    return [textures];
}