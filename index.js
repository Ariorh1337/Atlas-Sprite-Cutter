const fs = require("fs");
const { createCanvas, loadImage } = require('canvas');
const atlas = process.argv[2] || undefined;

if (!atlas) return console.log("Please enter name of atlas from input folder");

fs.readFile(`./input/${atlas}`, (err, data) => {
    if (err) throw err;

    const textures = JSON.parse(data).textures;
    textures.forEach(texture => {
        textureParse(texture);
    });
})

const textureParse = (texture) => {
    const fileName = texture.image;

    loadImage(`./input/${fileName}`).then((image) => {
        texture.frames.forEach(frameOptions => {
            frameParse(image, frameOptions);
        });
    })
}

const frameParse = (img, frameOptions) => {
    const fileName = frameOptions.filename;
    const { x, y, w, h } = frameOptions.frame;

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
    
    fs.writeFileSync(`./output/${fileName}.png`, buffer );
}