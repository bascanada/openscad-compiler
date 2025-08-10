import { once } from 'node:events';
import { Compiler } from './index.js';
import { writeFile } from 'node:fs/promises';


const compilerNative = new Compiler({ engine: 'native' });
const compilerWasm = new Compiler({ engine: 'wasm' });


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
        await writeFile(`./cube_${prefix}.stl`, wasmOutput);
    });
}

wrapEmitter('wasm', compilerWasm.compile(text));
wrapEmitter('native', compilerNative.compile(text));

