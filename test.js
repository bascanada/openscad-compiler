import { once } from 'node:events';
import { Compiler } from './index.js';
import { writeFile } from 'node:fs/promises';


const compilerNative = new Compiler({ engine: 'native', fileType: 'stl' });
const compilerWasm = new Compiler({ engine: 'wasm', fileType: 'stl', args: { fast: [
    "--enable=fast-csg", "--enable=lazy-union", "--enable=roof"
], full: [] } });



const text = `
//-- Car Window Vent Insert - Asymmetric Curve --//

//-- [ Main Parameters ] --//

window_width = 700;
panel_height = 150; // Height at the new peak location
panel_thickness = 5;

// --- Fitment Parameters ---
window_glass_thickness = 4;
top_curve_radius = 2500;

// --- Asymmetric Curve Control ---
// Controls the left-right position of the curve's highest point.
// 0 = center, negative = left, positive = right.
// The panel edge is at -(window_width / 2).
peak_x_position = -150; // [mm]


epsilon = 0.1;

fan_size = 110;                 // The size of the main square air hole.
mounting_hole_spacing = 105;    // The distance between screw holes.
screw_hole_diameter = 4;        // The diameter of the screw holes.




//-- [ Reusable Fan Hole Module (Square Version) ] --//

module fan_hole(pos = [0,0,0]) {
    translate(pos) {
        cutter_height = panel_height * 2;
        
        // 1. Main SQUARE hole for airflow.
        cube([fan_size, fan_size, cutter_height], center=true);
        
        // 2. The four mounting screw holes.
        offset = mounting_hole_spacing / 2;
        positions = [ [offset, offset], [offset, -offset], [-offset, offset], [-offset, -offset] ];
        
        for (p = positions) {
            translate([p[0], p[1], 0]) {
                cylinder(h = cutter_height, d = screw_hole_diameter, center=true, $fn=20);
            }
        }
    }
}

//-- [ Render the Model ] --//

difference() {
    
    // --- Part 1: Create the main panel shape ---
    intersection() {
        cube([window_width, panel_thickness, panel_height], center = true);
        translate([peak_x_position, 0, panel_height/2 - top_curve_radius]) {
            rotate([90, 0, 0]) {
                cylinder(r = top_curve_radius, h = panel_thickness + epsilon, center = true, $fn=200);
            }
        }
        
    }
    
    // --- Part 2: Subtract the bottom groove and the fan holes ---
    
    // Bottom groove cutter
    translate([0, 0, -panel_height/2]) {
        rotate([0, 90, 0]) {
            cylinder(h = window_width + epsilon, d = window_glass_thickness, center = true, $fn=50);
        }
    }
    
    // Call the fan_hole() module to add fans
    // You can add as many as you want by calling the module again
    // with different positions.
    rotate([90, 0, 0]) {
       fan_hole(pos = [50, 0, 0]);      // Add a fan centered at x=50
       fan_hole(pos = [-250, 0, 0]);    // Add another fan centered at x=-200
    }

    // fan_hole(pos = [300, 0, 0]);  // Example of adding a third fan
}
`;

function wrapEmitter(prefix, emitter) {
    const origEmit = emitter.emit;
    emitter.emit = function(event, ...args) {
        if (event !== 'done') {
            console.log(`[${prefix}] ${event}:`, ...args);
        }
        return origEmit.call(this, event, ...args);
    };

    once(emitter, 'done').then(async (wasmOutput) => {
        // wasmOutput might be a Buffer or string depending on engine/fileType
        const outPath = `./cube_${prefix}.stl`;
        if (wasmOutput instanceof Buffer) {
            await writeFile(outPath, wasmOutput);
        } else {
            await writeFile(outPath, wasmOutput);
        }
    });
}



async function testSceneGraph(scadCode) {
    console.log('\n--- Testing Scene Graph (CSG) ---');
    try {
        const nativeCsg = await compilerNative.getSceneGraph(scadCode);
        await writeFile('./cube_native.csg', nativeCsg);
        console.log('Saved native CSG to cube_native.csg');

        const wasmCsg = await compilerWasm.getSceneGraph(scadCode);
        await writeFile('./cube_wasm.csg', wasmCsg);
        console.log('Saved wasm CSG to cube_wasm.csg');
    } catch (error) {
        console.error('Scene Graph test failed:', error);
    }
}

async function testDimensions(scadCode) {
    console.log('\n--- Testing Dimensions (STL) ---');
    try {
        const nativeDimensions = await compilerNative.getDimensions(scadCode);
        console.log('Native Dimensions:', nativeDimensions);

        const wasmDimensions = await compilerWasm.getDimensions(scadCode);
        console.log('WASM Dimensions:', wasmDimensions);
    } catch (error) {
        console.error('Dimensions test failed:', error);
    }
}

async function testPreview(scadCode) {
    console.log('\n--- Testing Preview (PNG) ---');
    try {
        const nativePreview = await compilerNative.getPreview(scadCode);
        await writeFile('./preview_native.png', nativePreview);
        console.log('Saved native preview to preview_native.png');

        const wasmPreview = await compilerWasm.getPreview(scadCode);
        await writeFile('./preview_wasm.png', wasmPreview);
        console.log('Saved wasm preview to preview_wasm.png');
    } catch (error) {
        console.error('Preview test failed:', error);
    }
}


(async () => {


    const versionWasm = await compilerWasm.getVersion();
    const versionNative = await compilerNative.getVersion();

    console.log("native version:", versionNative);
    console.log("wasm version:", versionWasm);

    wrapEmitter('wasm', compilerWasm.compile(text));
    wrapEmitter('native', compilerNative.compile(text));

    await testSceneGraph(text);
    await testDimensions(text);
    await testPreview(text);

})();