export interface OpenSCADModule {
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
  };
  callMain: (args: string[]) => void;
  onRuntimeInitialized?: () => void;
}