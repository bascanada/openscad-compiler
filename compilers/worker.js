importScripts('command.js');

self.onmessage = async function(e) {
    const { scadCode, quality, outputFormat, wasmPath } = e.data;

    importScripts(wasmPath);

    const OpenSCAD = self.OpenSCAD;

    try {
        self.postMessage({ type: 'compiling' });

        const instance = await OpenSCAD();
        instance.FS.writeFile('/input.scad', scadCode);

        const command = new Command({ version: '2022.03.20', quality, outputFormat });
        const outputFile = `output.${outputFormat}`;
        const args = command.getArgs('/input.scad', outputFile);

        instance.callMain(args);
        const output = instance.FS.readFile(outputFile);
        self.postMessage({ type: 'output', payload: output });
    } catch (err) {
        self.postMessage({ type: 'error', payload: err.message });
    }
};
